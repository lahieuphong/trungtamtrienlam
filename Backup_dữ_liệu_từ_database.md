# Backup và khôi phục dữ liệu

Backend hiện tại là `trungtamtrienlam-BE`. Tất cả file backup nên được lưu tập trung tại:

```text
trungtamtrienlam\backup
```

File database chuẩn hiện có:

```text
backup\trungtamtrienlam-current-20260713064140.dump
```

> File `.dump` chỉ chứa database, không chứa ảnh hoặc file upload. Media đang sử dụng nằm tại `trungtamtrienlam-BE\app\media` và cần được backup riêng.

## Khôi phục database

Mở PowerShell tại thư mục dự án rồi chạy:

```powershell
Set-Location "E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-BE"

powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 `
  -Environment dev `
  -ConfirmDestructive

docker compose run --rm app poetry run python manage.py migrate --noinput
docker compose up -d
```

Script tự chọn file `.dump` mới nhất trong `..\backup`. Tham số `-ConfirmDestructive` cho phép xóa và tạo lại **database của stack backend hiện tại** trước khi restore; các Docker volume khác không bị xóa.

Nếu chỉ muốn khôi phục database và không xử lý media:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 `
  -Environment dev `
  -ConfirmDestructive `
  -SkipMedia
```

## Tạo database backup mới

Đảm bảo PostgreSQL của backend đang chạy:

```powershell
Set-Location "E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-BE"
docker compose up -d postgres

$stamp = Get-Date -Format "yyyyMMddHHmmss"
$file = "trungtamtrienlam-$stamp.dump"

docker compose exec -T postgres pg_dump `
  --username=trungtamtrienlam `
  --dbname=trungtamtrienlam `
  --format=custom `
  --file="/tmp/$file"

docker compose cp "postgres:/tmp/$file" "..\backup\$file"
docker compose exec -T postgres rm -f "/tmp/$file"
```

Kiểm tra file vừa tạo:

```powershell
Get-ChildItem ..\backup\*.dump
```

## Backup media

Database dump không bao gồm media. Có thể tạo thêm file nén cùng thời điểm:

```powershell
$stamp = Get-Date -Format "yyyyMMddHHmmss"
Compress-Archive `
  -Path .\app\media\* `
  -DestinationPath "..\backup\media-$stamp.zip" `
  -Force
```

Không đưa dump, media backup hoặc file `.env` có dữ liệu thật lên repository public.

## Lưu ý an toàn

- Không chạy `docker compose down -v`; tùy chọn `-v` sẽ xóa volume database.
- Nên tạo một dump mới trước khi restore lên database đang có dữ liệu quan trọng.
- Chỉ restore file có nguồn gốc tin cậy.
