# NRApp — chạy local cho team

Repo gồm FE Expo/React Native ở `Nrapp/` và các service NestJS ở `backend/`.
Mỗi thành viên chạy BE, FE và dữ liệu riêng trên máy của mình.

## Chuẩn bị máy

- Node.js **22** và npm. Nếu dùng nvm: `nvm install` rồi `nvm use`.
- Docker Desktop trên Windows/macOS, hoặc Docker Engine + Compose v2 trên Linux.
  Bật Docker trước khi chạy BE. Windows có thể dùng các lệnh npm trong PowerShell.
- Muốn thử mobile: Expo Go trên điện thoại cùng Wi-Fi, hoặc Android Emulator.
  Bản web chạy bằng trình duyệt, không cần Android Studio.

Lần đầu cần Internet để tải dependency và Docker image. Không cần tài khoản
deploy, Gmail, MongoDB Atlas hoặc cấu hình GitHub Secrets.

## Lần đầu sau khi clone

Mở terminal tại **thư mục gốc**, nơi có file README này và `package.json`:

```bash
npm run setup
```

Lệnh này cài dependency cho FE, các service BE và package log dùng chung;
tạo `backend/.env`, env từng service và `Nrapp/.env`; sinh JWT/secret đồng bộ
riêng cho máy đó. File `.env` và bản sao lưu được Git bỏ qua. Chỉ commit source,
lockfile và `.env.example`.

`npm run setup` giữ nguyên env đã tồn tại. Nếu mang env từ repo cũ sang, dùng
`npm run setup -- --reset-env` một lần: env cũ được sao lưu trong
`.local-env-backups/`, rồi thay bằng cấu hình local. Lệnh này cũng bỏ
`.env.local` cũ sau khi sao lưu để Expo không đọc nhầm URL.

## Chạy mỗi ngày

Terminal 1 — BE:

```bash
npm run dev:backend
```

Lệnh chờ MongoDB, Redis, RabbitMQ, PostgreSQL và Mailpit local sẵn sàng,
rồi chạy cả chín Node service ở chế độ watch. Docker chỉ chạy hạ tầng;
code BE chạy trực tiếp trên máy và tự biên dịch lại khi sửa.

Terminal 2 — FE web:

```bash
npm run dev:web
```

Mở URL Expo in trong terminal, mặc định `http://localhost:8081`.

Hoặc chạy FE mobile:

```bash
npm run dev:mobile
```

Nhấn `a` để mở Android Emulator. API tự dùng `10.0.2.2:3000` trên emulator,
`localhost:3000` trên web và iOS Simulator. Chat Socket.IO đi qua Gateway
cổng 3000, nên không phải đổi riêng URL chat.

## Hai bạn sửa code và test local thế nào?

Sau lần setup đầu, mỗi bạn làm trên nhánh Git và database local riêng. Không
cần chạy lại `npm run setup` mỗi lần sửa code hoặc mỗi lần khởi động máy.

- Sửa code **BE**: giữ terminal BE đang chạy. Nest watch tự biên dịch và khởi
  động lại service có file thay đổi; chờ log hết lỗi rồi thao tác lại trên FE.
- Sửa code **FE**: giữ Expo đang chạy. Fast Refresh cập nhật giao diện; nếu
  thay đổi chưa hiện, reload ứng dụng/trình duyệt.
- Sửa **`.env`**: dừng rồi chạy lại BE hoặc Expo tương ứng. FE có thể chạy lại
  bằng `npm run dev:web -- --clear` sau khi đổi env.
- Thêm/đổi dependency: dùng `npm install` trong đúng thư mục có `package.json`
  của service/FE; commit cả `package.json` và `package-lock.json`. Bạn còn lại
  sau khi pull chạy `npm ci` trong thư mục đó. Nếu nhiều phần đổi dependency,
  có thể chạy `npm run setup` ở gốc; lệnh này giữ env hiện tại.
- Đổi/thêm biến env cần cho cả nhóm: cập nhật `.env.example` và hướng dẫn,
  mỗi bạn điền vào `.env` trên máy mình. Không chạy `--reset-env` hằng ngày.

### Có cần chạy cả BE khi chỉ sửa một vài service?

**Không bắt buộc.** Chọn theo việc đang kiểm tra:

| Việc đang làm | Cần chạy gì? |
| --- | --- |
| Unit test BE có mock, lint hoặc build | Chạy lệnh kiểm tra trong service; không cần bật FE/cả BE |
| Sửa giao diện FE và xem dữ liệu thật | Expo + nhóm BE phục vụ màn hình đó |
| Sửa API một service rồi test qua FE | Nhóm đăng nhập + service đó + Expo |
| Sửa đồng thời nhiều chức năng, Auth/Gateway hoặc muốn kiểm tra toàn bộ app | Chạy cả cụm bằng `npm run dev:backend` + Expo |

Nhóm BE dưới đây bao gồm đăng ký, đăng nhập OTP và đọc hồ sơ, để không phải
bỏ qua bước xác thực khi test tính năng:

