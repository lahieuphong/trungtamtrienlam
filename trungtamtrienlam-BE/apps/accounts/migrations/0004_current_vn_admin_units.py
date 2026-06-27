# Generated manually to migrate active Vietnam admin units from 3 levels to Province -> Ward.
from django.db import migrations, models
import django.db.models.deletion

CURRENT_PROVINCES = [{'code': '01', 'name': 'Thành phố Hà Nội', 'unit_type': 'central_city'}, {'code': '04', 'name': 'Tỉnh Cao Bằng', 'unit_type': 'province'}, {'code': '08', 'name': 'Tỉnh Tuyên Quang', 'unit_type': 'province'}, {'code': '11', 'name': 'Tỉnh Điện Biên', 'unit_type': 'province'}, {'code': '12', 'name': 'Tỉnh Lai Châu', 'unit_type': 'province'}, {'code': '14', 'name': 'Tỉnh Sơn La', 'unit_type': 'province'}, {'code': '15', 'name': 'Tỉnh Lào Cai', 'unit_type': 'province'}, {'code': '19', 'name': 'Tỉnh Thái Nguyên', 'unit_type': 'province'}, {'code': '20', 'name': 'Tỉnh Lạng Sơn', 'unit_type': 'province'}, {'code': '22', 'name': 'Tỉnh Quảng Ninh', 'unit_type': 'province'}, {'code': '24', 'name': 'Tỉnh Bắc Ninh', 'unit_type': 'province'}, {'code': '25', 'name': 'Tỉnh Phú Thọ', 'unit_type': 'province'}, {'code': '31', 'name': 'Thành phố Hải Phòng', 'unit_type': 'central_city'}, {'code': '33', 'name': 'Tỉnh Hưng Yên', 'unit_type': 'province'}, {'code': '37', 'name': 'Tỉnh Ninh Bình', 'unit_type': 'province'}, {'code': '38', 'name': 'Tỉnh Thanh Hóa', 'unit_type': 'province'}, {'code': '40', 'name': 'Tỉnh Nghệ An', 'unit_type': 'province'}, {'code': '42', 'name': 'Tỉnh Hà Tĩnh', 'unit_type': 'province'}, {'code': '44', 'name': 'Tỉnh Quảng Trị', 'unit_type': 'province'}, {'code': '46', 'name': 'Thành phố Huế', 'unit_type': 'central_city'}, {'code': '48', 'name': 'Thành phố Đà Nẵng', 'unit_type': 'central_city'}, {'code': '51', 'name': 'Tỉnh Quảng Ngãi', 'unit_type': 'province'}, {'code': '52', 'name': 'Tỉnh Gia Lai', 'unit_type': 'province'}, {'code': '56', 'name': 'Tỉnh Khánh Hòa', 'unit_type': 'province'}, {'code': '66', 'name': 'Tỉnh Đắk Lắk', 'unit_type': 'province'}, {'code': '68', 'name': 'Tỉnh Lâm Đồng', 'unit_type': 'province'}, {'code': '75', 'name': 'Tỉnh Đồng Nai', 'unit_type': 'province'}, {'code': '79', 'name': 'Thành phố Hồ Chí Minh', 'unit_type': 'central_city'}, {'code': '80', 'name': 'Tỉnh Tây Ninh', 'unit_type': 'province'}, {'code': '82', 'name': 'Tỉnh Đồng Tháp', 'unit_type': 'province'}, {'code': '86', 'name': 'Tỉnh Vĩnh Long', 'unit_type': 'province'}, {'code': '91', 'name': 'Tỉnh An Giang', 'unit_type': 'province'}, {'code': '92', 'name': 'Thành phố Cần Thơ', 'unit_type': 'central_city'}, {'code': '96', 'name': 'Tỉnh Cà Mau', 'unit_type': 'province'}]


