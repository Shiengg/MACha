import { initCampaignSubscriber } from "./campaign.subscriber.js";

export const initSubscribers = async (io) => {
    await initCampaignSubscriber(io);
}