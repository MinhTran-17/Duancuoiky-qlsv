# Đề 2 – Hệ thống Quản lý Sinh viên

Môn: **Triển khai và Quản trị Hệ thống Phần mềm**
Sinh viên: Trần Vũ Minh – MSSV: `<điền MSSV>` – Lớp: `<điền lớp>`

Website quản lý sinh viên (CRUD **lớp, sinh viên, môn học, điểm số**), triển khai toàn bộ bằng **Docker Compose**.

## Kiến trúc

```
Trình duyệt ──HTTP :80──> Nginx (chuyển hướng HTTPS)
            ──HTTPS :443─> Nginx ──/──────> app (Node.js/Express :3000) ──> MySQL 8.4
                                  └─/pma/──> phpMyAdmin ─────────────────────┘
```

| Service | Image | Vai trò | Network |
|---|---|---|---|
| nginx | nginx-unprivileged 1.27 (build) | Reverse proxy, HTTPS tự ký, security headers | frontend |
| app | node:22-alpine (build) | Web quản lý sinh viên | frontend, backend |
| mysql | mysql:8.4 | Cơ sở dữ liệu | backend |
| phpmyadmin | phpmyadmin:5.2 | Công cụ quản lý DB | frontend, backend |

- **frontend**: Nginx ↔ app, phpMyAdmin
- **backend** (`internal: true`): app, phpMyAdmin ↔ MySQL – không ra Internet, MySQL không public cổng 3306
- Chỉ Nginx mở cổng ra ngoài (80, 443)

## Cấu trúc thư mục

```
.
├── docker-compose.yml
├── .env.example          # mẫu biến môi trường (copy thành .env)
├── app/                  # web app Node.js/Express
│   ├── Dockerfile
│   └── src/ (server.js, db.js, resources.js, views/, public/)
├── mysql/init/
│   ├── 01_schema.sql     # tạo bảng + dữ liệu mẫu
│   └── 02_app_user.sh    # tạo user ứng dụng quyền hạn chế
└── nginx/
    ├── Dockerfile        # tạo chứng chỉ self-signed bằng OpenSSL
    ├── default.conf      # reverse proxy + HTTPS
    └── snippets/         # security headers, proxy headers
```

## Yêu cầu

- Docker Desktop (Windows/macOS) hoặc Docker Engine + Compose V2 (Linux)
- Cổng 80 và 443 trên máy còn trống

## Cách chạy

```bash
# 1. Tạo file .env từ mẫu, sau đó mở .env và đổi mật khẩu
cp .env.example .env            # Windows PowerShell: copy .env.example .env

# 2. Kiểm tra cấu hình
docker compose config -q

# 3. Build và khởi động
docker compose up -d --build

# 4. Xem trạng thái (chờ mysql, app ở trạng thái healthy)
docker compose ps
```

Truy cập:

| Địa chỉ | Nội dung |
|---|---|
| https://localhost | Website quản lý sinh viên (chứng chỉ tự ký → Advanced → Proceed) |
| https://localhost/pma/ | phpMyAdmin (đăng nhập `root` hoặc user ứng dụng trong `.env`) |
| http://localhost | Tự chuyển hướng sang HTTPS |

## Kiểm tra / minh chứng

```bash
# Log
docker compose logs -f app
docker compose logs mysql

# HTTPS + security headers
curl -kI https://localhost
curl -I  http://localhost          # 301 -> https

# Container không chạy root
docker compose exec app id         # uid=1000(node)
docker compose exec nginx id       # uid=101(nginx)

# Quyền hạn chế của user ứng dụng
docker compose exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SHOW GRANTS FOR \"$APP_DB_USER\"@\"%\";"'

# Network isolation
docker network ls
docker network inspect qlsv_backend
```

## Hardening đã áp dụng

1. **Non-root container**: app chạy user `node`, Nginx dùng bản unprivileged (user `nginx`)
2. **Network isolation**: tách `frontend` / `backend`, backend là mạng `internal`, MySQL không public cổng
3. **Least privilege DB**: app dùng user `qlsv_app` chỉ có `SELECT, INSERT, UPDATE, DELETE` trên DB `qlsv`
4. **Mật khẩu mạnh + bí mật trong `.env`** (không commit, đã có trong `.gitignore`)
5. **Nginx**: HTTPS (TLS 1.2/1.3), chuyển hướng HTTP→HTTPS, `server_tokens off`, security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), rate limiting
6. **Container**: `read_only` filesystem, `cap_drop: ALL`, `no-new-privileges` (app, nginx)
7. **Ứng dụng**: parameterized query (chống SQL Injection), escape output (chống XSS), ẩn header `X-Powered-By`, không trả stack trace

## Dừng hệ thống

```bash
docker compose down        # dừng, giữ dữ liệu
docker compose down -v     # dừng và XÓA dữ liệu MySQL (chạy lại init.sql từ đầu)
```

> Lưu ý: script trong `mysql/init/` chỉ chạy **lần đầu** khi volume MySQL còn trống. Sửa file SQL xong phải `docker compose down -v` rồi `up` lại.
