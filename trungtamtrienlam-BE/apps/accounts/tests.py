import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import District, Province, Ward
from apps.accounts.services import active_location_or_failure


class CurrentAdminUnitImportTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        legacy_province = Province.objects.create(
            code='97',
            name='Legacy HCM',
            unit_type=Province.UNIT_TYPE_PROVINCE,
            is_disabled=True,
        )
        District.objects.create(
            name='Qu\u1eadn 1',
            code='Q1',
            province=legacy_province,
            is_legacy=False,
            is_disabled=False,
        )
        cls.fixture_path = cls._build_hcm_fixture()
        call_command('import_vn_admin_units', file_path=str(cls.fixture_path), verbosity=0)

    @classmethod
    def tearDownClass(cls):
        try:
            cls.fixture_path.unlink(missing_ok=True)
        finally:
            super().tearDownClass()

    @staticmethod
    def _build_hcm_fixture():
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
        tmp.close()
        path = Path(tmp.name)
        rows = [
            ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
            ['T\u1ec9nh, th\u00e0nh ph\u1ed1', 'T\u00ean X\u00e3 m\u1edbi', 'M\u00e3 X\u00e3 m\u1edbi', '', '', '', 'Qu\u1eadn/huy\u1ec7n', ''],
        ]
        next_code = 27001
        for index in range(113):
            rows.append([
                'Th\u00e0nh ph\u1ed1 H\u1ed3 Ch\u00ed Minh (79)',
                f'Ph\u01b0\u1eddng Test {index + 1:03d}',
                f'{next_code + index:05d}',
                '', '', '', 'Qu\u1eadn 1 (760)', '',
            ])
        next_code = 27201
        for index in range(54):
            rows.append([
                'Th\u00e0nh ph\u1ed1 H\u1ed3 Ch\u00ed Minh (79)',
                f'X\u00e3 Test {index + 1:03d}',
                f'{next_code + index:05d}',
                '', '', '', 'Huy\u1ec7n C\u1ea7n Gi\u1edd (787)', '',
            ])
        rows.append([
            'Th\u00e0nh ph\u1ed1 H\u1ed3 Ch\u00ed Minh (79)',
            '\u0110\u1eb7c khu C\u00f4n \u0110\u1ea3o',
            '26732',
            '', '', '', 'Huy\u1ec7n C\u00f4n \u0110\u1ea3o (755)', '',
        ])

        def cell(ref, value):
            return f'<c r="{ref}" t="inlineStr"><is><t>{escape(value)}</t></is></c>'

        sheet_rows = []
        for row_index, values in enumerate(rows, start=1):
            cells = ''.join(cell(f'{chr(65 + col_index)}{row_index}', value) for col_index, value in enumerate(values))
            sheet_rows.append(f'<row r="{row_index}">{cells}</row>')
        sheet_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData>' + ''.join(sheet_rows) + '</sheetData></worksheet>'
        )
        workbook_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="T\u1ed5ng h\u1ee3p_kh\u00f4ng merge " sheetId="1" r:id="rId1"/></sheets></workbook>'
        )
        rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>'
            '</Relationships>'
        )
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr('xl/workbook.xml', workbook_xml)
            archive.writestr('xl/_rels/workbook.xml.rels', rels_xml)
            archive.writestr('xl/worksheets/sheet2.xml', sheet_xml)
        return path

    def test_current_province_count_is_34(self):
        self.assertEqual(Province.objects.filter(is_deleted=False, is_disabled=False).count(), 34)

    def test_hcm_code_79_has_168_wards(self):
        hcm = Province.objects.get(code='79')
        self.assertEqual(Ward.objects.filter(province=hcm, is_deleted=False, is_disabled=False).count(), 168)

    def test_hcm_has_one_special_zone_con_dao(self):
        hcm = Province.objects.get(code='79')
        self.assertEqual(
            Ward.objects.filter(
                province=hcm,
                unit_type=Ward.UNIT_TYPE_SPECIAL_ZONE,
                name='\u0110\u1eb7c khu C\u00f4n \u0110\u1ea3o',
                is_deleted=False,
                is_disabled=False,
            ).count(),
            1,
        )

    def test_address_form_does_not_require_district(self):
        hcm = Province.objects.get(code='79')
        ward = Ward.objects.filter(province=hcm, is_deleted=False, is_disabled=False).first()
        province, district, selected_ward, error = active_location_or_failure(hcm.code, ward.code, district_id='')
        self.assertEqual(error, '')
        self.assertEqual(province, hcm)
        self.assertIsNone(district)
        self.assertEqual(selected_ward, ward)

    def test_old_district_records_are_legacy_not_active(self):
        old_district = District.objects.get(code='Q1')
        self.assertTrue(old_district.is_legacy)
        self.assertTrue(old_district.is_disabled)
