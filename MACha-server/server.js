import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import { connectRedis, closeSubscriber, getConnectionInfo } from './config/redis.js';
import { setupSwagger } from './docs/swagger.js';
import * as routes from './routes/index.js';
import './jobs/cleanupUnverifiedUsers.job.js';
import './jobs/finalizeVotingPeriods.job.js';
import './jobs/processExpiredCampaigns.job.js';
import './jobs/processExpiredEvents.job.js';

import { initSubscribers } from './subscribers/initSubscriber.js';
import User from './models/user.js';
import * as onlineService from './services/online.service.js';
import { metricsMiddleware, register, updateWebSocketConnections } from './middlewares/metricsMiddleware.js';

const app = express();
dotenv.config();

app.set('trust proxy', 1);

connectDB().catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
});

setupSwagger(app);

connectRedis().catch(err => {
    console.error('❌ Redis connection failed:', err.message);
});

// Determine allowed origin based on environment
const allowedOrigin = process.env.NODE_ENV === 'development'
    ? (process.env.ORIGIN_URL?.replace(/\/$/, '') || 'http://localhost:3000')
    : (process.env.ORIGIN_PROD?.replace(/\/$/, '') || 'http://localhost:3000');

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman, health checks)
        if (!origin) {
            return callback(null, true);
        }
        const normalizedOrigin = origin.replace(/\/$/, '');
        
        if (normalizedOrigin === allowedOrigin) {
            return callback(null, true);
        }

        const mobileOrigins = [
            'http://localhost',
            'http://127.0.0.1',
            'exp://localhost',
            'exp://127.0.0.1',
        ];
        
        const isMobileOrigin = mobileOrigins.some(mobileOrigin => 
            normalizedOrigin.startsWith(mobileOrigin)
        );
        
        if (isMobileOrigin) {
            return callback(null, true);
        }
        
        console.warn(`⚠️  CORS blocked origin: ${origin}, expected: ${allowedOrigin}`);
        callback(new Error(`CORS: Origin ${origin} not allowed. Expected: ${allowedOrigin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'], // Expose Set-Cookie header for debugging
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Metrics middleware - phải đặt trước routes để capture tất cả requests
// Chỉ enable nếu METRICS_ENABLED=true trong .env
if (process.env.METRICS_ENABLED === 'true') {
    app.use(metricsMiddleware);
    console.log('📊 Metrics enabled - Prometheus metrics available at /metrics');
}

app.use("/api/auth", routes.authRoutes);
app.use("/api/users", routes.userRoutes);
app.use("/api/kyc", routes.kycRoutes);
app.use("/api/posts", routes.postRoutes);
app.use("/api/comments", routes.commentRoutes);
app.use("/api/likes", routes.likeRoutes);
app.use("/api/campaigns", routes.campaignRoutes);
app.use("/api/donations", routes.donationRoutes);
app.use("/api/escrow", routes.escrowRoutes);
app.use("/api/admin", routes.adminEscrowRoutes);
app.use("/api/admin", routes.adminRoutes);
app.use("/api/notifications", routes.notificationRoute);
app.use("/api/hashtags", routes.hashtagRoutes);
app.use("/api/conversations", routes.conversationRoutes);
app.use("/api/messages", routes.messageRoutes);
app.use("/api/reports", routes.reportRoutes);
app.use("/api/search", routes.searchRoutes);
app.use("/api/events", routes.eventRoutes);
app.use("/api/owner", routes.ownerRoutes);
app.use("/api/recovery", routes.recoveryRoutes);
app.use("/api", routes.campaignCompanionRoutes);
app.use("/api/recommendations", routes.recommendationRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigin,
        credentials: true,
    },
    pingTimeout: 60000, // 60 giây - thời gian chờ pong response
    pingInterval: 25000, // 25 giây - thời gian giữa các ping
    transports: ['websocket', 'polling'],
});

io.use(async (socket, next) => {
    try {
        let token = null;

        // Lấy token từ auth hoặc cookie (giống authMiddleware)
        if (socket.handshake.auth.token) {
            token = socket.handshake.auth.token;
        } else if (socket.handshake.headers.cookie) {
            const cookies = socket.handshake.headers.cookie.split('; ');
            const jwtCookie = cookies.find(c => c.startsWith('jwt='));
            if (jwtCookie) {
                token = jwtCookie.split('=')[1];
            }
        }

        if (!token) {
            console.log('⚠️  Socket connection without token');
            return next(new Error('Authentication error'));
        }

        // Verify token (giống authMiddleware)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Lấy user (giống authMiddleware)
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return next(new Error('User not found'));
        }

        // Lưu vào socket
        socket.userId = user._id.toString();
        socket.user = user;

        //console.log(`🔐 Socket authenticated: ${user.username} (${socket.userId})`);
        next();
    } catch (err) {
        console.error('❌ Socket auth failed:', err.message);
        next(new Error('Authentication error'));
    }
});

// Socket.IO Connection Handler
io.on('connection', async (socket) => {
    const userId = socket.userId;
    const username = socket.user?.username;

    //console.log(`✅ Socket connected: ${socket.id} (User: ${username})`);

    // Update WebSocket connections metric
    if (process.env.METRICS_ENABLED === 'true') {
        updateWebSocketConnections(io.sockets.sockets.size);
    }

    if (userId) {
        const userRoom = `user:${userId}`;
        socket.join(userRoom);
        //console.log(`🏠 User ${username} joined room: ${userRoom}`);

        socket.emit('room-joined', { room: userRoom, userId });

        await onlineService.setUserOnline(userId, socket.id);
        
        const onlineUserIds = await onlineService.getAllOnlineUserIds();
        socket.emit('users:online:list', { userIds: onlineUserIds });
        
        io.emit('user:online', { userId });
    }

    // Handle join-room event
    socket.on('join-room', (room) => {
        socket.join(room);
        //console.log(`🏠 Socket ${socket.id} joined room: ${room}`);
    });

    // Handle leave-room event
    socket.on('leave-room', (room) => {
        socket.leave(room);
        //console.log(`🚪 Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', async () => {
        //console.log(`❌ Socket disconnected: ${socket.id} (User: ${username})`);

        // Update WebSocket connections metric
        if (process.env.METRICS_ENABLED === 'true') {
            updateWebSocketConnections(io.sockets.sockets.size);
        }

        if (userId) {
            // Set user offline khi socket disconnect
            await onlineService.setUserOffline(userId);

            // Broadcast user offline status
            io.emit('user:offline', { userId });
        }
    });
});