def normalize_current_admin_units(apps, schema_editor):
    Province = apps.get_model('accounts', 'Province')
    District = apps.get_model('accounts', 'District')
    Ward = apps.get_model('accounts', 'Ward')

    official_ids = set()
    for item in CURRENT_PROVINCES:
        province = Province.objects.filter(code=item['code']).first()
        if not province:
            province = Province.objects.filter(name__iexact=item['name']).first()
        if not province and item['code'] == '79':
            province = Province.objects.filter(code__iexact='HCM').first() or Province.objects.filter(name__icontains='H? Ch? Minh').first()
        if not province:
            province = Province()
        previous_code = province.code
        if previous_code and previous_code != item['code']:
            province.legacy_code = previous_code
        province.code = item['code']
        province.name = item['name']
        province.unit_type = item['unit_type']
        province.is_disabled = False
        province.is_deleted = False
        province.save()
        official_ids.add(province.id)

    used_codes = set(Province.objects.exclude(code__isnull=True).values_list('code', flat=True))
    available_codes = [f'{i:02d}' for i in range(2, 100) if f'{i:02d}' not in used_codes]
    for province in Province.objects.exclude(id__in=official_ids).order_by('id'):
        if province.code:
            province.legacy_code = province.legacy_code or province.code
        if not province.code or len(province.code) != 2 or province.code in used_codes:
            province.code = available_codes.pop(0) if available_codes else None
        province.is_disabled = True
        province.save()
        if province.code:
            used_codes.add(province.code)

    District.objects.filter(is_deleted=False).update(is_legacy=True, is_disabled=True)
    fallback_province = Province.objects.filter(code='79').first() or Province.objects.filter(id__in=official_ids).first()

    legacy_counter = 1
    used_ward_codes = set(Ward.objects.exclude(code__isnull=True).values_list('code', flat=True))
    for ward in Ward.objects.select_related('district', 'province').all().order_by('id'):
        if ward.district_id and not ward.province_id:
            ward.province_id = ward.district.province_id
            if ward.district and not ward.old_district_name:
                ward.old_district_name = ward.district.name
        if not ward.province_id and fallback_province:
            ward.province_id = fallback_province.id
            ward.is_disabled = True
            ward.is_deleted = True
        if not ward.unit_type:
            ward.unit_type = 'ward'
        if not ward.code or len(str(ward.code)) > 5:
            while True:
                candidate = f'L{legacy_counter:04d}'
                legacy_counter += 1
                if candidate not in used_ward_codes:
                    ward.code = candidate
                    used_ward_codes.add(candidate)
                    break
        ward.save()


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_staff_files_staff_fk'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='district',
            options={'ordering': ['name'], 'verbose_name': 'Cấp huyện cũ (lưu trữ)', 'verbose_name_plural': 'Cấp huyện cũ (lưu trữ)'},
        ),
        migrations.AlterModelOptions(
            name='province',
            options={'ordering': ['name'], 'verbose_name': 'Tỉnh/Thành phố trực thuộc TW', 'verbose_name_plural': 'Tỉnh/Thành phố trực thuộc TW'},
        ),
        migrations.AlterModelOptions(
            name='ward',
            options={'ordering': ['name'], 'verbose_name': 'Phường/Xã/Đặc khu', 'verbose_name_plural': 'Phường/Xã/Đặc khu'},
        ),
        migrations.AddField(
            model_name='province',
            name='legacy_code',
            field=models.CharField(blank=True, db_index=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='province',
            name='unit_type',
            field=models.CharField(choices=[('province', 'Tỉnh'), ('central_city', 'Thành phố trực thuộc TW')], default='province', max_length=20),
        ),
        migrations.AddField(
            model_name='district',
            name='is_legacy',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='ward',
            name='old_district_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='ward',
            name='province',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='wards', to='accounts.province'),
        ),
        migrations.AddField(
            model_name='ward',
            name='unit_type',
            field=models.CharField(choices=[('ward', 'Phường'), ('commune', 'Xã'), ('special_zone', 'Đặc khu')], default='ward', max_length=20),
        ),
        migrations.RunPython(normalize_current_admin_units, reverse_noop),
        migrations.AlterField(
            model_name='province',
            name='code',
            field=models.CharField(max_length=2, unique=True),
        ),
        migrations.AlterField(
            model_name='district',
            name='is_disabled',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='district',
            name='province',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='districts', to='accounts.province'),
        ),
        migrations.AlterField(
            model_name='ward',
            name='code',
            field=models.CharField(max_length=5, unique=True),
        ),
        migrations.AlterField(
            model_name='ward',
            name='district',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='legacy_wards', to='accounts.district'),
        ),
        migrations.AlterField(
            model_name='ward',
            name='province',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='wards', to='accounts.province'),
        ),
    ]
