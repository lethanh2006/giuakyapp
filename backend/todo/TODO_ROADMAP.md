# Lộ trình Đề xuất Mở rộng Chức năng cho Hệ thống Quản lý Công việc (Todo Service)

> Tài liệu này phân tích hiện trạng của service **Todo** trong dự án **NRApp**, đồng thời đề xuất các tính năng mới mang tính thực tiễn cao, phù hợp với hệ thống vận hành nội bộ (nhà hàng / doanh nghiệp), dễ dàng mở rộng từ kiến trúc Microservices hiện có.

---

## 1. Hiện trạng Hệ thống Todo hiện tại

Service **Todo** hiện tại đã cung cấp các chức năng CRUD cơ bản:
- **Dữ liệu Task**: `title`, `description`, `status` (`todo`, `in_progress`, `done`, `cancelled`), `priority` (`low`, `medium`, `high`), `createdBy`, `assignedTo`, `deadline`.
- **Phân quyền (RBAC)**:
  - Nhân viên thông thường: xem việc của mình (`/my-tasks`), cập nhật trạng thái (`/:id/status`), xem chi tiết (`/:id`).
  - Quản lý (`ADMIN`, `MANAGER`, `CHEF`): tạo việc, xem tất cả việc, sửa nội dung, phân công lại (`assign`), xóa.
- **Cơ sở dữ liệu**: MongoDB (`TaskSchema`) với các index tối ưu cho `assignedTo` và `createdBy`.

---

## 2. Các nhóm chức năng đề xuất phát triển thêm

Dưới đây là 5 nhóm chức năng thực tế nhất, xếp theo độ ưu tiên từ cơ bản đến nâng cao:

---

### 🔥 Nhóm 1: Checklist / Subtasks (Công việc con) & Tiến độ %
> **Mục tiêu**: Giúp chia nhỏ các công việc phức tạp thành các bước cụ thể (rất hữu ích trong nhà hàng/bếp như: quy trình mở ca, vệ sinh dụng cụ, kiểm kê kho).

- **Mô tả chức năng**:
  - Thêm mảng `subtasks` vào schema: mỗi mục gồm `title`, `isCompleted: boolean`.
  - Tự động tính toán trường `progress` (0% - 100%) dựa trên số item đã hoàn thành.
  - Khi hoàn thành 100% subtasks, hệ thống có thể gợi ý chuyển trạng thái task sang `done`.
- **API đề xuất**:
  - `POST /api/todo/:id/subtasks`: Thêm checklist item.
  - `PATCH /api/todo/:id/subtasks/:subtaskId`: Đánh dấu tick/untick hoàn thành item.
  - `DELETE /api/todo/:id/subtasks/:subtaskId`: Xóa mục checklist.

---

### 💬 Nhóm 2: Trao đổi & Lịch sử thay đổi (Comments & Activity Log)
> **Mục tiêu**: Quản lý và nhân viên có thể thảo luận ngay tại công việc đó thay vì phải qua app chat riêng biệt, đồng thời ghi lại vết trách nhiệm (ai đổi trạng thái lúc nào).

- **Mô tả chức năng**:
  - **Activity Log (Audit Trail)**: Tự động ghi lại lịch sử khi có sự kiện:
    - *Nguyễn Văn A nhận việc lúc 08:30*.
    - *Trần Thị B đổi trạng thái từ TODO sang IN_PROGRESS lúc 09:15*.
    - *Lý do hủy việc (nếu status = cancelled)*.
  - **Comments**: Cho phép quản lý và người làm việc để lại bình luận hướng dẫn hoặc phản hồi.
- **API đề xuất**:
  - `GET /api/todo/:id/activities`: Lấy toàn bộ lịch sử thay đổi của task.
  - `POST /api/todo/:id/comments`: Thêm bình luận vào task.
  - `GET /api/todo/:id/comments`: Xem danh sách bình luận.

---

### 📸 Nhóm 3: Ảnh minh chứng hoàn thành (Proof of Completion)
> **Mục tiêu**: Đảm bảo chất lượng công việc thông qua hình ảnh thực tế (ví dụ: chụp ảnh bếp sạch, ảnh kiểm tra tủ đông, ảnh sắp xếp bàn ăn).

