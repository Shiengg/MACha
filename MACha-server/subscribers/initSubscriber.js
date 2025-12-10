import { initCampaignSubscriber } from "./campaign.subscriber.js";
import { initLikeSubscriber } from "./like.subscriber.js";
import { initNotificationSubscriber } from "./notification.subscriber.js";
import { initCommentSubscriber } from "./comment.subscriber.js";


export const initSubscribers = async (io) => {
    await initCampaignSubscriber(io);
    await initLikeSubscriber(io);
    await initNotificationSubscriber(io);
    await initCommentSubscriber(io);
}