# PHÂN TÍCH LỖ HỔNG NGHIỆP VỤ - MACha Platform

**Ngày phân tích:** 2024-12-19  
**Phạm vi:** Toàn bộ codebase (Backend, Queue/Worker, Database)

---

## 1. TỔNG QUAN HỆ THỐNG & LUỒNG NGHIỆP VỤ

### Hệ thống MACha
Hệ thống nền tảng quyên góp từ thiện với các thành phần chính:
- **Backend (MACha-server):** Express.js, MongoDB, Redis, RabbitMQ
- **Worker (MACha_worker):** Xử lý email và notification bất đồng bộ
- **Payment Gateway:** SePay integration
- **Core Entities:** Campaign, Donation, Escrow (withdrawal requests), User, KYC

### Luồng nghiệp vụ chính:

#### A. Luồng Quyên Góp (Donation Flow)
1. User tạo donation → Tạo Donation record với status "pending"
2. Thanh toán qua SePay → Tạo order_invoice_number
3. SePay callback → Update donation status
4. Khi status = "completed" → Update campaign.current_amount, trigger milestone check
5. Worker xử lý notification (nếu có)

#### B. Luồng Campaign Approval
1. Creator tạo campaign → Status "pending"
2. Admin review → Approve/Reject
3. Nếu approved → Status "active", gửi email (async)
4. Campaign có thể nhận donation khi status = "active"

#### C. Luồng Escrow/Withdrawal
1. Campaign đạt milestone → Tự động tạo withdrawal request (hoặc creator tạo manual)
2. Voting period (3 ngày) → Donors vote
3. Admin review → Approve/Reject
4. Owner release payment → Status "released"
5. Worker gửi email/notification

#### D. Luồng Refund
1. Campaign bị cancel → Tính refund ratio
2. Admin process refund → Tạo Refund records
3. Process payment → Update refund status
4. Worker gửi email/notification

---

## 2. SƠ ĐỒ LUỒNG NGHIỆP VỤ (DIỄN GIẢI BẰNG CHỮ)

### 2.1. Luồng Donation (Sepay Payment)

**Step 1: User Initiate Donation**
- Input: campaignId, amount, paymentMethod
- Action: `createSepayDonation()` tạo Donation với status="pending"
- Output: Donation record, order_invoice_number
- Side-effect: Campaign.total_donations_count tăng
- **⚠️ Vấn đề:** Chưa có tiền, nhưng đã tăng counter

**Step 2: Payment Gateway Callback**
- Input: order_invoice_number, transaction_status
- Action: `updateSepayDonationStatus()` update status
- Check: Nếu status="completed" → Update campaign.current_amount
- Output: Updated donation
- Side-effect: Campaign amount tăng, milestone check, notification job
- **⚠️ Vấn đề:** Race condition giữa check và update (TOCTOU)

**Step 3: Milestone Check (Async)**
- Input: Campaign với current_amount mới
- Action: `checkAndCreateMilestoneWithdrawalRequest()` check % đạt được
- Output: Escrow withdrawal request (nếu đạt milestone)
- **⚠️ Vấn đề:** Race condition, có thể tạo duplicate requests

**Step 4: Worker Process Notification**
- Input: Job từ queue (notification.create)
- Action: Tạo Notification records
- Output: Notifications created
- **⚠️ Vấn đề:** Retry có thể gửi duplicate notifications

### 2.2. Luồng Campaign Approval

**Step 1: Admin Approve Campaign**
- Input: campaignId, adminId
- Action: `approveCampaign()` update status từ "pending" → "active"
- Check: Status phải là "pending"
- Output: Campaign với status="active"
- Side-effect: Cache invalidation, email job (async)
- **⚠️ Vấn đề:** Không có transaction, race condition nếu 2 admin cùng approve

**Step 2: Worker Send Email**
- Input: Job từ queue (mail.send)
- Action: Gửi email thông báo campaign approved
- Output: Email sent
- **⚠️ Vấn đề:** Nếu fail, không có retry hoặc user không nhận được email

### 2.3. Luồng Escrow Withdrawal

