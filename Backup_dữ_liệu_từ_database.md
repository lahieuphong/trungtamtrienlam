# Backup Dữ Liệu Database

File này hướng dẫn cách giữ lại toàn bộ dữ liệu database khi clone dự án sang máy khác.

## 1. Hiểu Nhanh

GitHub chỉ lưu code, không tự lưu dữ liệu database.

Muốn máy khác có đủ table và record, cần backup:

| Cần backup | File tạo ra | Ý nghĩa |
|---|---|---|
| Database | `backup\trungtamtrienlam_backup.dump` | Giữ toàn bộ table và record |
| Media/upload | `backup\media_backup.zip` | Giữ hình ảnh, file upload, chữ ký, con dấu |

Tên cần nhớ:

| Tên | Nghĩa là gì |
|---|---|
| `pg-trienlam` | Container PostgreSQL trong Docker |
| `trungtamtrienlam_dev` | Tên database thật |

Nói đơn giản:

```text
pg-trienlam = nơi chạy PostgreSQL
trungtamtrienlam_dev = database cần backup
```

## 2. Backup Database

Mở CMD, vào thư mục dự án:

```cmd
cd E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam
```

Kiểm tra container đang chạy:

```cmd
docker ps
```

Cần thấy container tên `pg-trienlam`.

Tạo thư mục backup:

```cmd
mkdir backup
```

Backup database trong container:

```cmd
docker exec pg-trienlam pg_dump -U postgres -d trungtamtrienlam_dev -Fc -f /tmp/trungtamtrienlam_backup.dump
```

Copy file backup ra máy:

```cmd
docker cp pg-trienlam:/tmp/trungtamtrienlam_backup.dump backup\trungtamtrienlam_backup.dump
```

Kiểm tra:

```cmd
dir backup
```

Cần thấy file:

```text
trungtamtrienlam_backup.dump
```

## 3. Backup Media Nếu Có File Upload

Nếu có ảnh, chữ ký, con dấu hoặc file upload, chạy thêm:

```cmd
powershell -Command "Compress-Archive -Path .\trungtamtrienlam-BE\media -DestinationPath .\backup\media_backup.zip -Force"
```

Nếu không có thư mục `media` thì có thể bỏ qua.

## 4. Khi Có Dữ Liệu Mới Thì Backup Lại

Mỗi lần có dữ liệu mới trong hệ thống, chạy lại:

```cmd
cd E:\Phong_Nho_IT\trungtamtrienlam\trungtamtrienlam

docker exec pg-trienlam pg_dump -U postgres -d trungtamtrienlam_dev -Fc -f /tmp/trungtamtrienlam_backup.dump
docker cp pg-trienlam:/tmp/trungtamtrienlam_backup.dump backup\trungtamtrienlam_backup.dump
```

Nếu có upload thêm file, chạy thêm:

```cmd
powershell -Command "Compress-Archive -Path .\trungtamtrienlam-BE\media -DestinationPath .\backup\media_backup.zip -Force"
```

## 5. Restore Sang Máy Khác

Sau khi clone code về máy khác, copy thư mục `backup` vào dự án.

Tạo database rỗng:

```cmd
docker exec pg-trienlam createdb -U postgres trungtamtrienlam_dev
```

Copy file backup vào container:

```cmd
docker cp backup\trungtamtrienlam_backup.dump pg-trienlam:/tmp/trungtamtrienlam_backup.dump
```

Restore database:

```cmd
docker exec pg-trienlam pg_restore -U postgres -d trungtamtrienlam_dev --clean --if-exists /tmp/trungtamtrienlam_backup.dump
```

Nếu có `media_backup.zip`, giải nén:

```cmd
powershell -Command "Expand-Archive -Path .\backup\media_backup.zip -DestinationPath .\trungtamtrienlam-BE -Force"
```

## 6. Không Nên Push Các File Này Lên GitHub Public

Không nên push:

```text
backup\trungtamtrienlam_backup.dump
backup\media_backup.zip
trungtamtrienlam-BE\.env
```

Vì các file này có thể chứa dữ liệu thật, tài khoản, email hoặc file nội bộ.

## 7. Lỗi Thường Gặp

Nếu không có container `pg-trienlam`, kiểm tra tên container bằng:

```cmd
docker ps
```

Nếu database chưa tồn tại, tạo bằng:

```cmd
docker exec pg-trienlam createdb -U postgres trungtamtrienlam_dev
```

Nếu không thấy file backup, chạy lại:

```cmd
docker cp pg-trienlam:/tmp/trungtamtrienlam_backup.dump backup\trungtamtrienlam_backup.dump
```
