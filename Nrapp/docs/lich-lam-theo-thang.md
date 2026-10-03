# Đăng ký lịch làm theo tháng

Admin mở một đợt nhận lịch tại **Lịch làm & chấm công → Vận hành → Mở đăng ký theo tháng**. Chọn tháng, ngày bắt đầu và ngày kết thúc trên cùng bảng lịch, rồi lưu. Ngày đã qua không thể chọn. Khi đổi tháng, khoảng ngày được đặt lại trong tháng mới.

Ngày bắt đầu/kết thúc là **thời gian nhận đăng ký**, đồng thời xác định tháng được đăng ký. Ví dụ đợt 29/10–31/10 chỉ nhận lịch tháng 10; đợt 29/10–02/11 không hợp lệ. User chọn bất kỳ ngày chưa qua trong tháng đang mở, kể cả ngày nằm sau hạn nhận đăng ký. Mọi mốc ngày dùng múi giờ Việt Nam.

User và tài khoản đăng ký cá nhân trong khu admin dùng chung luồng:

1. Bảng tháng cố định theo đợt; chạm ngày để chỉnh trực tiếp ca tại công ty và ghi chú ngay dưới lịch.
2. Chọn nhanh T2–T6 áp dụng ca cả ngày tại công ty cho các ngày chưa qua trong tháng; cuối tuần chọn riêng.
3. Nút gửi hiển thị tổng ngày/buổi. Chỉ gửi khi có ít nhất một ngày làm chưa qua.
4. Một tài khoản có một yêu cầu mỗi tháng. Lịch đã gửi hoặc duyệt chỉ xem; lịch từ chối cho sửa và gửi lại khi đợt còn mở.
5. Entry của ngày quá khứ được giữ nguyên khi gửi lại/điều chỉnh, không thêm, sửa hoặc xóa.

Lịch tuần cũ giữ nguyên để xem lại. Những ngày trùng lịch tuần đang chờ/đã duyệt không được đăng ký thêm. Trang chủ lấy lịch đã duyệt của hôm nay/ngày mai, kể cả khi sang tuần hoặc tháng mới.

## Contract API

- `GET /workschedule/policy`: `registration_start`, `registration_end`, `locked`, `schedule_month` do server suy ra (`YYYY-MM`, hoặc `null` nếu cấu hình cũ không hợp lệ).
- `PATCH /workschedule/policy`: gửi thời gian và `locked`; không gửi `schedule_month`.
- `POST /workschedule/schedule/requests`: `{ "month": "2026-10", "entries": [...] }`, tối đa 31 ngày, mỗi ngày chỉ một entry.
- `POST /workschedule/schedule/requests/:id/resubmit` và `PATCH /workschedule/schedule/requests/:id`: `{ "entries": [...] }`, giữ nguyên entry quá khứ.
- Danh sách cá nhân, danh sách quản lý và heatmap dùng query `month=YYYY-MM`. Danh sách quản lý trả kèm `entries` để hiển thị chi tiết từng ngày trên bảng tháng.

Mở phần cấu hình chỉ để xem, không tự đổi ngày bắt đầu hoặc hạn đăng ký. Admin chọn **Chỉnh sửa** để sửa; **Hủy chỉnh sửa** khôi phục cấu hình đã lưu. Đổi tháng ở danh sách duyệt không làm mất bản nháp cấu hình.

Khi rời trang đăng ký có thay đổi chưa gửi, ứng dụng cho chọn **Ở lại** hoặc **Rời trang**. Gửi lỗi vẫn giữ các ngày đã chọn để thử lại; gửi thành công chuyển sang trạng thái chờ duyệt.

BE kiểm tra lại tháng, hạn đăng ký và ngày quá khứ cho mọi vai trò. Không có dữ liệu policy hoặc lỗi tải dữ liệu thì FE khóa gửi và cho tải lại.

### Ghi chú tách đăng ký làm từ xa

