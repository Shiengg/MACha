import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import app, { allowedOrigin } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { connectRedis, disconnectRedis, closeSubscriber, getConnectionInfo } from './config/redis.js';
import { connectRabbitMQ, disconnectRabbitMQ } from './config/rabbitmq.js';
import { initSubscribers } from './subscribers/initSubscriber.js';
import User from './models/user.js';
import * as onlineService from './services/online.service.js';
import { updateWebSocketConnections } from './middlewares/metricsMiddleware.js';

// Import jobs (side effects - chạy khi import)
import './jobs/cleanupUnverifiedUsers.job.js';
import './jobs/finalizeVotingPeriods.job.js';
import './jobs/processExpiredCampaigns.job.js';
import './jobs/processExpiredEvents.job.js';
import './jobs/processStartedEvents.job.js';
import './jobs/checkOverduePostReleaseUpdates.job.js';

dotenv.config();


const initializeConnections = async () => {
    try {
        await connectDB();
        await connectRedis();
        await connectRabbitMQ();
        console.log('✅ All connections initialized successfully');
    } catch (err) {
        console.error("Connection initialization failed:", err.message);
        process.exit(1);
    }
};

initializeConnections();


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

// Export io để worker và các module khác có thể dùng
export { io };

// ============================================
// INIT SUBSCRIBERS
// ============================================
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

// ============================================
// START SERVER
// ============================================
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

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
    if (isShuttingDown) {
        console.log('⚠️  Shutdown already in progress...');
        return;
    }

    isShuttingDown = true;
    console.log(`\n🛑 ${signal} received, initiating graceful shutdown...`);

    // 1. Stop accepting new requests
    server.close(() => {
        console.log('✅ HTTP server closed');
    });

    try {
        // 2. Close Redis subscriber (for pub/sub)
        console.log('🔌 Closing Redis subscriber...');
        await closeSubscriber();

        // 3. Close RabbitMQ connections (channels and connection)
        console.log('🔌 Closing RabbitMQ connections...');
        await disconnectRabbitMQ();

        // 4. Close Redis main client
        console.log('🔌 Closing Redis main client...');
        await disconnectRedis();

        // 5. Close MongoDB connections (last, most critical)
        console.log('🔌 Closing MongoDB connections...');
        await disconnectDB();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
