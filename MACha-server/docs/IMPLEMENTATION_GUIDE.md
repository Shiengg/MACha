# 📋 HƯỚNG DẪN TRIỂN KHAI TÍNH NĂNG ORGANIZATION & CAMPAIGN COMPANION

## 📌 A. TỔNG QUAN KIẾN TRÚC HIỆN TẠI

### Backend (MACha-server)
- **Framework**: Node.js + Express + MongoDB (Mongoose)
- **Authentication**: JWT (cookie-based, httpOnly)
- **Cache**: Redis (Cache-Aside pattern)
- **Queue**: Redis-based queue service
- **Payment**: SePay integration
- **KYC**: VNPT eKYC + Manual review system
- **Role System**: `user`, `admin`, `owner`, `organization` (enum đã có, chưa implement)

### Frontend
- **Client**: Next.js (React + TypeScript)
- **Mobile**: React Native (Expo)
- **State Management**: React Context API

### Database Schema hiện tại
- **User**: username, email, password, role, is_verified, kyc_status, current_kyc_id
- **Campaign**: creator (ref User), status, category, milestones, location
- **Donation**: campaign, donor, amount, payment_status, is_anonymous
- **KYC**: user, status, documents, extracted_data, manual_review

### Flow hiện tại
1. **Đăng ký User**: Signup → OTP Email → Verify → Active
2. **KYC User**: Submit KYC → VNPT eKYC / Manual → Review → Verified/Rejected
3. **Tạo Campaign**: Check KYC verified → Create → Pending → Admin Approve → Active
4. **Donate**: Create Donation → Update Campaign amount → Tracking event

---

## 📌 B. NHỮNG PHẦN CODE / MODULE CẦN CHỈNH SỬA HOẶC BỔ SUNG

### Backend

#### 1. **Models**
- ✅ `models/user.js` - Đã có role "organization" trong enum
- 🆕 `models/campaignCompanion.js` - Bảng mới (many-to-many)
- 🔄 `models/donation.js` - Thêm field `companion`
- 🔄 `models/kyc.js` - Mở rộng để support organization KYC

#### 2. **Controllers**
- 🔄 `controllers/AuthController.js` - Thêm `signupOrganization`
- 🔄 `controllers/KYCController.js` - Support organization KYC
- 🆕 `controllers/CampaignCompanionController.js` - Mới
- 🔄 `controllers/DonationController.js` - Support companion tracking
- 🔄 `controllers/CampaignController.js` - Check companion khi donate

#### 3. **Services**
- 🔄 `services/auth.service.js` - `createOrganizationUser`
- 🔄 `services/kyc.service.js` - `submitOrganizationKYC`
- 🆕 `services/campaignCompanion.service.js` - Mới
- 🔄 `services/donation.service.js` - Track companion
- 🔄 `services/campaign.service.js` - Helper check organization

#### 4. **Routes**
- 🔄 `routes/AuthRoute.js` - Thêm `/signup/organization`
- 🔄 `routes/KYCRoute.js` - Support organization endpoint
- 🆕 `routes/CampaignCompanionRoute.js` - Mới
- 🔄 `routes/DonationRoute.js` - Thêm companion param (optional)

#### 5. **Middlewares**
- 🔄 `middlewares/checkRole.js` - Đã support, không cần sửa

### Frontend

#### Client (Next.js)
- 🔄 `src/app/(auth)/register/page.tsx` - Thêm form organization
- 🔄 `src/services/auth.service.ts` - Thêm signupOrganization
- 🔄 `src/services/kyc.service.ts` - Support organization KYC
- 🆕 `src/services/campaignCompanion.service.ts` - Mới
- 🔄 `src/app/profile/[userId]/page.tsx` - Thêm tab "Chiến dịch đồng hành"
- 🔄 `src/app/campaigns/[campaignId]/page.tsx` - Thêm nút "Đồng hành"
- 🔄 `src/app/campaigns/[campaignId]/donate/page.tsx` - Support companion link

