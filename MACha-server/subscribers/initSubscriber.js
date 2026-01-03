import { initCampaignSubscriber } from "./campaign.subscriber.js";
import { initLikeSubscriber } from "./like.subscriber.js";
import { initNotificationSubscriber } from "./notification.subscriber.js";
import { initCommentSubscriber } from "./comment.subscriber.js";
import { initDonationSubscriber } from "./donation.subscriber.js";
import { initUserSubscriber } from "./user.subscriber.js";
import { initMessageSubscriber } from "./message.subscriber.js";
import { initEventSubscriber } from "./event.subscriber.js";


export const initSubscribers = async (io) => {
    await initCampaignSubscriber(io);
    await initLikeSubscriber(io);
    await initNotificationSubscriber(io);
    await initCommentSubscriber(io);
    await initDonationSubscriber(io);
    await initUserSubscriber(io);
    await initMessageSubscriber(io);
    await initEventSubscriber(io);
}