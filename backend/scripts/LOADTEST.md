# Kiểm tra hiệu năng local (tùy chọn)

Chạy BE theo [README gốc](../../README.md). Các script SSH, Nginx và load test
trên VPS của repo cũ đã được gỡ. Việc chạy dự án không cần k6 hoặc Python.

## Health probe

Nếu đã cài Python và package `requests`:

```bash
python3 probe-health-latency.py http://localhost:3000/health --count 10
```

## REST với k6

`loadtest.js` đọc `BASE_URL` (origin của Gateway, không thêm `/api`) và
`TOKEN` hoặc `TOKENS_FILE` chứa access token từ tài khoản local. Ví dụ khi
đã cài k6, đặt hai biến trong terminal rồi chạy `k6 run loadtest.js`.

- `BASE_URL=http://localhost:3000`.
- `TOKENS_FILE` là đường dẫn tới file JSON chứa mảng token. Giữ file ngoài repo.
- `MODE=smoke` mặc định, 1 VU trong 20 giây.
- `MODE=load`, `TARGET_VUS`, `RAMP_SECONDS`, `HOLD_SECONDS`, `DOWN_SECONDS`
  cho bài đo lớn hơn. Điều chỉnh rate limit local nếu cần thử tải.

Các route được đo: `/api/user/me`, `/api/todo/my-tasks`,
`/api/chat/chat/all`. Luồng OTP, ghi dữ liệu và Socket.IO cần kiểm tra riêng.

Không commit access token hoặc tài khoản thử nghiệm vào Git.