**Step 1: Create Withdrawal Request**
- Input: campaignId, amount, reason
- Action: `createWithdrawalRequest()` tạo Escrow record
- Check: Available amount, không có pending request
- Output: Escrow với status="pending_voting"
- **⚠️ Vấn đề:** Check và create không atomic, có thể tạo duplicate

**Step 2: Voting Period**
- Input: escrowId, userId, vote (approve/reject)
- Action: `submitVote()` tạo/update Vote record
- Check: User eligible, voting period chưa hết
- Output: Vote record
- **⚠️ Vấn đề:** Vote weight tính từ donation amount, nhưng donation có thể thay đổi

**Step 3: Admin Review**
- Input: escrowId, adminId, action (approve/reject)
- Action: `approveWithdrawalRequest()` hoặc `rejectWithdrawalRequest()`
- Check: Status phải là "voting_completed"
- Output: Escrow với status="admin_approved" hoặc "admin_rejected"
- **⚠️ Vấn đề:** Không có transaction, race condition

**Step 4: Release Payment**
- Input: order_invoice_number, payment_status
- Action: `updateSepayWithdrawalStatus()` update status="released"
- Check: Status phải là "admin_approved"
- Output: Escrow với status="released"
- Side-effect: Email/notification
- **⚠️ Vấn đề:** Idempotency check không đủ, có thể release 2 lần

### 2.4. Luồng Refund

**Step 1: Campaign Cancelled**
- Input: campaignId, reason
- Action: `cancelCampaign()` update status="cancelled"
- Output: Campaign với status="cancelled"
- **⚠️ Vấn đề:** Không check xem có withdrawal request đang pending không

**Step 2: Process Refund**
- Input: campaignId, adminId
- Action: `processProportionalRefund()` tạo Refund records
- Calculation: refundRatio = availableAmount / totalDonated
- Output: Refund records cho mỗi donation
- **⚠️ Vấn đề:** Tính toán refund dựa trên snapshot, nhưng có thể có donation mới trong lúc process

**Step 3: Process Refund Payment**
- Input: refundId, payment_status
- Action: `updateRefundStatus()` update status="completed"
- Output: Refund với status="completed"
- Side-effect: Update donation status, email/notification
- **⚠️ Vấn đề:** Multiple refunds cho cùng 1 donation có thể cộng dồn sai

---

## 3. DANH SÁCH LỖ HỔNG NGHIỆP VỤ

### [BL-01] Race Condition trong Cập Nhật Campaign Amount
- **Mô tả:** Khi nhiều donation callback xảy ra đồng thời, việc cập nhật `campaign.current_amount += amount` không atomic, dẫn đến mất mát dữ liệu.
- **Nguyên nhân:** 
  - Code sử dụng `campaign.current_amount += amount` rồi `campaign.save()` - đây là read-modify-write pattern không atomic
  - Không sử dụng MongoDB atomic operations (`$inc`)
  - Không có database transaction
- **Kịch bản lỗi:**
  1. Donation A (100k) và Donation B (200k) callback cùng lúc
  2. Cả 2 đọc `current_amount = 1000k`
  3. Donation A tính: `1000k + 100k = 1100k`, save
  4. Donation B tính: `1000k + 200k = 1200k`, save (ghi đè)
  5. **Kết quả:** Chỉ có 1200k thay vì 1300k → Mất 100k
- **Hậu quả:** 
  - Campaign amount không chính xác
  - Milestone được trigger sai
  - Refund tính toán sai
  - Tổn thất tài chính
- **Mức độ rủi ro:** ⚠️ **RẤT CAO**

### [BL-02] Idempotency Không Đảm Bảo trong Payment Callback
- **Mô tả:** Payment callback có thể được xử lý nhiều lần, dẫn đến duplicate processing (cộng tiền 2 lần, gửi notification 2 lần).
- **Nguyên nhân:**
  - Check `payment_status === 'completed'` và update không atomic (TOCTOU - Time-of-check-time-of-use)
  - SePay có thể gửi callback nhiều lần (network retry, webhook retry)
  - Không có unique constraint hoặc locking mechanism
