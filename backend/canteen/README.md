# Dịch vụ căn tin NRApp

Dịch vụ căn tin NRApp là service NestJS phục vụ gọi món tại bàn cho nhân viên.
Service sở hữu thực đơn, danh mục, bàn và vòng đời đơn hàng; client truy cập
thông qua API Gateway.

## Phạm vi hiện tại

- Xem thực đơn và danh mục công khai, có tìm kiếm món.
- Admin quản lý món ăn, danh mục và bàn.
- Nhân viên tạo đơn theo bàn; giá món và tùy chọn được xử lý phía server.
- Admin thu tiền mặt và hủy các đơn đủ điều kiện.
- Lịch sử undo/redo thực đơn được lưu qua Redis.
- Tự tạo 20 bàn mặc định ở lần khởi động đầu tiên nhưng không ghi đè dữ liệu
  bàn đã tồn tại.

Service hiện chỉ hỗ trợ đơn `CASH`. Service không còn module bếp, kho, nguyên
liệu, phân bàn tự động, giảm giá/trợ cấp, thanh toán QR, RabbitMQ hoặc outbox.

## Quy tắc đơn hàng

Server đọc giá món và giá tùy chọn từ MongoDB; client chỉ gửi ID món, số lượng và
tên tùy chọn được chọn. Đơn mới sử dụng:

- `status`: `CREATED`, `COMPLETED` hoặc `CANCELLED`
- `paymentStatus`: `PENDING` hoặc `PAID`
- `paymentMethod`: `CASH`

Bàn vẫn ở trạng thái đang sử dụng khi còn đơn chưa tất toán. Bàn chỉ được trả về
trạng thái trống khi không còn đơn chưa hủy nào chưa thanh toán trên bàn đó.

## HTTP API

Tất cả route nằm dưới `/api/canteen` và được expose qua Gateway.

| Route | Quyền | Mục đích |
| --- | --- | --- |
| `GET /menu`, `GET /menu/search` | Công khai | Xem và tìm kiếm món đang bán |
| `GET /categories`, `GET /categories/:id` | Công khai | Xem danh mục đang hoạt động |
| `GET /admin/menu` | Admin | Đọc toàn bộ thực đơn, bao gồm bản ghi bị ẩn |
| `POST/PUT/DELETE /admin/menu...` | Admin | Quản lý món ăn |
| `POST /admin/menu/undo`, `POST /admin/menu/redo` | Admin | Undo hoặc redo thay đổi thực đơn |
| `POST /orders` | Đã xác thực | Tạo đơn tiền mặt |
| `GET /orders/my-orders` | Đã xác thực | Xem đơn của người dùng hiện tại |
| `GET /orders/:id` | Đã xác thực | Xem đơn mà người dùng hiện tại được phép xem |
| `PATCH /orders/:id/cancel` | Chủ đơn hoặc admin | Hủy đơn đủ điều kiện |
| `GET /orders` | Admin | Lọc và phân trang danh sách đơn vận hành |
| `PATCH /orders/:id/payment/cash` | Admin | Xác nhận đã thu tiền và hoàn tất đơn |
| `GET /tables` và `GET /tables/:id` | Đã xác thực | Xem trạng thái bàn |
| `POST/PATCH/DELETE /tables...` | Admin | Tạo, sửa, xóa và đổi trạng thái bàn |
| `POST/PATCH/DELETE /categories...` | Admin | Quản lý danh mục |

`GET /health/live` (và `/health`) báo liveness của process. Endpoint readiness
báo trạng thái MongoDB và Redis, đồng thời trả response unavailable khi một
trong hai dependency bị lỗi.

## Tin cậy Gateway và bảo mật

Gateway chuyển identity người dùng dưới dạng payload có chữ ký. Ở production,
`CANTEEN_INTERNAL_SECRET` là bắt buộc và phải giống secret tại Gateway; service
từ chối chữ ký thiếu, hết hạn hoặc không hợp lệ. Khi phát triển local có thể để
`CANTEEN_REQUIRE_SIGNATURE=false` để gọi trực tiếp phục vụ kiểm thử.

## Cấu hình

Chạy `npm run setup` tại thư mục gốc để tạo env đồng bộ. MongoDB mặc định là
Atlas dev dùng chung cho đội; điền URI trưởng nhóm cung cấp riêng vào
`backend/.env`:

```env
MONGO_MODE=atlas
MONGO_URL=mongodb+srv://<db_user>:<url_encoded_password>@<dev_cluster>/nrapp_dev?retryWrites=true&w=majority
MONGO_DB_NAME=nrapp_dev
```

Các service Mongo cùng sử dụng database `nrapp_dev`; thay đổi thực đơn, bàn và
đơn hàng dev sẽ hiển thị cho các thành viên cùng kết nối. Không cần chạy MongoDB
Docker ở chế độ mặc định. Cấu hình riêng của Canteen có giá trị tham khảo:

```env
PORT=5005
REDIS_URL=redis://127.0.0.1:6379
CANTEEN_INTERNAL_SECRET=replace_with_a_long_random_shared_secret
CANTEEN_REQUIRE_SIGNATURE=false
CANTEEN_SIGNATURE_MAX_AGE_MS=300000
```

`LOG_LEVEL`, `LOG_FORMAT` và `DEPLOYMENT_ENVIRONMENT` cấu hình application log.
Không commit file `.env` thật.

## Chạy local

Chạy `npm run setup` tại thư mục gốc của dự án để tạo env đồng bộ và cài
dependency, điền URI Atlas dev vào `backend/.env`, sau đó bật nhóm căn tin:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail,canteen
```

Runner bật hạ tầng local cần thiết và các service ở chế độ watch.
`npm run dev:backend` chạy toàn bộ service khi cần kiểm tra cả ứng dụng. Xem
[hướng dẫn local dev](../../README.md). Package log dùng chung đã nằm trong
`backend/logger/packages/observability`.

Nếu chạy trực tiếp `npm run start:dev` trong service, cần tự bật các dependency
đã nêu ở trên. Service đọc `backend/.env` trước `.env` riêng, nên cấu hình Mongo
tập trung vẫn áp dụng khi chạy trực tiếp. Chỉ dùng MongoDB Docker khi chủ động
chọn `MONGO_MODE=local`; Compose bật profile `local-mongo` và khởi tạo replica
set `rs0`.

Các lệnh kiểm tra chất lượng và hợp đồng dữ liệu:

```bash
npm run lint
npm run format:check
npm test
npm run build
npm run check:indexes
```

`check:indexes` khởi động MongoDB tạm thời bằng Docker và kiểm tra index cùng các
luồng quan trọng về tính nhất quán đơn hàng/trạng thái bàn.

Tài liệu chi tiết hơn nằm trong [hướng dẫn vòng đời request](docs/request-lifecycle.md)
và [hướng dẫn index database](docs/database-indexes.md).