| Tính năng cần test trên FE | Danh sách Node service |
| --- | --- |
| Đăng ký, OTP, hồ sơ, danh bạ | `gateway,auth,user,mail` |
| Chat | `gateway,auth,user,mail,chat` |
| Todo / công việc | `gateway,auth,user,mail,todo` |
| Lịch làm việc / chấm công / đơn nhân sự | `gateway,auth,user,mail,workschedule` |
| Căn tin / thanh toán tiền mặt | `gateway,auth,user,mail,canteen` |

Ví dụ **chỉ sửa chat**, terminal BE tại thư mục gốc:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail,chat
```

Ví dụ **sửa cả Todo và lịch làm việc**:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail,todo,workschedule
```

Terminal FE vẫn dùng `npm run dev:web` hoặc `npm run dev:mobile` như bình
thường. Runner chỉ chạy các Node service được liệt kê, tự lấy env/cổng local
và bật hạ tầng Docker. `--services` **không tự thêm service phụ thuộc**; dùng
các nhóm trong bảng. Phần hạ tầng nhỏ vẫn được bật đủ, còn các Node service
không chọn sẽ không biên dịch hoặc chạy.

Nếu muốn thử trực tiếp một service BE, ví dụ `todo`, có thể dùng
`npm run dev:backend -- --services=todo`. Tự bổ sung các dependency được API
đó gọi; API được bảo vệ còn cần identity/chữ ký hợp lệ. Để test qua FE/Swagger,
dùng nhóm có Gateway trong bảng sẽ thuận tiện hơn.

Payment hiện chưa nối Gateway/FE. Phát triển riêng bằng
`npm run dev:backend -- --services=payment`, chạy test của Payment và kiểm tra
API nội bộ có chữ ký; không dùng màn hình căn tin để kết luận Payment đã hoạt động.

**Dừng phiên BE hiện tại bằng `Ctrl+C` trước khi đổi nhóm service.** Không chạy
cả cụm và một nhóm có cùng service đồng thời vì sẽ trùng port. Trong chế độ
chọn service, các màn hình dùng service chưa bật có thể báo lỗi; chat nền cũng
không kết nối nếu chưa bật `chat`. Muốn kiểm tra toàn bộ ứng dụng thì chạy cả cụm.
Gateway `/health` chỉ xác nhận Gateway đang chạy; vẫn phải thao tác API/tính
năng cần test để kiểm tra các service phía sau. API có token vẫn cần Auth vì
Gateway xác minh token qua Auth.

### Kiểm tra trước khi commit/push

Trước tiên thử tính năng đã sửa trên FE/API local: trường hợp thành công,
validation dữ liệu sai và quyền user/admin nếu có thay đổi quyền. Nếu đổi
request/response giữa FE và BE, thử cả hai đầu cùng phiên bản code. Ví dụ sửa
chat thì đăng nhập hai tài khoản, gửi tin nhắn và kiểm tra bên nhận cập nhật.

Sau khi test thao tác, dừng BE watch trước các lệnh build để tránh ghi đè
`dist` của service đang chạy. Từ thư mục gốc, chỉ kiểm tra các phần đã sửa.
Ví dụ đã sửa **Chat và FE**:

```bash
npm --prefix backend/chat run lint
npm --prefix backend/chat test -- --runInBand
npm --prefix backend/chat run build
npm --prefix Nrapp run lint
npm --prefix Nrapp run typecheck
```

Thay `chat` bằng service thực tế. Chỉ sửa BE thì không cần chạy kiểm tra FE;
chỉ sửa FE thì chạy hai lệnh FE và thử màn hình với BE đang dùng. Nếu sửa hai
service, chạy lint/test/build cho cả hai. Unit test có mock không cần khởi động
cả cụm; integration test có thể cần Docker hoặc dependency riêng.

**Gateway dùng Node test runner**, chạy riêng như sau; không thêm `--runInBand`:

```bash
npm --prefix backend/gateway run lint
npm --prefix backend/gateway test
```

Lệnh test Gateway tự build trước khi chạy. Khi sửa luồng lịch làm việc có
transaction, có thể chạy thêm bài kiểm tra tích hợp đã có:

```bash
npm --prefix backend/workschedule run test:e2e
```

Bài này cần Docker, tự tạo dữ liệu/tiến trình tạm. Nếu sửa package log dùng
chung, chạy `npm --prefix backend/logger/packages/observability test` và kiểm
tra các service chịu ảnh hưởng. Không cần chạy lại mọi bài test cho thay đổi
chỉ nằm ở một service độc lập.

### Quy trình Git cho hai thành viên

1. Lưu/commit phần đang làm trước khi đổi nhánh. Lấy code mới từ nhánh chung
   rồi tạo nhánh riêng, ví dụ (thay `main` nếu nhóm dùng tên nhánh khác):

   ```bash
   git switch main
   git pull --ff-only
   git switch -c feature/ten-ban-chat
   ```

2. Sửa code, chạy nhóm BE/FE cần thiết, test thao tác và chạy các kiểm tra ở
   trên. Hai bạn có thể chạy local đồng thời trên hai máy; không dùng chung DB.