- **Kịch bản lỗi:**
  1. SePay gửi callback lần 1: Check status="pending" → Update status="completed" → Cộng tiền
  2. SePay gửi callback lần 2 (retry): Check status="completed" → Return early
  3. **Nhưng nếu:** Callback 1 đang xử lý (chưa save), callback 2 check → status vẫn="pending" → Cộng tiền lần 2
- **Hậu quả:**
  - Campaign amount bị cộng dồn sai
  - User được credit nhiều lần
  - Notification gửi duplicate
- **Mức độ rủi ro:** ⚠️ **RẤT CAO**

### [BL-03] Thiếu Database Transaction - Partial Failure
- **Mô tả:** Các operations phức tạp (tạo donation + update campaign + tạo milestone) không nằm trong transaction, nếu 1 bước fail thì data inconsistent.
- **Nguyên nhân:**
  - Không sử dụng MongoDB transactions (`session.startTransaction()`)
  - Mỗi operation là independent, không có rollback mechanism
- **Kịch bản lỗi:**
  1. Donation callback: Update donation status="completed" → Success
  2. Update campaign.current_amount → Success
  3. Tạo milestone withdrawal request → Fail (database error)
  4. **Kết quả:** Donation đã completed, campaign đã cộng tiền, nhưng milestone request không được tạo
  5. Campaign có thể không bao giờ có withdrawal request cho milestone đó
- **Hậu quả:**
  - Data inconsistent giữa các collections
  - Campaign có tiền nhưng không tạo được withdrawal request
  - Phải manual intervention để fix
- **Mức độ rủi ro:** ⚠️ **CAO**

### [BL-04] Race Condition trong Campaign Approval/Rejection
- **Mô tả:** Nếu 2 admin cùng approve/reject 1 campaign, có thể cả 2 đều thành công (hoặc 1 approve, 1 reject).
- **Nguyên nhân:**
  - Check status và update không atomic
  - Không có optimistic locking (version field)
  - Không có pessimistic locking
- **Kịch bản lỗi:**
  1. Admin A và Admin B cùng mở campaign (status="pending")
  2. Admin A click approve → Check status="pending" → Update status="active"
  3. Admin B click reject → Check status="pending" (vì A chưa save) → Update status="rejected"
  4. **Kết quả:** Status cuối cùng là "rejected" (ghi đè), nhưng email "approved" đã được gửi
- **Hậu quả:**
  - Campaign status không đúng với action của admin
  - User nhận email sai
  - Business logic vi phạm
- **Mức độ rủi ro:** ⚠️ **CAO**

### [BL-05] Duplicate Milestone Withdrawal Request
- **Mô tả:** Nếu nhiều donation xảy ra đồng thời, có thể tạo nhiều withdrawal request cho cùng 1 milestone.
- **Nguyên nhân:**
  - Check `existingRequest` và `create()` không atomic
  - Multiple donations cùng đạt milestone → Cùng check (không thấy request) → Cùng tạo
- **Kịch bản lỗi:**
  1. Campaign đang ở 49% goal
  2. Donation A (1%) và Donation B (1%) xảy ra cùng lúc
  3. Cả 2 check milestone → Đều đạt 50% milestone
  4. Cả 2 check existingRequest → Đều không thấy (vì chưa có)
  5. Cả 2 tạo withdrawal request cho milestone 50%
  6. **Kết quả:** 2 requests duplicate cho cùng 1 milestone
- **Hậu quả:**
  - Creator có thể vote 2 lần
  - Admin phải xử lý duplicate requests
  - Confusion trong business flow
- **Mức độ rủi ro:** ⚠️ **CAO**

### [BL-06] Race Condition trong Create Withdrawal Request
- **Mô tả:** Nếu creator tạo withdrawal request 2 lần nhanh, có thể tạo 2 requests cùng lúc.
- **Nguyên nhân:**
  - Check `pendingRequest` và `create()` không atomic
  - Không có unique constraint hoặc locking
- **Kịch bản lỗi:**
  1. Creator click "Create withdrawal request" → Check không có pending request → OK
  2. Creator click lại (double click) → Check không có pending request (vì request 1 chưa save) → OK
  3. **Kết quả:** 2 withdrawal requests được tạo
