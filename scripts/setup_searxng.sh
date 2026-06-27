#!/bin/bash
# scripts/setup_searxng.sh — Cài đặt SearXNG trên VPS
# Chạy: bash scripts/setup_searxng.sh

set -e

echo "=== Cài đặt SearXNG ==="

# 1. Kiểm tra Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker chưa được cài đặt. Cài đặt Docker trước..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "✅ Docker đã được cài đặt. Logout và login lại để áp dụng group."
  exit 0
fi

# 2. Tạo thư mục cho SearXNG
mkdir -p ~/searxng
cd ~/searxng

# 3. Tạo docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./searxng-data:/etc/searxng
    environment:
      - SEARXNG_BASE_URL=http://localhost:8080
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
EOF

# 4. Khởi động SearXNG
echo "🚀 Khởi động SearXNG..."
docker compose up -d

# 5. Kiểm tra
echo "⏳ Chờ SearXNG khởi động (10s)..."
sleep 10

if curl -s http://localhost:8080/search?q=test&format=json | head -c 100 | grep -q "results"; then
  echo "✅ SearXNG hoạt động! Truy cập: http://localhost:8080"
  echo "📝 API endpoint: http://localhost:8080/search?q=<query>&format=json"
else
  echo "⚠️ SearXNG có thể chưa sẵn sàng. Kiểm tra: docker logs searxng"
fi

echo ""
echo "=== Cấu hình tối ưu cho VPS 2GB ==="
echo "Bạn có thể chỉnh sửa file ~/searxng/searxng-data/settings.yml"
echo "để thêm các search engine mong muốn."
echo ""
echo "=== Hoàn tất ==="
