# Dịch vụ xác thực NRApp

Dịch vụ xác thực NRApp là microservice NestJS phụ trách lưu credential, kiểm tra
mật khẩu, đăng nhập OTP, đăng nhập Google, phiên JWT và các thao tác tài
khoản/role. Ứng dụng mobile và web truy cập service thông qua API Gateway;
endpoint introspection dùng cho giao tiếp giữa Gateway và Auth.

## Trách nhiệm

- Lưu credential trong MongoDB với email duy nhất, password hash và role ứng
  dụng (`user` hoặc `admin`).
- Đăng ký tài khoản và bắt đầu luồng đăng nhập bằng mật khẩu với OTP email gồm
  sáu chữ số.
- Lưu OTP cùng trạng thái giới hạn request/số lần thử trong Redis. OTP hết hạn
  sau năm phút, mỗi email chỉ yêu cầu OTP tối đa một lần trong một phút và việc
  xác thực bị giới hạn năm lần sai.
- Cấp access token và refresh token. ID của refresh token được lưu trong Redis và
  xoay vòng nguyên tử khi làm mới phiên.
- Kiểm tra Google ID token khi đã cấu hình `GOOGLE_WEB_CLIENT_ID`.
- Kiểm tra access token cho Gateway và trả về role hiện tại của credential; việc
  tài khoản bị xóa hoặc role thay đổi sẽ được phản ánh khi introspection (ngoại
  trừ thời gian cache identity tùy chọn đã cấu hình).
- Phát hành event outbox giao dịch vào queue RabbitMQ `user-profile-sync` khi
  credential được tạo, cập nhật hoặc xóa.

User service vẫn sở hữu read model username/profile. Auth đọc dữ liệu này qua
kết nối nội bộ khi tạo phiên và phát event thay đổi credential qua outbox, không
ghi trực tiếp vào database của User.

## HTTP API

Tất cả route nghiệp vụ nằm dưới `/api/auth`.

| Method | Path | Quyền | Mục đích |
| --- | --- | --- | --- |
| `POST` | `/register` | Công khai | Tạo credential và enqueue việc tạo profile |
| `POST` | `/login` | Công khai | Kiểm tra mật khẩu và gửi OTP qua RabbitMQ |
| `POST` | `/verify` | Công khai | Kiểm tra OTP và cấp access/refresh token |
| `POST` | `/refresh` | Công khai | Xoay vòng refresh token và cấp phiên mới |
| `POST` | `/login-google` | Công khai | Kiểm tra Google ID token và cấp phiên |
| `POST` | `/introspect` | Gateway nội bộ | Kiểm tra access token và trả về identity hiện tại |
| `GET` | `/me` | Đã xác thực | Đọc credential hiện tại |
| `PATCH` | `/me/email` | Đã xác thực | Đổi email tài khoản hiện tại |
| `DELETE` | `/me` | Đã xác thực | Xóa tài khoản hiện tại |
| `GET` | `/users/:userId` | Admin | Đọc credential của user khác |
| `DELETE` | `/users/:userId` | Admin | Xóa tài khoản user khác |
| `PATCH` | `/users/:userId/role` | Admin | Đổi role của user khác |

`GET /health` và `GET /health/live` trả về trạng thái liveness của service.
Các route tài khoản được bảo vệ yêu cầu header identity có chữ ký do Gateway
gửi; client không gọi trực tiếp các route này.

## Dependency và cấu hình

Service cần MongoDB, Redis, RabbitMQ và User service nội bộ. MongoDB phải hỗ trợ
transaction vì credential và outbox được ghi cùng nhau trong một transaction.

Cấu hình được tạo bởi `npm run setup` tại thư mục gốc. Các giá trị tham khảo:

```env
PORT=4000
MONGO_URL=mongodb://127.0.0.1:27017/nrapp?replicaSet=rs0&directConnection=true
MONGO_DB_NAME=nrapp
REDIS_URL=redis://localhost:6379
USER_SERVICE=http://localhost:5000
JWT_SECRET=replace_with_at_least_32_random_bytes
GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
AUTH_INTERNAL_SECRET=replace_with_a_long_random_shared_secret
AUTH_SIGNATURE_MAX_AGE_MS=300000

Rabbitmq_Host=localhost
Rabbitmq_Port=5672
Rabbitmq_Username=guest
Rabbitmq_Password=guest
```

`AUTH_IDENTITY_CACHE_TTL_MS` là tùy chọn và phải nằm trong khoảng `0` đến
`5000`; chỉ bật giá trị khác `0` khi chỉ có một Auth instance phục vụ traffic.
Các biến logging trong `.env.example` cấu hình application log có cấu trúc.
Không commit credential hoặc JWT secret thật.

## Chạy local

Chạy `npm run setup` tại thư mục gốc của dự án để tạo env đồng bộ và cài
dependency, sau đó `npm run dev:backend` để bật cả cụm. Xem
[hướng dẫn local dev](../../README.md). Package log dùng chung đã nằm trong
`backend/logger/packages/observability`.

Sau khi hạ tầng đã chạy, có thể mở terminal ở service này và chạy
`npm run start:dev` để phát triển riêng.

Các lệnh kiểm tra:

```bash
npm run lint
npm run format:check
npm test
npm run build
```
