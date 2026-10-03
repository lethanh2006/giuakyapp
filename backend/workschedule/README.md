# WorkSchedule

Nhân viên đăng ký lịch theo tháng, xem trạng thái duyệt và chấm công. Quản lý mở đợt đăng ký, duyệt lịch, chỉnh các ngày chưa qua và tạo mã QR.

## Yêu cầu MongoDB

Mặc định đội dùng chung **MongoDB Atlas dev**, database `nrapp_dev`. Atlas hỗ trợ transaction nên không cần chạy MongoDB Docker khi phát triển. Nếu chủ động dùng MongoDB local, MongoDB phải chạy dạng **replica set**; Compose profile `local-mongo` của dự án tự khởi tạo `rs0`. Service kiểm tra khả năng này lúc khởi động và báo lỗi rõ nếu kết nối tới MongoDB standalone.

Các thao tác tạo, gửi lại, sửa, xóa và duyệt lịch sử dụng transaction để lưu yêu cầu, các ngày đăng ký và chấm công từ xa cùng lúc. Nếu một bước lỗi, toàn bộ thay đổi được hoàn tác. Khi hai thao tác cùng sửa một yêu cầu, MongoDB thử lại transaction với dữ liệu mới nhất; lịch đã duyệt không bị một lần gửi lại thất bại ghi đè.

Chạy `npm run setup` tại thư mục gốc, sau đó điền URI Atlas dev do trưởng nhóm cung cấp riêng vào `backend/.env`:

```dotenv
MONGO_MODE=atlas
MONGO_URL=mongodb+srv://<db_user>:<url_encoded_password>@<dev_cluster>/nrapp_dev?retryWrites=true&w=majority
MONGO_DB_NAME=nrapp_dev
```

`MONGO_DB_NAME` quyết định database sử dụng, kể cả khi URI chứa tên database khác. Các thành viên cùng kết nối sẽ thấy chung dữ liệu lịch và chấm công dev. Không commit URI chứa mật khẩu thật.

Bật nhóm lịch làm việc từ thư mục gốc; runner bật hạ tầng local cần thiết và các service ở chế độ watch:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail,workschedule
```

Chạy `npm run dev:backend` khi cần kiểm tra toàn bộ ứng dụng. Nếu chạy riêng service, cần tự bật các dependency. Service đọc `backend/.env` trước `.env` riêng, nên cấu hình Mongo tập trung vẫn áp dụng khi chạy trực tiếp.

MongoDB Docker là lựa chọn riêng khi đặt `MONGO_MODE=local`, dùng profile `local-mongo` và URI replica set `rs0`. Xem [hướng dẫn local](../../README.md) để chuyển chế độ.

## Chuyển dữ liệu lịch tuần sang luồng tháng

Không cần xóa lịch cũ. Lịch tuần vẫn được hiển thị; thao tác đăng ký mới dùng `month` dạng `YYYY-MM`. Khi khởi động, service tạo unique index theo nhân viên và tháng trước khi bỏ unique index tuần cũ. Lịch từ xa mới có `schedule_request_id`, vì vậy sửa hoặc xóa lịch tháng không xóa chấm công của lịch tuần cũ.

Ngày đăng ký và giới hạn ngày đã qua được tính theo giờ Việt Nam. Một đợt đăng ký chỉ nằm trong một tháng; policy cũ kéo dài qua hai tháng được hiển thị ở trạng thái khóa để quản lý cấu hình lại.

## Kiểm tra

```bash
npm test -- --runInBand
npm run build
npm run lint
```

### Kiểm tra tích hợp luồng tháng

```bash
npm run test:e2e
```

Cần cài dependency của cả `workschedule` và `gateway`, cùng Docker đang chạy. Lệnh tự build hai dịch vụ, khởi tạo MongoDB replica set tạm bằng image `mongo:7.0`, rồi gọi HTTP qua Gateway. Có thể dùng `MONGOD_BINARY=/đường/dẫn/mongod npm run test:e2e` nếu đã cài MongoDB trên máy.

Bài kiểm tra dùng database, cổng và tài khoản giả lập riêng; không đọc `.env` của dịch vụ và không ghi vào dữ liệu đang sử dụng. Gateway và WorkSchedule chạy thật; xác thực và danh bạ dùng HTTP fixture. Container MongoDB cùng các tiến trình kiểm tra được dừng khi hoàn tất. Nếu lỗi, đường dẫn nhật ký trong thư mục tạm được in ra để chẩn đoán.

Các tình huống gồm phân quyền mở đợt, chặn khoảng ngày vắt tháng, lịch sai tháng/ngày quá khứ, đăng ký trùng, gửi lại đồng thời, duyệt và sửa đồng thời, đồng bộ chấm công từ xa, tổng hợp tháng, giữ lịch tuần cũ và khóa đăng ký. Bản build được sao chép sang thư mục tạm để tiến trình phát triển tự biên dịch lại không xóa file dịch vụ đang kiểm tra.
