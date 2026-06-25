# Hướng dẫn chạy dự án

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
cd E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam\trungtamtrienlam-BE
.\venv\Scripts\activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

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
