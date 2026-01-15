# 📧 LUỒNG GỬI EMAIL CẢM ƠN - TỪ JOB ĐẾN WORKER

## 🎯 Tổng quan

Luồng gửi email cảm ơn sau khi donate thành công qua Sepay được thực hiện qua **RabbitMQ Queue** với kiến trúc **Producer-Consumer**:

- **Producer (Server)**: Bắn job vào queue
- **Queue (RabbitMQ)**: Lưu trữ và phân phối job
- **Consumer (Worker)**: Nhận và xử lý job để gửi email

---

## 📋 LUỒNG CHI TIẾT (TỪNG BƯỚC)

### **BƯỚC 1: Donation Completed → Tạo Job**

**File**: `MACha-server/services/donation.service.js`
**Function**: `updateSepayDonationStatus()`
**Dòng code**: ~615-654

```javascript
// Khi donation chuyển sang status = 'completed'
if (oldPaymentStatus !== 'completed' && !donation.thank_you_mail_sent_at) {
    // 1. Lấy thông tin donor
    const donor = await User.findById(donation.donor).select("email username fullname");
    
    // 2. Tạo job object theo schema chuẩn
    const thankYouJob = createJob(
        JOB_TYPES.DONATION_THANK_YOU,  // Job type
        {
            email: donor.email,
            donorName: donor.fullname || donor.username,
            amount: donation.amount,
            currency: donation.currency,
            transactionId: donation.sepay_transaction_id,
            transactionTime: donation.paid_at,
            donationId: donation._id.toString(),
        },
        {
            userId: donation.donor.toString(),
            source: JOB_SOURCE.SYSTEM,  // System-generated job
            requestId: `donation-${donation._id}-${Date.now()}`,
        }
    );
    
    // 3. Push job vào queue
    await queueService.pushJob(thankYouJob);
}
```

**Input**: Donation object với status = 'completed'
**Output**: Job object được tạo và chuẩn bị để push vào queue

---

### **BƯỚC 2: Validate Job Schema**

**File**: `MACha-server/services/queue.service.js`
**Function**: `pushJob(job)`
**Dòng code**: ~30-37

```javascript
export const pushJob = async (job) => {
    // Validate job format theo schema (fail fast)
    validateJob(job);  // Ném error nếu không hợp lệ
    
    // Xác định queue nào sẽ nhận job này
    let targetQueue = null;
    switch (job.type) {
        case JOB_TYPES.DONATION_THANK_YOU:
            targetQueue = QUEUE_NAMES.MAIL_SEND;  // "mail.send"
            break;
        // ... các job types khác
    }
    
    // Thêm metadata
    const jobWithMeta = {
        ...job,
        meta: {
            ...job.meta,
            queuedAt: new Date().toISOString(),
            queue: targetQueue,
        },
    };
    
    // Gọi sendToQueue
    await sendToQueue(targetQueue, jobWithMeta);
}
```

**Input**: Job object đã được validate
**Output**: Job được đánh dấu queue = "mail.send" và chuẩn bị gửi vào RabbitMQ

---

### **BƯỚC 3: Gửi Job Vào RabbitMQ Queue**

**File**: `MACha-server/config/rabbitmq.js`
**Function**: `sendToQueue(queueName, content, options)`
**Dòng code**: ~303-337

```javascript
export const sendToQueue = async (queueName, content, options = {}) => {
    // 1. Lấy publisher channel (tạo nếu chưa có)
    const channel = await getPublisherChannel();
    
    // 2. Đảm bảo queue tồn tại (tạo nếu chưa có, durable = true)
    await channel.assertQueue(queueName, { durable: true });
    
    // 3. Serialize job object thành JSON Buffer
    const message = Buffer.from(JSON.stringify(content));
    
    // 4. Gửi message vào queue với persistent = true
    channel.sendToQueue(queueName, message, {
        persistent: true,  // Message không bị mất khi broker restart
        timestamp: Date.now(),
    });
    
    // 5. Wait for drain nếu buffer đầy
    if (!sent) {
        await new Promise((resolve) => channel.once('drain', resolve));
    }
}
```

**Input**: Queue name = "mail.send", Job object đã serialize
**Output**: Message được gửi vào RabbitMQ queue "mail.send"
**RabbitMQ**: Lưu message vào queue với persistent = true

---

### **BƯỚC 4: Worker Khởi Động Consumer**

**File**: `MACha_worker/src/index.js`
**Function**: `bootstrap()`
**Dòng code**: ~72-95

```javascript
const bootstrap = async () => {
    // 1. Connect MongoDB
    await connectDB();
    
    // 2. Connect Redis
    await connectRedis();
    
    // 3. Connect RabbitMQ
    await connectRabbitMQ();
    
    // 4. Start mail consumer (listening queue "mail.send")
    mailConsumerTag = await startMailConsumer();
    
    console.log("📬 Listening for mail jobs...");
}
```

**Khi worker start**: Consumer sẽ tự động connect và listen queue "mail.send"

---

### **BƯỚC 5: Worker Consume Message Từ Queue**