#### Mobile (React Native)
- 🔄 `src/screens/auth/RegisterScreen.js` - Thêm form organization
- 🔄 `src/services/auth.service.js` - Thêm signupOrganization
- 🔄 `src/screens/profile/ProfileScreen.js` - Thêm tab companion
- 🔄 `src/screens/campaigns/CampaignDetailScreen.js` - Thêm nút companion
- 🔄 `src/screens/campaigns/DonateScreen.js` - Support companion

---

## 📌 C. DATABASE

### 1. Bảng mới

#### `CampaignCompanion`
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: User),        // User đồng hành
  campaign: ObjectId (ref: Campaign), // Campaign được đồng hành
  joined_at: Date,                    // Thời gian đồng hành
  is_active: Boolean,                 // Có còn active không
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ user: 1, campaign: 1 }` - Unique index (1 user chỉ đồng hành 1 campaign 1 lần)
- `{ campaign: 1, is_active: 1 }` - Query companions của campaign
- `{ user: 1, is_active: 1 }` - Query campaigns user đang đồng hành

### 2. Field mới

#### `Donation` model - Thêm field:
```javascript
companion: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "CampaignCompanion",
  default: null,
  index: true
}
```

#### `KYC` model - Mở rộng để support organization:
```javascript
kyc_type: {
  type: String,
  enum: ["individual", "organization"],
  default: "individual",
  index: true
},
organization_data: {
  legal_representative: {
    fullname: String,
    id_card_number: String,      // CCCD/Passport
    id_card_last4: String,
    position: String,             // Chức vụ
    id_card_front_url: String,
    id_card_back_url: String,
    selfie_url: String
  },
  organization_documents: {
    business_license_url: String,              // Giấy phép kinh doanh
    establishment_decision_url: String,        // Quyết định thành lập
    tax_code: String,
    organization_name: String,
    organization_address: String
  }
}
```

### 3. Quan hệ (ERD mô tả bằng text)

```
User (1) ──< (N) Campaign
  │                      │
  │                      │
  │                      │
  │            (N) ──< CampaignCompanion >── (1) Campaign
  │                      │
  │                      │
  │            (N) ──< Donation >── (1) Campaign
  │                      │
  │                      │
  │                      └── (optional) CampaignCompanion (1)
  │
  └── (1) ──< (N) KYC
               │
               └── (optional) organization_data
```

**Quan hệ chi tiết:**
- **User ↔ Campaign**: 1-N (1 user tạo nhiều campaign)
- **User ↔ CampaignCompanion**: 1-N (1 user đồng hành nhiều campaign)
- **Campaign ↔ CampaignCompanion**: 1-N (1 campaign có nhiều companion)
- **CampaignCompanion**: Junction table (many-to-many giữa User và Campaign)
- **Donation ↔ CampaignCompanion**: N-1 (Nhiều donation có thể qua 1 companion, optional)
- **User ↔ KYC**: 1-N (1 user có nhiều KYC submissions, latest được track)
- **KYC**: Có thể là individual hoặc organization type

---

## 📌 D. BACKEND

### 1. API cần thêm / sửa

#### Authentication Routes

**POST `/api/auth/signup/organization`**
```javascript
Request Body:
{
  organization_name: string,  // Tên tổ chức (dùng làm fullname)
  username: string,
  password: string,
  confirm_password: string,
  email: string (optional, không bắt buộc)
}