- **Hậu quả:**
  - Duplicate withdrawal requests
  - Confusion trong voting process
  - Phải manual cancellation
- **Mức độ rủi ro:** ⚠️ **TRUNG BÌNH**

### [BL-07] Worker Retry Gây Duplicate Notifications/Emails
- **Mô tả:** Khi worker retry job (do network error, temporary failure), notification/email có thể được gửi nhiều lần.
- **Nguyên nhân:**
  - Worker retry logic không check idempotency
  - Notification/email được tạo mỗi lần retry (không check xem đã tạo chưa)
  - Job schema có jobId nhưng không được sử dụng để prevent duplicate
- **Kịch bản lỗi:**
  1. Campaign approved → Push job "CAMPAIGN_APPROVED" vào queue
  2. Worker xử lý → Tạo notification, gửi email → Network error → NACK
  3. Worker retry → Tạo notification lại, gửi email lại
  4. **Kết quả:** User nhận 2 notifications và 2 emails
- **Hậu quả:**
  - User experience kém (spam)
  - Database có duplicate notifications
  - Email provider có thể block (spam)
- **Mức độ rủi ro:** ⚠️ **TRUNG BÌNH**

### [BL-08] Refund Calculation Dựa Trên Snapshot
- **Mô tả:** Refund được tính dựa trên `campaign.current_amount` tại thời điểm process, nhưng có thể có donation mới trong lúc process, dẫn đến refund ratio sai.
- **Nguyên nhân:**
  - `totalDonated = campaign.current_amount` được đọc 1 lần
  - Process refund không lock campaign
  - Có thể có donation mới trong lúc process refund
- **Kịch bản lỗi:**
  1. Campaign có 1000k, released 200k → Available = 800k
  2. Admin start process refund → Tính refundRatio = 800k/1000k = 80%
  3. Trong lúc process refund, có donation mới 100k → current_amount = 1100k
  4. Refund được process với ratio 80% (sai, vì phải là 800k/1100k = 72.7%)
  5. **Kết quả:** Donors được refund nhiều hơn thực tế
- **Hậu quả:**
  - Financial loss
  - Refund amount không chính xác
  - Campaign có thể âm tiền
- **Mức độ rủi ro:** ⚠️ **CAO**

### [BL-09] Campaign Cancellation Không Check Pending Withdrawals
- **Mô tả:** Campaign có thể bị cancel ngay cả khi có withdrawal request đang pending, dẫn đến inconsistent state.
- **Nguyên nhân:**
  - `cancelCampaign()` không check xem có withdrawal request nào đang pending/released không
  - Business rule không rõ ràng về khi nào được phép cancel
- **Kịch bản lỗi:**
  1. Campaign có withdrawal request status="admin_approved"
  2. Creator cancel campaign → Success
  3. Admin release payment → Success
  4. **Kết quả:** Campaign bị cancel nhưng vẫn release tiền → Inconsistent
- **Hậu quả:**
  - Business logic vi phạm
  - Money flow không rõ ràng
  - Audit trail khó trace
- **Mức độ rủi ro:** ⚠️ **TRUNG BÌNH**

### [BL-10] Escrow Release Payment Không Idempotent
- **Mô tả:** SePay callback cho withdrawal payment có thể được xử lý nhiều lần, dẫn đến release tiền nhiều lần (hoặc update status nhiều lần).
- **Nguyên nhân:**
  - Check `request_status === 'released'` và update không atomic
  - SePay callback có thể retry
- **Kịch bản lỗi:**
  1. SePay callback lần 1: Check status="admin_approved" → Update status="released"
  2. SePay callback lần 2: Check status="released" → Return early (OK)
  3. **Nhưng nếu:** Callback 1 đang xử lý (chưa save), callback 2 check → status vẫn="admin_approved" → Update lại
  4. **Kết quả:** Email/notification được gửi 2 lần
- **Hậu quả:**
  - Duplicate notifications
  - Confusion (nhưng không mất tiền vì chỉ update status 1 lần)
- **Mức độ rủi ro:** ⚠️ **TRUNG BÌNH**

