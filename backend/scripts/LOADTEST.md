# Test NRApp đã deploy trên một VPS

Chạy k6 trên máy cá nhân, hướng tới domain API thật. Trên VPS mở một phiên SSH
khác để theo dõi backend. Đây là bài test REST ban đầu cho phiên đã đăng nhập,
chưa phải phép đo khả năng chịu tải toàn hệ thống.

## Kết quả tối ưu gần nhất (16–17/09/2026)

Auth trên VPS hiện dùng cache identity tối đa 2 giây cho **một Auth instance** và
JWT key được tạo sẵn trong Auth/Gateway. Mỗi request vẫn xác minh chữ ký và hạn
JWT; các thay đổi credential qua Auth xóa cache trước/sau khi ghi. Ghi trực tiếp
vào MongoDB từ nơi khác có thể khiến role/xóa tài khoản chưa phản ánh tối đa 2
giây. Source còn là thay đổi local ở `auth/` và `gateway/`; cần đưa qua Git/CI
trước lần phát hành tiếp theo để không bị image cũ ghi đè.

Ba lượt 10 VU ngắn, tăng 30 giây, giữ 60 giây, giảm 10 giây; cùng ba API đọc và cùng
**một** access token. Task/chat của tài khoản thử nghiệm rỗng:

| Nơi phát request | RPS giữ tải | Thành công | p95 giữ tải | p99 giữ tải |
| --- | ---: | ---: | ---: | ---: |
| Linux Mint → domain HTTPS | 6,47 | 100% | 706,56 ms | 1115,08 ms |
| k6 trên VPS → Gateway `127.0.0.1:3000` | 6,97 | 100% | 314,08 ms | 649,13 ms |
| k6 trên VPS → Nginx HTTPS loopback | 6,98 | 100% | 223,06 ms | 348,25 ms |

**Hai lượt đầu trượt mục tiêu p99 <500 ms; lượt Nginx loopback đạt p99 chung ở
đoạn giữ tải nhưng k6 vẫn báo trượt vì p99 riêng profile trên toàn bộ ramp/hold/
down là 544 ms.** Bài trên VPS còn dùng CPU VPS cho k6, không mô phỏng đường mạng
của người dùng. Ba lượt chạy nối tiếp, nên chênh lệch là dấu hiệu cần điều tra
đường ngoài và biến động backend, không phải định lượng chính xác phần latency
của Nginx/mạng. Trong mẫu `vmstat` giữa bài trực tiếp, CPU idle 64–70%, steal
6–8%, I/O wait 0%; chưa thấy CPU trung bình bão hòa ở mức 10 VU.

Sau lượt loopback, `scripts/loadtest.js` đã được sửa để ngưỡng p95/p99 riêng
từng API ở chế độ `load` chỉ dùng đoạn giữ tải, giống `Fixed-load p95/p99` trong
báo cáo. Trước đó ngưỡng từng API dùng cả ramp/down, dễ làm `k6 exit code: 99`
dù đoạn giữ tải chung đạt. Lượt 10 VU mới bằng script đã sửa qua domain thật,
ramp 30 giây, giữ **300 giây**, giảm 10 giây:

| Kết quả đoạn giữ tải | Giá trị |
| --- | ---: |
| Response hoàn tất / RPS | 2018 / 6,73 |
| Thành công (HTTP 200 + JSON hợp lệ) | 100% |
| Chung p95 / p99 | 382,38 / 1041,45 ms |
| Profile p95 / p99 | 469,09 / 1060,46 ms |
| My tasks p95 / p99 | 358,11 / 1019,48 ms |
| Chats p95 / p99 | 373,72 / 980,52 ms |

**p95 của cả ba API đạt <500 ms, nhưng p99 không đạt; k6 exit code 99.** Max
latency trong đoạn giữ tải là 8,03 giây dù không có HTTP lỗi. Đây là 10 VU dùng
chung một tài khoản, task/chat rỗng, không phải 10 người dùng khác nhau hoặc
toàn hệ thống. Báo cáo:
`/tmp/nrapp-k6-reports/20260916T160650-load-10vu.measurement.json`.
Một lượt 5 phút chưa phải soak test dài hạn và chưa đủ để ghi p99 <500 ms trong CV.

Sau sửa đã chạy kiểm tra chức năng 1 VU với hold 8 giây: báo cáo in đúng p95/p99
từng API của đoạn hold và exit code 0. Nó chỉ có 4 response trong đoạn hold,
không dùng làm kết quả hiệu năng. File:
`/tmp/nrapp-k6-reports/20260916T160500-load-1vu.json`.

Probe tuần tự 100 mẫu/chặng lúc rảnh cho p99 Auth introspection 109 ms, user
90 ms, todo 88 ms, chat 79 ms; các chặng được đo riêng, không cộng p99 với nhau.
Nó chưa thay thế phân tích tail latency của các request đồng thời. Summary nằm ở
`/tmp/nrapp-k6-reports/20260916T153255-load-10vu.json` và
`/tmp/nrapp-k6-reports/20260916-direct-vps-10vu.json`, cùng
`/tmp/nrapp-k6-reports/20260916-nginx-loopback-10vu.json`. Probe ở
`/tmp/nrapp-perf-stage-idle-100.log`.

