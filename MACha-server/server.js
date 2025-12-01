import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
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

const app = express();
dotenv.config();

connectDB();
setupSwagger(app);

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

app.get('/', (req, res) => {
    res.send("MACha API is running");
})

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