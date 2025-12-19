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
import {
    authRoutes,
    userRoutes,
    postRoutes,
    commentRoutes,
    likeRoutes,
    campaignRoutes,
    donationRoutes,
    notificationRoute,
    hashtagRoutes
} from './routes/index.js';

import { initSubscribers } from './subscribers/initSubscriber.js';
import User from './models/user.js';

const app = express();
dotenv.config();

connectDB();
setupSwagger(app);
connectRedis();

// CORS phải được cấu hình TRƯỚC tất cả các routes
app.use(cors({
    origin: process.env.ORIGIN_URL || 'http://localhost:3000',
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/notifications", notificationRoute);
app.use("/api/hashtags", hashtagRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ORIGIN_URL || 'http://localhost:3000',
    }
});

// Socket.IO Authentication Middleware
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
io.on('connection', (socket) => {
    const userId = socket.userId;
    const username = socket.user?.username;
    
    console.log(`✅ Socket connected: ${socket.id} (User: ${username})`);
    
    if (userId) {
        const userRoom = `user:${userId}`;
        socket.join(userRoom);
        console.log(`🏠 User ${username} joined room: ${userRoom}`);
        
        socket.emit('room-joined', { room: userRoom, userId });
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
    
    socket.on('disconnect', () => {
        console.log(`❌ Socket disconnected: ${socket.id} (User: ${username})`);
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