// Health check endpoint for Railway and monitoring
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'MACha API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Dedicated health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Prometheus metrics endpoint
// Chỉ expose nếu METRICS_ENABLED=true
if (process.env.METRICS_ENABLED === 'true') {
    const metricsPath = process.env.METRICS_PATH || '/metrics';
    app.get(metricsPath, async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            const metrics = await register.metrics();
            res.end(metrics);
        } catch (error) {
            console.error('❌ Error generating metrics:', error);
            res.status(500).end('Error generating metrics');
        }
    });
    console.log(`📊 Metrics endpoint available at ${metricsPath}`);
}

// Init subscribers (pass Socket.IO instance)
initSubscribers(io).then(() => {
    // Log connection info after all subscribers are initialized
    const connInfo = getConnectionInfo();
    console.log('\n📊 Redis Connection Summary:');
    console.log(`   - Main client: ${connInfo.hasMainClient ? '✅ Connected' : '❌ Not connected'}`);
    console.log(`   - Subscriber client: ${connInfo.hasSubscriberClient ? '✅ Connected (shared by 8 subscribers)' : '❌ Not connected'}`);
    console.log(`   - Total connections: ${connInfo.totalConnections}/2 (optimal: 2 per server instance)\n`);
}).catch(err => {
    console.error('❌ Error initializing subscribers:', err);
});

// Export io để worker có thể dùng
export { io };

const PORT = process.env.PORT || 5000;

// Add startup logging
console.log('🚀 Starting MACha Server...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 Port:', PORT);
console.log('🗄️  Database URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Not set');
console.log('🔴 Redis URL:', process.env.REDIS_URL ? '✓ Set' : '✗ Not set');
console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? '✓ Set' : '✗ Not set');
console.log('🌐 Allowed Origin:', allowedOrigin);

server.listen(PORT, '0.0.0.0', () => {
    const cyan = '\x1b[36m';
    const green = '\x1b[32m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    console.log('====================================================');
    console.log(`${green}${bold}⚡  SERVER IS RUNNING!${reset}`);
    console.log('====================================================');
    console.log(`- Port:     ${bold}${PORT}${reset}`);
    console.log(`- Host:     ${bold}0.0.0.0${reset}`);
    console.log(`- Local:    ${cyan}http://localhost:${PORT}${reset}`);
    console.log(`- Time:     ${new Date().toLocaleString()}`);
    console.log('====================================================');
});

// Graceful shutdown - cleanup Redis connections
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, closing server...');
    await closeSubscriber();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, closing server...');
    await closeSubscriber();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});