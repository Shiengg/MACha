# MACha - Nền Tảng Quyên Góp Từ Thiện

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

MACha là một nền tảng quyên góp từ thiện toàn diện, cho phép người dùng tạo chiến dịch quyên góp, đóng góp tiền, và theo dõi tiến độ một cách minh bạch. Hệ thống tích hợp cơ chế escrow với voting từ cộng đồng để đảm bảo tính minh bạch và trách nhiệm trong việc sử dụng quỹ.

## 📋 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Tính Năng Chính](#tính-năng-chính)
- [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
- [Cấu Trúc Dự Án](#cấu-trúc-dự-án)
- [Cài Đặt và Chạy](#cài-đặt-và-chạy)
- [API Documentation](#api-documentation)
- [Luồng Nghiệp Vụ](#luồng-nghiệp-vụ)
- [Monitoring & Metrics](#monitoring--metrics)
- [License](#license)

## 🎯 Tổng Quan

MACha là một hệ thống quyên góp từ thiện với các tính năng:

- **Quản lý Chiến Dịch**: Tạo, duyệt và quản lý các chiến dịch quyên góp với nhiều danh mục khác nhau
- **Hệ Thống Thanh Toán**: Tích hợp SePay để xử lý thanh toán an toàn
- **Escrow & Voting**: Cơ chế escrow với voting từ cộng đồng để đảm bảo tính minh bạch
- **KYC Verification**: Xác thực danh tính người dùng qua VNPT eKYC và manual review
- **Sự Kiện**: Tạo và quản lý các sự kiện từ thiện với RSVP
- **Tương Tác Xã Hội**: Posts, comments, likes, follows, messaging
- **Bản Đồ**: Khám phá chiến dịch và sự kiện trên bản đồ
- **Real-time**: Thông báo và messaging real-time qua Socket.IO

## 🏗️ Kiến Trúc Hệ Thống

Hệ thống MACha được xây dựng theo kiến trúc microservices với các thành phần chính:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  MACha-client   │     │  MACha-mobile   │     │  MACha-server   │
│   (Next.js)     │────▶│   (React Native)│────▶│   (Express.js)  │
│   Web App       │     │   Mobile App    │     │   REST API      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                         ┌─────────────────────────┐
                                         │   MACha_worker          │
                                         │   (Background Jobs)     │
                                         │   - Email Processing     │
                                         │   - Notifications       │
                                         └─────────────────────────┘
                                                          │
                    ┌─────────────────────────────────────┼─────────────┐
                    │                                     │             │
                    ▼                                     ▼             ▼
            ┌──────────────┐                    ┌──────────────┐  ┌──────────────┐
            │   MongoDB     │                    │    Redis     │  │   RabbitMQ   │
            │   Database    │                    │    Cache     │  │   Queue      │
            └──────────────┘                    └──────────────┘  └──────────────┘
```

### Các Thành Phần

1. **MACha-server**: Backend API server (Express.js)
   - RESTful API endpoints
   - Socket.IO cho real-time communication
   - Authentication & Authorization (JWT)
   - Business logic và data validation
   - Scheduled jobs (cron jobs)

2. **MACha-client**: Web application (Next.js)
   - Responsive web interface
   - Server-side rendering
   - Client-side state management
   - Map integration (Mapbox)

3. **MACha-mobile**: Mobile application (React Native + Expo)
   - Cross-platform mobile app (iOS & Android)
   - Native features integration
   - Offline support

4. **MACha_worker**: Background worker service
   - Email processing (RabbitMQ consumer)
   - Notification processing
   - Async task handling

## ✨ Tính Năng Chính

### 1. Quản Lý Chiến Dịch (Campaigns)
- Tạo chiến dịch với nhiều danh mục (trẻ em, người già, thiên tai, y tế, giáo dục, v.v.)
- Duyệt chiến dịch bởi admin
- Milestones và timeline dự kiến
- Theo dõi tiến độ quyên góp real-time
- Cập nhật tiến độ từ creator
- Hủy chiến dịch và hoàn tiền

### 2. Hệ Thống Quyên Góp (Donations)
- Đóng góp với nhiều phương thức thanh toán
- Tích hợp SePay payment gateway
- Thanh toán an toàn với callback verification
- Quyên góp ẩn danh (optional)
- Lịch sử quyên góp chi tiết

### 3. Escrow & Voting System
- Tự động tạo withdrawal request khi đạt milestone
- Voting period (3 ngày) cho donors
- Weighted voting dựa trên số tiền đã quyên góp
- Admin review và approval
- Gia hạn voting period nếu cần
- Tự động reject nếu >50% donors từ chối
- Release payment sau khi được approve

### 4. KYC Verification
- VNPT eKYC integration
- Manual review bởi admin
- Support cho cả individual và organization
- Document upload và verification
- Status tracking (unverified, pending, verified, rejected)

### 5. Sự Kiện (Events)
- Tạo sự kiện từ thiện (volunteering, fundraising, charity event, donation drive)
- RSVP system với status (going, interested, not_going)
- Capacity management
- Event updates và notifications
- Map-based event discovery
- Auto-complete events khi kết thúc

### 6. Tương Tác Xã Hội
- Posts và comments
- Like system
- Follow/Unfollow users
- Real-time messaging
- Notifications system
- Hashtag support

### 7. Tìm Kiếm & Khám Phá
- Search campaigns và events
- Filter theo category, location, status
- Map-based discovery
- Recommendation system
- Search history

### 8. Admin Dashboard
- Quản lý users (ban/unban)
- Duyệt campaigns và events
- Review withdrawal requests
- Process refunds
- KYC review
- System metrics và monitoring

## 🛠️ Công Nghệ Sử Dụng

### Backend (MACha-server)
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.x
- **Database**: MongoDB (Mongoose ODM)
- **Cache**: Redis
- **Message Queue**: RabbitMQ
- **Real-time**: Socket.IO
- **Authentication**: JWT (cookie-based, httpOnly)
- **Payment**: SePay integration
- **Email**: Nodemailer + Resend
- **Monitoring**: Prometheus metrics
- **Documentation**: Swagger/OpenAPI
- **Scheduling**: node-cron

### Frontend Web (MACha-client)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Forms**: React Hook Form + Zod
- **Maps**: Mapbox GL
- **Icons**: Lucide React, React Icons
- **Notifications**: SweetAlert2
- **Real-time**: Socket.IO Client

### Mobile (MACha-mobile)
- **Framework**: React Native (Expo)
- **Language**: JavaScript/TypeScript
- **Navigation**: React Navigation
- **Maps**: React Native Maps
- **State Management**: React Context API
- **Storage**: AsyncStorage

### Worker (MACha_worker)
- **Runtime**: Node.js (ES Modules)
- **Queue**: RabbitMQ (amqplib)
- **Email**: Nodemailer + Resend
- **Database**: MongoDB (Mongoose)
- **Cache**: Redis

### Infrastructure
- **Containerization**: Docker
- **Monitoring**: Grafana + Prometheus
- **Load Testing**: k6

## 📁 Cấu Trúc Dự Án

```
MACha/
├── MACha-server/          # Backend API server
│   ├── app.js             # Express app configuration
│   ├── server.js          # HTTP server + Socket.IO
│   ├── config/            # Database, Redis, RabbitMQ configs
│   ├── controllers/       # Route controllers
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── middlewares/       # Express middlewares
│   ├── jobs/              # Scheduled cron jobs
│   ├── subscribers/       # Redis pub/sub subscribers
│   ├── utils/             # Utility functions
│   └── docs/              # API documentation
│
├── MACha-client/          # Web application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API service clients
│   │   ├── hooks/         # Custom React hooks
│   │   ├── utils/         # Utility functions
│   │   └── constants/     # Constants
│   └── public/            # Static assets
│
├── MACha-mobile/          # Mobile application
│   ├── src/
│   │   ├── app/           # Expo router pages
│   │   ├── screens/       # Screen components
│   │   ├── components/    # Reusable components
│   │   ├── services/     # API service clients
│   │   ├── navigation/    # Navigation config
│   │   ├── contexts/      # React contexts
│   │   └── store/         # State management
│   └── assets/            # Images and assets
│
└── MACha_worker/          # Background worker
    ├── src/
    │   ├── index.js       # Worker entry point
    │   ├── consumers/     # RabbitMQ consumers
    │   ├── handlers/      # Job handlers
    │   ├── templates/     # Email templates
    │   └── config/         # Configurations
    └── Dockerfile         # Docker configuration
```

## 🚀 Cài Đặt và Chạy

### Yêu Cầu Hệ Thống

- Node.js >= 18.x
- MongoDB >= 6.x
- Redis >= 7.x
- RabbitMQ >= 3.x
- npm hoặc yarn

### Cài Đặt Backend (MACha-server)

```bash
cd MACha-server
npm install

# Tạo file .env
cp .env.example .env
# Điền các biến môi trường cần thiết

# Chạy server
npm run dev          # Development mode
npm start            # Production mode

# Chạy subscribers (trong terminal khác)
npm run subscriber
```

### Cài Đặt Frontend Web (MACha-client)

```bash
cd MACha-client
npm install

# Tạo file .env.local
cp .env.example .env.local
# Điền các biến môi trường

# Chạy development server
npm run dev

# Build production
npm run build
npm start
```

### Cài Đặt Mobile App (MACha-mobile)

```bash
cd MACha-mobile
npm install

# Chạy với Expo
npm start

# Chạy trên iOS
npm run ios

# Chạy trên Android
npm run android
```

### Cài Đặt Worker (MACha_worker)

```bash
cd MACha_worker
npm install

# Tạo file .env
cp .env.example .env
# Điền các biến môi trường

# Chạy worker
npm start
```

### Biến Môi Trường Cần Thiết

#### MACha-server/.env
```env
# Server
PORT=5000
NODE_ENV=development
ORIGIN_URL=http://localhost:3000

# Database
DATABASE_URL=mongodb://localhost:27017/macha

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# JWT
JWT_SECRET=your-secret-key

# SePay
SEPAY_API_KEY=your-sepay-api-key
SEPAY_API_SECRET=your-sepay-api-secret

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Metrics
METRICS_ENABLED=true
METRICS_PATH=/metrics
```

#### MACha-client/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

## 📚 API Documentation

API documentation được cung cấp qua Swagger UI khi server chạy:

- **Development**: `http://localhost:5000/api-docs`
- **Production**: `https://your-domain.com/api-docs`

### Các Endpoint Chính

#### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `GET /api/auth/me` - Lấy thông tin user hiện tại

#### Campaigns
- `GET /api/campaigns` - Lấy danh sách campaigns
- `GET /api/campaigns/:id` - Lấy chi tiết campaign
- `POST /api/campaigns` - Tạo campaign mới
- `PUT /api/campaigns/:id` - Cập nhật campaign
- `DELETE /api/campaigns/:id` - Xóa campaign

#### Donations
- `POST /api/donations` - Tạo donation
- `GET /api/donations` - Lấy danh sách donations
- `GET /api/donations/:id` - Lấy chi tiết donation

#### Escrow
- `GET /api/escrow/withdrawal-requests` - Lấy danh sách withdrawal requests
- `POST /api/escrow/withdrawal-requests` - Tạo withdrawal request
- `POST /api/escrow/withdrawal-requests/:id/vote` - Vote cho withdrawal request
- `GET /api/escrow/withdrawal-requests/:id` - Lấy chi tiết withdrawal request

#### Events
- `GET /api/events` - Lấy danh sách events
- `POST /api/events` - Tạo event mới
- `POST /api/events/:id/rsvp` - RSVP cho event

Xem thêm chi tiết tại Swagger UI hoặc file `MACha-server/docs/swagger.js`.

## 🔄 Luồng Nghiệp Vụ

### 1. Luồng Quyên Góp (Donation Flow)

```
1. User tạo donation request
   ↓
2. Tạo Donation record với status="pending"
   ↓
3. Redirect đến SePay payment gateway
   ↓
4. User thanh toán
   ↓
5. SePay callback → Update donation status
   ↓
6. Nếu status="completed":
   - Update campaign.current_amount
   - Check milestones
   - Tạo notification job
   ↓
7. Worker xử lý notification
```

### 2. Luồng Duyệt Campaign

```
1. Creator tạo campaign → Status="pending"
   ↓
2. Admin review campaign
   ↓
3. Admin approve/reject
   ↓
4. Nếu approved:
   - Status="active"
   - Invalidate cache
   - Gửi email notification (async)
   ↓
5. Campaign có thể nhận donations
```

### 3. Luồng Escrow/Withdrawal

```
1. Campaign đạt milestone
   ↓
2. Tự động tạo withdrawal request (hoặc creator tạo manual)
   ↓
3. Status="voting_in_progress"
   Voting period: 3 ngày
   ↓
4. Donors vote (approve/reject)
   Weight = số tiền đã quyên góp
   ↓
5. Sau voting period:
   - Nếu reject >50% donors → Status="rejected_by_community"
   - Nếu vote <50% donors → Admin có thể gia hạn
   - Nếu không → Status="voting_completed"
   ↓
6. Admin review và approve/reject
   ↓
7. Nếu approved → Status="admin_approved"
   ↓
8. Owner release payment → Status="released"
```

### 4. Luồng KYC Verification

```
1. User submit KYC documents
   ↓
2. Status="pending"
   ↓
3. VNPT eKYC verification (nếu có)
   ↓
4. Admin manual review
   ↓
5. Approve → Status="verified"
   Reject → Status="rejected"
   ↓
6. User có thể tạo campaigns nếu verified
```

## 📊 Monitoring & Metrics

Hệ thống tích hợp Prometheus metrics để monitoring:

- **Metrics Endpoint**: `/metrics` (khi `METRICS_ENABLED=true`)
- **Grafana Dashboards**: Xem trong `MACha-server/grafana/dashboards/`

### Các Metrics Được Thu Thập

- HTTP request metrics (count, duration, status codes)
- WebSocket connections
- Database query metrics
- Redis operation metrics
- RabbitMQ queue metrics

### Load Testing

Sử dụng k6 cho load testing:

```bash
cd MACha-server/monitoring/k6
./run-load-test.sh
```

Xem thêm tại `MACha-server/docs/PRODUCTION_LOAD_TEST_GUIDE.md`.

## 🔐 Security

- JWT authentication với httpOnly cookies
- Password hashing với bcryptjs
- CORS configuration
- Rate limiting middleware
- Input validation và sanitization
- SQL injection protection (MongoDB)
- XSS protection

## 📝 License

Dự án này được cấp phép dưới Apache License 2.0. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🤝 Đóng Góp

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📞 Liên Hệ

Để biết thêm thông tin hoặc hỗ trợ, vui lòng xem các tài liệu trong thư mục `MACha-server/docs/`:

- `BUSINESS_LOGIC_ANALYSIS.md` - Phân tích nghiệp vụ chi tiết
- `IMPLEMENTATION_GUIDE.md` - Hướng dẫn triển khai
- `MONITORING.md` - Hướng dẫn monitoring
- `PRODUCTION_LOAD_TEST_GUIDE.md` - Hướng dẫn load testing

---

**MACha** - Making A Change, Together! 🌟
