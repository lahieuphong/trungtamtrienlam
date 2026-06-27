import re
import tempfile
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import District, Province, Ward
from apps.accounts.vn_admin_units import CURRENT_PROVINCES

DEFAULT_SOURCE_URL = 'https://danhmuchanhchinh.nso.gov.vn/TAPTIN/BangChuyendoi%C4%90VHCmoi_cu_final.xlsx'
LOCAL_FALLBACKS = [
    Path(r'C:\tmp\BangChuyendoiDVHCmoi_cu_final.xlsx'),
    Path(r'C:\tmp\BangChuyendoi?VHCmoi_cu_final.xlsx'),
]
XLSX_NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL_NS = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
OFFICE_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CENTRAL_CITY_CODES = {'01', '31', '46', '48', '79', '92'}


def normalize_admin_code(value, length):
    value = str(value or '').strip()
    if value.endswith('.0'):
        value = value[:-2]
    return value.zfill(length) if value.isdigit() else value


def clean_province_name(value):
    return re.sub(r'\s*\(\d{2}\)\s*$', '', str(value or '')).strip()


def parse_province_code(value):
    match = re.search(r'\((\d{2})\)\s*$', str(value or ''))
    return match.group(1) if match else ''


def ward_unit_type(name):
    if name.startswith('\u0110\u1eb7c khu'):
        return Ward.UNIT_TYPE_SPECIAL_ZONE
    if name.startswith('X\u00e3'):
        return Ward.UNIT_TYPE_COMMUNE
    return Ward.UNIT_TYPE_WARD


class SimpleXlsxReader:
    def __init__(self, path):
        self.path = Path(path)

    def rows(self):
        with zipfile.ZipFile(self.path) as workbook:
            shared_strings = self._read_shared_strings(workbook)
            sheet_path = self._sheet_path(workbook)
            root = ET.fromstring(workbook.read(sheet_path))
            for row in root.findall('m:sheetData/m:row', XLSX_NS):
                yield self._read_row(row, shared_strings)

    def _read_shared_strings(self, workbook):
        if 'xl/sharedStrings.xml' not in workbook.namelist():
            return []
        root = ET.fromstring(workbook.read('xl/sharedStrings.xml'))
        values = []
        for item in root.findall('m:si', XLSX_NS):
            values.append(''.join((node.text or '') for node in item.findall('.//m:t', XLSX_NS)))
        return values

    def _sheet_path(self, workbook):
        workbook_root = ET.fromstring(workbook.read('xl/workbook.xml'))
        rel_root = ET.fromstring(workbook.read('xl/_rels/workbook.xml.rels'))
        rels = {rel.attrib['Id']: rel.attrib['Target'] for rel in rel_root}
        fallback = 'xl/worksheets/sheet2.xml' if 'xl/worksheets/sheet2.xml' in workbook.namelist() else 'xl/worksheets/sheet1.xml'
        for sheet in workbook_root.findall('m:sheets/m:sheet', XLSX_NS):
            name = sheet.attrib.get('name', '')
            rel_id = sheet.attrib.get(f'{{{OFFICE_REL_NS}}}id')
            target = rels.get(rel_id, '')
            if 'kh\u00f4ng merge' in name.lower() and target:
                return 'xl/' + target.lstrip('/')
        return fallback

    def _read_row(self, row, shared_strings):
        values = {}
        for cell in row.findall('m:c', XLSX_NS):
            cell_ref = cell.attrib.get('r', '')
            column = re.match(r'[A-Z]+', cell_ref).group(0)
            values[column] = self._cell_value(cell, shared_strings).strip()
        return values

    def _cell_value(self, cell, shared_strings):
        value_node = cell.find('m:v', XLSX_NS)
        if value_node is None:
            inline_node = cell.find('m:is/m:t', XLSX_NS)
            return inline_node.text if inline_node is not None and inline_node.text else ''
        value = value_node.text or ''
        if cell.attrib.get('t') == 's' and value:
            return shared_strings[int(value)]
        return value


def iter_ward_rows(path):
    wards = {}
    for row in SimpleXlsxReader(path).rows():
        province_cell = row.get('A', '')
        ward_name = row.get('B', '').strip()
        ward_code = normalize_admin_code(row.get('C', ''), 5)
        province_code = parse_province_code(province_cell)
        if not province_code or not ward_name or not ward_code.isdigit():
            continue
        item = wards.setdefault(ward_code, {
            'code': ward_code,
            'name': ward_name,
            'province_code': province_code,
            'province_name': clean_province_name(province_cell),
            'unit_type': ward_unit_type(ward_name),
            'old_district_names': set(),
        })
        old_district_name = row.get('G', '').strip()
        if old_district_name:
            item['old_district_names'].add(old_district_name)
    for item in wards.values():
        item['old_district_name'] = '; '.join(sorted(item.pop('old_district_names')))[:255]
        yield item