- **Mô tả chức năng**:
  - Cho phép người được giao đính kèm ảnh khi chuyển trạng thái sang `done`.
  - Quản lý có thể xem ảnh để duyệt nghiệm thu hoặc từ chối chuyển về `in_progress`.
- **API đề xuất**:
  - `POST /api/todo/:id/attachments`: Tải ảnh/tệp đính kèm lên task.
  - `DELETE /api/todo/:id/attachments/:fileId`: Xóa tệp đính kèm.

---

### 📊 Nhóm 4: Báo cáo & Thống kê Hiệu suất (Analytics Dashboard)
> **Mục tiêu**: Phục vụ màn hình Dashboard cho Quản lý / Ban giám đốc để theo dõi năng suất làm việc.

- **Mô tả chức năng**:
  - Thống kê tỷ lệ hoàn thành đúng hạn (On-time completion rate) vs quá hạn (Overdue rate).
  - Thống kê số lượng task theo mức độ ưu tiên (`high`, `medium`, `low`) và theo nhân viên.
  - Biểu đồ khối lượng công việc theo tuần/tháng.
- **API đề xuất**:
  - `GET /api/todo/statistics/summary`: Tổng quan (Tổng việc, Đang làm, Quá hạn, Đã xong).
  - `GET /api/todo/statistics/by-user`: Thống kê khối lượng việc và tỷ lệ hoàn thành theo từng nhân viên.
  - `GET /api/todo/statistics/overdue`: Danh sách các công việc đã bị trễ hạn chót (`deadline < now` mà chưa `done`).

---

### 🔔 Nhóm 5: Tích hợp Thông báo Tự động (RabbitMQ & Mail Service)
> **Mục tiêu**: Tận dụng hạ tầng RabbitMQ & Mailpit đã có sẵn trong dự án để thông báo tức thời.

- **Mô tả chức năng**:
  - Khi quản lý tạo việc mới và gán `assignedTo`, Todo Service bắn message vào RabbitMQ Exchange: `todo.task_assigned`.
  - Service `mail` hoặc Notification lắng nghe và gửi email/thông báo cho nhân viên.
  - Tự động gửi cảnh báo nhắc việc trước deadline 1 tiếng hoặc khi task bị trễ hạn.

---

## 3. Bảng so sánh & Lựa chọn triển khai

| Chức năng | Độ khó | Thời gian dự kiến | Giá trị thực tiễn | Đánh giá ưu tiên |
| :--- | :---: | :---: | :---: | :---: |
| **1. Checklist / Subtasks** | Dễ | 1 - 2 ngày | ⭐⭐⭐⭐⭐ | **Rất nên làm đầu tiên** |
| **2. Báo cáo thống kê Dashboard** | Trung bình | 1 - 2 ngày | ⭐⭐⭐⭐⭐ | **Rất nên làm** (dễ chấm điểm demo) |
| **3. Lịch sử thay đổi (Activity Log)** | Trung bình | 1 ngày | ⭐⭐⭐⭐ | Nên làm |
| **4. Bắn sự kiện qua RabbitMQ** | Trung bình | 1 - 2 ngày | ⭐⭐⭐⭐⭐ | Thể hiện đúng bản chất Microservices |
| **5. Đính kèm ảnh minh chứng** | Trung bình | 2 - 3 ngày | ⭐⭐⭐⭐ | Làm sau khi có upload service |

---

## 4. Gợi ý bước thực hiện tiếp theo

Nếu bạn muốn bắt tay vào phát triển, **Nhóm 1 (Checklist / Subtasks)** và **Nhóm 4 (Thống kê / Dashboard)** là 2 tính năng tối ưu nhất:
1. **Dễ kiểm chứng trực tiếp trên Swagger**: Chỉ cần thêm DTO, controller và service là Swagger hiển thị ngay các API mới.
2. **Dễ đưa lên giao diện ứng dụng (Mobile/Web Expo)**: Thêm các ô tích chọn checklist hoặc biểu đồ tròn/thanh cho Dashboard.
