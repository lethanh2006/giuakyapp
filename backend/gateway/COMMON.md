# Đọc luồng Gateway

`main.ts` tạo ứng dụng, validation, Swagger và proxy Socket.IO. `app.module.ts`
ghép các module nghiệp vụ; `core/core.module.ts` đăng ký middleware và filter
dùng chung. Controller/service nghiệp vụ nằm trong `modules/<tên>/`.

Luồng HTTP:

1. `common/middleware/request-id.middleware.ts` tạo `request_id` và log context.
2. `request-outcome.middleware.ts` ghi kết quả lỗi/thời gian khi request kết thúc;
   `rate-limit.middleware.ts` kiểm tra giới hạn request.
3. `common/guards/jwt-auth.guard.ts` bỏ qua route `@Public()` hoặc chạy
   `common/security/jwt.strategy.ts` để xác thực JWT và introspect tại Auth.
4. `common/guards/roles.guard.ts` kiểm tra role được khai báo bằng `@Roles()`.
5. Controller nhận DTO; service gọi backend bằng `common/http/upstream-http.module.ts`.
   `common/security/internal-request-signature.service.ts` ký danh tính gửi nội bộ.
6. `common/filters/global-exception.filter.ts` giữ định dạng lỗi trả frontend;
   `common/logging/logger.ts` ghi JSON và flush log khi ứng dụng dừng.

`config/` chứa kiểm tra cấu hình; `decorators/` chứa metadata route; `enums/`
chứa role; `interfaces/` chỉ chứa kiểu request. Các thư mục chỉ xuất hiện khi có
file thực sự dùng. Test nằm cạnh phần được kiểm tra, không tạo file `index.ts`
hay lớp chuyển tiếp chỉ để đổi tên import.

Gateway dùng metadata role `role`; các service có thể dùng `roles` hoặc key khác.
Không đổi các key, thứ tự middleware/guard, chữ ký nội bộ, DTO, HTTP status hay
response để ép mọi service có cùng triển khai. Luồng Socket.IO vẫn do Chat xử lý.

Từ repo này, chạy `npm run lint`, `npm run format:check` và `npm test`.
`npm test` gồm build và toàn bộ test Gateway.
