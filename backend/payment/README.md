# Payment Service

Payment Service tạo VietQR cho đơn hàng Canteen, nhận Casso Webhook V2 và lưu
toàn bộ trạng thái thanh toán trong PostgreSQL. Service không dùng MongoDB hoặc
Redis.

Xem [COMMON.md](COMMON.md) để đọc luồng request, cấu trúc code dùng chung và
cấu trúc module và request nội bộ.

## Luồng chính

1. Gateway xác thực JWT và lấy `finalAmount` trực tiếp từ Canteen.
2. Gateway gọi `POST /api/payment/create-qr` bằng identity nội bộ có HMAC.
3. Payment tạo/reuse một intent `PENDING` và trả URL VietQR.
4. Casso gọi `POST /api/payment/webhooks/casso` (hoặc `/webhook/casso`).
5. Payment xác thực HMAC-SHA512, khóa intent, kiểm tra account/amount và xử lý
   idempotent theo `data.id`.
6. Cập nhật `SUCCESS` và ghi outbox trong cùng transaction PostgreSQL.
7. Outbox phát `payment.succeeded.v1` tới queue
   `canteen.payment.succeeded.v1`; Canteen cập nhật `paymentStatus=PAID`.

Outbox mặc định retry vô hạn với exponential backoff khi RabbitMQ gián đoạn.
Chỉ đặt `PAYMENT_OUTBOX_MAX_ATTEMPTS` thành số dương nếu đã có quy trình cảnh
báo và re-drive các row có `failed_at`.

## Chạy local

Từ thư mục gốc của dự án:

```bash
npm run setup
npm run dev:backend
```

PostgreSQL Payment chạy local ở `127.0.0.1:5433`. Service tự chạy migration
khi khởi động. Secret và tài khoản demo trong env được tạo cho môi trường local.
VietQR dùng thông tin mẫu và không cấu hình Casso thật. Gateway hiện chưa đăng ký
module Payment; FE căn tin dùng thanh toán tiền mặt. Xem [hướng dẫn local](../../README.md).

## Kiểm tra

```bash
npm run build
npm test -- --runInBand
npm run lint
```

`GET /health` là liveness; `GET /health/ready` kiểm tra PostgreSQL và RabbitMQ.
