# Trung tâm Triển lãm Backend

Backend Django hiện tại được giữ nguyên cấu trúc `apps/`, API, model và luồng
nghiệp vụ. Các phần bổ sung trong đợt chuẩn hóa này chỉ bao quanh ứng dụng để
có thể kiểm thử và triển khai ổn định trên Linux.

## Thành phần vận hành

- Django ASGI chạy bằng Uvicorn.
- PostgreSQL, Redis, Celery worker và Celery Beat.
- Nginx làm reverse proxy và phục vụ static/media theo URL hiện tại.
- Liveness tại `/healthcheck/` và readiness tại `/readiness/`.
- Smoke test không cần dịch vụ ngoài và test nghiệp vụ trên PostgreSQL.

## Phát triển và kiểm tra

Tạo `.env` từ `.env.example`, cài dependency rồi chạy các kiểm tra:

```sh
python -m pip install -r requirements-dev.txt
python manage.py check --settings=config.settings.test
python manage.py makemigrations --check --dry-run --settings=config.settings.test
python -m pytest
```

## Chạy toàn bộ backend bằng Docker trên Windows

Docker Compose mặc định đọc `.env` hiện tại nhưng tự đổi kết nối nội bộ sang
`postgres` và `redis`; vì vậy không cần sửa `.env` từ `localhost`.

```cmd
docker-local-up.cmd
```

Lần chạy đầu, web chờ PostgreSQL/Redis, áp dụng migration rồi mới cho
Celery Worker/Beat khởi động. Dừng an toàn và giữ nguyên named volume:

```cmd
docker-local-down.cmd
```

Không dùng `docker compose down -v` nếu chưa chủ động sao lưu dữ liệu.

Các test nghiệp vụ cũ cần PostgreSQL vì migration hiện tại có SQL dành riêng
cho PostgreSQL. CI chạy bộ này với `config.settings.test_postgres`.

## Triển khai Linux

Hướng dẫn đầy đủ nằm tại [`deploy/README.md`](deploy/README.md). Trước mỗi lần
triển khai cần sao lưu database/media, tạo `deploy/.env.production` từ file mẫu,
kiểm tra Compose và duyệt migration. Entrypoint không tự chạy migration hoặc
collectstatic nếu chưa bật rõ `RUN_MIGRATIONS`/`RUN_COLLECTSTATIC`.

Các file `.env`, media hiện có, secret, certificate và cấu hình cloud riêng của
backend tham chiếu không được đóng gói vào image hoặc sao chép sang dự án này.
