# Hướng dẫn chạy dự án

## 1. Chạy trên Windows

Trong Docker Desktop đang có 2 container:

- `pg-trienlam`: PostgreSQL, port `5432`
- `redis-trienlam`: Redis, port `6379`

Nhưng nếu thấy nút tam giác **Play** thì có khả năng container đang **tắt**. Bật lại bằng:

```powershell
docker start pg-trienlam redis-trienlam
```

Sau đó kiểm tra:

```powershell
docker ps
```

Nếu thấy `pg-trienlam` và `redis-trienlam` trong danh sách là ok.

Tiếp theo chạy Backend:

```powershell
cd E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam
.\start-be.bat
```

Hoặc chạy thủ công trong thư mục Backend:

```powershell
cd E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-BE
.\venv\Scripts\activate
python manage.py migrate
python -m uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload
```

Lưu ý: chat realtime dùng WebSocket ở `ws://localhost:8000/ws/chat/`, vì vậy không dùng `python manage.py runserver` cho backend khi test chat.

Rồi chạy Frontend ở PowerShell khác:

```powershell
cd E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-FE
Copy-Item .env.example .env.local
yarn dev
```

Mở:

```text
http://localhost:3000
```

Nếu `python manage.py migrate` báo lỗi database không tồn tại, tạo database trong container `pg-trienlam`:

```powershell
docker exec -it pg-trienlam psql -U postgres -c "CREATE DATABASE trungtamtrienlam_dev;"
```

Sau đó chạy lại:

```powershell
python manage.py migrate
```

## 2. Chạy trên macOS

### 2.1. Bật Docker

Nếu container đã có sẵn trong Docker Desktop, bật PostgreSQL và Redis:

```bash
docker start pg-trienlam redis-trienlam
docker ps
```

Cần thấy:

```text
pg-trienlam
redis-trienlam
```

Nếu chưa có container PostgreSQL:

```bash
docker run -d --name pg-trienlam \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=trungtamtrienlam_dev \
  -p 5432:5432 \
  -v pg-trienlam-data:/var/lib/postgresql/data \
  postgres:16
```

Nếu port `6379` chưa bị chiếm, tạo Redis Docker như này:

```bash
docker run -d --name redis-trienlam \
  -p 6379:6379 \
  -v redis-trienlam-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

Nếu macOS báo lỗi `address already in use` ở port `6379`, nghĩa là máy đang có Redis khác chạy sẵn. Khi đó tạo Redis Docker bằng port ngoài `6380`:

```bash
docker run -d --name redis-trienlam \
  -p 6380:6379 \
  -v redis-trienlam-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

Với trường hợp dùng port `6380`, sửa file `trungtamtrienlam-BE/.env`:

```env
REDIS_URL=redis://localhost:6380/0
CELERY_BROKER_URL=redis://localhost:6380/1
CELERY_RESULT_BACKEND=redis://localhost:6380/2
```

Nếu Redis Docker dùng đúng port `6379`, giữ cấu hình:

```env
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

### 2.2. Chạy Backend trên macOS

Vào thư mục Backend:

```bash
cd /Users/lahieuphong/Downloads/Phong_Nho_IT/trungtamtrienlam/trungtamtrienlam-BE
```

Tạo môi trường Python nếu chưa có:

```bash
python3.12 -m venv venv
```

Kích hoạt môi trường Python trên macOS:

```bash
source venv/bin/activate
```

Lưu ý:

```text
Windows: .\venv\Scripts\activate
macOS:   source venv/bin/activate
```

Cài thư viện nếu chưa cài:

```bash
pip install -r requirements.txt
```

Chạy migrate và seed menu:

```bash
python manage.py migrate
python manage.py seed_menu
```

Chạy Backend:

```bash
python -m uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload
```

Backend sẽ chạy tại:

```text
http://localhost:8000
```

### 2.3. Chạy Frontend trên macOS

Mở terminal khác, vào thư mục Frontend:

```bash
cd /Users/lahieuphong/Downloads/Phong_Nho_IT/trungtamtrienlam/trungtamtrienlam-FE
```

Tạo file môi trường nếu chưa có:

```bash
cp .env.example .env.local
```

Cài thư viện nếu chưa cài:

```bash
yarn install
```

Chạy Frontend:

```bash
yarn dev
```

Mở:

```text
http://localhost:3000
```
