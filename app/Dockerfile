# Image Node.js nhẹ (Alpine), chỉ định rõ phiên bản LTS
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Copy package*.json trước để tận dụng layer cache khi chỉ sửa code
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node src ./src

# Hardening: chạy bằng user "node" (không phải root)
USER node

EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1

CMD ["node", "src/server.js"]
