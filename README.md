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
