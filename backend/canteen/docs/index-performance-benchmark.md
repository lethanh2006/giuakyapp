# Benchmark hiệu năng MongoDB index

## Con số trung bình để trình bày

> Đo 22 cặp truy vấn/index từ các service MongoDB với 30.000 bản ghi giả lập
> mỗi kịch bản và 4 user đồng thời. Median trung bình theo kịch bản giảm từ
> **292,2 ms xuống 35,5 ms (87,8%, nhanh hơn 8,2 lần)**; số document được xét
> trong query plan giảm trung bình **99,36%**. Cả 22 kịch bản đều có median
> thấp hơn khi dùng index.

Đây là trung bình **không trọng số**: mỗi loại truy vấn được tính ngang nhau vì
chưa có tỉ lệ traffic production theo endpoint. Trung bình phần trăm giảm median
riêng của từng kịch bản là **84,9%**; chênh lệch với 87,8% là do các kịch bản có
latency nền khác nhau.

## Kết quả từng truy vấn

Mỗi hàng là median latency của 20 mẫu, chạy bởi 4 client đồng thời. “Quét” là
số document được MongoDB xét theo `executionStats`.

| Service / truy vấn | Không index | Có index | Giảm latency | Quét document |
| --- | ---: | ---: | ---: | ---: |
| Auth / đăng nhập theo email | 317,481 ms | 19,382 ms | 93,9% | 30.000 → 1 |
| Auth / lấy sự kiện outbox pending | 304,535 ms | 71,286 ms | 76,6% | 30.000 → 1.000 |
| Chat / danh sách hội thoại theo user | 419,668 ms | 90,428 ms | 78,5% | 30.000 → 20 |
| Chat / lịch sử tin nhắn theo chat | 301,126 ms | 13,219 ms | 95,6% | 30.000 → 50 |
| Chat / đếm tin chưa đọc | 290,925 ms | 6,946 ms | 97,6% | 30.000 → 0 (covered by index) |
| Todo / việc được giao | 333,154 ms | 69,436 ms | 79,2% | 30.000 → 20 |
| Todo / việc do user tạo | 305,459 ms | 12,195 ms | 96,0% | 30.000 → 20 |
| WorkSchedule / lịch theo nhân viên và tuần | 300,891 ms | 78,723 ms | 73,8% | 30.000 → 20 |
| WorkSchedule / yêu cầu đang chờ | 213,542 ms | 6,319 ms | 97,0% | 30.000 → 20 |
| WorkSchedule / lookup tháng duy nhất | 70,982 ms | 60,783 ms | 14,4% | 5.543 → 516 |
| WorkSchedule / đơn cá nhân | 298,333 ms | 6,347 ms | 97,9% | 30.000 → 20 |
| WorkSchedule / kiểm tra đơn trùng | 302,054 ms | 4,820 ms | 98,4% | 30.000 → 2 |
| WorkSchedule / lịch theo request | 191,048 ms | 17,509 ms | 90,8% | 30.000 → 10 |
| WorkSchedule / chấm công cá nhân | 281,059 ms | 18,942 ms | 93,3% | 30.000 → 20 |
| WorkSchedule / tìm token QR | 300,264 ms | 2,537 ms | 99,2% | 30.000 → 1 |
| Canteen / danh sách đơn mới nhất | 489,329 ms | 24,805 ms | 94,9% | 30.000 → 20 |
| Canteen / lọc đơn theo trạng thái | 203,570 ms | 98,257 ms | 51,7% | 30.000 → 20 |
| Canteen / lịch sử đơn theo user | 294,000 ms | 80,055 ms | 72,8% | 30.000 → 20 |
| Canteen / kiểm tra đơn đang mở theo bàn | 300,277 ms | 3,826 ms | 98,7% | 30.000 → 60 |
| Canteen / món theo danh mục và trạng thái bán | 209,079 ms | 9,084 ms | 95,7% | 30.000 → 60 |
| Canteen / sắp xếp danh mục | 401,898 ms | 5,155 ms | 98,7% | 30.000 → 20 |

Index outbox `{publishedAt, nextAttemptAt}` vẫn cần bước `SORT` theo thời gian
tạo sự kiện; đây là kịch bản tăng chậm nhất trong bộ test. Index giảm số document
được xét nhưng chưa tối ưu được phần sắp xếp đó.

### Chỗ index hiện tại chưa bao phủ truy vấn

- User Service lấy danh sách và sắp xếp theo `username, _id`, nhưng schema chỉ
  có unique index trên `email`; index email không giúp bước lọc/sắp xếp này.
