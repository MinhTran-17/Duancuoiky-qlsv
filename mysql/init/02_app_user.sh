#!/bin/bash
# Tạo user riêng cho ứng dụng theo nguyên tắc Least Privilege:
# chỉ được SELECT/INSERT/UPDATE/DELETE trên đúng database của ứng dụng,
# KHÔNG được DROP, ALTER, CREATE, GRANT...
set -e

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOSQL
CREATE USER IF NOT EXISTS '${APP_DB_USER}'@'%' IDENTIFIED BY '${APP_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE}\`.* TO '${APP_DB_USER}'@'%';
FLUSH PRIVILEGES;
EOSQL

echo "[init] Da tao user ung dung '${APP_DB_USER}' voi quyen han che"
