# Đề 2 – Hệ thống Quản lý Sinh viên

Môn: **Triển khai và Quản trị Hệ thống Phần mềm**
Sinh viên: Trần Vũ Minh – MSSV: `<điền MSSV>` – Lớp: `<điền lớp>`

Website quản lý sinh viên (CRUD **lớp, sinh viên, môn học, điểm số**), triển khai toàn bộ bằng **Docker Compose**.

| Commit | Nội dung |
|---|---|
| 1 | Web app + MySQL + phpMyAdmin + Nginx reverse proxy (HTTPS tự ký, security headers) |
| 2 | Giám sát: Prometheus + Grafana, cAdvisor (container), nginx-exporter (web server), mysqld-exporter (DB), node-exporter (máy chủ) |

## Kiến trúc

```
Trình duyệt ──HTTP :80──> Nginx (chuyển hướng HTTPS)
            ──HTTPS :443─> Nginx ──/──────────> app (Node.js/Express :3000) ──> MySQL 8.4
                                  ├─/pma/──────> phpMyAdmin ─────────────────────┘
                                  └─/grafana/──> Grafana ──> Prometheus
                                                                 │ (pull mỗi 15s)
                     cAdvisor · node-exporter · nginx-exporter · mysqld-exporter · app/metrics
```

| Service | Image | Vai trò | Network |
|---|---|---|---|
| nginx | nginx-unprivileged 1.27 (build) | Reverse proxy, HTTPS tự ký, security headers | frontend |
| app | node:22-alpine (build) | Web quản lý sinh viên | frontend, backend |
| mysql | mysql:8.4 | Cơ sở dữ liệu | backend |
| phpmyadmin | phpmyadmin:5.2 | Công cụ quản lý DB | frontend, backend |
| prometheus | prom/prometheus:v3.5.0 | Thu thập, lưu metrics, alert rules | monitoring |
| grafana | grafana/grafana:11.6.0 | Dashboard giám sát | frontend, monitoring |
| cadvisor | cadvisor:v0.49.1 | Metrics container | monitoring |
| node-exporter | prom/node-exporter:v1.9.1 | Metrics máy chủ | monitoring |
| nginx-exporter | nginx-prometheus-exporter:1.4.2 | Metrics Nginx (stub_status) | frontend, monitoring |
| mysqld-exporter | prom/mysqld-exporter:v0.17.2 | Metrics MySQL | backend, monitoring |

- **frontend**: Nginx ↔ app, phpMyAdmin
- **backend** (`internal: true`): app, phpMyAdmin, mysqld-exporter ↔ MySQL – không ra Internet, MySQL không public cổng 3306
- **monitoring**: Prometheus, Grafana, các exporter, app (`/metrics`)
- Chỉ Nginx mở cổng ra ngoài (80, 443). Prometheus chỉ mở `127.0.0.1:9090` (chỉ truy cập được từ chính máy chạy)

## Cấu trúc thư mục

```
.
├── docker-compose.yml
├── .env.example          # mẫu biến môi trường (copy thành .env)
├── app/                  # web app Node.js/Express
│   ├── Dockerfile
│   └── src/ (server.js, db.js, resources.js, views/, public/)
├── mysql/init/
│   ├── 01_schema.sql         # tạo bảng + dữ liệu mẫu
│   ├── 02_app_user.sh        # tạo user ứng dụng quyền hạn chế
│   └── 03_exporter_user.sh   # tạo user chỉ-đọc-trạng-thái cho mysqld-exporter
├── monitoring/
│   ├── prometheus/ (prometheus.yml, alerts.yml)
│   └── grafana/ (provisioning/, dashboards/qlsv-overview.json)
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
| https://localhost/grafana/ | Grafana – dashboard **QLSV – Giám sát hệ thống** (tài khoản trong `.env`) |
| http://localhost:9090 | Prometheus (Status → Targets, Alerts) – chỉ mở trên máy local |

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

## Giám sát (Prometheus + Grafana)

| Đối tượng | Exporter | Metric tiêu biểu |
|---|---|---|
| Container | cAdvisor | `container_cpu_usage_seconds_total`, `container_memory_usage_bytes` |
| Web server | nginx-exporter, app (prom-client) | `nginx_http_requests_total`, `nginx_connections_active`, `http_requests_total`, `http_request_duration_seconds` |
| Database | mysqld-exporter | `mysql_up`, `mysql_global_status_threads_connected`, `mysql_global_status_queries` |
| Máy chủ | node-exporter | `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes` |

Dashboard được provisioning tự động (Data Source + JSON), gồm các nhóm: Tổng quan · Container · Web server · Database · Máy chủ.
Alert rules (`monitoring/prometheus/alerts.yml`): `TargetDown`, `MySQLDown`, `HighHttp5xxRate`, `ContainerHighMemory`.

Một số PromQL để demo:

```promql
up
sum by (name) (rate(container_cpu_usage_seconds_total{name=~"qlsv-.+"}[1m])) * 100
sum by (status) (rate(http_requests_total[1m]))
mysql_global_status_threads_connected
```

## Hardening đã áp dụng

1. **Non-root container**: app chạy user `node`, Nginx dùng bản unprivileged (user `nginx`)
2. **Network isolation**: tách `frontend` / `backend`, backend là mạng `internal`, MySQL không public cổng
3. **Least privilege DB**: app dùng user `qlsv_app` chỉ có `SELECT, INSERT, UPDATE, DELETE` trên DB `qlsv`
4. **Mật khẩu mạnh + bí mật trong `.env`** (không commit, đã có trong `.gitignore`)
5. **Nginx**: HTTPS (TLS 1.2/1.3), chuyển hướng HTTP→HTTPS, `server_tokens off`, security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), rate limiting
6. **Container**: `read_only` filesystem, `cap_drop: ALL`, `no-new-privileges` (app, nginx)
7. **Ứng dụng**: parameterized query (chống SQL Injection), escape output (chống XSS), ẩn header `X-Powered-By`, không trả stack trace
8. **Giám sát an toàn**: Grafana chỉ truy cập qua Nginx HTTPS, tắt đăng ký và anonymous; Prometheus chỉ bind `127.0.0.1`; `/metrics` của app bị Nginx chặn từ bên ngoài; `stub_status` chỉ cho IP nội bộ; user `exporter` của MySQL chỉ có quyền `PROCESS, REPLICATION CLIENT` và đọc `performance_schema`, tối đa 3 kết nối

## Dừng hệ thống

```bash
docker compose down        # dừng, giữ dữ liệu
docker compose down -v     # dừng và XÓA dữ liệu MySQL (chạy lại init.sql từ đầu)
```

> Lưu ý: script trong `mysql/init/` chỉ chạy **lần đầu** khi volume MySQL còn trống. Sửa file SQL xong phải `docker compose down -v` rồi `up` lại.