- Attendance report có thể lọc theo `date` mà không có `employee_id`, trong khi
  index AttendanceRecord bắt đầu bằng `employee_id`; truy vấn ngày toàn cục không
  được index đó thu hẹp.
- Menu search sort theo `name`, còn index hiện tại là
  `{categoryId, isAvailable}`; nó giúp lọc món nhưng không bỏ được sort theo tên.

Các truy vấn này không được đưa vào trung bình vì hiện không có index schema phù
hợp để so sánh. Chỉ nên thêm index mới nếu lượng dữ liệu và tần suất truy vấn
đủ lớn để bù chi phí ghi và lưu trữ.

## Cách đo

- Chạy ngày 24/09/2026 trên VPS, MongoDB 8.0.32 tạm trong container riêng;
  MongoDB bị giới hạn 0,35 CPU / 640 MiB RAM, WiredTiger cache 0,25 GiB.
- Mỗi kịch bản tạo 30.000 document giả lập. Có 4 client đồng thời, mỗi client
  chạy 5 truy vấn đo cho mỗi phương án và 2 lượt warm-up.
- Cùng bộ dữ liệu và cùng điều kiện lọc/sắp xếp được đo theo hai plan: ép quét
  collection bằng `$natural`, rồi ép dùng index schema. Script xác nhận hai plan
  trả cùng kết quả.
- Đây là kết nối MongoDB trực tiếp, không đo HTTP, Gateway, mạng Atlas, auth,
  thời gian dựng index hoặc chi phí ghi trung bình cho toàn bộ schema.
- Trung bình mỗi kịch bản được tính ngang nhau, không dựa trên traffic thực.
  Category là bảng tham chiếu nhỏ ngoài đời nhưng được giả lập cùng 30.000 dòng;
  vì vậy đây là so sánh ở quy mô stress test, không phải dự báo latency production.
- Payment không nằm trong phép đo vì service đang ngắt kết nối. TTL index và
  unique index chỉ phục vụ vòng đời dữ liệu/toàn vẹn mà không có truy vấn đọc
  tương ứng không được tính như index tăng tốc đọc. Index mặc định `_id_` cũng
  không được tính vào trung bình.
- Chỉ dùng database test riêng; container benchmark và dữ liệu đã được xóa.
  Sau khi chạy, các container ứng dụng vẫn healthy.

## Một phép đo sâu hơn cho Order history

Index `{userId: 1, createdAt: -1, _id: -1}` trong
`canteen/src/schemas/orders.schema.ts` được đo riêng với 100.000 đơn và 4 user,
mỗi user gửi 25 truy vấn.

| Chỉ số | Không index | Có index | Thay đổi |
| --- | ---: | ---: | ---: |
| Median | 1.179 ms | 90,796 ms | giảm 92,3% |
| p95 | 1.896,765 ms | 205,367 ms | giảm 89,2% |
| Throughput | 3,4 query/s | 43,3 query/s | tăng 12,74 lần |
| Document được xét | 100.000 | 20 | ít hơn 99,98% |

Phép đo ghi riêng so sánh một compound index với collection chỉ có `_id_`, ghi
7 lô, mỗi lô 15.000 đơn. Mean ghi tăng 4,9%, median gần như ngang nhau (-0,5%),
nên chưa xác định được overhead ghi chính xác. Index thêm 741.376 bytes (khoảng
724 KiB) cho 15.000 đơn; thời gian dựng index trên dữ liệu đã có không nằm trong
phép đo.

## Giới hạn khi dùng số liệu

Không nên ghi CV hoặc báo cáo rằng toàn ứng dụng production nhanh hơn 8,2 lần.
Đó là trung bình có kiểm soát của 22 query/index trên dữ liệu giả lập, không
trọng số theo mức độ sử dụng từng endpoint. Trong lần kiểm tra database ứng dụng
trước đó, Orders chỉ có 2 bản ghi nên chưa thấy lợi ích latency đáng kể; thời
gian mạng khoảng 50 ms lấn át thời gian tìm kiếm trong MongoDB.

Các script và kết quả thô:

- `scripts/benchmark-index-suite.cjs`: benchmark 22 cặp truy vấn/index.
- `canteen/scripts/benchmark-index-performance.mongosh.js`: đọc tuần tự và chi
  phí ghi của Order history.
- `canteen/scripts/benchmark-index-concurrent.cjs`: 4 user đồng thời cho Order
  history.
- `canteen/docs/index-suite-results-2026-09-24.json`: plan, latency và document
  examined của cả 22 kịch bản.
