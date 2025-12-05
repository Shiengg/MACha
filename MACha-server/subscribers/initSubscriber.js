import { initCampaignSubscriber } from "./campaign.subscriber.js";
import { initLikeSubscriber } from "./like.subscriber.js";

export const initSubscribers = async (io) => {
    await initCampaignSubscriber(io);
    await initLikeSubscriber(io);
}