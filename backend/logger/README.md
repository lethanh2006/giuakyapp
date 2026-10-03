# Log dùng chung cho backend

Thư mục `packages/observability` chứa package `@nrapp/observability` mà các
service NestJS đang sử dụng: logger Pino, request ID, che thông tin nhạy cảm
và flush log khi dừng process.

`npm run setup` ở thư mục gốc cài package này trước các service. Chạy local dùng
`LOG_FORMAT=pretty`, log in trực tiếp tại terminal của BE. Các cấu hình
monitoring và deploy của repo cũ đã được gỡ.

Xem [API package](packages/observability/README.md). Kiểm tra package:

```bash
cd packages/observability
npm test
```
