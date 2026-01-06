import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { setupSwagger } from './docs/swagger.js';
import * as routes from './routes/index.js';
import './jobs/cleanupUnverifiedUsers.job.js';
import './jobs/finalizeVotingPeriods.job.js';
import './jobs/processExpiredCampaigns.job.js';
import './jobs/processExpiredEvents.job.js';

import { initSubscribers } from './subscribers/initSubscriber.js';
import User from './models/user.js';
import * as onlineService from './services/online.service.js';

const app = express();
dotenv.config();

connectDB();
setupSwagger(app);
connectRedis();

const allowedOrigin = process.env.ORIGIN_URL?.replace(/\/$/, '') || 'http://localhost:3000';

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        const normalizedOrigin = origin.replace(/\/$/, '');
        if (normalizedOrigin === allowedOrigin) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} not allowed. Expected: ${allowedOrigin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(cookieParser());

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
app.use("/api/notifications", routes.notificationRoute);
app.use("/api/hashtags", routes.hashtagRoutes);
app.use("/api/conversations", routes.conversationRoutes);
app.use("/api/messages", routes.messageRoutes);
app.use("/api/reports", routes.reportRoutes);
app.use("/api/search", routes.searchRoutes);
app.use("/api/events", routes.eventRoutes);
app.use("/api/owner", routes.ownerRoutes);
app.use("/api/recovery", routes.recoveryRoutes);

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

        console.log(`🔐 Socket authenticated: ${user.username} (${socket.userId})`);
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

    console.log(`✅ Socket connected: ${socket.id} (User: ${username})`);

    if (userId) {
        const userRoom = `user:${userId}`;
        socket.join(userRoom);
        console.log(`🏠 User ${username} joined room: ${userRoom}`);

        socket.emit('room-joined', { room: userRoom, userId });

        await onlineService.setUserOnline(userId, socket.id);
        
        const onlineUserIds = await onlineService.getAllOnlineUserIds();
        socket.emit('users:online:list', { userIds: onlineUserIds });
        
        io.emit('user:online', { userId });
    }

    // Handle join-room event
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`🏠 Socket ${socket.id} joined room: ${room}`);
    });

    // Handle leave-room event
    socket.on('leave-room', (room) => {
        socket.leave(room);
        console.log(`🚪 Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', async () => {
        console.log(`❌ Socket disconnected: ${socket.id} (User: ${username})`);

        if (userId) {
            // Set user offline khi socket disconnect
            await onlineService.setUserOffline(userId);

            // Broadcast user offline status
            io.emit('user:offline', { userId });
        }
    });
});

app.get('/', (req, res) => {
    res.send("MACha API is running");
})

// Init subscribers (pass Socket.IO instance)
initSubscribers(io);

// Export io để worker có thể dùng
export { io };

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    const cyan = '\x1b[36m';
    const green = '\x1b[32m';
    const reset = '\x1b[0m';
    const bold = '\x1b[1m';

    console.log('====================================================');
    console.log(`${green}${bold}⚡  SERVER IS RUNNING!${reset}`);
    console.log('====================================================');
    console.log(`- Port:     ${bold}${PORT}${reset}`);
    console.log(`- Local:    ${cyan}http://localhost:${PORT}${reset}`);
    console.log(`- Time:     ${new Date().toLocaleString()}`);
    console.log('====================================================');
});