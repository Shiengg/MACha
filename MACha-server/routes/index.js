import authRoutes from "./AuthRoute.js";
import userRoutes from "./UserRoute.js";
import postRoutes from "./PostRoute.js";
import commentRoutes from "./CommentRoute.js";
import likeRoutes from "./LikeRoute.js";
import campaignRoutes from "./CampaignRoute.js";
import donationRoutes from "./DonationRoute.js";
import escrowRoutes, { adminEscrowRoutes } from "./EscrowRoute.js";
import notificationRoute from "./NotificationRoute.js";
import hashtagRoutes from "./HashtagRoute.js";
import conversationRoutes from "./ConversationRoute.js";
import messageRoutes from "./MessageRoute.js";

export {
    authRoutes,
    userRoutes,
    postRoutes,
    commentRoutes,
    likeRoutes,
    campaignRoutes,
    donationRoutes,
    escrowRoutes,
    adminEscrowRoutes,
    notificationRoute,
    hashtagRoutes,
    conversationRoutes,
    messageRoutes
}