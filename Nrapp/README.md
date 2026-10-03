# Nrapp

Nrapp là ứng dụng Expo/React Native cho nền tảng vận hành nội bộ NRApp. Ứng dụng
kết nối tới API Gateway NRApp để sử dụng xác thực, dữ liệu người dùng, chat
realtime, công việc, gọi món căn tin, lịch làm việc, đơn nhân sự và chấm công
QR.

Ứng dụng đang được cấu hình ở version `1.0.4`, Android `versionCode` `6`. APK
phát hành mới nhất có tại [trang GitHub Releases](https://github.com/lethanh2006/Nrapp/releases/latest).

## Tài liệu

- [Kiến trúc và luồng request](docs/kien-truc-va-luong-hoat-dong.md)
- [Luồng chat realtime](docs/chat-flow.md)
- [APK phát hành mới nhất](https://github.com/lethanh2006/Nrapp/releases/latest/download/Nrapp.apk)

## Các nhóm chức năng

- Đăng ký bằng email/mật khẩu và đăng nhập hai bước bằng OTP.
- Đăng nhập Google, khôi phục phiên bằng refresh token và quản lý tài khoản.
- Danh bạ người dùng và quản lý hồ sơ.
- Chat realtime một-một qua REST và Socket.IO, bao gồm tải ảnh được hỗ trợ.
- Tạo, giao, lọc, đổi trạng thái công việc và xem công việc cá nhân.
- Xem thực đơn căn tin, gọi món theo bàn, xem lịch sử đơn và quản lý thực đơn,
  đơn hàng, bàn ở khu admin. Hợp đồng hiện tại chỉ hỗ trợ thanh toán tiền mặt.
- Lịch làm việc theo tháng, đơn nghỉ/đi muộn/tăng ca và các đơn nhân sự liên
  quan, quản lý chính sách, báo cáo và chấm công QR.

Điều hướng admin và user được tách riêng trong cây Expo Router. Backend vẫn là
nơi quyết định quyền; việc ẩn một màn hình trên app không thay thế kiểm tra
quyền.

## Cấu trúc source

```text
app/
├── (auth)/                 # đăng ký, đăng nhập, xác thực OTP
└── (main)/
    ├── admin/              # điều hướng và màn hình admin
    └── user/               # điều hướng và màn hình user

src/features/<feature>/
├── admin/                  # màn hình, UI và hook cho admin
├── user/                   # màn hình và UI cho user
└── shared/                 # model hoặc tiện ích trung lập với role

src/services/               # REST, Socket.IO và type theo domain
src/application/            # role, kiểm tra quyền và hằng số route
src/shared/                 # UI, hook và model thực sự dùng chung
src/utils/                  # Axios, URL Gateway và xử lý lỗi HTTP
```

Cấu hình ESLint kiểm tra ranh giới import giữa admin/user/shared. Hãy đặt lời
gọi nghiệp vụ trong `src/services`, giữ file route mỏng và không chuyển màn hình
riêng của một role vào `shared`.

## Cấu hình

Sao chép `.env.example` thành `.env.local`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_GATEWAY_HOST:3000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
```

Các biến tùy chọn gồm `EXPO_PUBLIC_API_TIMEOUT_MS`,
`EXPO_PUBLIC_SOCKET_URL`, `EXPO_PUBLIC_SOCKET_PATH`, `EXPO_PUBLIC_API_PORT` và
`EXPO_PUBLIC_API_PATH`. Giá trị `EXPO_PUBLIC_*` được đóng gói vào client và chỉ
được chứa cấu hình công khai; không đặt secret vào đây.

Hãy dùng URL Gateway mà thiết bị có thể truy cập. Android Emulator chỉ dùng
`10.0.2.2` thông qua các biến host/port dự phòng khi chưa cấu hình URL API đầy
đủ. Thiết bị thật cần địa chỉ Gateway có thể truy cập qua LAN hoặc tunnel.

## Chạy local

```bash
npm ci
cp .env.example .env.local
npm start
```

Các script có sẵn:

```bash
npm run android
npm run android:lan
npm run android:tunnel
npm run ios
npm run web
npm run lint
npx tsc --noEmit
```

`npm run reset-project` là script mẫu của Expo và không được chạy trên source
đang phát triển.

## Build và cập nhật bằng EAS

Các profile build trong `eas.json`:

- `preview`: APK Android nội bộ để kiểm thử trên thiết bị.
- `production`: Android App Bundle để phát hành lên store.
- `production-apk`: APK dùng channel production cho phân phối nội bộ.

Ví dụ:

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

Workflow `eas-update.yml` chạy khi push vào `main` hoặc chạy thủ công. Workflow
cần repository secret `EXPO_TOKEN`, cài dependency, chạy ESLint và kiểm tra
TypeScript, sau đó publish bản cập nhật Android lên channel `production`. App
kiểm tra update khi mở và dùng bundle đã cache nếu chưa thể tải bản mới ngay.
