# Trung Tâm Triển Lãm

Hệ thống quản lý trung tâm triển lãm gồm backend Django và frontend Next.js.

## Cấu trúc dự án

```
trungtamtrienlam/
├── trungtamtrienlam-BE/   # Django REST Framework
└── trungtamtrienlam-FE/   # Next.js 15
```

## Backend (Django)

**Yêu cầu:** Python 3.11+, PostgreSQL, Redis

```bash
cd trungtamtrienlam-BE
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # cấu hình biến môi trường
python manage.py migrate
python manage.py runserver
```

**Các module chính:** accounts, authentication, departments, tasks, documents, archives, calendars, chats, notifications, ratings, media_files

## Frontend (Next.js)

**Yêu cầu:** Node.js 18+, Yarn

```bash
cd trungtamtrienlam-FE
yarn install
cp .env.example .env.local   # cấu hình biến môi trường
yarn dev
```

Truy cập tại `http://localhost:3000`

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Django 5, DRF, Celery, Channels (WebSocket) |
| Frontend | Next.js 15, React 19, Tailwind CSS, Radix UI |
| Database | PostgreSQL |
| Cache / Queue | Redis |
Sở Văn hóa và Thể thao TPHCM - Trung tâm Thông tin Triển Lãm