# NRApp — chạy local cho team

Repo gồm FE Expo/React Native ở `Nrapp/` và các service NestJS ở `backend/`.
Mỗi thành viên chạy BE và FE trên máy của mình. Auth, User, Chat, Todo,
WorkSchedule và Canteen cùng dùng database Atlas dev **`nrapp_dev`** của nhóm.
Redis, RabbitMQ, Mailpit và PostgreSQL Payment vẫn chạy Docker trên từng máy.

## Chuẩn bị máy

- Node.js **22** và npm. Nếu dùng nvm: `nvm install` rồi `nvm use`.
- Docker Desktop trên Windows/macOS, hoặc Docker Engine + Compose v2 trên Linux.
  Bật Docker trước khi chạy BE. Windows có thể dùng các lệnh npm trong PowerShell.
- Muốn thử mobile: Expo Go trên điện thoại cùng Wi-Fi, hoặc Android Emulator.
  Bản web chạy bằng trình duyệt, không cần Android Studio.

Cần Internet để kết nối Atlas, tải dependency và Docker image. Không cần tài
khoản deploy, Gmail hoặc cấu hình GitHub Secrets.

## Lần đầu sau khi clone

Mở terminal tại **thư mục gốc**, nơi có file README này và `package.json`:

```bash
npm run setup
```

Lệnh này cài dependency cho FE, các service BE và package log dùng chung;
tạo `backend/.env`, env từng service và `Nrapp/.env`; sinh JWT/secret đồng bộ
riêng cho máy đó. File `.env` và bản sao lưu được Git bỏ qua. Chỉ commit source,
lockfile và `.env.example`.

Sau khi setup, lấy URI Atlas dev từ người quản lý nhóm rồi điền vào
**`backend/.env`**. Chỉ sửa cấu hình Mongo ở file này:

```env
MONGO_MODE=atlas
MONGO_URL=mongodb+srv://<db_username>:<db_password>@cluster0.nyzuk0s.mongodb.net/nrapp_dev?appName=Cluster0
MONGO_DB_NAME=nrapp_dev
```

Thay username/password bằng database user của nhóm; URL-encode mật khẩu nếu
có ký tự đặc biệt. Runner truyền URI và tên database cho cả sáu service.
Không đặt URI Mongo trong env FE. Template chỉ chứa placeholder; người clone
repo cần nhận URI thực để chạy.

Runner dev dùng `DEV_DNS_SERVERS=1.1.1.1,8.8.8.8` trong `backend/.env` để
phân giải địa chỉ Atlas. Cấu hình này chỉ áp dụng cho các process dev; không
đổi DNS hệ điều hành. Để trống biến này nếu muốn dùng DNS sẵn có của máy.

