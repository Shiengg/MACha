# ESCROW VOTING EVALUATION - IMPLEMENTATION SUMMARY

## I. TỔNG QUAN

Đã implement đầy đủ luồng xử lý escrow khi hết thời gian vote, bao gồm:
- **CASE 1**: Vote quá ít (<50% donor) → Admin có thể gia hạn
- **CASE 2**: Reject quá nhiều (>50% donor) → Huỷ campaign và hoàn tiền

---

## II. CÁC THAY ĐỔI CHÍNH

### 1. Escrow Model (`models/escrow.js`)

**Trạng thái mới:**
- `voting_extended`: Đã gia hạn thời gian vote
- `rejected_by_community`: Bị từ chối bởi cộng đồng (>50% reject)
- `admin_approved`: Đã được admin duyệt (đã có sẵn, giữ nguyên)

**Fields mới:**
- `community_rejected_at`: Thời điểm bị từ chối bởi cộng đồng (audit trail)
- `voting_extended_count`: Số lần đã gia hạn vote
- `last_extended_at`: Thời điểm gia hạn cuối
- `voting_extended_by`: Admin đã gia hạn vote

### 2. Escrow Service (`services/escrow.service.js`)

#### a. `evaluateVoteResults(escrowId)`
Function chính để đánh giá kết quả vote:
- Tính toán:
  - `totalDonors`: Tổng số donor đã donate
  - `totalVotes`: Tổng số vote
  - `votePercentage`: % donor đã vote
  - `rejectDonorPercentage`: % donor reject (theo số lượng donor, không phải weight)

- Logic quyết định:
  - **Reject > 50% donor** → `REJECTED_BY_COMMUNITY` (set status + `community_rejected_at`)
  - **Vote < 50% donor** → `INSUFFICIENT_VOTES` (giữ nguyên status để admin gia hạn)
  - **Còn lại** → `VOTING_COMPLETED` (chờ admin review)

#### b. `processExpiredVotingPeriods()`
Job chạy mỗi giờ để xử lý escrow đã hết thời gian vote:
- Query escrow với status `voting_in_progress` hoặc `voting_extended` và `voting_end_date <= now`
- Gọi `evaluateVoteResults()` cho mỗi escrow
- Log kết quả đầy đủ

#### c. `extendVotingPeriod(escrowId, adminId, extensionDays)`
Admin gia hạn thời gian vote:
- Validate: `extensionDays` phải là 3 hoặc 5
- Chỉ cho phép khi escrow ở trạng thái `voting_in_progress`, `voting_extended`, hoặc đã expired
- Update:
  - `voting_end_date`: Gia hạn thêm X ngày
  - `request_status`: → `voting_extended`
  - `voting_extended_count`: Tăng lên
  - `last_extended_at`: Set thời điểm hiện tại
  - `voting_extended_by`: Set admin ID
- Gửi notification cho tất cả donor
- Invalidate cache

#### d. `cancelCampaignByCommunityRejection(escrowId, adminId)`
Admin huỷ campaign và khởi tạo refund:
- Chỉ cho phép khi escrow ở trạng thái `rejected_by_community`
- Idempotency check: Nếu campaign đã bị cancel → return success (không làm gì)
- Actions:
  1. Set `campaign.status = "cancelled"`
  2. Set `campaign.cancelled_at`
  3. Set `campaign.cancellation_reason`
  4. Cancel tất cả pending withdrawal requests
  5. Gọi `processProportionalRefund()` (reuse logic từ refund flow)
  6. Gửi notification và email cho tất cả donor
  7. Invalidate cache

#### e. `submitVote(escrowId, userId, value)` - Cập nhật
- Cho phép vote khi status là `voting_in_progress` HOẶC `voting_extended`
- Sau khi vote reject: Check ngay nếu `rejectDonorPercentage > 50%` → trigger `evaluateVoteResults()` để set `REJECTED_BY_COMMUNITY`

#### f. `getWithdrawalRequestsForReview(status)` - Cập nhật
- Query cả `voting_completed` và `rejected_by_community`
- Tính toán đầy đủ vote summary (bao gồm `totalDonors`, `votePercentage`, `rejectDonorPercentage`)
- Thêm `adminActions` object:
  - `canExtend`: Vote < 50%
  - `canCancel`: Status = `rejected_by_community` và campaign chưa bị cancel
  - `canApprove`: Status = `voting_completed`
  - `canReject`: Status = `voting_completed`