Trong lượt 5 phút qua domain, probe tuần tự 20 mẫu/chặng cho p95 Auth 47 ms,
user 75 ms, todo 85 ms, chat 63 ms. VPS có mẫu CPU idle 53–78%, I/O wait 0%.
`/health` qua domain, tái sử dụng HTTPS connection, có 100/100 HTTP 200,
p95 63 ms và p99 164 ms cùng lúc. Các phép đo này không bắt được từng request
API chậm hiếm; không thể quy toàn bộ p99 cao cho mạng, Nginx, Atlas hay code
riêng lẻ. Cần trace theo request và Atlas Metrics/Opscounter để xác nhận chỗ
chờ. Log stage: `/tmp/nrapp-perf-stage-public-10vu-5m.log`.

### Ghép thời gian theo request ID (17/09/2026)

Một image Gateway chẩn đoán tạm ghi thời gian từ lúc vào Gateway đến lúc gửi
xong response, tách Auth và service. k6 ghi ID của response mất ít nhất 500 ms.
Lượt lặp lại 10 VU giữ 60 giây qua domain có 376 response đoạn giữ tải,
6,27 RPS, 100% thành công, p95 690 ms, p99 1180 ms. Đây không phải mức đạt.
Trong cả lượt có 426 request API tại Gateway, 49 response chậm trong k6 và
**khớp đủ 49 ID** với log Gateway:

| 49 response chậm | Median | p95 |
| --- | ---: | ---: |
| `http_req_duration` của k6 | 686 ms | 2174 ms |
| Thời gian trong Gateway | 257 ms | 653 ms |
| Chênh lệch k6 trừ Gateway | 346 ms | 2104 ms |

Ba response k6 mất 2,17–2,58 giây nhưng Gateway chỉ mất 67–70 ms. Trong 49
response chậm, 7 request cũng mất >500 ms **bên trong** Gateway. Trên toàn bộ
426 request API, Gateway p99 là 565 ms, Auth p99 417 ms, gọi service p99
276 ms. Vì thế có **cả** đợt chậm trước/sau Gateway lẫn đợt chậm trong Auth/
service; không thể hứa cache hay Nginx một mình sẽ đưa p99 public <500 ms.
Chênh lệch k6–Gateway là phép suy ra gần đúng, gồm thời gian ở Nginx, mạng và
client; `http_req_duration` không tính DNS/TCP/TLS ban đầu.

Log đã lưu tại `/tmp/nrapp-gateway-trace-10vu-repeat.jsonl`, k6 tại
`/tmp/nrapp-perf-trace-public-10vu-repeat.log`; script ghép là
`/tmp/nrapp-compare-trace.py`. Gateway đã quay về image tối ưu trước chẩn đoán,
rate limit đã về 120/phút/IP. Code chẩn đoán ở source mặc định tắt.

Người quản trị đã áp dụng `scripts/nginx-gateway-timing.sh` lên VPS ngày
17/09/2026. Log chỉ chứa request ID, status và thời gian; không ghi URL, token
hay body. Lượt 10 VU qua domain, ramp 20 giây, giữ 120 giây, giảm 10 giây có
790 response đoạn giữ tải, 6,58 RPS, 100% thành công, p95 411 ms, p99 846 ms.
Trong toàn lượt, **41/41 response k6 chậm ≥500 ms** khớp với log Nginx:

| 41 response chậm | Median | p95 |
| --- | ---: | ---: |
| Thời gian k6 | 728 ms | 1220 ms |
| Nginx `request_time` | 101 ms | 774 ms |
| Nginx `upstream_response_time` | 100 ms | 772 ms |
| k6 trừ Nginx | 594 ms | 1073 ms |
| Nginx tổng trừ upstream | 0 ms | 3 ms |

32/41 response có chênh lệch k6–Nginx >500 ms; 4/41 có upstream >500 ms.
Response k6 chậm nhất 4,29 giây nhưng Nginx chỉ mất 77 ms. Vì vậy Nginx xử lý
thêm rất ít trong các mẫu này; phần lớn tail latency quan sát nằm trên đường
từ Nginx tới k6/máy Mint hoặc ở client, còn một số ít nằm trước/tại Gateway.
Chênh lệch là gần đúng; k6 `http_req_duration` không tính DNS/TCP/TLS ban đầu.
Ping 50 gói tới VPS mất 0%, trung bình 26 ms; MTR TCP 30 mẫu tới đích mất 0%
nhưng có mẫu RTT 1,21 giây. Điều này cho thấy đường mạng có biến động, chưa đủ
để quy lỗi riêng cho ISP, VPS provider hay máy Mint.

Log tại `/tmp/nrapp-nginx-timing-10vu.log`, k6 tại
`/tmp/nrapp-perf-nginx-timing-10vu.log`; script ghép
`/tmp/nrapp-compare-nginx.py`. Rate limit Gateway đã về 120/phút/IP và các
container đang healthy. **Log Nginx vẫn đang bật**: `deploy` không thể chạy
`sudo -n` vì cần mật khẩu. Người dùng chạy trong phiên SSH của mình:

```bash
sudo bash /tmp/nrapp-nginx-timing.sh restore
```

