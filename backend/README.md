# NRApp backend local

Backend gồm chín service NestJS. Mã nguồn và package log dùng chung nằm trong
cùng repo. Xem [hướng dẫn cho thành viên mới](../README.md) để chạy BE và FE.

## Khởi chạy

Tại thư mục gốc của dự án, chạy `npm run setup` lần đầu. Điền URI MongoDB Atlas
dev do chủ project cung cấp riêng vào `backend/.env`:

```env
MONGO_MODE=atlas
MONGO_URL=mongodb+srv://<db_user>:<url_encoded_password>@<dev_cluster>/nrapp_dev?retryWrites=true&w=majority
MONGO_DB_NAME=nrapp_dev
```

Chủ project cần thêm **IP public** của từng máy chạy BE vào Atlas Network
Access. Để xem dữ liệu bằng Atlas Data Explorer, chủ project mời email thành
viên vào project và cấp quyền xem dữ liệu phù hợp. Database user trong URI dùng
để kết nối BE/Compass; quyền vào giao diện Atlas được cấp qua lời mời project.

Sau đó từ `backend/`:

```bash
npm run dev
```

Runner bật Docker Compose chứa **hạ tầng local**, chờ healthy rồi chạy Node
service ở chế độ watch. MongoDB mặc định kết nối **Atlas dev dùng chung**, đã
hỗ trợ transaction của Auth, User và WorkSchedule.

Auth, User, Chat, Todo, WorkSchedule và Canteen dùng chung database
**`nrapp_dev`** trên Atlas; dữ liệu đã lưu được chia sẻ giữa các thành viên.
Redis, RabbitMQ, Mailpit và PostgreSQL vẫn chạy trên từng máy. Redis, RabbitMQ
và PostgreSQL lưu dữ liệu trong volume của project `nrapp-local-dev`. Payment
dùng PostgreSQL local database `nrapp_payment`.

| Service Node | Port |
| --- | --- |
| Gateway | 3000 |
| Auth | 4000 |
| User | 5000 |
| Mail | 5001 |
| Chat | 5002 |
| Todo | 5003 |
| WorkSchedule | 5004 |
| Canteen | 5005 |
| Payment | 5006 |

Gateway API: `http://localhost:3000/api`. Swagger:
`http://localhost:3000/api-docs`. Gateway nhận request từ web/emulator/điện
thoại qua LAN và forward HTTP, Socket.IO đến các service local.

## Env

`backend/.env` chứa cấu hình MongoDB chung (`MONGO_MODE`, `MONGO_URL`,
`MONGO_DB_NAME`), cổng hạ tầng, tài khoản local và secret dùng chung. Cấu hình
Mongo ở đây áp dụng cho cả sáu service Mongo; `MONGO_DB_NAME` chọn database,
kể cả khi URI chứa tên database khác. Các service đọc `backend/.env` trước
`.env` riêng. Env trong từng service chứa cấu hình riêng như Google, Cloudinary
và Payment demo. Runner đồng bộ credential và URL local khi khởi chạy, kể cả
khi thay cổng hạ tầng.
Không đặt `PORT` trong `backend/.env`; dùng các biến `AUTH_HOST_PORT`,
`CHAT_HOST_PORT`, … để từng service có cổng riêng.

`npm run setup` tại thư mục gốc sinh các secret ngẫu nhiên và điền vào template.
Không sao chép nguyên `.env.example` của BE để chạy, vì các marker `__…__` cần
được setup thay bằng giá trị thực. Để chỉ tạo env:

```bash
npm run setup -- --env-only
```

Lệnh giữ env có sẵn. Thêm `--reset-env` để sao lưu env cũ rồi tạo cấu hình local
mới. Không dùng tùy chọn này hằng ngày: RabbitMQ/PostgreSQL trong volume giữ
credential được tạo lần đầu. URI Atlas chứa mật khẩu thật chỉ lưu trong env đã
được Git bỏ qua; mỗi thành viên nhận URI qua kênh riêng từ chủ project.

## Hạ tầng

```bash
npm run infra:up
npm run infra:logs
npm run infra:down
```

