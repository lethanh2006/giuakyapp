# API Gateway NRApp

API Gateway NRApp là dịch vụ NestJS cung cấp điểm vào HTTP công khai cho backend
NRApp. Gateway kiểm tra request và access token, áp dụng các kiểm soát dùng
chung, chuyển tiếp request đến các service nội bộ và proxy kết nối Socket.IO của
Chat.

## Trách nhiệm

- Định tuyến REST đến Auth, User, Chat, Todo, Workschedule và Canteen.
- Kiểm tra JWT access token thông qua endpoint introspection của Auth.
- Gắn request ID và ký payload người dùng đã xác thực trước khi chuyển tiếp đến
  service nội bộ.
- Áp dụng validation DTO, kiểm tra role, giới hạn request theo IP trên từng
  instance và pipeline exception/logging dùng chung.
- Cung cấp Swagger UI tại `/api-docs` và liveness tại `/health` hoặc
  `/health/live`.
- Proxy cả HTTP polling và WebSocket upgrade dưới `/socket.io` đến Chat.

Gateway là ranh giới phía client. Trong luồng sử dụng thông thường, client cần
truy cập các service thông qua Gateway.

## Các prefix được định tuyến

| Prefix | Nghiệp vụ upstream |
| --- | --- |
| `/api/auth` | Đăng ký, đăng nhập OTP, đăng nhập Google, làm mới token và quản trị tài khoản |
| `/api/user` | Hồ sơ người dùng, danh bạ và cập nhật hồ sơ |
| `/api/chat` | Cuộc trò chuyện, tin nhắn và tải ảnh |
| `/api/todo` | Tạo, giao, cập nhật, đổi trạng thái và truy vấn công việc |
| `/api/workschedule` | Lịch làm việc, đơn nhân sự, chấm công và chính sách chấm công |
| `/api/canteen` | Thực đơn, danh mục, bàn và đơn căn tin tiền mặt |
| `/socket.io` | Kênh realtime của Chat |

Hợp đồng request và response cụ thể nằm trong controller và DTO dưới
`src/modules`. Swagger là cách nhanh nhất để xem API mà Gateway cung cấp.

## Luồng request

```text
Client
  -> Gateway gắn request ID và giới hạn request
  -> Introspection JWT với route cần xác thực
  -> Validation DTO và role tại controller
  -> Ký request nội bộ rồi chuyển đến service tương ứng
  -> Response hoặc upstream error có cấu trúc
```

Các route công khai được đánh dấu bằng decorator `@Public()`. Route bảo vệ dùng
Bearer access token và metadata role được khai báo tại từng controller. URL
service nội bộ và secret dùng để ký được cấu hình bằng biến môi trường; các giá
trị này không được gửi từ ứng dụng mobile.

## Cấu hình

Sao chép `.env.example` thành `.env` rồi điền giá trị theo môi trường:

```env
PORT=3000
AUTH_SERVICE_URL=http://localhost:4000
USER_SERVICE_URL=http://localhost:5000
CHAT_SERVICE_URL=http://localhost:5002
TODO_SERVICE_URL=http://localhost:5003
WORKSCHEDULE_SERVICE_URL=http://localhost:5004
CANTEEN_SERVICE_URL=http://localhost:5005
JWT_SECRET=replace_with_at_least_32_random_bytes
CANTEEN_INTERNAL_SECRET=replace_with_a_long_random_shared_secret
```

Có thể cấu hình riêng `AUTH_INTERNAL_SECRET`, `USER_INTERNAL_SECRET`,
`CHAT_INTERNAL_SECRET`, `TODO_INTERNAL_SECRET` và
`WORKSCHEDULE_INTERNAL_SECRET` khi upstream dùng secret riêng. Nếu secret riêng
bỏ trống, Gateway giữ cơ chế tương thích dùng `JWT_SECRET`. Giới hạn request mặc
định trong bộ nhớ là 120 request mỗi 60 giây trên mỗi Gateway instance; có thể
đổi bằng `RATE_LIMIT_WINDOW_MS` và `RATE_LIMIT_MAX_REQUESTS`.

Các biến observability trong `.env.example` điều khiển định dạng log, log level,
trace export và metadata Swagger. Không commit file `.env` thật.

## Chạy local

Gateway dùng package observability cục bộ của Logger. Đặt repository Logger cạnh
repository này trong thư mục backend, sau đó chạy:

```bash
npm ci --prefix ../logger/packages/observability --no-audit --no-fund
npm ci
cp .env.example .env
npm run start:dev
```

Các lệnh kiểm tra:

```bash
npm run lint
npm run format:check
npm test
npm run build
```

Gateway local mặc định ở `http://localhost:3000`; Swagger ở
`http://localhost:3000/api-docs`.

## CI/CD

`.github/workflows/ci.yml` gọi reusable workflow kiểm tra Node.js được pin trong
[Logger](https://github.com/lethanh2006/Logger). Workflow chạy kiểm tra dependency
và bảo mật, lint, format, test và build. Push thành công vào nhánh mặc định sẽ
kích hoạt `.github/workflows/cd.yml` để deploy đúng commit lên VPS thông qua
reusable deployment workflow đã pin. Xem [.github/CI.md](.github/CI.md) để biết
secret cần thiết và quy trình phát hành.