**File**: `MACha_worker/src/consumers/mail.consumer.js`
**Function**: `startMailConsumer()`
**Dòng code**: ~98-117

```javascript
export const startMailConsumer = async () => {
    // Gọi consumeMessages với:
    // - Queue: "mail.send"
    // - Handler: processMailMessage
    const consumerTag = await consumeMessages(
        QUEUE_NAMES.MAIL_SEND,  // "mail.send"
        processMailMessage,      // Handler function
        {
            requeueOnError: true,  // Retry nếu lỗi
        }
    );
}
```

**File**: `MACha_worker/src/config/rabbitmq.js`
**Function**: `consumeMessages(queueName, handler, options)`
**Dòng code**: ~278-320

```javascript
export const consumeMessages = async (queueName, handler, options = {}) => {
    // 1. Lấy consumer channel (với prefetch)
    const channel = await getConsumerChannel();
    
    // 2. Đảm bảo queue tồn tại
    await assertQueue(queueName);
    
    // 3. Bắt đầu consume messages từ queue
    const consumerTag = await channel.consume(queueName, async (msg) => {
        // 4. Parse message từ Buffer → JSON → Object
        let content = JSON.parse(msg.content.toString());
        
        // 5. Gọi handler function
        await handler(content, msg, channel);
    }, {
        noAck: false,  // Manual acknowledgment
    });
}
```

**Input**: Message từ RabbitMQ queue "mail.send"
**Output**: Job object được parse và gửi vào handler `processMailMessage`

---

### **BƯỚC 6: Validate & Process Job**

**File**: `MACha_worker/src/consumers/mail.consumer.js`
**Function**: `processMailMessage(content, msg, channel)`
**Dòng code**: ~36-96

```javascript
const processMailMessage = async (content, msg, channel) => {
    const requestId = content.meta?.requestId || "unknown";
    
    console.log(`[Mail Consumer] Received message:`, {
        requestId,
        retryCount: getRetryCount(msg),
    });
    
    try {
        // 1. Validate job schema (fail fast)
        assertJob(content);
        
        // 2. Gọi mail handler để xử lý
        const result = await handleMailJob(content);
        
        // 3. ACK message (xác nhận đã xử lý thành công)
        await ackMessage(msg);
        
        console.log(`[Mail Consumer] Message processed successfully`);
    } catch (error) {
        // 4. Nếu lỗi → Retry hoặc NACK
        const canRetry = shouldRetry(msg, error);
        if (canRetry) {
            await nackMessage(msg, true);  // Requeue
        } else {
            await nackMessage(msg, false); // Discard
        }
    }
}
```

**Input**: Job object đã parse
**Output**: 
- Success → ACK message
- Error → NACK (retry hoặc discard)

---

### **BƯỚC 7: Mail Handler Xử Lý Job**

**File**: `MACha_worker/src/handlers/mail.handler.js`
**Function**: `handleMailJob(job)`
**Dòng code**: ~12-164

```javascript
export const handleMailJob = async (job) => {
    const { type, payload, meta } = job;
    
    // 1. Validate email
    const email = payload.email.trim().toLowerCase();
    validateEmails([email]);
    
    // 2. Generate email template dựa vào job type
    let emailData = null;
    switch (type) {
        case JOB_TYPES.DONATION_THANK_YOU:
            emailData = emailTemplates.generateDonationThankYouEmail({
                donorName: payload.donorName,
                amount: payload.amount,
                currency: payload.currency,
                transactionTime: payload.transactionTime,
                transactionId: payload.transactionId,
            });
            break;
    }
    
    // 3. Gửi email qua mail service
    const result = await sendEmail({
        to: email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        from: EMAIL_CONFIG.FROM_EMAIL,
        fromName: EMAIL_CONFIG.FROM_NAME,
    });
    
    // 4. Return result
    return result;
}
```

**Input**: Job object với type = DONATION_THANK_YOU
**Output**: Email được gửi qua SMTP

---

### **BƯỚC 8: Mail Service Gửi Email**

**File**: `MACha_worker/src/services/mail.service.js`
**Function**: `sendEmail(params)`
**Dòng code**: ~57-141

```javascript
export const sendEmail = async (params) => {
    const { to, subject, html, text, from, fromName } = params;
    
    // 1. Format "From" field
    const fromField = `${fromName} <${from}>`;
    
    // 2. Prepare mail options
    const mailOptions = {
        from: fromField,
        to: to,
        subject: subject,
        html: html,
        text: text,
    };
    
    // 3. Send email via Nodemailer (Gmail SMTP)
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: EMAIL_CONFIG.USER,
            pass: EMAIL_CONFIG.PASSWORD,
        },
    });
    
    // 4. Send với timeout
    const result = await transporter.sendMail(mailOptions);
    
    // 5. Return success
    return {
        success: true,
        messageId: result.messageId,
    };
}
```

**Input**: Email data (to, subject, html, text)
**Output**: Email được gửi qua Gmail SMTP

---

