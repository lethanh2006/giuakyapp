# NRApp backend

Backend hỗ trợ hai chế độ chạy. Cả hai dùng chung cấu hình port, RabbitMQ và
PostgreSQL Payment trong `backend/.env`.

## Stack service

Các service `chat`, `user`, `todo` và `workschedule` đã được chuyển từ Express
bootstrap thủ công sang NestJS 11, đồng bộ toolchain với `auth`, `canteen` và
`gateway`:

- NestJS 11, `@nestjs/config` 4 và `@nestjs/mongoose` 11;
- Mongoose 9, TypeScript 5.9, Node.js 20.19+ (container dùng Node.js 22);
- module/controller/service + dependency injection, DTO validation;
- request ID, structured logging, global exception filter và health endpoint;
- shutdown lifecycle cho kết nối hạ tầng.

Các HTTP path, response envelope, Socket.IO event, RabbitMQ queue và tên MongoDB
collection cũ được giữ nguyên để Gateway và dữ liệu hiện tại tiếp tục tương thích.
Chat dùng Nest WebSocket Gateway và Cloudinary upload stream; User quản lý
consumer `user-profile-sync` bằng lifecycle NestJS.

Bạn vẫn có thể chạy `npm run dev`/`npm run start:dev` bên trong từng service từ
IDE. Các service dùng RabbitMQ sẽ tự đọc credential hạ tầng ở `backend/.env`.

## Dev: app local, hạ tầng dùng Docker

Yêu cầu: Node.js 20.19+, Docker và dependency của từng service đã được cài.

```bash
cd backend
npm run dev
```

Lệnh này tự động:

1. dừng các container app để không trùng port;
2. khởi động và chờ Redis, RabbitMQ và PostgreSQL Payment healthy;
3. chạy toàn bộ Node service local ở chế độ watch;
4. ánh xạ URL nội bộ sang `127.0.0.1` và dùng credential RabbitMQ từ
   `backend/.env`.

Nhấn `Ctrl+C` để dừng các app local. Redis, RabbitMQ và PostgreSQL Payment vẫn
chạy để lần khởi động sau nhanh hơn. Dừng chúng khi không dùng:

```bash
npm run infra:down
```

Nếu hạ tầng đã chạy sẵn và không muốn script đụng tới Docker:

```bash
npm run dev:apps
```

Gateway mặc định ở `http://localhost:3000`, Swagger ở
`http://localhost:3000/api-docs`.

MongoDB hiện là hạ tầng bên ngoài Compose. Khi chạy local, đặt `MONGO_URL` trong
`.env` của từng service tới MongoDB có thể truy cập từ máy host. Khi chạy toàn bộ
bằng Docker, không dùng `localhost` trong `MONGO_URL`; hãy dùng hostname/DNS mà
container truy cập được. Các service tiếp tục dùng database `nrapp` để đọc đúng
dữ liệu hiện có.

## pgAdmin web cho team

Điền `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` vào `backend/.env`, rồi
chạy `npm run pgadmin:up`. Mở <http://127.0.0.1:5050> trên máy host.
Service dùng profile `admin` và volume `pgadmin_data`, tự khởi động lại cùng
Docker trừ khi đã chủ động dừng. Dừng riêng bằng `npm run pgadmin:down`.
`infra:down` chỉ dừng hạ tầng DB/cache; pgAdmin vẫn chạy nhưng không kết nối DB
được cho tới khi bật lại hạ tầng.

Để team truy cập `https://pgadmin.thanhlelmtp2006.id.vn`, làm theo
[hướng dẫn pgAdmin cho team](../docBEMD/HUONG_DAN_PGADMIN_TEAM.md): Cloudflare
Access theo email, route HTTP `pgadmin:8080`, tài khoản pgAdmin riêng và quyền
PostgreSQL chỉ đọc. Tài khoản pgAdmin desktop cũ không tự chuyển sang bản web.

## Kiểm tra các service vừa chuyển đổi

Chạy build và test độc lập cho từng service:

```bash
for service in chat user todo workschedule; do
  (cd "$service" && npm run lint && npm test -- --runInBand && npm run build)
done
```

## Chạy toàn bộ bằng Docker

```bash
cd backend
npm run docker:up
```

Nếu đã có image trên máy và chỉ cần bật lại app, dùng `npm run docker:start`.
Lệnh này dùng image backend hiện có, không build hoặc pull lại image backend;
khi sửa code, dùng `npm run docker:up` để build bản mới.

Dockerfile dùng frontend có sẵn trong BuildKit (Docker Engine 23+), tránh bước
tải thêm `docker/dockerfile:1.7` từ Docker Hub. Build vẫn cần truy cập registry
khi phải lấy base image hoặc dependency chưa có trong cache.

Nếu registry báo `dial tcp [IPv6]:443: network is unreachable`, đó là lỗi kết nối
tới registry; kiểm tra cả IPv4 bằng `curl -4 -I https://registry-1.docker.io/v2/`.
HTTP 401 ở endpoint này là phản hồi xác thực bình thường, cho thấy đã kết nối
được registry. Không cần chạy `docker:down` để thử build lại.

Dừng toàn bộ stack:

```bash
npm run docker:down
```

Không chạy `npm run dev` cùng lúc với các container app vì chúng dùng cùng host
port. Script dev sẽ tự dừng các container app trước khi chạy local.

Nếu script báo port đang được sử dụng, hãy dừng các Run/Debug task hoặc terminal
đang chạy service cũ trong IDE rồi chạy lại. Script không tự kill process local
không thuộc phiên hiện tại để tránh làm mất công việc đang chạy.

## Quy ước source backend

Mỗi service là một repo độc lập. Bắt đầu đọc `main.ts` → `app.module.ts` →
`core/core.module.ts` → `modules/<nghiệp-vụ>/`. Các file dùng xuyên module đặt
trong `common/`, chia theo trách nhiệm: `config`, `decorators`, `enums`,
`interfaces`, `middleware`, `guards`, `security`, `filters`, `logging`, `utils`.
Chỉ tạo thư mục có file thực sự dùng; `http`/`pipes` chỉ có ở service cần đến.

Luồng và các điểm khác nhau cần giữ của từng service nằm trong `COMMON.md`
của repo tương ứng. Không ép đồng nhất role, chữ ký, metadata hay response
format vì frontend và các service đang phụ thuộc vào chúng.

Hiện trạng VPS và thứ tự phát hành được ghi trong
[Logger deploy](logger/deploy/README.md). Payment chưa deploy, nhưng mã nguồn
và migration vẫn được giữ để bảo toàn chức năng.
