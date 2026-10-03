# Nrapp — frontend local

Ứng dụng Expo/React Native dùng API Gateway tại cổng `3000`, REST qua `/api`
và chat Socket.IO qua `/socket.io` trên cùng Gateway.

## Cài đặt lần đầu

Dùng Node.js 22 LTS và npm. Backend phải chạy trước theo [hướng dẫn tại thư mục gốc](../README.md).
Từ thư mục `Nrapp`, chạy:

```bash
npm ci
cp .env.example .env
```

PowerShell trên Windows: dùng `Copy-Item .env.example .env` thay cho `cp`.
Mỗi thành viên có `.env` riêng; Git chỉ lưu `.env.example`.
Nếu máy đã có `.env.local` hoặc `.env.development.local` cũ, xóa hoặc đổi tên
để chúng không ghi đè cấu hình local mới.

## Chạy trên máy tính

Chọn một trong các lệnh:

```bash
npm run web      # Trình duyệt: http://localhost:8081
npm run android  # Android Emulator đã mở từ Android Studio
npm run ios      # iOS Simulator, cần macOS và Xcode
```

Để trống `EXPO_PUBLIC_API_URL` trong `.env` để ứng dụng tự chọn địa chỉ:

| Nơi mở ứng dụng | REST Gateway |
| --- | --- |
| Web trên máy chạy BE | `http://localhost:3000/api` |
| Android Emulator của Android Studio | `http://10.0.2.2:3000/api` |
| iOS Simulator với `npm run ios` | `http://localhost:3000/api` |

`npm start` mở Metro ở localhost; chọn nền tảng bằng phím `w`, `a` hoặc `i`.
Nếu cổng `8081` đã được dùng, Expo sẽ đề nghị cổng khác. Lệnh Android/iOS dùng
Expo Go; hãy cài bản Expo Go tương thích SDK 54 của dự án theo
[hướng dẫn Expo](https://expo.dev/go).

## Chạy trên điện thoại cùng Wi-Fi

1. Lấy IPv4 LAN của máy chạy BE, ví dụ `192.168.1.20` (`ipconfig` trên Windows,
   `ip addr` trên Linux hoặc `ipconfig getifaddr en0` trên macOS).
2. Sửa `Nrapp/.env`:

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api
   EXPO_PUBLIC_SOCKET_URL=
   ```

3. Chạy `npm run start:lan`, rồi mở Expo Go trên điện thoại và quét QR.
4. Cho phép firewall máy tính nhận kết nối trong mạng riêng tại cổng `3000`
   và cổng Metro đang chạy (`8081` mặc định). BE phải lắng nghe trên `0.0.0.0`.

Điện thoại và máy tính phải cùng mạng và mạng không bật cách ly thiết bị.
Kiểm tra từ điện thoại bằng `http://192.168.1.20:3000/health` trước khi mở app.
`localhost` trên điện thoại là chính điện thoại, nên cần IP LAN của máy BE.
Sau khi đổi `.env`, dừng Expo và chạy lại lệnh với `-- --clear` để nạp cấu hình mới.

## Đăng nhập local và cấu hình

Dùng đăng ký/đăng nhập email, mật khẩu và OTP với backend local.
Chat văn bản hoạt động với backend local. Gửi ảnh cần Cloudinary của nhóm
được cấu hình trong backend; xem [hướng dẫn backend](../backend/README.md).
Google Sign-In chỉ hiện khi có `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` của nhóm và
native build phù hợp. Mặc định biến này để trống; không dùng Google project
của repo cũ. Google Sign-In cần native module riêng nên không chạy trong
Expo Go; tham khảo [tài liệu Expo](https://docs.expo.dev/guides/google-authentication/).

| Biến | Mặc định | Công dụng |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | trống | URL `/api` hoàn chỉnh; ưu tiên hơn tự chọn host |
| `EXPO_PUBLIC_API_PORT` | `3000` | Cổng khi tự chọn host |
| `EXPO_PUBLIC_API_PATH` | `/api` | Path REST khi tự chọn host |
| `EXPO_PUBLIC_API_TIMEOUT_MS` | `10000` | Thời gian chờ HTTP (ms) |
| `EXPO_PUBLIC_SOCKET_URL` | trống | Tự dùng origin của REST Gateway |
| `EXPO_PUBLIC_SOCKET_PATH` | `/socket.io` | Path Socket.IO qua Gateway |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | trống | Public OAuth client ID, tùy chọn |

Biến `EXPO_PUBLIC_*` được đóng gói vào ứng dụng và công khai; chỉ đặt URL hoặc
public client ID, không đặt secret backend. Xem
[cách Expo đọc biến môi trường](https://docs.expo.dev/guides/environment-variables/).

## Kiểm tra trước khi chia sẻ code

```bash
npm run lint
npm run typecheck
```

Khi sửa FE, giữ Expo đang chạy để Fast Refresh cập nhật màn hình. Nếu đổi
env, dừng và chạy lại Expo; nếu đổi dependency, cài trong `Nrapp/` và commit
cả `package.json`/`package-lock.json`.

Test màn hình với nhóm BE tương ứng. Ví dụ từ thư mục gốc, sửa Todo:

```bash
npm run dev:backend -- --services=gateway,auth,user,mail,todo
```

Terminal FE chạy `npm run dev:web` hoặc `npm run dev:mobile` từ gốc. Nếu API
đổi payload/response, kiểm tra FE và BE cùng code mới; test cả thao tác thành
công và validation/quyền liên quan. Chỉ sửa FE thì không cần chạy toàn bộ bài
test BE. Nếu muốn kiểm tra mọi màn hình, chạy BE không có `--services`.

[README gốc](../README.md) có bảng service cần cho từng chức năng, lệnh kiểm
tra trước khi push và quy trình nhánh/commit/pull request cho hai thành viên.

Tài liệu nghiệp vụ và kiến trúc:

- [Kiến trúc và luồng request](docs/kien-truc-va-luong-hoat-dong.md)
- [Luồng chat realtime](docs/chat-flow.md)
- [Lịch làm theo tháng](docs/lich-lam-theo-thang.md)
