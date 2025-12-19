import Donation from "../models/donation.js";
import Campaign from "../models/campaign.js";
import { redisClient } from "../config/redis.js";

export const createDonation = async (campaignId, donorId, donationData) => {
    const { amount, currency, donation_method, is_anonymous } = donationData;
    
    // Check if campaign exists
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return null;
    }
    
    // Create donation
    const donation = await Donation.create({
        campaign: campaignId,
        donor: donorId,
        amount,
        currency,
        donation_method,
        is_anonymous,
    });
    
    // Update campaign current_amount
    campaign.current_amount += amount;
    await campaign.save();
    
    // Invalidate cache
    await redisClient.del(`donations:${campaignId}`);
    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del('campaigns');
    
    return { donation, campaign };
}

export const getDonationsByCampaign = async (campaignId) => {
    const donationKey = `donations:${campaignId}`;
    
    // Check cache
    const cached = await redisClient.get(donationKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    // Query database
    const donations = await Donation.find({ campaign: campaignId })
        .populate("donor", "username avatar_url")
        .sort({ created_at: -1 });
    
    // Save to cache (TTL: 5 minutes)
    await redisClient.setEx(donationKey, 300, JSON.stringify(donations));
    
    return donations;
}

export const createSepayDonation = async (campaignId, donorId, donationData) => {
    const { amount, currency, paymentMethod, is_anonymous } = donationData;
    
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
        return null;
    }
    
    const donation = await Donation.create({
        campaign: campaignId,
        donor: donorId,
        amount,
        currency: currency || 'VND',
        donation_method: 'sepay',
        sepay_payment_method: paymentMethod || 'BANK_TRANSFER',
        payment_status: 'pending',
        is_anonymous: is_anonymous || false,
    });
    
    const orderInvoiceNumber = `DONATION-${campaign._id}-${Date.now()}`;
    donation.order_invoice_number = orderInvoiceNumber;
    await donation.save();
    
    campaign.total_donations_count += 1;
    await campaign.save();
    
    await redisClient.del(`donations:${campaignId}`);
    await redisClient.del(`campaign:${campaignId}`);
    await redisClient.del('campaigns');
    
    return { donation, campaign };
}

export const getDonationByOrderInvoice = async (orderInvoiceNumber) => {
    const donation = await Donation.findOne({ order_invoice_number: orderInvoiceNumber });
    return donation;
}

export const updateSepayDonationStatus = async (orderInvoiceNumber, status, sepayData) => {
    const donation = await Donation.findOne({ order_invoice_number: orderInvoiceNumber });
    if (!donation) {
        return null;
    }

    // Nếu giao dịch đã hoàn tất trước đó thì không cho phép cập nhật xuống trạng thái khác
    // Tránh trường hợp đã COMPLETED rồi sau đó bị callback / redirect CANCELLED ghi đè
    if (donation.payment_status === 'completed') {
        const campaign = await Campaign.findById(donation.campaign);
        return { donation, campaign };
    }
    
    // Bảo vệ: KHÔNG cho phép update từ completed sang cancelled/failed
    // Nếu đã completed thì không thể bị downgrade
    if ((status === 'cancelled' || status === 'failed') && donation.payment_status === 'completed') {
        const campaign = await Campaign.findById(donation.campaign);
        return { donation, campaign };
    }

    // Cho phép override từ cancelled/failed sang completed
    // Vì success redirect chỉ được gọi khi SePay thực sự redirect về success URL (thanh toán đã thành công)
    if (status === 'completed' && (donation.payment_status === 'cancelled' || donation.payment_status === 'failed')) {
        // Tiếp tục xử lý để update thành completed
    }
    // Bảo vệ: Nếu đang cố cập nhật xuống 'cancelled' hoặc 'failed' nhưng có dấu hiệu thành công
    // (như có transaction_id hoặc paid_at đã được set), thì không cho phép
    else if ((status === 'cancelled' || status === 'failed') && donation.payment_status === 'pending') {
        // Kiểm tra nếu có transaction_id trong callback data - đây là dấu hiệu giao dịch đã được xử lý thành công
        if (sepayData?.transaction_id || donation.sepay_transaction_id) {
            const campaign = await Campaign.findById(donation.campaign);
            return { donation, campaign };
        }
        
        // Kiểm tra nếu đã có paid_at timestamp - nghĩa là đã từng được đánh dấu thành công
        if (donation.paid_at) {
            const campaign = await Campaign.findById(donation.campaign);
            return { donation, campaign };
        }
    }
    // Không cho phép update từ cancelled/failed sang cancelled/failed khác (tránh duplicate updates)
    else if ((status === 'cancelled' || status === 'failed') && (donation.payment_status === 'cancelled' || donation.payment_status === 'failed')) {
        const campaign = await Campaign.findById(donation.campaign);
        return { donation, campaign };
    }
    
    const updateData = {
        payment_status: status,
        sepay_response_data: sepayData
    };
    
    if (sepayData?.transaction_id) {
        updateData.sepay_transaction_id = sepayData.transaction_id;
    }
    
    if (status === 'completed') {
        updateData.paid_at = new Date();
    } else if (status === 'failed') {
        updateData.failed_at = new Date();
    } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date();
    }

    Object.assign(donation, updateData);
    await donation.save();
    
    if (status === 'completed' && donation.payment_status !== 'completed') {
        const campaign = await Campaign.findById(donation.campaign);
        if (campaign) {
            campaign.current_amount += donation.amount;
            campaign.completed_donations_count += 1;
            await campaign.save();
        }
    }
    
    await redisClient.del(`donations:${donation.campaign}`);
    await redisClient.del(`campaign:${donation.campaign}`);
    await redisClient.del('campaigns');
    
    const campaign = await Campaign.findById(donation.campaign);
    return { donation, campaign };
}