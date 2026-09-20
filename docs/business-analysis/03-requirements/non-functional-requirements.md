# Non-Functional Requirements

## Performance

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-001 | Thời gian phản hồi của các thao tác tra cứu thông thường | 95% request <= 2 giây |
| NFR-002 | Thời gian kiểm tra availability | <= 3 giây |
| NFR-003 | Khả năng phục vụ người dùng đồng thời | >= 100 active sessions |

## Availability

| ID | Requirement | Target |
|---|---|---|
| NFR-004 | Mức độ sẵn sàng của hệ thống | >= 99.5% mỗi tháng, không tính thời gian bảo trì có kế hoạch |

## Security

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-005 | API yêu cầu xác thực phải từ chối request không hợp lệ | 100% |
| NFR-006 | Chức năng giới hạn theo vai trò phải kiểm tra authorization trước khi xử lý | 100% |
| NFR-007 | Mật khẩu phải được lưu dưới dạng hash | 100% tài khoản |
| NFR-008 | Dữ liệu và bằng chứng nội bộ chỉ được truy cập bởi người có quyền | 100% request được kiểm soát quyền |

## Reliability & Data Integrity

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-009 | Transaction thất bại không được để lại dữ liệu xử lý một phần | 0 partial transaction |
| NFR-010 | Temporary hold hết hạn phải được giải phóng | <= 1 phút sau thời điểm hết hạn |
| NFR-011 | Các thao tác nghiệp vụ quan trọng phải có dữ liệu phục vụ truy vết | 100% thao tác thuộc phạm vi audit |

## Time & Consistency

| ID | Non-Functional Requirement |
| --- | --- |
| NFR-013 | 100% thời gian nghiệp vụ hiển thị cho người dùng phải được xử lý nhất quán theo timezone `Asia/Ho_Chi_Minh`. |
| NFR-014 | Các phép kiểm tra giao nhau về thời gian phải tuân theo quy ước interval nửa mở `[startAt, endAt)`. |

## Maintainability & Traceability

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-012 | Các chức năng nghiệp vụ chính phải có automated test. | Main flow và boundary case quan trọng phải được kiểm thử. |
| NFR-015 | Các Business Rule quan trọng phải truy vết được tới Functional Requirement, Use Case, sequence và implementation liên quan. | 100% rule critical trong RTM có liên kết. |

## Planned AI Requirements

| ID | Non-Functional Requirement | Status |
| --- | --- | --- |
| NFR-AI-001 | 95% phản hồi của AI Chatbot phải được trả trong vòng 5 giây trong điều kiện tải bình thường. | Planned |
| NFR-AI-002 | AI Chatbot không được phép truy cập hoặc trả về dữ liệu của Customer khác hoặc dữ liệu ngoài phạm vi quyền được cấp. | Planned |