def seed_current_provinces():
    province_by_code = {}
    for item in CURRENT_PROVINCES:
        province, _ = Province.objects.update_or_create(
            code=item['code'],
            defaults={
                'name': item['name'],
                'unit_type': item['unit_type'],
                'is_disabled': False,
                'is_deleted': False,
            },
        )
        province_by_code[item['code']] = province
    Province.objects.exclude(code__in=province_by_code.keys()).update(is_disabled=True)
    return province_by_code


class Command(BaseCommand):
    help = 'Import current Vietnam administrative units as Province -> Ward.'

    def add_arguments(self, parser):
        parser.add_argument('--file', dest='file_path', help='Path to the official conversion .xlsx file')
        parser.add_argument('--url', default=DEFAULT_SOURCE_URL, help='Official conversion .xlsx URL')
        parser.add_argument('--province-code', dest='province_code', help='Import only one province code, e.g. 79')
        parser.add_argument('--skip-download', action='store_true', help='Use local fallback file instead of downloading')

    def handle(self, *args, **options):
        source_path = self._resolve_source(options)
        province_filter = normalize_admin_code(options.get('province_code'), 2) if options.get('province_code') else ''

        with transaction.atomic():
            province_by_code = seed_current_provinces()
            District.objects.filter(is_deleted=False).update(is_legacy=True, is_disabled=True)

            imported_codes = set()
            touched_province_ids = set()
            created = 0
            updated = 0
            for item in iter_ward_rows(source_path):
                if province_filter and item['province_code'] != province_filter:
                    continue
                province = province_by_code.get(item['province_code'])
                if not province:
                    continue
                _, was_created = Ward.objects.update_or_create(
                    code=item['code'],
                    defaults={
                        'name': item['name'],
                        'province': province,
                        'unit_type': item['unit_type'],
                        'old_district_name': item['old_district_name'],
                        'district': None,
                        'is_disabled': False,
                        'is_deleted': False,
                    },
                )
                imported_codes.add(item['code'])
                touched_province_ids.add(province.id)
                created += 1 if was_created else 0
                updated += 0 if was_created else 1

            if imported_codes:
                Ward.objects.filter(province_id__in=touched_province_ids).exclude(code__in=imported_codes).update(is_disabled=True)

            self._assert_current_counts(province_filter)

        self.stdout.write(self.style.SUCCESS(
            f'Imported Vietnam admin units from {source_path}. Created {created}, updated {updated}.'
        ))

    def _resolve_source(self, options):
        explicit_path = options.get('file_path')
        if explicit_path:
            path = Path(explicit_path)
            if not path.exists():
                raise CommandError(f'File not found: {path}')
            return path

        if not options.get('skip_download'):
            try:
                target = Path(tempfile.gettempdir()) / 'BangChuyendoiDVHCmoi_cu_final.xlsx'
                urllib.request.urlretrieve(options['url'], target)
                return target
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f'Download failed, trying local fallback: {exc}'))

        for path in LOCAL_FALLBACKS:
            if path.exists():
                return path
        raise CommandError('No source .xlsx file found. Pass --file or allow download from the official URL.')

    def _assert_current_counts(self, province_filter):
        active_province_count = Province.objects.filter(is_deleted=False, is_disabled=False, code__in=[p['code'] for p in CURRENT_PROVINCES]).count()
        if active_province_count != 34:
            raise CommandError(f'Expected 34 active current provinces, got {active_province_count}.')

        if province_filter and province_filter != '79':
            return

        hcm = Province.objects.filter(code='79', is_deleted=False, is_disabled=False).first()
        if not hcm:
            raise CommandError('Province code 79 was not found after import.')
        hcm_wards = Ward.objects.filter(province=hcm, is_deleted=False, is_disabled=False)
        counts = {
            Ward.UNIT_TYPE_WARD: hcm_wards.filter(unit_type=Ward.UNIT_TYPE_WARD).count(),
            Ward.UNIT_TYPE_COMMUNE: hcm_wards.filter(unit_type=Ward.UNIT_TYPE_COMMUNE).count(),
            Ward.UNIT_TYPE_SPECIAL_ZONE: hcm_wards.filter(unit_type=Ward.UNIT_TYPE_SPECIAL_ZONE).count(),
        }
        if hcm_wards.count() != 168 or counts[Ward.UNIT_TYPE_WARD] != 113 or counts[Ward.UNIT_TYPE_COMMUNE] != 54 or counts[Ward.UNIT_TYPE_SPECIAL_ZONE] != 1:
            raise CommandError(
                'Expected TP.HCM code 79 to have 168 active wards '
                f'(113 wards, 54 communes, 1 special zone), got total={hcm_wards.count()}, counts={counts}.'
            )