Ở chế độ mặc định `MONGO_MODE=atlas`, các container gồm Redis, RabbitMQ,
PostgreSQL Payment và Mailpit; MongoDB nằm trên Atlas. Những container local
chỉ publish cổng ở `127.0.0.1`.
Mailpit mặc định nhận SMTP ở `1025`, không cần tài khoản SMTP; mở
`http://localhost:8025` để lấy OTP. [Cấu hình SMTP của Mailpit](https://mailpit.axllent.org/docs/configuration/smtp/).

Đăng ký chỉ lưu tài khoản; **đăng nhập bằng mật khẩu** mới phát OTP.
Runner local ép SMTP về Mailpit, vì vậy Gmail thật sẽ không nhận thư. Cần
service `mail` đang chạy để tiêu thụ queue `send-otp`. Đăng nhập, đọc OTP và
verify cần dùng **cùng một BE**: OTP và phiên xác thực được lưu trong Redis
local của máy phát mã. Cách mở Atlas Data Explorer/Compass, xem collection tài
khoản và kiểm tra OTP nằm trong [README gốc](../README.md).

Khi chủ động dùng database riêng trên máy, đặt `MONGO_MODE=local` và
`MONGO_DB_NAME=nrapp_local` trong `backend/.env`, rồi chạy lại runner. Runner
bật thêm MongoDB 7.0 qua profile `local-mongo`, tự khởi tạo replica set `rs0`
và tạo URI theo `MONGO_HOST_PORT`. Dữ liệu này nằm trong volume
`nrapp-local-dev_mongo_data` với tên project mặc định, riêng trên từng máy.

Nhấn `Ctrl+C` dừng các process Node do runner tạo, hạ tầng vẫn chạy và giữ dữ
liệu. `infra:down` dừng container, giữ volume. Không có bước build image app,
CI/CD, VPS, Nginx, monitoring hoặc deploy trong luồng này.

Nếu đã tự khởi động các dependency local, có thể bỏ qua bước Docker:

```bash
npm run dev:apps
```

## Chỉ chạy các service cần sửa/test

Từ `backend/`, ví dụ cần test chat qua FE:

```bash
npm run dev -- --services=gateway,auth,user,mail,chat
```

Hoặc từ thư mục gốc:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail,chat
```

Không truyền `--services` thì chạy cả chín service. Khi có danh sách, runner
chỉ kiểm tra env/dependency/port và chạy Node watch của những service đã chọn;
vẫn đồng bộ URL, secret và cổng hạ tầng. Hạ tầng Docker vẫn được bật đủ.
`--services` không tự thêm dependency; nhóm `gateway,auth,user,mail` phục vụ
đăng nhập/hồ sơ, rồi thêm `chat`, `todo`, `workschedule` hoặc `canteen` theo
màn hình cần test. Xem bảng nhóm service và quy trình commit/push trong
[README gốc](../README.md).

**Chạy Auth và User cùng nhau** khi thử luồng tài khoản. Hai service dùng
chung dữ liệu/outbox trên Atlas nhưng xử lý queue RabbitMQ của từng máy; để
Auth chạy riêng có thể khiến hồ sơ user chưa được đồng bộ cho luồng đang thử.

Khi test chat realtime giữa hai tài khoản, cả hai FE phải kết nối **cùng một
Gateway/BE**, ví dụ máy tính và điện thoại cùng dùng BE trên một máy. Lịch sử
chat được chia sẻ qua Atlas; các kết nối Socket.IO và sự kiện realtime do BE
đang chạy quản lý riêng.

Nếu hạ tầng đã chạy, thêm `--skip-infra` để không gọi Docker Compose:

```bash
npm run dev -- --skip-infra --services=gateway,auth,user,mail,todo
```

Chạy `npm run dev -- --help` để xem cú pháp. Dừng phiên đang chạy bằng
`Ctrl+C` trước khi đổi nhóm; không chạy cùng một service trong hai terminal.
Chỉ chạy `--services=todo` phù hợp khi thử trực tiếp service và tự cung cấp
dependency/chữ ký cần thiết. Unit test có mock có thể chạy riêng mà không
cần FE/cả BE.

Có thể dùng `npm run start:dev` trong từng service từ IDE, nhưng cách này
không tự ánh xạ `*_HOST_PORT` thành các URL local. Khi dùng cổng tùy chỉnh,
hoặc chọn `MONGO_MODE=local`, dùng runner ở trên để nhận URI và cổng đúng.

## Kiểm tra và đọc source

Các lệnh kiểm tra được chạy trực tiếp trong service cần sửa:

```bash
npm run lint
npm test
npm run build
```

Dừng BE watch trước khi build. Các service dùng Jest hỗ trợ `--runInBand`;
Gateway dùng Node test runner, `npm test` đã tự build nên không cần build thêm
hay truyền cờ Jest. FE kiểm tra bằng lint/typecheck ở `Nrapp/`. Chạy kiểm tra
các phần đã sửa và thử luồng FE–BE liên quan trước khi push lên nhánh riêng.

Đọc `src/main.ts` → `src/app.module.ts` → `src/core/core.module.ts` →
`src/modules/<nghiệp-vụ>/`. `COMMON.md` của từng service mô tả request, role,
chữ ký nội bộ và response. Package `logger/packages/observability` cung cấp
logger và request ID; đây là dependency runtime của các service.

Google OAuth, Cloudinary và Casso là tích hợp tùy chọn. Email/OTP và chat chữ
không cần các tài khoản này. Payment khởi động bằng thông tin demo trong env,
nhưng Gateway chưa có module Payment; FE căn tin dùng thanh toán tiền mặt.
