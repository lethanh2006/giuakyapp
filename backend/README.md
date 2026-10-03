# NRApp backend local

Backend gồm chín service NestJS. Mã nguồn và package log dùng chung nằm trong
cùng repo. Xem [hướng dẫn cho thành viên mới](../README.md) để chạy BE và FE.

## Khởi chạy

Tại thư mục gốc của dự án, chạy `npm run setup` lần đầu. Sau đó từ `backend/`:

```bash
npm run dev
```

Runner bật Docker Compose chứa **hạ tầng local**, chờ healthy rồi chạy Node
service ở chế độ watch. MongoDB replica set được tự khởi tạo để hỗ trợ
transaction của Auth, User và WorkSchedule. Dữ liệu nằm trong volume riêng của
project `nrapp-local-dev`.

| Service Node | Port |
| --- | --- |
| Gateway | 3000 |
| Auth | 4000 |
| User | 5000 |
| Mail | 5001 |
| Chat | 5002 |
| Todo | 5003 |
| WorkSchedule | 5004 |
| Canteen | 5005 |
| Payment | 5006 |

Gateway API: `http://localhost:3000/api`. Swagger:
`http://localhost:3000/api-docs`. Gateway nhận request từ web/emulator/điện
thoại qua LAN và forward HTTP, Socket.IO đến các service local.

## Env

`backend/.env` chứa cổng hạ tầng, tài khoản local và secret dùng chung. Env trong
từng service chứa cấu hình riêng như Google, Cloudinary và Payment demo. Runner
đồng bộ credential và URL local khi khởi chạy, kể cả khi thay cổng hạ tầng.
Không đặt `PORT` trong `backend/.env`; dùng các biến `AUTH_HOST_PORT`,
`CHAT_HOST_PORT`, … để từng service có cổng riêng.

`npm run setup` tại thư mục gốc sinh các secret ngẫu nhiên và điền vào template.
Không sao chép nguyên `.env.example` của BE để chạy, vì các marker `__…__` cần
được setup thay bằng giá trị thực. Để chỉ tạo env:

```bash
npm run setup -- --env-only
```

Lệnh giữ env có sẵn. Thêm `--reset-env` để sao lưu env cũ rồi tạo cấu hình local
mới. Không dùng tùy chọn này hằng ngày: RabbitMQ/PostgreSQL trong volume giữ
credential được tạo lần đầu.

## Hạ tầng

```bash
npm run infra:up
npm run infra:logs
npm run infra:down
```

Các container gồm MongoDB `rs0`, Redis, RabbitMQ, PostgreSQL Payment và Mailpit.
MongoDB/Redis/RabbitMQ/PostgreSQL/Mailpit chỉ publish cổng ở `127.0.0.1`.
Mailpit mặc định nhận SMTP ở `1025`, không cần tài khoản SMTP; mở
`http://localhost:8025` để lấy OTP. [Cấu hình SMTP của Mailpit](https://mailpit.axllent.org/docs/configuration/smtp/).

Nhấn `Ctrl+C` dừng các process Node do runner tạo, hạ tầng vẫn chạy và giữ dữ
liệu. `infra:down` dừng container, giữ volume. Không có bước build image app,
CI/CD, VPS, Nginx, monitoring hoặc deploy trong luồng này.

Nếu đã tự khởi động các dependency local, có thể bỏ qua bước Docker:

```bash
npm run dev:apps
```

Để phát triển một service riêng, bật hạ tầng rồi mở terminal trong service đó
và chạy `npm run start:dev`. Các env tạo bởi setup dùng cổng mặc định; nếu đã
đổi cổng hạ tầng, ưu tiên runner để URL được đồng bộ.

## Kiểm tra và đọc source

Các lệnh kiểm tra được chạy trực tiếp trong service cần sửa:

```bash
npm run lint
npm test -- --runInBand
npm run build
```

Đọc `src/main.ts` → `src/app.module.ts` → `src/core/core.module.ts` →
`src/modules/<nghiệp-vụ>/`. `COMMON.md` của từng service mô tả request, role,
chữ ký nội bộ và response. Package `logger/packages/observability` cung cấp
logger và request ID; đây là dependency runtime của các service.

Google OAuth, Cloudinary và Casso là tích hợp tùy chọn. Email/OTP và chat chữ
không cần các tài khoản này. Payment khởi động bằng thông tin demo trong env,
nhưng Gateway chưa có module Payment; FE căn tin dùng thanh toán tiền mặt.
