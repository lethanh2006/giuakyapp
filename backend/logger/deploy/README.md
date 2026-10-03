# Deploy backend lên VPS

Các repo service giữ code ứng dụng. Logger giữ package log, reusable CI/CD,
Dockerfile và receiver. `backend/` ở máy phát triển là thư mục tập hợp nhiều
repo, không phải một repo Git; Compose ứng dụng trên VPS được quản lý riêng
tại `/opt/nrapp/backend`.

Kiểm tra trực tiếp ngày 2026-09-21: VPS chạy Gateway, Auth, User, Mail, Chat,
Todo, Workschedule, Canteen; Redis và RabbitMQ phục vụ các ứng dụng này.
Prometheus, Grafana, node-exporter theo dõi tài nguyên máy. MongoDB nằm ngoài
Compose. Payment và PostgreSQL Payment ở profile `payment-later`, chưa chạy.

Giữ middleware request ID, JSON log, lọc lỗi, JWT/chữ ký gateway, kiểm tra role,
healthcheck, outbox và retry: đây là phần ứng dụng đang dùng. OpenTelemetry,
Loki, Alloy, Alertmanager và collector không thuộc stack đang chạy; không cần
cài chúng để dùng package `@nrapp/observability` hiện tại.

## Thứ tự phát hành

1. Test và push Logger, lấy full SHA của commit.
2. Kiểm tra Compose VPS khởi động app bằng `command: ["node", "dist/main.js"]`.
   Bỏ preload `--require @nrapp/observability/register` trước khi deploy image
   dùng package log mới. Các biến `OTEL_*` cũ không còn được dùng.
3. Ghim cả reusable workflow `uses:` và `platform-ref` trong CI/CD của service
   vào cùng SHA Logger. Test, commit và push service.
4. CI kiểm tra dependency, lint, format, test và build. CD build image từ đúng
   SHA đã qua CI, truyền qua SSH; receiver chờ healthy và rollback khi thất bại.

Không dùng lệnh `docker compose down -v` để cập nhật. Không cần xóa database,
volume hay mã Payment để tắt deployment Payment. Monitoring giữ project
`nrapp-monitoring-minimal` để dùng đúng các volume hiện có trên VPS.

Kiểm tra chỉ đọc trên VPS:

```bash
/home/deploy/bin/dc --profile app config --quiet
docker ps --format '{{.Names}}\t{{.Status}}'
docker stats --no-stream
```