#### g. `calculateEscrowProgress(escrow)` - Cập nhật
- Support các trạng thái mới:
  - `voting_extended`: Tương tự `voting_in_progress`
  - `rejected_by_community`: Community voting step = REJECTED
- Thêm metadata: `voting_extended_count`, `last_extended_at`, `community_rejected_at`

### 3. Escrow Controller (`controllers/EscrowController.js`)

**Endpoints mới:**
1. `POST /api/admin/escrow/withdrawal-requests/:escrowId/extend-vote`
   - Body: `{ "extension_days": 3 hoặc 5 }`
   - Auth: Admin only
   
2. `POST /api/admin/escrow/withdrawal-requests/:escrowId/cancel-campaign`
   - Auth: Admin only

### 4. Routes (`routes/EscrowRoute.js`)

- Thêm routes cho extend-vote và cancel-campaign
- Rate limiting: extend-vote (50 req/60s), cancel-campaign (20 req/60s)

---

## III. LUỒNG XỬ LÝ CHI TIẾT

### CASE 1: VOTE QUÁ ÍT (<50% DONOR)

1. **Khi hết thời gian vote:**
   - Job `processExpiredVotingPeriods()` chạy
   - `evaluateVoteResults()` được gọi
   - Phát hiện `votePercentage < 50%`
   - Escrow giữ nguyên status (`voting_in_progress` hoặc `voting_extended`)
   - Return `{ decision: "INSUFFICIENT_VOTES", canExtend: true }`

2. **Admin xem withdrawal request:**
   - `getWithdrawalRequestsForReview()` return escrow với `adminActions.canExtend = true`
   - Admin thấy button "Gia hạn vote" với options 3 ngày / 5 ngày

3. **Admin gia hạn:**
   - Gọi `extendVotingPeriod(escrowId, adminId, 3 hoặc 5)`
   - Escrow được gia hạn và set status = `voting_extended`
   - Notification gửi cho tất cả donor

### CASE 2: REJECT QUÁ NHIỀU (>50% DONOR)

1. **Khi có vote reject:**
   - `submitVote()` check ngay sau khi vote
   - Nếu `rejectDonorPercentage > 50%` → gọi `evaluateVoteResults()`
   - Escrow được set status = `rejected_by_community`
   - Set `community_rejected_at`

2. **Khi hết thời gian vote (fallback):**
   - Job `processExpiredVotingPeriods()` cũng phát hiện case này
   - Escrow được set status = `rejected_by_community`

3. **Admin xem withdrawal request:**
   - `getWithdrawalRequestsForReview()` return escrow với `adminActions.canCancel = true`
   - Admin thấy button "Huỷ campaign & hoàn tiền"

4. **Admin huỷ campaign:**
   - Gọi `cancelCampaignByCommunityRejection(escrowId, adminId)`
   - Campaign được cancel
   - Refund được khởi tạo (reuse `processProportionalRefund()`)
   - Notification và email gửi cho tất cả donor

---

## IV. REFUND FLOW

Reuse hoàn toàn logic từ `refund.service.js`:
- `processProportionalRefund()` được gọi khi campaign bị cancel
- Tính toán refund ratio dựa trên `availableAmount / totalDonated`
- Tạo Refund records và update Donation status
- Gửi email cho từng donor
- Idempotency: Campaign chỉ được cancel 1 lần

---

## V. NOTIFICATION & EMAIL

### Khi vote được gia hạn:
- **Notification type**: `voting_extended`
- **Message**: "Thời gian vote đã được gia hạn thêm X ngày"
- **Gửi cho**: Tất cả donor của campaign
- **Real-time**: Publish qua Redis pub/sub

### Khi campaign bị huỷ:
- **Notification type**: `campaign_cancelled`
- **Message**: "Campaign đã bị huỷ do cộng đồng từ chối"
- **Content**: Thông báo tiền sẽ được hoàn lại
- **Gửi cho**: Tất cả donor của campaign
- **Email**: Gửi qua `processProportionalRefund()` (đã có sẵn)

---

## VI. IDEMPOTENCY & AN TOÀN TIỀN