3. Kiểm tra diff, chỉ stage những file của công việc đó. Ví dụ sửa chat:

   ```bash
   git status
   git diff
   git add backend/chat/src Nrapp/src/features/chat
   git diff --cached
   git commit -m "feat(chat): mo ta thay doi"
   git push -u origin HEAD
   ```

   Điều chỉnh danh sách file nếu sửa service khác, config, test hoặc lockfile.
   Giữ `.env`, token và `.local-env-backups/` trên máy; chia sẻ cấu hình mới
   qua `.env.example` và README.
4. Tạo pull request từ nhánh riêng về nhánh chung. Ghi đã sửa gì, cách chạy
   local để kiểm tra, các lệnh test đã pass và có cần thêm env/migration không.
   Người còn lại review trước khi merge. Sau merge, pull code mới, cài lại
   dependency ở phần có lockfile thay đổi và thử luồng liên quan trên máy mình.

Push chỉ đưa code lên Git của nhóm. Repo này không tự deploy khi push.

## Điện thoại thật qua Wi-Fi

Máy chạy BE và điện thoại phải cùng mạng. Tìm IPv4 LAN của máy bằng `ipconfig`
(Windows) hoặc phần Network của hệ điều hành. Ví dụ máy có IP `192.168.1.10`,
sửa `Nrapp/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
EXPO_PUBLIC_SOCKET_URL=
```

Sau đó chạy:

```bash
cd Nrapp
npm run start:lan
```

Quét QR bằng Expo Go. Nếu máy hỏi firewall, cho phép Node trên mạng riêng.
Thử mở `http://192.168.1.10:3000/health` từ điện thoại để kiểm tra kết nối BE.
Sau khi đổi env, dừng Expo rồi chạy lại với `npm run start:lan -- --clear`.

## Tài khoản và OTP

Database local ban đầu trống. Đăng ký tài khoản trên FE, sau đó đăng nhập bằng
email/mật khẩu. Mở **http://localhost:8025** để đọc thư OTP do Mailpit nhận,
rồi nhập mã vào FE. Email thử nghiệm không cần là hộp thư thật; thư được giữ
trong Mailpit local.

Google Sign-In để trống mặc định. Muốn thử tính năng này cần OAuth client ID
riêng ở FE và Auth, cùng native development build có Google Sign-In. Expo Go
và web dùng đăng nhập email/OTP. Chat chữ chạy ngay; gửi ảnh cần điền Cloudinary
riêng trong `backend/chat/.env`. Các cấu hình này là tùy chọn.

Payment chạy PostgreSQL local và tự tạo bảng qua migration. Thông tin VietQR
là dữ liệu mẫu, chưa nối Casso thật. Gateway hiện chưa đăng ký module Payment;
FE căn tin đang dùng thanh toán tiền mặt.

## Địa chỉ local

| Thành phần | Địa chỉ mặc định |
| --- | --- |
| FE web | `http://localhost:8081` |
| Gateway API | `http://localhost:3000/api` |
| Swagger | `http://localhost:3000/api-docs` |
| Mailpit — xem OTP | `http://localhost:8025` |
| RabbitMQ UI | `http://localhost:15672` |
| MongoDB | `mongodb://127.0.0.1:27017/nrapp?replicaSet=rs0&directConnection=true` |
| PostgreSQL Payment | `127.0.0.1:5433` |

Tài khoản RabbitMQ và PostgreSQL nằm trong `backend/.env`. Các cổng hạ tầng
chỉ mở ở loopback; điện thoại chỉ cần truy cập Gateway và Expo.

## Dừng và xử lý lỗi thường gặp

Nhấn `Ctrl+C` tại hai terminal để dừng BE/FE. Hạ tầng vẫn giữ dữ liệu. Dừng
hạ tầng khi không dùng:

```bash
npm run infra:down
```

- **Docker chưa chạy:** bật Docker rồi chạy lại BE.
- **Trùng port:** dừng phiên dev cũ hoặc đổi các biến `*_HOST_PORT` trong
  `backend/.env`. Nếu đổi Gateway port, đổi `EXPO_PUBLIC_API_PORT` hoặc URL
  đầy đủ trong `Nrapp/.env`. Runner không tự dừng process/container của dự án khác.
- **Env mới, volume DB cũ:** RabbitMQ/PostgreSQL giữ tài khoản được tạo lần đầu.
  Khôi phục credential phù hợp từ bản sao lưu; đổi mật khẩu trong env không tự
  đổi mật khẩu database. `--reset-env` tạo secret mới, không xóa dữ liệu DB.
- **Không nhận OTP:** kiểm tra log `[mail]`, `[auth]` và Mailpit, rồi thử đăng
  nhập lại sau một phút.
- **Lỗi Mongo transaction:** dùng Mongo của Compose đã có replica set `rs0`;
  Mongo standalone cài riêng sẽ không chạy được luồng này. [Tài liệu MongoDB](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/).

Chi tiết từng phần: [BE](backend/README.md), [FE](Nrapp/README.md).
