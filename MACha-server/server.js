import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { setupSwagger } from './docs/swagger.js';
import {
    authRoutes,
    userRoutes,
    postRoutes,
    commentRoutes,
    likeRoutes,
    campaignRoutes,
    donationRoutes
} from './routes/index.js';

const app = express();
dotenv.config();

connectDB();
setupSwagger(app);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/donations", donationRoutes);

// Example endpoint
/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome route
 *     description: Kiểm tra server hoạt động
 *     responses:
 *       200:
 *         description: Trả về thông báo chào mừng
 */
app.get('/', (req, res) => {
    res.send("MACha API is running");
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`- Local:        http://localhost:${PORT}`)
})