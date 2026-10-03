# Giám sát và log backend

Repository này chỉ giữ hai phần dùng chung đã triển khai trên VPS:

- Prometheus, Grafana và node_exporter để theo dõi CPU, RAM, dung lượng đĩa;
- package Pino dùng chung để ghi log JSON kèm `request_id`.

Prometheus lấy mẫu mỗi 60 giây. Grafana tự nạp datasource Prometheus và dashboard
`VPS / Tài nguyên VPS` gồm ba biểu đồ CPU, RAM và dung lượng đĩa đã dùng.

## Khởi động giám sát

```bash
cp .env.example .env
docker compose --env-file .env up -d --wait
```

Đặt `GRAFANA_ADMIN_PASSWORD` thành mật khẩu mạnh trước khi chạy. Grafana và
Prometheus chỉ bind vào loopback; Nginx/HTTPS và basic auth chịu trách nhiệm
bảo vệ truy cập từ bên ngoài.

- Grafana: `http://127.0.0.1:3001`
- Prometheus: `http://127.0.0.1:9090`

Kiểm tra target `node-exporter` tại `http://127.0.0.1:9090/targets`. Dừng stack
mà vẫn giữ dữ liệu bằng `docker compose down`.

## Healthcheck backend

Compose ứng dụng tại VPS khai báo healthcheck cho từng container NestJS và các
dependency. Quy trình CD chỉ hoàn tất khi container mới healthy; nếu không,
receiver khôi phục image trước đó.

## Log JSON và request_id

Các service dùng package `packages/observability` để:

- ghi log JSON ra `stdout`/`stderr` khi `LOG_FORMAT=json`;
- tạo hoặc nhận `x-request-id`, trả header này về client;
- tự gắn `request_id` vào log trong cùng request;
- truyền `x-request-id` qua HTTP và RabbitMQ;
- che token, mật khẩu, cookie và dữ liệu nhạy cảm.

Docker dùng logging driver `local` cùng giới hạn dung lượng file. Stack này
không tuyên bố distributed tracing, log aggregation hay application metrics.

Chi tiết stack thực tế và thứ tự cập nhật CI/CD xem [deploy/README.md](deploy/README.md).