## 🔄 FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│  1. Donation Completed (SePay Callback)                    │
│     File: donation.service.js                               │
│     Function: updateSepayDonationStatus()                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Create Job Object                                       │
│     createJob(JOB_TYPES.DONATION_THANK_YOU, payload, meta)  │
│     File: job.schema.js                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Queue Service - Validate & Route                        │
│     File: queue.service.js                                  │
│     Function: pushJob()                                     │
│     → Validate job schema                                   │
│     → Map to queue "mail.send"                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. RabbitMQ Config - Send To Queue                         │
│     File: config/rabbitmq.js                                │
│     Function: sendToQueue()                                 │
│     → Assert queue "mail.send" (durable)                    │
│     → Serialize job → JSON Buffer                           │
│     → Send to RabbitMQ                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ [RabbitMQ Queue: "mail.send"]
                     │ Persistent = true
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Worker Consumer - Listen Queue                          │
│     File: consumers/mail.consumer.js                        │
│     Function: startMailConsumer()                           │
│     → consumeMessages("mail.send", handler)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Process Message                                         │
│     Function: processMailMessage()                          │
│     → Parse message (Buffer → JSON → Object)                │
│     → Validate job schema                                   │
│     → Call handleMailJob()                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Mail Handler                                            │
│     File: handlers/mail.handler.js                          │
│     Function: handleMailJob()                               │
│     → Validate email                                        │
│     → Generate email template                               │
│     → Call sendEmail()                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Mail Service - Send Email                               │
│     File: services/mail.service.js                          │
│     Function: sendEmail()                                   │
│     → Nodemailer transporter                                │
│     → Gmail SMTP                                            │
│     → Email sent! ✅                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  9. ACK Message                                             │
│     → ackMessage(msg)                                       │
│     → Message removed from queue                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 CÁC FILE LIÊN QUAN

### **Server Side (Producer)**
1. `MACha-server/services/donation.service.js` - Tạo job khi donation completed
2. `MACha-server/services/queue.service.js` - Validate & route job
3. `MACha-server/config/rabbitmq.js` - Gửi message vào RabbitMQ
4. `MACha-server/schemas/job.schema.js` - Job schema definition

### **Worker Side (Consumer)**
1. `MACha_worker/src/index.js` - Worker bootstrap
2. `MACha_worker/src/consumers/mail.consumer.js` - Consume messages từ queue
3. `MACha_worker/src/config/rabbitmq.js` - RabbitMQ connection cho worker
4. `MACha_worker/src/handlers/mail.handler.js` - Xử lý mail job
5. `MACha_worker/src/services/mail.service.js` - Gửi email qua SMTP
6. `MACha_worker/src/templates/email.templates.js` - Email templates
7. `MACha_worker/src/schemas/job.schema.js` - Job schema (must match server)

---

## 🔑 KEY CONCEPTS

### **1. Job Schema (Standardized Format)**
Tất cả job phải follow schema:
```javascript
{
    jobId: "uuid",
    type: "DONATION_THANK_YOU",
    payload: {
        email: "...",
        amount: 100000,
        currency: "VND",
        // ...
    },
    meta: {
        requestId: "uuid",
        userId: "user_id",
        source: "system",
        createdAt: "ISO string",
    }
}
```

### **2. Queue Routing**
- Email jobs → `mail.send` queue
- Notification jobs → `notification.create` queue

### **3. Idempotency**
- Check `thank_you_mail_sent_at` trước khi push job
- Set `thank_you_mail_sent_at` sau khi push thành công
- Reload donation để tránh race condition

### **4. Error Handling & Retry**
- Retry: Lỗi temporary (network, timeout)
- No retry: Lỗi permanent (invalid email, auth error)
- Max retries: 3 (configurable)
- NACK với requeue = true để retry

### **5. Message Acknowledgment**
- **ACK**: Message đã xử lý thành công → Remove khỏi queue
- **NACK**: Message xử lý thất bại → Requeue hoặc discard

---

## 🚀 CÁCH TEST LUỒNG

### **1. Test End-to-End**
```bash
# 1. Start RabbitMQ
docker-compose up rabbitmq

# 2. Start Server
cd MACha-server && npm start

# 3. Start Worker
cd MACha_worker && npm start

# 4. Donate qua Sepay
# 5. Check logs:
#    - Server: "Preparing thank you email for donation..."
#    - Worker: "Received message..."
#    - Worker: "Email sent successfully"
#    - Check inbox của donor
```

### **2. Test Queue Directly**
```bash
# Xem messages trong queue
rabbitmqadmin list queues

# Publish test message
rabbitmqadmin publish exchange=amq.default routing_key=mail.send payload='{"type":"DONATION_THANK_YOU",...}'
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Job Schema phải match**: Server và Worker phải dùng cùng job schema
2. **Queue name phải match**: Server push và Worker consume cùng queue name
3. **Idempotency**: Luôn check `thank_you_mail_sent_at` để tránh gửi duplicate
4. **Error handling**: Mail fail không fail toàn bộ donation flow
5. **Retry logic**: Chỉ retry lỗi temporary, không retry permanent errors