### Idempotency checks:
1. **Extend vote**: Không có duplicate check vì có thể gia hạn nhiều lần (track bằng `voting_extended_count`)
2. **Cancel campaign**: Check `campaign.status === "cancelled"` trước khi cancel
3. **Refund**: Logic trong `processProportionalRefund()` đã có idempotency

### Audit trail:
- `community_rejected_at`: Thời điểm bị từ chối bởi cộng đồng
- `voting_extended_count`: Số lần gia hạn
- `last_extended_at`: Thời điểm gia hạn cuối
- `voting_extended_by`: Admin đã gia hạn
- `campaign.cancelled_at`: Thời điểm campaign bị huỷ
- `campaign.cancellation_reason`: Lý do huỷ

---

## VII. CACHE INVALIDATION

Khi có thay đổi:
- `campaign:{campaignId}`: Invalidated
- `escrow:{escrowId}`: Invalidated (nếu có)
- `campaigns:all:*`: Invalidated qua `invalidateCampaignCache()`
- `notifications:{donorId}`: Invalidated khi có notification mới

---

## VIII. LOGGING & AUDIT

### Log points:
1. **Vote evaluation**: Log decision và vote summary
2. **Extend vote**: Log admin, extension days, new end date
3. **Cancel campaign**: Log admin, refund results
4. **Submit vote**: Log khi detect reject > 50%

### Audit fields:
- Tất cả actions đều có timestamp và admin ID
- Campaign có `cancelled_at` và `cancellation_reason`
- Escrow có `community_rejected_at`, `voting_extended_by`, `last_extended_at`

---

## IX. LÝ DO THIẾT KẾ

### Tại sao không auto huỷ ngay khi vote ít?
- **Lý do**: Vote ít có thể do nhiều nguyên nhân (donor chưa thấy, chưa kịp vote, v.v.)
- **Giải pháp**: Cho phép admin xem xét và gia hạn để tạo cơ hội cho cộng đồng tham gia
- **Tránh**: Auto reject có thể gây thiệt hại không đáng có

### Tại sao cần admin xác nhận huỷ campaign?
- **Lý do**: Huỷ campaign là action quan trọng, ảnh hưởng đến tất cả donor
- **Giải pháp**: Admin phải xem xét và xác nhận trước khi huỷ
- **Bảo vệ**: Tránh auto huỷ nhầm hoặc do bug

---

## X. TEST CASES

### Test Case 1: Vote < 50% → Admin gia hạn
1. Tạo escrow với voting period 3 ngày
2. Chỉ có 30% donor vote
3. Đợi hết thời gian vote
4. Job chạy → escrow giữ nguyên status
5. Admin xem → thấy `canExtend = true`
6. Admin gia hạn 3 ngày
7. Escrow có status `voting_extended` và `voting_end_date` mới
8. Donor nhận notification

### Test Case 2: Reject > 50% → Huỷ campaign
1. Tạo escrow với 100 donors
2. 60 donors vote reject
3. `submitVote()` detect reject > 50% → set `rejected_by_community`
4. Admin xem → thấy `canCancel = true`
5. Admin cancel campaign
6. Campaign status = `cancelled`
7. Refund được khởi tạo cho tất cả donor
8. Donor nhận notification và email

### Test Case 3: Idempotency
1. Gọi `cancelCampaignByCommunityRejection()` lần 1 → Success
2. Gọi lại lần 2 → Return `wasAlreadyCancelled = true` (không làm gì)
3. Refund chỉ chạy 1 lần

---

## XI. FILES CHANGED

1. `models/escrow.js` - Thêm status và fields mới
2. `services/escrow.service.js` - Core logic
3. `controllers/EscrowController.js` - API endpoints
4. `routes/EscrowRoute.js` - Routes
5. `jobs/finalizeVotingPeriods.job.js` - Đã có sẵn, sử dụng `processExpiredVotingPeriods()`

---

## XII. NEXT STEPS (Nếu cần)

1. **Frontend**: Implement UI cho admin panel (extend vote button, cancel campaign button)
2. **Email templates**: Có thể tùy chỉnh email cho voting extended và campaign cancelled
3. **Metrics**: Track số lần extend vote, số campaign bị cancel do community rejection
4. **Alerting**: Alert admin khi có escrow cần review (vote < 50% hoặc reject > 50%)

---

**IMPLEMENTATION COMPLETE ✅**