Script khôi phục file host Nginx đã sao lưu và giữ file log để kiểm tra sau.
[Tài liệu Nginx về access log](https://nginx.org/en/docs/http/ngx_http_log_module.html)
và [các biến thời gian upstream](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
giải thích ý nghĩa các cột.

Probe thêm qua HTTPS/Nginx nhưng kết nối tới `127.0.0.1` ngay trên VPS, dùng
SNI domain thật và tái sử dụng connection, cho 30 request tuần tự/API đều HTTP
200. Median profile/todo/chat lần lượt 75,64/80,15/77,33 ms; p95 lần lượt
115,13/165,23/115,66 ms. Mẫu này loại đoạn internet từ Linux Mint, nhưng không
phải phép đo dưới tải và chỉ có 30 request/API. Nó cho thấy Nginx/TLS trên host
không thường xuyên gây độ trễ 1 giây lúc rảnh. Log ở
`/tmp/nrapp-perf-reused-nginx-loopback-30.log`.

Nginx trên host hiện gửi `Connection: close` tới Gateway với request thường.
`scripts/nginx-gateway-keepalive.sh` đã được chép thành
`/tmp/nrapp-nginx-keepalive.sh` trên VPS và kiểm tra `preview`; chưa áp dụng do
tài khoản `deploy` không có `sudo` không cần mật khẩu. Kết quả ghép ID ở trên
cho thấy Nginx overhead rất nhỏ; keep-alive là tối ưu phụ, không phải cách xử
lý chính cho p99. Chỉ cân nhắc sau khi đã khôi phục timing config; từ phiên SSH
có quyền sudo, kiểm tra diff rồi áp dụng:

```bash
bash /tmp/nrapp-nginx-keepalive.sh preview
sudo bash /tmp/nrapp-nginx-keepalive.sh apply
```

Script sao lưu file Nginx, kiểm tra `nginx -t`, reload và khôi phục nếu lỗi.
Sau đó chạy lại **cùng** bài 10 VU qua domain để kiểm chứng; keep-alive ở loopback
không được kỳ vọng tự nó cắt hàng trăm ms. Chỉ tăng VU khi mức trước đạt yêu cầu.
Giới hạn rate limit gateway đã được khôi phục sau lượt đo này; muốn đo nhiều VU
tiếp cần bật lại theo bước 3 và khôi phục sau khi xong.

Image trước tối ưu vẫn lưu trên VPS. Nếu cần quay lại bản trước cả cache và JWT
key, chạy hai lệnh tag rồi recreate trên VPS:

```bash
docker image tag nrapp/auth:before-perf-20260916T152120 nrapp/auth:vps-lab-001
docker image tag nrapp/gateway:before-perf-20260916T152120 nrapp/gateway:vps-lab-001
/home/deploy/bin/dc --profile app up -d --no-deps --no-build --pull never --force-recreate --wait auth gateway
```

## Cấu hình sẵn cho máy Linux Mint của bạn

Gateway: `https://api-vps.thanhlelmtp2006.id.vn`. `/api-docs` là trang Swagger;
`BASE_URL` chỉ dùng domain, không có `/api-docs`, `/api` hoặc phần `#...`.

Domain và access token bạn cung cấp đã được lưu trên máy trong
`~/.config/nrapp/loadtest.env` (hoặc `$XDG_CONFIG_HOME/nrapp/loadtest.env` nếu có
cấu hình XDG), quyền đọc/ghi chỉ cho tài khoản của bạn. Script chạy tự đọc file
này. Khi token hết hạn, thay giá trị `TOKEN` trong file đó.

Từ terminal Bash tại thư mục `backend`, chạy 1 VU trong 20 giây:

```bash
bash scripts/loadtest-vps.sh
```

Để lấy thêm mẫu ở tải nhỏ và nhìn rõ khoảng chạy trên Grafana, giữ 1 VU trong
5 phút, đồng thời lưu output:

```bash
set -o pipefail
SMOKE_DURATION=5m bash scripts/loadtest-vps.sh 2>&1 | tee /tmp/nrapp-k6-1vu-5m.txt
```

Ở Grafana, đổi `Last 24 hours` thành `Last 15 minutes`, giữ datasource
`Prometheus` và job `node-exporter`, refresh `30s` hoặc `1m`. Quan sát các biểu đồ
`CPU Basic`, `Memory Basic`, `Network Traffic Basic`; so sánh trước, trong và sau
test. Nếu Prometheus lấy mẫu mỗi 60 giây, refresh nhanh hơn không tạo thêm mẫu.
Dashboard node-exporter hiển thị tài nguyên máy, chưa hiển thị trực tiếp RPS/p95
của k6. Những chỉ số k6 hiện vẫn đọc trong terminal.

Nếu bài 20 giây có 12 request, mỗi API chỉ có 4 mẫu: p95 rất nhạy với một request
chậm. HTTP 200 và checks 100% xác nhận request hoạt động; p95 vượt 500 ms làm
test trượt mục tiêu latency minh họa, không tự chứng minh VPS bão hòa. Không suy
ra tải test gây ra đỉnh CPU trong biểu đồ 24 giờ; đối chiếu đúng thời điểm chạy.

Khi smoke test đạt và đã kiểm tra rate limit ở bước 3, chạy 10 VU:

```bash
bash scripts/loadtest-vps.sh load 10
```

Linux Mint chạy trực tiếp Bash và Docker, không cần WSL. Các bước nhập token
thủ công dưới đây dành cho trường hợp bạn muốn tự đổi cấu hình hoặc chạy từ máy
khác. Việc tạo cấu hình không tự chạy test lên VPS.

## Lấy số liệu để mô tả trong CV

Sau khi gateway đã áp dụng cấu hình rate limit cho load test và bài smoke đạt,
chạy từng mức trên máy cá nhân. Bắt đầu:

```bash
bash scripts/loadtest-vps.sh load 10
```

Chỉ khi mức trước đạt toàn bộ ngưỡng, tài nguyên đã ổn định, mới chạy mức sau:

```bash
bash scripts/loadtest-vps.sh load 20
```

```bash
bash scripts/loadtest-vps.sh load 50
```

Đây là các mức thăm dò, chưa phải ước lượng giới hạn VPS. Từ nhịp 1 VU khoảng
0,69 RPS đã đo, nếu latency và thời gian nghỉ giữ nguyên thì 10/20/50 VU có thể
cho khoảng 7/14/35 RPS. Traffic thực tế cần đọc từ báo cáo.

Wrapper tự lưu terminal log, summary JSON và `.measurement.json` trong
`/tmp/nrapp-k6-reports`. Cuối output có `NRAPP LOAD TEST REPORT`; đọc:

- `k6 exit code: 0`: lượt chạy đạt toàn bộ threshold đang cấu hình.
- `Fixed-load RPS`: response hoàn tất trong đoạn giữ VU cố định chia cho đúng
  thời gian giữ tải. Đây là completion throughput của workload.
- `Fixed-load success`: HTTP 200 và JSON object không có `success=false`.
- `Fixed-load p95`, `Fixed-load p99`: latency các response hoàn tất trong đoạn
  giữ tải, gồm cả response lỗi nếu có. Mục tiêu hiện tại là cả p95 và p99 <500 ms
  trong đoạn giữ tải và trên từng API; không ghi p99 <500 ms nếu chưa đạt.

Nếu chạy đủ đoạn giữ tải nhưng trượt latency, báo cáo vẫn cung cấp RPS quan sát
được và đánh dấu test không đạt. Nếu chưa chạy đủ đoạn giữ tải, báo cáo không
chia request cho toàn bộ thời gian dự định để tránh đưa ra RPS sai. Không tự
chạy mức cao hơn khi mức trước trượt.

Ở mức cao nhất đã đạt, kiểm tra ổn định thêm 20 phút. Ví dụ chỉ khi 20 VU đã đạt:

```bash
HOLD_SECONDS=1200 bash scripts/loadtest-vps.sh load 20
```

Lượt này giữ 20 VU trong 20 phút, tổng kịch bản 21 phút 30 giây cộng thời gian kết
thúc iteration. Giữ Grafana mở và lưu ảnh đúng khoảng chạy. Ghi rõ một tài khoản
dùng chung nếu chưa bổ sung dữ liệu nhiều tài khoản. Ghi phiên bản deployment,
cấu hình 2 vCPU/4 GB RAM, rate limit trong lúc test, và MongoDB Atlas ngoài VPS.
Các số này đại diện ba API đọc đã kiểm tra, không đại diện luồng ghi/Socket.IO.

Mẫu CV sau khi có một lượt chạy đạt:

> Kiểm thử ba API REST đọc dữ liệu trên backend một Ubuntu VPS bằng k6; giữ
> [N] VU trong [thời gian], ghi nhận [X] RPS, p99 [Y] ms và tỷ lệ thành công [Z]%;
> theo dõi tài nguyên qua Grafana/Prometheus.

Không dùng các số 3.000 VU hoặc 1.000 RPS của dự án khác. Sau khi hoàn tất, chạy
`bash /tmp/nrapp-gateway-loadtest.sh restore` trên VPS để khôi phục rate limit.

## Phân biệt mạng ngoài với đường xử lý backend

Đo riêng từng chặng từ container gateway trên VPS:

```bash
python3 scripts/backend-stage-probe.py
```

Probe gọi Auth introspection bằng access token hiện tại, rồi gọi riêng ba API
đọc nội bộ với identity đã được Auth xác nhận và chữ ký nội bộ của gateway.
Token chỉ đi qua SSH stdin; secret nội bộ không rời container. Mặc định 5 mẫu
tuần tự/chặng. Output là median/min/max thời gian cả HTTP nội bộ và DB; chặng
user/todo/chat không bao gồm Auth, không đo CPU hay thời gian MongoDB riêng.
Chạy một lần lúc rảnh, rồi chạy trong đoạn giữ tải k6 để khoanh vùng bước tăng
độ trễ. Các mẫu này không phải p99 của workload và không đủ xác nhận bottleneck.

Probe ngày 16/09/2026 (5 mẫu/chặng):

| Chặng | Median gọi tuần tự lúc không chạy k6 | Median trong đoạn giữ 50 VU |
| --- | ---: | ---: |
| Auth introspection + DB credential | 72,24 ms | 308,92 ms |
| User đọc nội bộ + DB, không gồm Auth | 58,66 ms | 84,26 ms |
| Todo đọc nội bộ + DB, không gồm Auth | 56,96 ms | 60,10 ms |
| Chat đọc nội bộ + DB, không gồm Auth | 63,67 ms | 56,39 ms |

Auth là chặng tăng rõ trong mẫu này; sau đó đã đo thêm truy vấn/đợi pool và
event loop trong chính process Auth, rồi thử cache identity ngắn như mô tả đầu
tài liệu. Các chặng được gọi ở thời điểm khác
nhau, không cộng median thành p99 của API. Log probe ở
`/tmp/nrapp-backend-stages-idle.log` và `/tmp/nrapp-backend-stages-50vu.log`.
Lượt k6 kèm probe (`20260916T145501-load-50vu`) trượt và tự dừng ở khoảng 98
giây do HTTP lỗi; không dùng như kết quả đạt để ghi CV. Đoạn giữ tải hoàn tất
ghi nhận 23,67 RPS, thành công 100%, p95 1698,23 ms và p99 4064,56 ms.

### Đo sâu trong process Auth

`scripts/profile-auth.cjs` được dùng qua Docker/SSH với inspector tạm chỉ lắng
nghe loopback trong container. Probe đo thời gian JWT, Mongoose query, lấy kết
nối MongoDB, chờ nhóm credential, event loop và CPU profile. Không log dữ liệu
query/token; hook có hạn tự tháo sau 60 giây và inspector đóng khi hoàn tất.
Profiling có overhead, nên không dùng lượt này làm capacity đạt hay số CV.

Trong khoảng 31,04 giây của lượt 50 VU ngày 16/09/2026:

| Phần | Số mẫu | Median | p95 | Max |
| --- | ---: | ---: | ---: | ---: |
| Verify JWT | 743 | 1,02 ms | 13,06 ms | 785,39 ms |
| Lấy kết nối MongoDB | 213 | 0,006 ms | 1,03 ms | 17,01 ms |
| Query credential | 185 | 55,44 ms | 258,30 ms | 1246,07 ms |
| Chờ credential (gồm đọc dùng chung) | 738 | 53,89 ms | 531,82 ms | 1247,12 ms |

Có 557 lần dùng chung query đang chờ. Auth thực hiện khoảng 5,96 query credential
mỗi giây; số này không phải Opscounter tổng của Atlas. Pool có tối đa hai kết
nối đang dùng, hàng đợi lớn nhất quan sát mỗi 100 ms bằng 0. Event loop delay
p99 82,31 ms, max 324,80 ms. Chưa có bằng chứng cạn pool kết nối. Một query chậm
ở Auth có thể trì hoãn nhiều request cùng tài khoản. Thời gian query vẫn gồm
mạng, DB, xử lý driver và lịch chạy CPU, không phải thời gian server Mongo riêng.

Hai khoảng vmstat hai giây trong khi profiling có CPU idle 0%, steal 12%/11%,
I/O wait 0%. Probe CPU tạo thêm tải. Các lượt trước không có CPU profiler cũng
có những khoảng idle 4%/13%, steal 12%/9%; chưa kết luận tải CPU trung bình cả
lượt. Docker Auth/Gateway không có quota CPU riêng; Auth cgroup có nr_throttled
và throttled_usec bằng 0. CPU steal là chờ hypervisor, khác với cgroup throttle.

Đã tháo các hook, đóng inspector sau đo. Báo cáo:
`/tmp/nrapp-auth-profile-idle.json`, `/tmp/nrapp-auth-profile-50vu.json`, và
`/tmp/nrapp-auth-50vu.cpuprofile`. Lượt k6 kèm CPU profiler tiền tố
`20260916T150220-load-50vu` chạy đủ đoạn giữ tải, ghi nhận 24,25 RPS, thành công
100%, p95 1710,49 ms, p99 2483,72 ms, trượt latency. Không cộng percentile của
các chặng để suy ra percentile tổng, và chưa loại trừ Atlas throttle khi chưa
có Opscounter toàn cluster.

Đo nhanh từng API từ máy cá nhân, mặc định 3 request/API, chạy tuần tự:

```bash
python3 scripts/latency-probe.py
```

Đo cùng API trực tiếp gateway từ bên trong VPS:

```bash
python3 scripts/latency-probe.py --remote
```

Lệnh remote dùng SSH key hiện tại, gửi token qua stdin mã hóa và chạy Python/curl
trên VPS; không cần chép file token hay cài k6 lên VPS. Mặc định gọi
`http://127.0.0.1:3000`, bỏ qua internet phía client, Cloudflare, host Nginx và TLS
bên ngoài. Nó vẫn đi qua guard, Auth, service và MongoDB Atlas ngoài VPS.
Nếu SSH bị timeout, chưa có phép đo bên trong VPS; không suy ra từ kết quả local.

Các cột là median từ các HTTP 200 response: DNS, TCP, TLS, WAIT và TOTAL (ms).
WAIT là thời gian sau khi chuẩn bị kết nối tới first byte, gồm mạng, proxy,
hàng đợi và backend; không phải thời gian CPU xử lý thuần. Probe tạo curl process
mới cho mỗi request, nên DNS/TCP/TLS khác bài k6 tái sử dụng kết nối. Không lấy
median 3 mẫu làm p95/p99 hay phép đo chịu tải.

Chạy hai probe lúc rảnh và lặp lại trong bài k6 50 VU để so sánh cùng điều kiện.
Nếu direct gateway cũng tăng độ trễ dưới tải, tập trung đo Auth/service/DB và
tài nguyên VPS; nếu chỉ đường domain bên ngoài tăng, đo thêm proxy/CDN/mạng và
máy phát tải. Đây là phép khoanh vùng, chưa phải bằng chứng về một bottleneck cụ thể.

Gateway gọi Auth introspection trên mỗi request. Auth vẫn verify từng token;
`InFlightReads` gộp các truy vấn credential đang chờ, chỉ lấy `_id`, email và
role. Bản đầu không giữ kết quả sau truy vấn; bản thử hiện tại thêm TTL 2 giây
trên VPS, giới hạn 10.000 entry. Khi giao dịch đổi email/role hoặc xóa tài
khoản commit, Auth loại bỏ kết quả cũ và ngăn truy vấn cũ xuất bản lại cache.
Test bao gồm token hết hạn, đổi role, xóa tài khoản và truy vấn lỗi.
Hiệu quả trên bài dùng chung tài khoản không được suy ra cho nhiều
tài khoản riêng biệt. Chat có count unread và lookup user cho từng chat; bài
chạy với danh sách chat rỗng chưa đo được chi phí đó.

Atlas Free giới hạn 100 thao tác đọc/ghi mỗi giây và tối đa 500 kết nối theo
[tài liệu MongoDB](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
Vượt giới hạn thao tác có thể có khoảng chờ một giây. Đây là thao tác DB, không
phải RPS của API; cần xem Atlas Metrics/Opscounter để xác nhận có chạm ngưỡng.
Đo ping MongoDB khoảng 202 ms từ VPS chỉ cho biết thời gian cả lệnh đi/về và
chờ phía DB, không xác định region hay chứng minh bị throttle. Task và chat rỗng
trong probe hiện tại; chưa có bằng chứng thiếu index gây chậm trong lượt này.

Bản sửa Auth đầu tiên được đưa lên VPS ngày 16/09/2026 từ source local đã qua 54 test,
lint và build, dựa trên image có revision
`b9ca6b94d1de0f08431c2be13b4d7fdf8c2b23a6`. Chỉ bổ sung JS đã build cho
AuthService và InFlightReads, giữ dependency/cấu hình image hiện tại. Label
`nrapp.patch.sha256` là
`d196503d0c5246bfef33db1ab3f3c1334def34099088563d4169ea5adaa3d220`.
Source đang là thay đổi local; cần đưa vào quy trình Git/CI khi phát hành tiếp
để pipeline không ghi đè bản sửa bằng source cũ.

Bản thử hiện tại sau đó đã qua 59 test Auth (4 skipped), 27 test Gateway, lint
và build của cả hai package. Đây là kiểm chứng code; không có nghĩa bài tải đã
đạt ngưỡng latency. Image đang chạy là `nrapp/auth:perf-20260916T152120` và
`nrapp/gateway:perf-20260916T152120` (tag canonical của Compose trỏ tới chúng).

Image trước sửa vẫn được giữ để khôi phục. Chạy trên VPS nếu cần:

```bash
docker image tag nrapp/auth:before-read-20260916T144611 nrapp/auth:vps-lab-001
/home/deploy/bin/dc --profile app up -d --no-deps --no-build --pull never --force-recreate --wait auth
```

Hai lượt thăm dò 50 VU ngày 16/09/2026, cùng ramp 30 giây, giữ 60 giây và giảm
10 giây, qua domain công khai từ Linux Mint:

| Lượt | RPS đoạn giữ tải | Thành công đoạn giữ tải | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Trước sửa Auth | 24,12 | 100% | 1819,91 ms | 2091,43 ms |
| Sau sửa Auth | 26,45 | 100% | 1399,94 ms | 1698,68 ms |

Cả hai chạy đủ nhưng trượt latency. Mỗi phiên bản chỉ có một lượt ngắn, môi
trường mạng/Atlas/VPS có biến động; chưa chứng minh mức cải thiện do bản sửa.
Các khoảng vmstat hai giây trong lượt sau có idle 13%/4%, CPU steal 9%/12%,
I/O wait 0%. Đây là mẫu tại vài thời điểm, không phải trung bình cả lượt.
Không quy hết bottleneck cho DB khi chưa đo Opscounter và đường xử lý từng bước.
Summary nằm trong `/tmp/nrapp-k6-reports`, lần lượt tiền tố
`20260916T144419-load-50vu` và `20260916T144642-load-50vu`; báo cáo so sánh là
`20260916-auth-read-comparison.json`. Cùng token cho tất cả VU và task/chat rỗng
ở thời điểm probe, nên không ghi đây là sức chịu tải của toàn bộ ứng dụng.

Lượt sau sửa ở 10 VU (cùng thời gian 30/60/10 giây), tiền tố
`20260916T144850-load-10vu`, ghi nhận 5,88 RPS, thành công 100%, p95 1160,08 ms,
p99 2661,87 ms trong đoạn giữ tải. Cũng trượt latency. Không suy ra tải thấp hơn
chắc chắn có tail latency tốt hơn từ các lượt ngắn, môi trường có biến động.
Người dùng xác nhận Atlas Free ở Singapore. Probe DB trong lượt 10 VU có ping
median 152,34 ms (5 mẫu); vmstat có CPU steal 18%/12% và idle 30%/24% ở hai
khoảng hai giây. Cần đo timing từng chặng và Atlas Opscounter để phân biệt chờ
DB, mạng và CPU; chưa có mức tải nào được xác nhận đạt p99 <500 ms sau sửa.

Lưu ý `http_req_duration` của k6 bao gồm sending + waiting + receiving, không
bao gồm DNS/TCP/TLS ban đầu. Giá trị p95 của HTTP không phải phép đo thời gian
xử lý code thuần.

## 1. Chuẩn bị

- Backend trên VPS đang hoạt động qua HTTPS.
- Máy chạy k6 có Docker và bản sao `scripts/loadtest.js`.
- Dùng tài khoản test có profile, task và chat mẫu. Dữ liệu rỗng thường nhẹ hơn
  dữ liệu người dùng thực tế.
- Đăng nhập qua ứng dụng, hoàn tất OTP rồi lấy access token trong DevTools:
  Network → request API đã đăng nhập → header `Authorization: Bearer ...`.
  Không dùng refresh token, không chia sẻ hoặc commit token.
- Nếu VPS đang phục vụ người dùng, chọn giờ ít truy cập và bắt đầu từ 1 VU.

Login của NRApp gửi OTP và có giới hạn một lần/phút/email. Script sử dụng token
có sẵn để đo phiên đã đăng nhập; không gọi login liên tục hoặc gửi hàng loạt email.

Các lệnh dưới đây dùng Bash trên Linux Mint. Chạy từ thư mục `backend`
trên máy cá nhân; domain gateway không thêm `/api`.

```bash
export BASE_URL='https://api-vps.thanhlelmtp2006.id.vn'
read -rsp 'Access token (không gồm Bearer): ' TOKEN
export TOKEN
```

## 2. Kiểm tra kết nối và quyền trước khi tăng tải

```bash
curl -sS -i "$BASE_URL/health"
curl -sS -i -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/user/me"
```

Health chỉ kiểm tra kết nối. Profile phải trả HTTP 200 và JSON đúng của tài khoản.
401: kiểm tra token/hạn dùng. 403: kiểm tra quyền. 404: kiểm tra domain/path.
Không tiếp tục tăng tải khi các request này chưa đúng.

## 3. Kiểm tra rate limit

### Áp dụng cấu hình cho bài stress test 3.000 VU

Trên máy Linux Mint, chuyển script lên VPS:

```bash
scp -o IdentitiesOnly=yes -i ~/.ssh/nrapp_vps scripts/gateway-loadtest.sh deploy@103.116.52.35:/tmp/nrapp-gateway-loadtest.sh
ssh -o IdentitiesOnly=yes -i ~/.ssh/nrapp_vps deploy@103.116.52.35
```

Trong terminal SSH trên VPS:

```bash
cd /opt/nrapp/backend
bash /tmp/nrapp-gateway-loadtest.sh enable
```

Script lưu các thiết lập rate limit ban đầu, đặt window 60.000 ms và giới hạn
300.000 request/phút/IP (tương đương trung bình 5.000 RPS trong một window), rồi
tạo lại riêng gateway bằng image hiện tại và chờ healthcheck. Mức này là giới
hạn chính sách dùng cho test, không phải năng lực đã đo của VPS. Nếu tạo lại
gateway thất bại, script thử khôi phục cấu hình và container trước đó.

Khi thành công, output cần có HTTP 200 và `x-ratelimit-limit: 300000`. Lệnh này
tạo lại container gateway, nên kết nối qua gateway có thể gián đoạn ngắn.
Sau đó mới chạy lệnh k6 ở terminal máy cá nhân. CDN/WAF có thể vẫn áp dụng giới
hạn riêng; script này chỉ điều chỉnh limiter trong gateway.

Sau test, khôi phục trên VPS:

```bash
bash /tmp/nrapp-gateway-loadtest.sh restore
```

Script khôi phục riêng các biến rate limit, giữ các thiết lập khác trong `.env`.
File backup nằm tại `/opt/nrapp-backups/gateway-rate-limit-before-loadtest.json`
và được xóa sau khi khôi phục thành công.

Gateway mặc định dùng `RATE_LIMIT_WINDOW_MS=60000` và
`RATE_LIMIT_MAX_REQUESTS=120`: 120 request/phút cho mỗi IP mà gateway nhận diện.
Các VU trên cùng máy thường bị tính chung IP. Proxy có thể ảnh hưởng việc nhận
diện IP; không giả lập `X-Forwarded-For` để vượt giới hạn.

Giữ cấu hình hiện tại nếu đo hành vi hệ thống với chính sách rate limit đang bật.
Nếu cần đo năng lực xử lý phía sau limiter, dùng môi trường test trên VPS với cấu
hình tương đương deployment thật và tăng giới hạn phù hợp với tải dự định.
Ví dụ 100 RPS từ cùng IP cần hơn 6.000 request/phút và dư địa cho burst.

Compose hiện đọc `gateway/.env`; điều chỉnh hai biến tại file đó trên môi trường
test rồi tạo lại riêng gateway bằng đúng bộ Compose đang dùng để deploy. Ví dụ,
nếu deployment dùng cả hai file của repo:

```bash
docker compose -f compose.yaml -f compose.vps.yaml --profile app up -d --no-deps --force-recreate gateway
```

Ghi lại cấu hình test, kiểm tra header `x-ratelimit-limit` ở response và khôi phục
giới hạn ban đầu sau test. Không kết luận 429 nghĩa là VPS đã bão hòa. CDN/WAF cũng
có thể giới hạn request trước gateway.

## 4. Theo dõi trên VPS trong lúc test

Trong các phiên SSH riêng:

```bash
docker stats
```

```bash
top
```

```bash
free -h
df -h
```

Xem CPU, RAM, swap, container restart và log lỗi của gateway/service. Nếu dùng
`compose.vps.yaml`, nhiều container có giới hạn RAM riêng; VPS còn RAM không có
nghĩa là container chưa chạm giới hạn. Nếu MongoDB ở ngoài VPS, theo dõi cả DB đó.
Theo dõi CPU/RAM và kết nối internet của máy phát tải nữa.

## 5. Smoke test: 1 VU, 20 giây

Trên máy cá nhân:

```bash
docker run --rm -i -e BASE_URL -e TOKEN grafana/k6 run - < scripts/loadtest.js
```

Một lượt chạy đọc tuần tự:

1. `GET /api/user/me`
2. `GET /api/todo/my-tasks`
3. `GET /api/chat/chat/all`

Có thời gian nghỉ giữa các bước. Đây là tỷ lệ minh họa 1:1:1; điều chỉnh theo
log/hành vi ứng dụng trước khi dùng để đại diện traffic thực tế. Script kiểm tra
HTTP 200, JSON, đếm riêng 429, 401/403 và 5xx. Kiểm tra JSON ở đây chỉ là kiểm tra
cơ bản; các luồng ghi sau này cần xác nhận kết quả nghiệp vụ cụ thể.

## 6. Tăng tải theo từng lần chạy

Ví dụ 10 VU: tăng từ 0 lên 10 trong 1 phút, giữ 3 phút, giảm về 0 trong 30 giây.

```bash
set -o pipefail
docker run --rm -i -e BASE_URL -e TOKEN -e MODE=load -e TARGET_VUS=10 grafana/k6 run - < scripts/loadtest.js 2>&1 | tee k6-10vu.txt
```

Nếu kết quả đạt và tài nguyên ổn, lần lượt thay `TARGET_VUS` thành 20, 50… và đổi
tên file báo cáo. Chờ CPU, kết nối và DB ổn định giữa các lần. Không nhảy ngay lên
3.000 VU. Dừng bằng Ctrl+C nếu xuất hiện lỗi kéo dài, restart hoặc swap tăng mạnh.

Chỉ dùng một TOKEN thì mọi VU cùng đọc dữ liệu một tài khoản: kết quả chỉ có ý
nghĩa cho trường hợp đó, có thể chịu ảnh hưởng lớn của cache. Khi test nhiều
người dùng, chuẩn bị file `tokens.json` chứa mảng access token của các tài khoản
test khác nhau, tối thiểu một token/VU:

```json
["access-token-user-1", "access-token-user-2"]
```

Ví dụ chạy 10 VU với file chứa ít nhất 10 token:

```bash
docker run --rm -i -v "$PWD:/work:ro" -e BASE_URL -e MODE=load -e TARGET_VUS=10 -e TOKENS_FILE=/work/tokens.json grafana/k6 run - < scripts/loadtest.js
```

File token là dữ liệu nhạy cảm; giữ ngoài version control và xóa sau test. Nếu
token hết hạn giữa lần chạy, 401 là lỗi phiên đăng nhập, không phải bằng chứng quá tải.

## 7. Đọc kết quả

- `http_reqs`: tổng request HTTP và tốc độ request/giây (RPS). VU là số người dùng
  ảo đồng thời, không bằng RPS. WebSocket message không cộng vào HTTP RPS.
- `http_req_duration`: latency; p95 = 95% request hoàn thành trong thời gian đó.
  Script có ngưỡng riêng cho từng endpoint để API nhanh không che API chậm.
- `http_req_failed`: tỷ lệ HTTP request lỗi theo cách k6 phân loại status.
- `checks`: tỷ lệ kiểm tra HTTP/body đạt.
- `rate_limited`, `auth_errors`, `server_errors`: số response tương ứng.

Mục tiêu hiện tại của script là HTTP lỗi <1%, checks >99%, p95 và p99 từng API <500 ms,
không có 429/401/403/5xx. Điều chỉnh latency theo yêu cầu thực tế. HTTP lỗi >=1%
có thể làm test tự dừng sau khoảng đợi đánh giá 20 giây; các ngưỡng còn lại quyết
định đạt/trượt khi kết thúc.

Lưu mỗi lần: cấu hình CPU/RAM, giới hạn container, deployment version, dữ liệu,
rate limit, số VU, RPS, p95, tỷ lệ lỗi và tài nguyên ở giai đoạn giữ tải. Summary
cuối gộp cả tăng/giữ/giảm tải; nếu cần RPS chính xác ở đoạn giữ tải, dùng dữ liệu
time series (`--out json=...` hoặc dashboard), không coi số trung bình cả lượt là
tốc độ ổn định. Ngưỡng chịu tải là tải vẫn đáp ứng yêu cầu với workload và thời
gian đã kiểm tra, không phải RPS lớn nhất bất kể lỗi.

## 8. Mở rộng trước khi tuyên bố khả năng toàn hệ thống

Bổ sung luồng ghi trên dữ liệu test: gửi message REST vào chat dành riêng, tạo/
cập nhật task bằng tài khoản đủ quyền, đặt món trên dữ liệu test nếu đó là hành
vi cần đo. Kiểm tra message/task/order thực sự được tạo đúng và dọn dữ liệu sau
test. Không đưa thanh toán thật hoặc webhook nhà cung cấp vào script thử nghiệm.

Chat hiện dùng Socket.IO, xác thực qua `handshake.auth.token`. Kết nối WebSocket
thuần rồi chỉ kiểm tra HTTP 101 không chứng minh Socket.IO đã đăng nhập thành
công. Cần kịch bản xử lý Engine.IO/Socket.IO handshake, heartbeat và event, đo
thời gian nhận message/ACK, chạy đồng thời với REST theo tỷ lệ thực tế.

Sau khi có workload đại diện, tăng dần tải, xác định mức còn đạt yêu cầu rồi giữ
20–30 phút để kiểm tra độ ổn định. `ramping-vus` giảm nhịp phát request khi backend
chậm; nếu mục tiêu là một RPS cố định, dùng arrival-rate executor, nhớ rằng rate
của executor là số iteration/giây, không tự động bằng số request/giây.

Tài liệu chính thức:
- https://grafana.com/docs/k6/latest/get-started/running-k6/
- https://grafana.com/docs/k6/latest/using-k6/thresholds/
- https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- https://grafana.com/docs/k6/latest/using-k6/protocols/websockets/
