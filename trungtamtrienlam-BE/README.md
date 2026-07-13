# Trung tâm triển lãm – Backend v2

Backend v2 giữ cấu trúc chuẩn của bản production:

- Cấu hình Django/ASGI/Celery nằm trong `app/root`.
- Logic nghiệp vụ nằm trong `app/core`.
- Có 18 app nghiệp vụ đang hoạt động: `accounts`, `archives`, `authentication`, `backup`, `calendars`, `chats`, `chat_notes`, `chat_reminds`, `chat_votes`, `departments`, `documents`, `media_files`, `monuments`, `notifications`, `ratings`, `settings_app`, `tasks` và `templates_app`.
- Các thư mục `legacy_aidi`, `projects` và `payments` được giữ lại từ cây code chuẩn nhưng không được đăng ký trong `INSTALLED_APPS`.

Dữ liệu PostgreSQL và media được phục hồi từ hệ thống cũ vào stack v2 tách biệt. Không đổi tên app label/migration và không cần xóa database hoặc volume của stack cũ.

## Yêu cầu trước khi chạy

- Docker Desktop đang chạy và Docker CLI dùng được trong PowerShell.
- PowerShell 5.1 trở lên.
- File `.env.local` của backend đã được cấu hình đầy đủ. Không commit file này và không đưa secret vào README/log.
- File backup PostgreSQL dạng `.dump` nằm trong `E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\backup`.

Mặc định script chọn file `.dump` mới nhất trong thư mục trên. Media hiện có được giữ tại:

`E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-BE\app\media`

Dump PostgreSQL không chứa media. Khi không truyền `-MediaSource` khác, script giữ nguyên thư mục media hiện tại và không copy chồng lên chính nó.

## Chạy lần đầu sau migration

Mở PowerShell và chạy đúng thứ tự:

~~~powershell
Set-Location "E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-BE"

docker compose build

powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 -Environment dev -ConfirmDestructive

docker compose run --rm app poetry run python manage.py migrate --noinput

docker compose up -d
~~~

Thứ tự này quan trọng: build image, restore dữ liệu/media, chạy các migration còn thiếu, rồi mới khởi động app và Celery.

Script restore yêu cầu `-ConfirmDestructive` vì nó drop rồi tạo lại database đích. Thao tác này chỉ áp dụng cho PostgreSQL thuộc project v2 dev `trungtamtrienlam-backend-v2-dev`; script không xóa Docker volume và không đụng stack backend cũ.

Các địa chỉ mặc định:

- API/backend: <http://127.0.0.1:8003>
- Healthcheck: <http://127.0.0.1:8003/healthcheck/>
- Readiness: <http://127.0.0.1:8003/readiness/>
- Django admin: <http://127.0.0.1:8003/admin/>
- PostgreSQL trên máy host: `127.0.0.1:5434`
- Redis chỉ mở trong mạng Docker, không publish ra host.

## Khởi động và dừng ở các lần sau

Khởi động lại toàn bộ dịch vụ:

~~~powershell
Set-Location "E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-BE"
docker compose up -d
~~~

Dừng tạm thời nhưng giữ nguyên container và dữ liệu:

~~~powershell
docker compose stop
~~~

Gỡ container/network của riêng stack v2 nhưng vẫn giữ volume dữ liệu:

~~~powershell
docker compose down
~~~

> Tuyệt đối không dùng `docker compose down -v`. Tham số `-v` sẽ xóa volume PostgreSQL và làm mất database đã restore.

Project, network và volume mặc định của dev được tách riêng:

- Project: `trungtamtrienlam-backend-v2-dev`
- Network: `trungtamtrienlam-backend-v2-dev-net`
- PostgreSQL volume: `trungtamtrienlam-backend-v2-dev-postgres-data`

Không override `COMPOSE_PROJECT_NAME`, `APP_NETWORK_NAME` hoặc `POSTGRES_VOLUME_NAME` bằng tên của stack backend cũ.

## Restore backup và media

Restore file dump mới nhất và media mặc định:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 -Environment dev -ConfirmDestructive
~~~

Chọn chính xác một file dump:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 -Environment dev -DumpPath "E:\duong-dan\backup.dump" -ConfirmDestructive
~~~

Chọn thư mục backup khác; script lấy file `.dump` mới nhất trong thư mục đó:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 -Environment dev -BackupDirectory "E:\duong-dan\thu-muc-backup" -ConfirmDestructive
~~~

Chọn nguồn media khác:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 -Environment dev -MediaSource "E:\duong-dan\media" -ConfirmDestructive
~~~

Chỉ restore database, không copy media:

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 -Environment dev -SkipMedia -ConfirmDestructive
~~~

Khi truyền `-MediaSource` khác, media được merge vào `app/media`; script không xóa các file đang có. Mặc định script giữ nguyên media hiện tại. Sau mỗi lần restore dump, luôn chạy:

