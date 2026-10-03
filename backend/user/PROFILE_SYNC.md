# Consumer đồng bộ profile từ Auth outbox

Consumer `user-profile-sync` nhận event có `version` hoặc `eventId` qua `ProfileSyncService`. Payload gồm `eventId`, ObjectId Auth dưới dạng `userId`, version nguyên dương, action CREATE/UPDATE_EMAIL/UPDATE_ROLE/DELETE. CREATE/UPDATE cần snapshot username/email/role đầy đủ.

## Nhất quán dữ liệu

MongoDB phải là replica set hoặc sharded cluster hỗ trợ transaction. `users` và `user_profile_sync_states` phải cùng database/connection. Service khởi tạo collection/index trước khi consume.

Consumer ghi version/eventId vào `user_profile_sync_states` và cập nhật/xóa profile trong cùng transaction, chỉ ack sau commit. Version nhỏ hơn hoặc bằng version đã xử lý được bỏ qua. UPDATE có thể tới trước CREATE: snapshot đầy đủ dựng được profile, `$setOnInsert` giữ username đã được người dùng chỉnh. Email/role được cập nhật theo snapshot mới nhất.

DELETE giữ record sync state lâu dài (tombstone), không TTL, nên CREATE/UPDATE cũ không hồi sinh profile. Mongo write conflict được transaction retry; lỗi khác, bao gồm unique conflict khi consumer đồng thời tạo profile, được chuyển sang hàng đợi retry.

Consumer vẫn nhận format cũ không có version/eventId qua handler cũ. Khi chuyển đổi, triển khai User trước, tạm dừng ghi Auth và drain event cũ (kể cả retry) rồi triển khai Auth mới. Event cũ không có version nên không có bảo đảm ordering như format mới.

## Lỗi và gửi lại

- `user-profile-sync.retry`: durable **quorum queue**, TTL 5 giây, dead letter về `user-profile-sync`, chiến lược `at-least-once`, overflow `reject-publish`. Retry DB/network lỗi không giới hạn số lần, không chặn các event sau trong queue chính.
- `user-profile-sync.dead`: durable queue giữ JSON/event không hợp lệ để kiểm tra thủ công.
- Consumer chỉ ack bản gốc sau khi bản retry/dead được broker confirm. Broker nack, timeout hoặc mandatory return khiến bản gốc được requeue.
- Prefetch 1 giới hạn message đang xử lý trên mỗi channel. Version vẫn cần thiết khi chạy nhiều instance hoặc redelivery.

RabbitMQ cần hỗ trợ quorum queue/at least once dead lettering (đã kiểm tra trên RabbitMQ 4.2.7). Quản trị broker cần cho phép service tạo các queue này. Theo dõi queue retry/dead; chỉ replay message dead sau khi sửa payload/nguyên nhân. Nếu email đã dùng cho profile cũ chưa nhận DELETE, CREATE mới sẽ retry cho tới khi DELETE cũ giải phóng email.

Đồng bộ là eventual consistency: profile mới có thể chưa xuất hiện ngay sau đăng ký. API xác thực/quyền vẫn dựa trên Auth credential gốc.

## Kiểm thử

```bash
npm run lint
npm run format:check
npm test -- --runInBand
npm run build
OUTBOX_TEST_MONGO_URL='mongodb://127.0.0.1:27017/?directConnection=true' npm test -- --runInBand
```

Suite Mongo thật tạo/xóa database test riêng; kiểm tra duplicate, event ngược thứ tự, giữ tên, tombstone, rollback version khi profile lỗi và consumer đồng thời. Test transport kiểm tra xác nhận gửi retry/DLQ trước ack và requeue khi gửi thất bại.

Tham khảo: [RabbitMQ xác nhận message](https://www.rabbitmq.com/docs/confirms), [quorum queue và at least once dead lettering](https://www.rabbitmq.com/docs/quorum-queues).
