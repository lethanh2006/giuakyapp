# Common của User

Luồng HTTP: `main.ts` khởi động `AppModule` → `CoreModule` đăng ký middleware, logger và exception filter → `RequestIdMiddleware` gắn `x-request-id` → guard của route (nếu có) → DTO validation → controller → service. Khi có lỗi, `GlobalExceptionFilter` giữ định dạng phản hồi và ghi log kèm request ID.

| Thư mục trong `src/common` | Trách nhiệm |
| --- | --- |
| `decorators/` | `CurrentUser` đọc `request.user`; `GatewayRoles` khai báo role của route. |
| `filters/` | Chuyển exception thành HTTP response và ghi log. |
| `guards/` | Kiểm tra identity theo yêu cầu của từng route. |
| `interfaces/` | Kiểu dữ liệu người dùng và request context. |
| `logging/` | Một file `logger.ts` tạo logger, adapter cho service và flush log khi ứng dụng dừng. |
| `middleware/` | Nhận hoặc tạo request ID trước khi xử lý route. |
| `security/` | Kiểm tra chữ ký và thời hạn của header do Gateway ký. |
| `utils/` | Parse identity và chuẩn hóa lỗi. |

`GatewayIdentityGuard` kiểm tra chữ ký, identity và role trước khi gán `request.user`. `UserPayloadGuard` chỉ parse identity cho route công khai `GET api/user/user/:id`; giữ riêng vì hai guard có hành vi khác nhau. Các route tương thích trả profile công khai vẫn theo cấu hình guard hiện tại trong controller.

Nghiệp vụ nằm ở `modules/user`; MongoDB schema nằm ở `schemas/`. Consumer RabbitMQ gọi profile sync trực tiếp, không đi qua HTTP middleware hoặc guard. Profile sync vẫn cần để nhận thay đổi từ Auth.

Logger dùng `@nrapp/observability` trong repo Logger để xuất log và nối log theo request ID. Test đặt cạnh file được kiểm tra; chỉ tạo thư mục khi service thực sự cần.
