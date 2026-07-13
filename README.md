# Trung tâm triển lãm

Repository local gồm frontend Next.js và backend Django/Celery. Backend đang sử dụng chính thức là `trungtamtrienlam-BE-v2`, giữ cấu trúc chuẩn đã lấy từ production và chạy bằng Docker Compose.

> Không sử dụng lại thư mục, container, virtual environment hoặc lệnh chạy của `trungtamtrienlam-BE` cũ.

## Cấu trúc hiện tại

```text
trungtamtrienlam/
├── trungtamtrienlam-BE-v2/        # Backend hiện tại
├── trungtamtrienlam-FE/           # Frontend hiện tại
├── backup/                        # Database/media backup local
├── start-be.bat                   # Khởi động backend trên Windows
├── Backup_dữ_liệu_từ_database.md # Hướng dẫn backup và restore
└── README.md
```

Thư mục `backup/` và các file `.env.local` được Git bỏ qua. Không đưa database dump, media thật, mật khẩu hoặc secret lên repository public.

## Yêu cầu

- Docker Desktop đang chạy và có Docker Compose v2.
- PowerShell 5.1 trở lên trên Windows.
- Node.js và Yarn 1.22.x để chạy frontend.
- Backend có file `trungtamtrienlam-BE-v2/.env.local` hợp lệ.
- Frontend có file `trungtamtrienlam-FE/.env.local` hợp lệ.

## Địa chỉ local

| Thành phần | Địa chỉ |
| --- | --- |
| Frontend | <http://localhost:3000> |
| Backend | <http://localhost:8003> |
| API đăng nhập | `POST http://localhost:8003/api/auth/login/` |
| Django Admin | <http://localhost:8003/admin/> |
| Healthcheck | <http://localhost:8003/healthcheck/> |
| Readiness | <http://localhost:8003/readiness/> |
| WebSocket chat | `ws://localhost:8003/ws/chat/` |
| PostgreSQL từ máy host | `127.0.0.1:5434` |

Redis chỉ hoạt động trong mạng Docker và không mở cổng ra máy host.

## Khởi động nhanh trên Windows

Mở PowerShell tại thư mục chứa file README này.

### 1. Khởi động backend

Lần đầu chạy, hoặc sau khi thay đổi dependency/Dockerfile:

```powershell
.\start-be.bat --build
```

Các lần chạy bình thường:

```powershell
.\start-be.bat
```

Script sẽ:

1. Kiểm tra Docker, Docker Compose và `.env.local`.
2. Khởi động PostgreSQL và Redis.
3. Chạy Django migration an toàn.
4. Khởi động API, Celery Worker và Celery Beat.
5. Chờ endpoint readiness tối đa 60 giây.

Script không tự restore backup, không drop database và không xóa Docker volume. Có thể thêm `--no-pause` khi chạy từ terminal hoặc automation:

```powershell
.\start-be.bat --no-pause
```

### 2. Khởi động frontend

Mở một cửa sổ PowerShell khác:

```powershell
Set-Location .\trungtamtrienlam-FE

if (-not (Test-Path .\.env.local)) {
  Copy-Item .\.env.example .\.env.local
}

yarn install --frozen-lockfile
yarn dev
```

Ba cấu hình local quan trọng của frontend là:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8003/api
NEXT_PUBLIC_WS_URL=ws://localhost:8003/ws
NEXT_PUBLIC_CDN_URL=http://localhost:8003
```

Sau khi sửa `.env.local`, hãy dừng và chạy lại `yarn dev`. Mở <http://localhost:3000> khi frontend báo sẵn sàng.

### 3. Kiểm tra hệ thống

```powershell
Invoke-RestMethod http://localhost:8003/healthcheck/
Invoke-RestMethod http://localhost:8003/readiness/
```

Kết quả readiness hợp lệ phải cho biết database và Redis đều có trạng thái `ok`.

## Khôi phục dữ liệu trên máy mới

Chỉ restore khi khởi tạo máy mới hoặc chủ động phục hồi dữ liệu. Không chạy restore trong mỗi lần khởi động.

```powershell
Set-Location .\trungtamtrienlam-BE-v2

docker compose build

powershell -ExecutionPolicy Bypass -File .\scripts\restore-local-backup.ps1 `
  -Environment dev `
  -ConfirmDestructive

Set-Location ..
.\start-be.bat
```

Script restore chọn file `.dump` mới nhất trong thư mục `backup/`. Tham số `-ConfirmDestructive` cho phép drop và tạo lại database của riêng stack BE-v2 trước khi nạp dump; hãy tạo backup mới nếu database hiện tại có dữ liệu quan trọng.

Database dump không chứa media. Media đang sử dụng nằm trong `trungtamtrienlam-BE-v2/app/media` và phải được backup riêng. Xem hướng dẫn đầy đủ tại [Backup dữ liệu từ database](./Backup_dữ_liệu_từ_database.md).

## Đăng nhập

Frontend gửi thông tin đăng nhập tới:

```text
POST /api/auth/login/
```

Payload sử dụng `username` và `password`. Repository không lưu mật khẩu mặc định; tài khoản được lấy từ database đã restore.

Nếu quên mật khẩu của tài khoản `admin`, có thể đặt lại trực tiếp trong backend:

```powershell
Set-Location .\trungtamtrienlam-BE-v2
docker compose exec app poetry run python manage.py changepassword admin
```

Nếu frontend vẫn báo sai tài khoản hoặc mật khẩu:

1. Kiểm tra readiness có trả về `ready` hay không.
2. Kiểm tra `.env.local` của frontend đang trỏ tới cổng `8003`.
3. Khởi động lại `yarn dev` sau khi sửa biến môi trường.
4. Xác nhận tài khoản tồn tại, đang active và mật khẩu đúng trong database hiện tại.

## Quản lý backend hằng ngày

Chạy các lệnh sau trong `trungtamtrienlam-BE-v2`:

```powershell
# Xem trạng thái
docker compose ps

# Xem log gần nhất
docker compose logs --tail 200 app postgres redis celery_worker celery_beat

# Theo dõi log realtime
docker compose logs -f app celery_worker celery_beat

# Dừng tạm thời, giữ nguyên container và dữ liệu
docker compose stop

# Gỡ container/network nhưng vẫn giữ volume dữ liệu
docker compose down
```

> Tuyệt đối không chạy `docker compose down -v`. Tùy chọn `-v` sẽ xóa PostgreSQL volume và làm mất database local.

Stack development hiện dùng:

- Compose project: `trungtamtrienlam-backend-v2-dev`
- PostgreSQL volume: `trungtamtrienlam-backend-v2-dev-postgres-data`
- Các service: `app`, `postgres`, `redis`, `celery_worker`, `celery_beat`

## Chạy trên macOS hoặc Linux

`start-be.bat` chỉ dành cho Windows. Trên macOS/Linux, dùng Docker Compose trực tiếp:

```bash
cd trungtamtrienlam-BE-v2

docker compose build
docker compose run --rm app poetry run python manage.py migrate --noinput
docker compose up -d --wait
```

Chạy frontend ở terminal khác:

```bash
cd trungtamtrienlam-FE

[ -f .env.local ] || cp .env.example .env.local
yarn install --frozen-lockfile
yarn dev
```

Không tạo các container PostgreSQL/Redis rời bên ngoài Compose của BE-v2.

## Tài liệu chi tiết

- [Backend v2](./trungtamtrienlam-BE-v2/README.md)
- [Backup và khôi phục dữ liệu](./Backup_dữ_liệu_từ_database.md)