### [BL-11] Voting Weight Tính Từ Snapshot
- **Mô tả:** Vote weight được tính từ donation amount tại thời điểm vote, nhưng donation có thể thay đổi sau đó (refund), dẫn đến vote weight không chính xác.
- **Nguyên nhân:**
  - Vote weight = donated_amount (snapshot tại thời điểm vote)
  - Nếu donation bị refund sau khi vote, weight vẫn giữ nguyên
- **Kịch bản lỗi:**
  1. Donor A donate 1000k, vote approve → Weight = 1000k
  2. Campaign bị cancel, refund 50% → Donation còn 500k
  3. Voting result vẫn tính weight = 1000k (sai)
  4. **Kết quả:** Vote weight không phản ánh actual contribution
- **Hậu quả:**
  - Voting result không chính xác
  - Business logic vi phạm (weight should reflect current contribution)
- **Mức độ rủi ro:** ⚠️ **THẤP** (vì đây là design decision, có thể intentional)

### [BL-12] No Compensation Logic cho Async Jobs
- **Mô tả:** Khi async job (email, notification) fail, không có compensation logic để rollback hoặc retry với backoff.
- **Nguyên nhân:**
  - Async jobs được push vào queue, nhưng nếu fail thì chỉ log error
  - Không có retry với exponential backoff
  - Không có dead-letter queue để manual review
- **Kịch bản lỗi:**
  1. Campaign approved → Push email job
  2. Email service down → Job fail → NACK → Retry ngay
  3. Email service vẫn down → Retry fail → NACK → Retry ngay (loop)
  4. **Kết quả:** Worker busy với retry, không process jobs khác
  5. User không nhận được email
- **Hậu quả:**
  - User không nhận được notification/email
  - Worker performance degrade
  - Khó debug (không biết job nào fail)
- **Mức độ rủi ro:** ⚠️ **TRUNG BÌNH**

### [BL-13] Cron Job Process Expired Campaigns Race Condition
- **Mô tả:** Cron job `processExpiredCampaigns` chạy mỗi ngày, nhưng nếu có nhiều campaigns hết hạn cùng lúc, có thể tạo duplicate withdrawal requests.
- **Nguyên nhân:**
  - Check `existing100PercentRequest` và `create()` không atomic
  - Multiple campaigns hết hạn cùng lúc → Cùng check → Cùng tạo
- **Kịch bản lỗi:**
  1. Campaign A và B cùng hết hạn
  2. Cron job chạy → Check A (không có request) → Tạo request
  3. Cron job chạy → Check B (không có request) → Tạo request
  4. **Nhưng nếu:** Trong lúc process A, có donation mới cho B → Trigger milestone → Tạo request
  5. **Kết quả:** Campaign B có 2 withdrawal requests
- **Hậu quả:**
  - Duplicate withdrawal requests
  - Confusion
- **Mức độ rủi ro:** ⚠️ **THẤP** (vì cron job chạy 1 lần/ngày, ít khi xảy ra)

---

## 4. CÁC LUỒNG NGHIỆP VỤ CÓ NGUY CƠ CAO NHẤT

### Luồng A: Donation Payment Callback (Sepay)
- **Rủi ro:** ⚠️ **RẤT CAO**
- **Lý do:**
  - Liên quan trực tiếp đến tiền (financial impact)
  - Race condition trong update campaign amount
  - Idempotency không đảm bảo (có thể cộng tiền 2 lần)
  - High concurrency (nhiều donations cùng lúc)
  - External dependency (SePay callback có thể retry)

### Luồng B: Campaign Approval/Rejection
- **Rủi ro:** ⚠️ **CAO**
- **Lý do:**
  - Business-critical (campaign status ảnh hưởng đến toàn bộ flow)
  - Race condition khi 2 admin cùng approve/reject
  - Email notification có thể sai
  - Không có audit trail rõ ràng

### Luồng C: Milestone Withdrawal Request Creation
- **Rủi ro:** ⚠️ **CAO**
- **Lý do:**
  - Trigger tự động khi đạt milestone
  - Race condition khi nhiều donations cùng đạt milestone
  - Duplicate requests gây confusion
  - Liên quan đến voting process (phức tạp)