Trên Atlas, người quản lý thêm IP public của từng máy vào **Security → Network
Access**. IP LAN `192.168.x.x` dùng cho điện thoại không phải IP public này.
Nếu đổi mạng và không kết nối được, cập nhật IP public trong danh sách.
[Hướng dẫn Network Access](https://www.mongodb.com/docs/atlas/security/add-ip-address-to-list/).

`npm run setup` giữ nguyên env đã tồn tại. Nếu mang env từ repo cũ sang, dùng
`npm run setup -- --reset-env` một lần: env cũ được sao lưu trong
`.local-env-backups/`, rồi thay bằng template dev; điền lại URI Atlas sau đó.
Lệnh này cũng bỏ
`.env.local` cũ sau khi sao lưu để Expo không đọc nhầm URL.

## Chạy mỗi ngày

Terminal 1 — BE:

```bash
npm run dev:backend
```

Lệnh bật Redis, RabbitMQ, PostgreSQL và Mailpit local, chờ healthy rồi chạy cả
chín Node service ở chế độ watch. Các service Mongo kết nối Atlas dev bằng
`backend/.env`; chế độ mặc định không bật Mongo trong Docker. Code BE chạy
trực tiếp trên máy và tự biên dịch lại khi sửa.

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

Sau lần setup đầu, mỗi bạn làm trên nhánh Git riêng và dùng chung dữ liệu
Atlas dev. Đặt email/username test có tên mình để tránh trùng dữ liệu của bạn
khác. Không cần chạy lại `npm run setup` mỗi lần sửa code hoặc khởi động máy.

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

**Luôn chạy Auth cùng User.** Outbox đăng ký dùng chung trên Atlas, nhưng mỗi
Auth chuyển sự kiện sang RabbitMQ của máy mình. Nếu một máy chỉ bật Auth mà
không bật User, hồ sơ của thành viên khác có thể bị chậm đồng bộ.

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
chat thì đăng nhập hai tài khoản trên **cùng một BE**, gửi tin nhắn và kiểm tra
bên nhận cập nhật. Dùng hai trình duyệt hoặc điện thoại cùng trỏ tới Gateway
của máy đó. Mongo chung giúp xem tin nhắn đã lưu trên mọi máy; Socket.IO hiện
chỉ phát realtime trong BE đang chạy, chưa liên thông các BE của thành viên.

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
   trên. Hai bạn có thể chạy local đồng thời trên hai máy và cùng thấy dữ liệu
   Atlas dev; thay đổi/xóa dữ liệu test sẽ có hiệu lực với cả nhóm.
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

**Local dùng Mailpit để nhận thư; OTP không gửi tới Gmail thật.** Luồng hiện
tại: đăng ký tạo tài khoản → đăng nhập bằng email/mật khẩu mới phát OTP → mở
**http://localhost:8025** trên máy chạy BE để đọc mã → nhập mã vào FE.
Đăng ký thành công chưa phát email, nên lúc đó hộp thư chưa có thư là bình thường.

Email thử nghiệm có thể là địa chỉ Gmail của bạn hoặc email bất kỳ đúng định
dạng. Thư được giữ trong Mailpit trên máy đó. Phải bật service `mail`, Auth,
User và Gateway; từ thư mục gốc:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail
```

Tài khoản được lưu chung trên Atlas, nhưng OTP và phiên đăng nhập nằm trong
Redis local. Đăng nhập và xác minh OTP qua cùng BE; đọc Mailpit của máy chạy
BE đó. Đổi sang BE của bạn khác thì đăng nhập lại để tạo phiên tại máy đó.

Nếu Mailpit trống sau khi bấm **đăng nhập**, kiểm tra log `[auth]`, `[mail]`,
`http://localhost:5001/health/ready` và RabbitMQ. Đợi một phút trước khi xin lại
OTP; mã hết hạn sau năm phút. Khi chạy trên điện thoại, mở Mailpit bằng trình
duyệt trên máy tính chạy BE; `localhost` của điện thoại là chính điện thoại.

Runner local luôn dùng SMTP Mailpit ở `127.0.0.1:1025`. Chỉ sửa SMTP Gmail
trong `backend/mail/.env` sẽ không chuyển sang gửi Gmail khi dùng runner;
việc gửi email thật cần cấu hình riêng cho SMTP và runner.

Google Sign-In để trống mặc định. Muốn thử tính năng này cần OAuth client ID
riêng ở FE và Auth, cùng native development build có Google Sign-In. Expo Go
và web dùng đăng nhập email/OTP. Chat chữ chạy ngay; gửi ảnh cần điền Cloudinary
riêng trong `backend/chat/.env`. Các cấu hình này là tùy chọn.

Payment chạy PostgreSQL local và tự tạo bảng qua migration. Thông tin VietQR
là dữ liệu mẫu, chưa nối Casso thật. Gateway hiện chưa đăng ký module Payment;
FE căn tin đang dùng thanh toán tiền mặt.

## Database dev dùng chung và cách xem dữ liệu

Database Mongo đang dùng là **`nrapp_dev`** trên cluster Atlas
**`cluster0.nyzuk0s.mongodb.net`**. Auth, User, Chat, Todo, WorkSchedule và
Canteen cùng đọc/ghi database này. BE/FE vẫn chạy trên máy từng thành viên.

Để cả nhóm xem dữ liệu ngay trong trình duyệt:

1. Người quản lý mời email Atlas của hai bạn vào project trong **Project
   Access Manager / Add Members**. Quyền **Project Data Access Read/Write**
   cho phép xem và sửa dữ liệu trên Data Explorer.
2. Mỗi bạn nhận lời mời, mở đúng project và cluster **Cluster0**.
3. Vào **Data Explorer / Browse Collections**, chọn **`nrapp_dev`**, rồi mở
   collection cần xem. Có thể lọc bằng `{ email: "tenban@example.com" }`
   trong collection `credentials` để tìm tài khoản test của mình.

Tài khoản được mời vào project là tài khoản dùng trang web Atlas. Username và
password trong `MONGO_URL` là **database user** cho BE kết nối; hai loại này
khác nhau. [Hướng dẫn Data Explorer](https://www.mongodb.com/docs/atlas/atlas-ui/databases/),
[quyền thành viên](https://www.mongodb.com/docs/atlas/reference/user-roles/).

Nhóm collection chính:

| Collection | Dữ liệu |
| --- | --- |
| `credentials` | Tài khoản đăng ký: email, password hash, role |
| `users` | Hồ sơ, username; User service đồng bộ sau khi đăng ký |
| `auth_outbox_events` | Sự kiện đồng bộ tài khoản sang User |
| `chats`, `messages` | Cuộc trò chuyện và tin nhắn |
| `tasks` | Công việc Todo |
| `schedulerequests`, `scheduleentries` | Yêu cầu và ngày làm việc |
| `categories`, `menuitems`, `tables`, `orders` | Dữ liệu căn tin |
| `reviews` | Đánh giá đơn căn tin và phản hồi của admin |

Hồ sơ `users` được đồng bộ qua RabbitMQ, nên User service cần chạy. Nếu chỉ
thấy tài khoản trong `credentials`, kiểm tra log `[user]` và luồng outbox.
Database/collection xuất hiện khi service tạo dữ liệu hoặc khởi tạo schema.
Dừng Docker trên máy không xóa dữ liệu Atlas. Dữ liệu từ Mongo Docker cũ
không tự chuyển sang cluster mới; đăng ký tài khoản test tại DB mới.

Nếu thích dùng MongoDB Compass, dán URI trong `backend/.env` vào Compass và
chọn `nrapp_dev`. Không đọc/sửa các file dữ liệu trong Docker để xem Mongo.

Payment dùng database PostgreSQL **`nrapp_payment`** riêng; không nằm trong
MongoDB. Cổng lấy từ `PAYMENT_POSTGRES_HOST_PORT`: template là `5433`, env trên
máy hiện tại là `15433`. Redis giữ OTP/cache và RabbitMQ chuyển các sự kiện.

### Tùy chọn dùng Mongo riêng trên máy

Mặc định nhóm dùng Atlas. Nếu cần test với DB riêng, đổi `backend/.env`:

```env
MONGO_MODE=local
MONGO_DB_NAME=nrapp_local
```

Sau đó chạy lại `npm run dev:backend`. Runner bật thêm MongoDB Docker 7.0,
replica set `rs0`, qua profile `local-mongo` và tự tính URI local theo
`MONGO_HOST_PORT`. Dữ liệu nằm trong volume `nrapp-local-dev_mongo_data`.
Khi quay lại DB chung, đặt `MONGO_MODE=atlas`, `MONGO_DB_NAME=nrapp_dev` và giữ
URI Atlas đúng. IDE chạy trực tiếp `start:dev` không tính URI theo mode;
ở chế độ local riêng, cần đặt `MONGO_URL` local tương ứng nếu bỏ qua runner.

## Địa chỉ local

| Thành phần | Địa chỉ mặc định |
| --- | --- |
| FE web | `http://localhost:8081` |
| Gateway API | `http://localhost:3000/api` |
| Swagger | `http://localhost:3000/api-docs` |
| Mailpit — xem OTP | `http://localhost:8025` |
| RabbitMQ UI | `http://localhost:15672` |
| MongoDB Atlas | Cluster dev chung; database `nrapp_dev`, URI trong `backend/.env` |
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
- **Atlas `bad auth`:** kiểm tra username/password của database user trong
  `MONGO_URL`; mật khẩu đăng nhập trang web Atlas không dùng để kết nối BE.
- **Atlas timeout:** kiểm tra Internet, cluster đang hoạt động và IP public
  của máy đã có trong Network Access.
- **Atlas `querySrv ETIMEOUT` / `ECONNREFUSED`:** kiểm tra `DEV_DNS_SERVERS`
  trong `backend/.env`, dùng `1.1.1.1,8.8.8.8` rồi chạy lại runner. Đây là
  lỗi phân giải DNS trước khi xác thực DB.
  [Hướng dẫn kết nối Atlas](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).
- **Lỗi Mongo transaction:** Atlas và Mongo Compose `rs0` đều hỗ trợ; Mongo
  standalone cài riêng sẽ không chạy được luồng này.

Chi tiết từng phần: [BE](backend/README.md), [FE](Nrapp/README.md).
