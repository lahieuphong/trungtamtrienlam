# Triển khai Linux bằng Docker Compose

Bộ file này chỉ đóng gói backend hiện tại; không thay đổi route, model hay luồng nghiệp vụ. Web chạy ASGI bằng Uvicorn ở cổng container `8000`, PostgreSQL và Redis nằm trong mạng nội bộ, còn Nginx là điểm vào HTTP ở production.

## Chuẩn bị

Chạy từ thư mục `trungtamtrienlam-BE`:

```sh
cp deploy/env.production.example deploy/.env.production
```

Đổi toàn bộ giá trị `CHANGE_ME`, rồi cấu hình `ALLOWED_HOSTS`, CORS, CSRF và
các biến CDN, OnlyOffice, Web Push, email đang được môi trường hiện tại sử dụng.
Thiếu các biến tích hợp này có thể làm thay đổi hành vi dù code không đổi.
Không commit `deploy/.env.production`.

Kiểm tra cấu hình trước khi chạy:

```sh
docker compose --env-file deploy/.env.production \
  -f docker-compose.yml -f docker-compose.prod.yml config
```

Migration và collectstatic **không tự chạy**. Khi đã sao lưu và chủ động duyệt migration, chạy một job một lần:

```sh
docker compose --env-file deploy/.env.production \
  -f docker-compose.yml -f docker-compose.prod.yml \
  run --rm -e RUN_MIGRATIONS=true -e RUN_COLLECTSTATIC=true web /bin/true
```

Khởi động hoặc cập nhật dịch vụ:

```sh
docker compose --env-file deploy/.env.production \
  -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Web vẫn có thể được kiểm tra nội bộ tại `127.0.0.1:8000`; Nginx lắng nghe `HTTP_PORT` (mặc định `80`). TLS, tên miền và chứng chỉ nên được cấu hình ở reverse proxy/load balancer của máy chủ, không nằm trong repo.

## Lưu ý vận hành

- `media`, `staticfiles`, PostgreSQL, Redis và lịch Celery dùng named volume để tồn tại qua lần dựng lại container.
- Image không chứa `.env` hoặc media đang có trong repo. Cần sao lưu và chuyển
  media hiện tại vào volume/storage đích bằng quy trình vận hành riêng.
- Nếu tiếp tục dùng database bên ngoài hiện tại, đặt `DB_HOST`, `DB_PORT` và
  thông tin đăng nhập tương ứng; không chạy migration trước khi đã sao lưu và
  kiểm tra trên bản sao database.
- Nginx phục vụ `/media/` trực tiếp để giữ URL media hiện tại. Cần rà soát riêng chính sách truy cập nếu có file riêng tư.
- Worker/Beat dùng `celery -A config`; backend phải có Celery app bootstrap và task schedule hợp lệ trước khi bật hai dịch vụ này.
- `requirements.txt` hiện chưa có lock/hash đầy đủ, nên nên kiểm thử image đã build trước khi đưa lên production.