### Luồng D: Refund Processing
- **Rủi ro:** ⚠️ **CAO**
- **Lý do:**
  - Financial impact (refund amount sai)
  - Calculation dựa trên snapshot (có thể sai nếu có donation mới)
  - Multiple refunds cho cùng 1 donation có thể cộng dồn sai
  - Liên quan đến recovery case (phức tạp)

---

## 5. NHẬN ĐỊNH TỔNG THỂ

### 5.1. Hệ thống hiện tại phù hợp ở mức scale nào?

**✅ PHÙ HỢP:**
- **Low-Medium scale:** < 100 concurrent users, < 1000 donations/day
- **Single region deployment**
- **Low concurrency scenarios** (ít xảy ra race condition)

**❌ KHÔNG PHÙ HỢP:**
- **High scale:** > 1000 concurrent users, > 10,000 donations/day
- **Multi-region deployment**
- **High concurrency scenarios** (peak hours, flash campaigns)

**Lý do:**
1. **Không có database transactions** → Partial failures không được handle
2. **Race conditions** → Data inconsistency ở scale cao
3. **No locking mechanism** → Duplicate operations
4. **Idempotency không đảm bảo** → Duplicate processing
5. **No compensation logic** → Async job failures không được handle properly

### 5.2. Những giả định nghiệp vụ đang sai hoặc quá lạc quan

#### ❌ Giả định 1: "MongoDB operations là atomic"
- **Thực tế:** Chỉ có single-document operations là atomic. Multi-document operations (tạo donation + update campaign) không atomic.
- **Hệ quả:** Partial failures không được handle

#### ❌ Giả định 2: "Payment callbacks chỉ được gửi 1 lần"
- **Thực tế:** Payment gateways thường retry callbacks (network issues, webhook retries).
- **Hệ quả:** Callbacks có thể được xử lý nhiều lần → Duplicate processing

#### ❌ Giả định 3: "Không có concurrent operations"
- **Thực tế:** Hệ thống có nhiều concurrent operations (donations, approvals, withdrawals).
- **Hệ quả:** Race conditions xảy ra thường xuyên

#### ❌ Giả định 4: "Async jobs luôn thành công"
- **Thực tế:** Email/notification services có thể fail (network, rate limits, downtime).
- **Hệ quả:** User không nhận được notifications, nhưng business logic vẫn tiếp tục

#### ❌ Giả định 5: "Read-modify-write operations là safe"
- **Thực tế:** `current_amount += amount` rồi `save()` không atomic → Race condition.
- **Hệ quả:** Data loss/corruption

#### ❌ Giả định 6: "Check-then-act pattern là safe"
- **Thực tế:** Check status rồi update không atomic (TOCTOU) → Race condition.
- **Hệ quả:** Duplicate operations, inconsistent state

#### ❌ Giả định 7: "Campaign amount chỉ được update từ donations"
- **Thực tế:** Campaign amount được update từ nhiều nguồn (donations, refunds, withdrawals) → Complex state management.
- **Hệ quả:** Difficult to maintain consistency

---

## 6. KHUYẾN NGHỊ TỔNG QUAN

### Priority 1 (Critical - Phải fix ngay):
1. **[BL-01]** Sử dụng MongoDB `$inc` operator cho campaign amount updates
2. **[BL-02]** Implement idempotency check với unique constraint hoặc optimistic locking
3. **[BL-03]** Sử dụng database transactions cho complex operations
4. **[BL-05]** Implement unique constraint hoặc locking cho milestone withdrawal requests

### Priority 2 (High - Nên fix sớm):
5. **[BL-04]** Implement optimistic locking cho campaign approval/rejection
6. **[BL-08]** Lock campaign trong lúc process refund
7. **[BL-06]** Implement unique constraint cho withdrawal requests

### Priority 3 (Medium - Nên fix trong roadmap):
8. **[BL-07]** Implement idempotency check cho notification/email jobs
9. **[BL-10]** Improve idempotency check cho escrow release
10. **[BL-12]** Implement dead-letter queue và retry với exponential backoff

---

**Kết thúc báo cáo**

