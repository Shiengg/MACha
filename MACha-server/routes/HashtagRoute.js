import { Router } from "express";
import Hashtag from "../models/Hashtag.js";
import Post from "../models/post.js";
import { HTTP_STATUS } from "../utils/status.js";

const hashtagRoutes = Router();

/**
 * @swagger
 * /api/hashtags/trending:
 *   get:
 *     summary: Get trending hashtags
 *     description: Retrieves the most used hashtags sorted by post count
 *     tags:
 *       - Hashtags
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of trending hashtags to return
 *     responses:
 *       200:
 *         description: Trending hashtags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   count:
 *                     type: integer
 */
hashtagRoutes.get('/trending', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Aggregate để đếm số lượng posts cho mỗi hashtag
        const trendingHashtags = await Post.aggregate([
            { $unwind: "$hashtags" },
            { 
                $group: { 
                    _id: "$hashtags", 
                    count: { $sum: 1 } 
                } 
            },
            { $sort: { count: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "hashtags",
                    localField: "_id",
                    foreignField: "_id",
                    as: "hashtagData"
                }
            },
            { $unwind: "$hashtagData" },
            {
                $project: {
                    _id: "$hashtagData._id",
                    name: "$hashtagData.name",
                    count: 1
                }
            }
        ]);

        return res.status(HTTP_STATUS.OK).json(trendingHashtags);
    } catch (error) {
        console.error("Error fetching trending hashtags:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: error.message 
        });
    }
});

/**
 * @swagger
 * /api/hashtags:
 *   get:
 *     summary: Get all hashtags
 *     description: Retrieves all hashtags in the system
 *     tags:
 *       - Hashtags
 *     responses:
 *       200:
 *         description: Hashtags retrieved successfully
 */
hashtagRoutes.get('/', async (req, res) => {
    try {
        const hashtags = await Hashtag.find().sort({ created_at: -1 });
        return res.status(HTTP_STATUS.OK).json(hashtags);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
            message: error.message 
        });
    }
});

export default hashtagRoutes;

