#!/bin/bash
# User riêng cho mysqld-exporter (giám sát DB) – chỉ có quyền đọc thông tin trạng thái,
# KHÔNG đọc được dữ liệu sinh viên. Giới hạn tối đa 3 kết nối.
set -e

mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOSQL
CREATE USER IF NOT EXISTS 'exporter'@'%' IDENTIFIED BY '${EXPORTER_DB_PASSWORD}' WITH MAX_USER_CONNECTIONS 3;
GRANT PROCESS, REPLICATION CLIENT ON *.* TO 'exporter'@'%';
GRANT SELECT ON performance_schema.* TO 'exporter'@'%';
FLUSH PRIVILEGES;
EOSQL

echo "[init] Da tao user 'exporter' cho mysqld-exporter"