Response:
{
  success: true,
  message: "Đăng ký tổ chức thành công",
  user: {
    id: string,
    username: string,
    role: "organization",
    is_verified: true,        // Active ngay
    fullname: string
  },
  token: string               // Auto login
}
```

**Flow:**
1. Validate input (username unique, password match, organization_name required)
2. Create user với role="organization", is_verified=true
3. Set fullname = organization_name
4. Generate JWT token
5. Return user + token (không cần OTP)

#### KYC Routes

**POST `/api/kyc/organization/submit`** (Mở rộng endpoint hiện tại)
```javascript
Request Body:
{
  legal_representative: {
    fullname: string,
    id_card_number: string,
    position: string,
    id_card_front_url: string,
    id_card_back_url: string,
    selfie_url: string
  },
  organization_documents: {
    business_license_url: string,
    establishment_decision_url: string,
    tax_code: string,
    organization_name: string,
    organization_address: string
  }
}

Response:
{
  success: true,
  kyc: { ... },
  message: "KYC đã được gửi để duyệt"
}
```

**GET `/api/kyc/organization/status`**
- Tương tự GET `/api/kyc/status` nhưng filter theo kyc_type="organization"

#### Campaign Companion Routes

**POST `/api/campaigns/:campaignId/companion/join`**
```javascript
Middleware: authMiddleware
Authorization: role="user" only

Request Body: (empty)

Response:
{
  success: true,
  companion: {
    _id: string,
    user: { _id, username, fullname, avatar },
    campaign: { _id, title },
    joined_at: Date
  },
  message: "Đã đồng hành chiến dịch thành công"
}
```

**DELETE `/api/campaigns/:campaignId/companion/leave`**
```javascript
Middleware: authMiddleware
Authorization: User phải là companion của campaign này

Response:
{
  success: true,
  message: "Đã rời khỏi chiến dịch đồng hành"
}
```

**GET `/api/campaigns/:campaignId/companions`**
```javascript
Response:
{
  companions: [
    {
      _id: string,
      user: { _id, username, fullname, avatar },
      joined_at: Date
    }
  ],
  total: number
}
```

**GET `/api/users/:userId/companion-campaigns`**
```javascript
Response:
{
  campaigns: [
    {
      _id: string,
      title: string,
      banner_image: string,
      current_amount: number,
      goal_amount: number,
      status: string,
      creator: { _id, username, fullname },
      joined_at: Date
    }
  ],
  total: number
}
```

#### Donation Routes

**POST `/api/donations/:campaignId/donate`** (Sửa đổi)
```javascript
Request Body:
{
  amount: number,
  currency: string,
  donation_method: string,
  is_anonymous: boolean,
  companion_id: string (optional)  // NEW: ID của CampaignCompanion
}

Response:
{
  donation: {
    ...existing fields,
    companion: CampaignCompanion | null
  }
}
```

**GET `/api/donations/:campaignId/donations`** (Sửa đổi response format)
```javascript
Response:
[
  {
    ...existing fields,
    donor: {
      _id: string,
      username: string,
      fullname: string,
      avatar: string
    },
    companion: {
      _id: string,
      user: { username, fullname, avatar }  // Người đồng hành
    } | null,
    display_name: string  // "Nguyễn Văn A (qua Trần Văn B)" hoặc "Nguyễn Văn A"
  }
]
```

### 2. Middleware / Guard / Permission

#### Middleware hiện tại đã đủ:
- ✅ `authMiddleware` - Xác thực JWT
- ✅ `checkRole` - Kiểm tra role (đã support "organization")

#### Permission Logic:

**Tạo Campaign:**
- User role="user": Cần KYC verified
- User role="organization": Cần KYC verified (organization type)
- Code trong `CampaignController.createCampaign`:
```javascript
// Sửa logic check KYC
if (req.user.role === 'user' && req.user.kyc_status !== 'verified') {
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    message: "You need to complete KYC verification before creating a campaign"
  });
}

