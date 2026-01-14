import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { setupSwagger } from './docs/swagger.js';
import * as routes from './routes/index.js';
import { metricsMiddleware, register } from './middlewares/metricsMiddleware.js';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

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


app.use(compression({
    level: 6, // Compression level (1-9), 6 is a good balance
    filter: (req, res) => {
        // Don't compress responses if this request header is present
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Use compression filter function
        return compression.filter(req, res);
    }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());


if (process.env.METRICS_ENABLED === 'true') {
    app.use(metricsMiddleware);
    console.log('📊 Metrics enabled - Prometheus metrics available at /metrics');
}


setupSwagger(app);

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


app.get('/', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'MACha API is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

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

export default app;
export { allowedOrigin };