~~~powershell
docker compose run --rm app poetry run python manage.py migrate --noinput
docker compose up -d
~~~

API backup kế thừa từ code cũ tại `/api/backup/` hiện chỉ là TODO/no-op, không tạo ra bản backup database có thể phục hồi. Không dùng trạng thái “thành công” của endpoint này để xác nhận đã backup. Quy trình phục hồi tin cậy hiện tại là dùng file `.dump` thật trong `backup` cùng script `scripts/restore-local-backup.ps1`.

## Kiểm tra sau khi chạy

Kiểm tra trạng thái container:

~~~powershell
docker compose ps
~~~

Kiểm tra Django và migration:

~~~powershell
docker compose run --rm app poetry run python manage.py check
docker compose run --rm app poetry run python manage.py showmigrations --plan
~~~

Kiểm tra HTTP:

~~~powershell
Invoke-RestMethod http://127.0.0.1:8003/healthcheck/
Invoke-RestMethod http://127.0.0.1:8003/readiness/
~~~

`healthcheck` xác nhận tiến trình web đang sống. `readiness` còn kiểm tra các dependency; nếu trả về lỗi, xem log PostgreSQL/Redis/app trước khi kiểm tra API nghiệp vụ.

Xem log gần nhất hoặc theo dõi realtime:

~~~powershell
docker compose logs --tail 200 app
docker compose logs --tail 200 postgres redis
docker compose logs -f app celery_worker celery_beat
~~~

Mở PostgreSQL để kiểm tra bảng/dữ liệu khi cần:

~~~powershell
docker compose exec postgres psql -U trungtamtrienlam -d trungtamtrienlam
~~~

Thoát `psql` bằng `\q`.

## Cấu hình frontend local

Nếu frontend hiện dùng các tên biến dưới đây, có thể trỏ FE local vào backend v2 như sau:

~~~dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8003/api
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8003/ws
~~~

Đặt chúng trong file env local của frontend, không commit secret. Nếu FE đang dùng tên biến khác, giữ nguyên tên biến hiện tại và chỉ đổi host/port tương ứng sang `127.0.0.1:8003`.

## Chạy bằng compose production

Compose production có project/volume riêng với dev:

- Project: `trungtamtrienlam-backend-v2-prod`
- PostgreSQL volume: `trungtamtrienlam-backend-v2-prod-postgres-data`

Mặc định compose production đọc `.env.local`. Có thể đặt biến `BACKEND_ENV_FILE` trỏ tới file env production được quản lý bên ngoài repo. Kiểm tra kỹ file env trước khi chạy và không đưa giá trị bí mật vào lệnh hoặc tài liệu.

Quy trình khởi tạo production v2:

~~~powershell
docker compose -f .\docker-compose.prod.yml build

powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 -Environment prod -ConfirmDestructive

docker compose -f .\docker-compose.prod.yml run --rm app poetry run python manage.py migrate --noinput

docker compose -f .\docker-compose.prod.yml up -d
~~~

Kiểm tra:

~~~powershell
docker compose -f .\docker-compose.prod.yml ps
docker compose -f .\docker-compose.prod.yml logs --tail 200 app
~~~

Dev và production đều dùng mặc định host port `8003`/`5434`, nên không thể chạy đồng thời với các port mặc định. Khi dừng production cũng không dùng `-v`:

~~~powershell
docker compose -f .\docker-compose.prod.yml down
~~~

## Xử lý lỗi thường gặp

### Port 8003 hoặc 5434 đang được sử dụng

Kiểm tra tiến trình đang lắng nghe:

~~~powershell
Get-NetTCPConnection -State Listen -LocalPort 8003,5434 -ErrorAction SilentlyContinue
~~~

Có thể đổi port cho phiên PowerShell hiện tại rồi recreate stack v2:

~~~powershell
$env:APP_PORT = "8004"
$env:POSTGRES_PORT = "5435"
docker compose up -d
~~~

Khi đổi app port, cập nhật URL API/WebSocket của frontend theo port mới. Nếu chạy restore trong phiên này, script cũng sử dụng port PostgreSQL mới từ compose.

### Docker Desktop chưa sẵn sàng

~~~powershell
docker version
docker compose version
~~~

Nếu không kết nối được Docker Engine, mở Docker Desktop, chờ engine chạy xong rồi mở PowerShell mới.

### App không lên sau restore

Chạy lần lượt:

~~~powershell
docker compose ps
docker compose logs --tail 200 postgres redis app
docker compose run --rm app poetry run python manage.py migrate --noinput
docker compose run --rm app poetry run python manage.py check
docker compose up -d
~~~

Không khắc phục lỗi bằng cách xóa volume. Nếu cần phục hồi lại database v2, chạy lại restore script với đúng dump; script chỉ tạo lại database trong stack v2 đã chọn.