Frontend lịch tháng không còn cho tạo mới entry `remote`; làm từ xa được tạo bằng đơn nhân sự riêng. Khi gửi lại lịch, FE vẫn giữ nguyên entry remote cũ ở ngày quá khứ vì đây là dữ liệu đã khóa. Backend hiện chưa bắt buộc đổi ngay nếu vẫn chấp nhận payload cũ, nhưng nên bổ sung validation không nhận `remote` mới ở ngày hiện tại/tương lai trong API tạo/gửi lại lịch tháng. Khi tổng hợp lịch và chấm công, backend cần ghép đơn làm từ xa đã duyệt vào đúng ngày/ca; dữ liệu lịch tháng `remote` cũ vẫn cần được hỗ trợ đọc trong giai đoạn chuyển đổi.

## Cập nhật và kiểm tra

Backend lịch cần MongoDB **replica set hoặc Atlas** để lưu lịch và chấm công trong cùng transaction; MongoDB standalone không được hỗ trợ.

Cập nhật `backend/workschedule`, `backend/gateway` và `Nrapp` cùng đợt vì payload tạo lịch đổi từ `week_start` sang `month`. Cấu hình cũ vắt tháng cần được admin mở lại thành một đợt hợp lệ. Dữ liệu lịch tuần không tự biến thành lịch tháng. Khi khởi động, dịch vụ tạo unique index theo `(employee_id, month)` rồi bỏ unique index tuần cũ; cần triển khai các instance dịch vụ lịch cùng phiên bản. Chấm công tự động của lịch tháng gắn với ID yêu cầu để không ảnh hưởng chấm công lịch tuần cũ.

- Nrapp: `npx tsc --noEmit`, `npm run lint`, `node --test scripts/workschedule-date.test.cjs`.
- Chạy thêm test ngày với `TZ=America/Los_Angeles` để kiểm tra thiết bị ở múi giờ khác.
- Backend lịch: `npm test -- --runInBand`, `npm run build`, `npm run lint`.
- Kiểm tra tích hợp: chạy `npm run test:e2e` tại `backend/workschedule` với Docker đang chạy và dependency của Gateway đã cài. Bài kiểm tra dùng Gateway, dịch vụ lịch và MongoDB replica set thật trong môi trường riêng; xác thực/danh bạ dùng dữ liệu giả lập, không ghi vào database đang sử dụng.
- Gateway: `npm run build`, `node --test dist/modules/workschedule/dto/monthly-schedule.dto.test.js`.
- Thử trên thiết bị: mở đợt cùng tháng, chọn nhanh/ngày riêng, gửi và gửi lại; ngày quá khứ xám; ngày khác tháng không xuất hiện trong lựa chọn.

## Kiểm tra giao diện trước khi phát hành

- Admin mở cấu hình để xem: không có yêu cầu lưu tự động, ngày của đợt đã lưu không đổi. Chỉnh sửa rồi chuyển sang danh sách duyệt và quay lại: bản nháp còn nguyên. Hủy chỉnh sửa khôi phục đúng đợt đã lưu.
- User chọn nhanh ngày làm, bấm Trang chủ rồi chọn Ở lại: các ngày đã chọn còn nguyên. Chọn Rời trang mới thoát. Sau khi gửi thành công, thoát không hiện cảnh báo bản nháp.
- Trên màn hình hẹp, bảng đủ bảy cột, ngày quá khứ xám, nút gửi không bị thanh điều hướng che. Kiểm tra thêm thao tác quay lại hệ thống trên Android/iOS.

Kiểm tra ngày 06/09/2026: backend đạt 49 test; Gateway đạt 3 test DTO; kiểm tra tích hợp với MongoDB riêng đạt. Luồng xem/sửa/hủy cấu hình, giữ bản nháp khi chuyển tab, cảnh báo rời trang và gửi lịch tháng đã chạy đạt trên Chrome ở kích thước 390 × 844 với API giả lập. Kiểm tra trình duyệt không thay thế kiểm tra trên thiết bị Android/iOS.