if (req.user.role === 'organization' && req.user.kyc_status !== 'verified') {
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    message: "Organization needs to complete KYC verification before creating a campaign"
  });
}
```

**Join Companion:**
- Chỉ user role="user" mới được join
- Organization không thể join companion
- Code trong `CampaignCompanionController.join`:
```javascript
if (req.user.role !== 'user') {
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    message: "Only individual users can join as companion"
  });
}
```

**Donate với Companion:**
- User có thể donate với companion_id (nếu là companion của campaign)
- Validate companion_id phải thuộc campaign và user phải là owner của companion

### 3. Flow xử lý chi tiết (Sequence)

#### Flow 1: Đăng ký Organization
```
User → POST /api/auth/signup/organization
  → AuthController.signupOrganization
    → Validate input
    → Check username unique
    → authService.createOrganizationUser
      → Create User (role="organization", is_verified=true)
    → Generate JWT token
    → Return user + token
  ← Response (201)
```

#### Flow 2: Submit Organization KYC
```
Organization User → POST /api/kyc/organization/submit
  → KYCController.submitOrganizationKYC
    → Validate user role = "organization"
    → Validate KYC data
    → kycService.submitOrganizationKYC
      → Create KYC document (kyc_type="organization")
      → Update user.kyc_status = "pending"
      → Update user.current_kyc_id
    → Return KYC document
  ← Response (201)
```

#### Flow 3: Join Campaign Companion
```
User → POST /api/campaigns/:campaignId/companion/join
  → CampaignCompanionController.join
    → Validate user role = "user"
    → Validate campaign exists
    → campaignCompanionService.joinCampaign
      → Check if already joined (unique index)
      → Create CampaignCompanion document
      → Return companion
    → Return success
  ← Response (201)
```

#### Flow 4: Donate qua Companion
```
User → POST /api/donations/:campaignId/donate
  Body: { amount, donation_method, companion_id }
  → DonationController.createDonation
    → Validate companion_id (nếu có)
      → Check companion exists
      → Check companion.user = req.user._id
      → Check companion.campaign = campaignId
    → donationService.createDonation
      → Create Donation (with companion reference)
      → Update campaign.current_amount
      → Return donation
    → Return donation
  ← Response (201)
```

#### Flow 5: Get Donations với Companion Display
```
GET /api/donations/:campaignId/donations
  → DonationController.getDonationsByCampaign
    → donationService.getDonationsByCampaign
      → Find donations
      → Populate donor
      → Populate companion.user
      → Format display_name:
        - Nếu có companion: "Donor.fullname (qua Companion.user.fullname)"
        - Nếu không: "Donor.fullname"
      → Return donations
    → Return donations
  ← Response (200)
