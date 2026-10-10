# Nginx bản "unprivileged": tiến trình chạy bằng user nginx (UID 101), không phải root.
# Vì không có quyền root nên Nginx lắng nghe cổng 8080/8443 trong container,
# docker-compose ánh xạ ra cổng 80/443 của máy host.
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
# Tạo chứng chỉ SSL tự ký (self-signed) bằng OpenSSL – dùng cho môi trường lab
RUN apk add --no-cache openssl \
 && mkdir -p /etc/nginx/certs \
 && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/server.key \
      -out /etc/nginx/certs/server.crt \
      -subj "/C=VN/ST=ThaiNguyen/O=ICTU/OU=TKQT-HTPM/CN=localhost" \
      -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
 && chown -R nginx:nginx /etc/nginx/certs \
 && chmod 600 /etc/nginx/certs/server.key \
 && apk del openssl

COPY default.conf /etc/nginx/conf.d/default.conf
COPY snippets/ /etc/nginx/snippets/

USER nginx