```

---

## 📌 E. FRONTEND

### 1. Màn hình / Form mới

#### Client (Next.js)

**Form đăng ký Organization**
- File: `src/app/(auth)/register/page.tsx`
- Thêm toggle/radio: "Đăng ký cá nhân" / "Đăng ký tổ chức"
- Khi chọn "Đăng ký tổ chức":
  - Form fields: Tên tổ chức, Username, Password, Confirm Password
  - Bỏ Email (hoặc optional)
  - Bỏ OTP verification
  - Submit → `POST /api/auth/signup/organization`
  - Auto login sau khi đăng ký

**Form KYC Organization**
- File: `src/app/kyc/organization/page.tsx` (mới)
- Section 1: Thông tin người đại diện
  - Họ tên
  - CCCD/Passport (front/back)
  - Chức vụ
  - Selfie
- Section 2: Giấy tờ tổ chức
  - Giấy phép kinh doanh
  - Quyết định thành lập
  - Mã số thuế
  - Tên tổ chức
  - Địa chỉ tổ chức
- Submit → `POST /api/kyc/organization/submit`

**Tab "Chiến dịch đồng hành" trong Profile**
- File: `src/app/profile/[userId]/page.tsx`
- Thêm tab mới: `'companions'`
- API: `GET /api/users/:userId/companion-campaigns`
- Hiển thị danh sách campaigns (card layout)
- Click vào campaign → Navigate to `/campaigns/:campaignId?companion=true`
- Nút "Rời khỏi" nếu là own profile

**Nút "Đồng hành" trong Campaign Detail**
- File: `src/app/campaigns/[campaignId]/page.tsx`
- Điều kiện hiển thị:
  - Campaign creator là organization
  - User đã login và role="user"
  - User chưa join companion
- API: `POST /api/campaigns/:campaignId/companion/join`
- Sau khi join → Update UI (disable button, show "Đã đồng hành")

**Donate với Companion Link**
- File: `src/app/campaigns/[campaignId]/donate/page.tsx`
- Check URL param: `?companion=true` hoặc `?companion_id=xxx`
- Nếu có companion param:
  - Get companion_id từ URL hoặc từ campaign companions list
  - Gửi `companion_id` trong donation request
  - Hiển thị badge: "Đang donate qua [Companion Name]"

#### Mobile (React Native)

**Form đăng ký Organization**
- File: `src/screens/auth/RegisterScreen.js`
- Tương tự client, thêm toggle organization/user
- Form organization: Tên tổ chức, Username, Password, Confirm Password

**Tab "Chiến dịch đồng hành"**
- File: `src/screens/profile/ProfileScreen.js`
- Thêm tab: `'companions'`
- API: `GET /api/users/:userId/companion-campaigns`
- FlatList hiển thị campaigns

**Nút "Đồng hành"**
- File: `src/screens/campaigns/CampaignDetailScreen.js`
- Thêm button "Đồng hành" (tương tự client)

### 2. UI Logic cần thêm

#### Display Donation với Companion
```typescript
// Format display name
function formatDonorDisplayName(donation: Donation): string {
  if (donation.companion?.user) {
    return `${donation.donor.fullname} (qua ${donation.companion.user.fullname})`;
  }
  return donation.donor.fullname || donation.donor.username;
}
```

#### Check Companion Status
```typescript
// Check if user is companion of campaign
async function checkIsCompanion(campaignId: string, userId: string): Promise<boolean> {
  const response = await apiClient.get(`/api/campaigns/${campaignId}/companions`);
  return response.data.companions.some(c => c.user._id === userId);
}
```

#### Generate Companion Share Link
```typescript
// Generate shareable link với companion tracking
function generateCompanionLink(campaignId: string, companionId: string): string {
  return `${baseUrl}/campaigns/${campaignId}/donate?companion_id=${companionId}`;
}
```

### 3. Flow người dùng

#### Flow User đăng ký Organization
1. User vào trang đăng ký
2. Chọn "Đăng ký tổ chức"
3. Điền form: Tên tổ chức, Username, Password
4. Submit → Auto login
5. Redirect to dashboard (hoặc KYC page)

#### Flow Organization submit KYC
1. Organization user vào KYC page
2. Chọn "KYC Tổ chức"
3. Upload giấy tờ người đại diện
4. Upload giấy tờ tổ chức
5. Submit → Pending status
6. Chờ admin review

#### Flow User join Campaign Companion
1. User xem campaign detail (của organization)
2. Thấy nút "Đồng hành"
3. Click → Confirm modal
4. Join thành công → Button disable, hiển thị "Đã đồng hành"
5. User share link campaign (có companion_id) đến bạn bè

#### Flow Donate qua Companion
1. User click vào companion share link: `/campaigns/xxx/donate?companion_id=yyy`
2. Trang donate load → Detect companion_id từ URL
3. User điền amount, method
4. Submit donation với companion_id
5. Donation được lưu với companion reference
6. Hiển thị trong donation list: "Nguyễn Văn A (qua Trần Văn B)"

#### Flow User xem Campaigns đang đồng hành
1. User vào profile của mình
2. Click tab "Chiến dịch đồng hành"
3. Xem danh sách campaigns
4. Click vào campaign → Navigate với companion flag
5. Donate từ đây sẽ tự động attach companion_id

---

## 📌 F. NHỮNG RỦI RO & EDGE CASES

### 1. Rủi ro

#### Security
- ⚠️ **Organization registration không có OTP**: Có thể bị spam fake organizations
  - **Giải pháp**: 
    - Rate limiting cho signup endpoint
    - Email verification optional nhưng nên khuyến khích
    - Admin có thể ban organization
    - KYC sẽ verify organization thực tế

- ⚠️ **Companion spam**: User có thể join nhiều campaign để spam
  - **Giải pháp**: 
    - Limit số lượng companion per user (ví dụ: max 10)
    - Rate limiting cho join endpoint
    - Admin có thể remove companion

#### Data Integrity
- ⚠️ **Donation với companion_id nhưng companion bị xóa**
  - **Giải pháp**: 
    - Donation.companion là optional (nullable)
    - Nếu companion bị xóa, donation vẫn hợp lệ (companion = null)
    - Không cascade delete

- ⚠️ **Organization KYC data không nhất quán với User.fullname**
  - **Giải pháp**: 
    - Cho phép update organization_name trong KYC
    - Sync với User.fullname khi KYC approved

#### Performance
- ⚠️ **Query companions của campaign có thể chậm nếu có nhiều**
  - **Giải pháp**: 
    - Index trên { campaign: 1, is_active: 1 }
    - Pagination cho companions list
    - Cache companions count (Redis)

### 2. Edge Cases

#### Case 1: User join companion nhưng campaign bị rejected/cancelled
- **Xử lý**: 
  - Companion vẫn tồn tại nhưng không hiển thị trong active campaigns
  - Filter companions chỉ hiển thị campaigns có status active/approved
  - Hoặc set `is_active=false` khi campaign không active

#### Case 2: Organization đổi tên sau khi KYC approved
- **Xử lý**: 
  - Allow update User.fullname (giống user bình thường)
  - KYC document giữ nguyên tên cũ (historical data)
  - Có thể submit KYC mới nếu cần update

#### Case 3: User donate với companion_id nhưng không phải companion của campaign
- **Xử lý**: 
  - Validate companion_id trong donation service
  - Return 400 Bad Request nếu invalid
  - Reject donation

#### Case 4: Multiple companions cùng share link → Donate tracking nào?
- **Xử lý**: 
  - URL param `companion_id` là explicit
  - Nếu có companion_id trong URL → dùng companion đó
  - Nếu không có → check user có phải companion không → dùng companion đó
  - Nếu user không phải companion → companion = null

#### Case 5: Organization tạo campaign trước khi KYC approved
- **Xử lý**: 
  - Check KYC status trong CampaignController.createCampaign
  - Organization cũng cần KYC verified (giống user)
  - Return 403 nếu chưa verified

#### Case 6: User leave companion nhưng đã có donations qua companion
- **Xử lý**: 
  - Donations vẫn giữ nguyên companion reference (historical data)
  - Set companion.is_active = false (soft delete)
  - Không xóa companion document

---

## 📌 G. ĐỀ XUẤT BEST PRACTICES

### 1. Clean Architecture

#### Service Layer Pattern
```javascript
// services/campaignCompanion.service.js
export const joinCampaign = async (userId, campaignId) => {
  // Business logic here
  // Validate, create, return
};

export const leaveCampaign = async (userId, campaignId) => {
  // Business logic
};

export const getUserCompanionCampaigns = async (userId, page, limit) => {
  // Query, pagination, return
};
```

#### Controller chỉ xử lý HTTP
```javascript
// controllers/CampaignCompanionController.js
export const join = async (req, res) => {
  try {
    const result = await campaignCompanionService.joinCampaign(
      req.user._id,
      req.params.campaignId
    );
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
```

### 2. Database Design

#### Indexes Strategy
```javascript
// CampaignCompanion indexes
campaignCompanionSchema.index({ user: 1, campaign: 1 }, { unique: true });
campaignCompanionSchema.index({ campaign: 1, is_active: 1 });
campaignCompanionSchema.index({ user: 1, is_active: 1 });

// Donation index
donationSchema.index({ companion: 1 });

// KYC index
kycSchema.index({ user: 1, kyc_type: 1, status: 1 });
```

#### Soft Delete cho CampaignCompanion
- Dùng `is_active` thay vì hard delete
- Giữ lịch sử donations

### 3. API Design

#### Consistent Response Format
```javascript
// Success response
{
  success: true,
  data: { ... },
  message: "..." (optional)
}

// Error response
{
  success: false,
  error: "ERROR_CODE",
  message: "Human readable message"
}
```

#### Versioning (Future)
- Consider API versioning: `/api/v1/...`
- Hiện tại chưa cần, nhưng nên chuẩn bị

### 4. Caching Strategy

#### Cache Invalidation
```javascript
// Khi join/leave companion
await redisClient.del(`campaign:${campaignId}`);
await redisClient.del(`campaigns:companions:${campaignId}`);
await redisClient.del(`users:companions:${userId}`);

// Khi donate với companion
await redisClient.del(`donations:${campaignId}`);
```

#### Cache Keys Pattern
```
campaign:${campaignId}
campaigns:companions:${campaignId}
users:companions:${userId}:page:${page}
kyc:user:${userId}:type:organization
```

### 5. Testing Strategy

#### Unit Tests
- Service functions (campaignCompanion, donation)
- KYC organization validation

#### Integration Tests
- API endpoints
- Database operations
- Cache invalidation

#### E2E Tests
- Complete flows: Signup → KYC → Create Campaign → Join Companion → Donate

### 6. Future Scaling

#### Potential Enhancements
1. **Companion Analytics**
   - Track donations per companion
   - Leaderboard companions
   - Commission/rewards cho companions

2. **Organization Features**
   - Multiple admins cho organization
   - Organization dashboard
   - Bulk campaign management

3. **Companion Features**
   - Companion groups/teams
   - Companion communication (chat)
   - Companion achievements/badges

4. **Performance**
   - Database read replicas
   - CDN cho images (KYC documents)
   - Message queue cho async tasks (email, notifications)

#### Database Scaling
- Sharding by campaignId (nếu campaigns quá nhiều)
- Separate collections cho high-traffic (donations, companions)

#### Code Structure
- Microservices migration (nếu cần):
  - Auth service
  - Campaign service
  - Donation service
  - KYC service
- Event-driven architecture (hiện tại đã có tracking service)

---

## 📌 SUMMARY CHECKLIST

### Phase 1: Database & Models
- [ ] Create `CampaignCompanion` model
- [ ] Update `Donation` model (add companion field)
- [ ] Update `KYC` model (add organization_data)
- [ ] Create migrations/scripts (nếu cần)

### Phase 2: Backend Services
- [ ] Create `campaignCompanion.service.js`
- [ ] Update `auth.service.js` (createOrganizationUser)
- [ ] Update `kyc.service.js` (submitOrganizationKYC)
- [ ] Update `donation.service.js` (track companion)
- [ ] Update `campaign.service.js` (helper functions)

### Phase 3: Backend Controllers & Routes
- [ ] Update `AuthController.js` (signupOrganization)
- [ ] Update `KYCController.js` (organization KYC)
- [ ] Create `CampaignCompanionController.js`
- [ ] Update `DonationController.js` (companion support)
- [ ] Update routes

### Phase 4: Frontend Client
- [ ] Update register page (organization form)
- [ ] Create organization KYC page
- [ ] Update profile page (companion tab)
- [ ] Update campaign detail (companion button)
- [ ] Update donate page (companion link)
- [ ] Update services (API clients)

### Phase 5: Frontend Mobile
- [ ] Update register screen
- [ ] Update profile screen (companion tab)
- [ ] Update campaign detail screen
- [ ] Update donate screen

### Phase 6: Testing & Documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Update API documentation (Swagger)
- [ ] Update README

---

**Lưu ý**: Tài liệu này là hướng dẫn chi tiết, cần review và adjust theo codebase thực tế trước khi implement.

