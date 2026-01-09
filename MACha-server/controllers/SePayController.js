import { HTTP_STATUS } from "../utils/status.js";
import * as sepayService from "../services/sepay.service.js";
import * as donationService from "../services/donation.service.js";

export const initSepayPayment = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const donorId = req.user._id;
        const { amount, currency, paymentMethod, is_anonymous } = req.body;

        if (!amount || amount <= 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Amount is required and must be greater than 0" });
        }

        const donationData = {
            amount,
            currency: currency || 'VND',
            paymentMethod: paymentMethod || 'BANK_TRANSFER',
            is_anonymous: is_anonymous || false
        };

        const result = await donationService.createSepayDonation(campaignId, donorId, donationData);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Campaign not found" });
        }

        const { donation, campaign } = result;
        const orderInvoiceNumber = donation.order_invoice_number;

        const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';

        const paymentParams = {
            orderInvoiceNumber,
            orderAmount: donation.amount,
            currency: donation.currency,
            paymentMethod: donation.sepay_payment_method,
            customerId: donorId.toString(),
            orderDescription: `Donation for campaign: ${campaign.title}`,
            successUrl: `${serverUrl}/api/donations/sepay/success?order_invoice_number=${orderInvoiceNumber}`,
            errorUrl: `${serverUrl}/api/donations/sepay/error?order_invoice_number=${orderInvoiceNumber}`,
            cancelUrl: `${serverUrl}/api/donations/sepay/cancel?order_invoice_number=${orderInvoiceNumber}`,
            customData: JSON.stringify({
                donationId: donation._id.toString(),
                campaignId: campaign._id.toString()
            })
        };

        const { checkoutUrl, formFields } = await sepayService.initPayment(paymentParams);

        res.status(HTTP_STATUS.OK).json({
            checkoutUrl,
            formFields,
            donation: {
                _id: donation._id,
                amount: donation.amount,
                currency: donation.currency,
                order_invoice_number: donation.order_invoice_number,
                payment_status: donation.payment_status
            }
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const sepayCallback = async (req, res) => {
    try {
        const sepayData = req.body;
        const orderInvoiceNumber = sepayData.order_invoice_number;

        if (!orderInvoiceNumber) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: "error", message: "order_invoice_number is required" });
        }

        // Kiểm tra donation hiện tại trước khi quyết định status
        const currentDonation = await donationService.getDonationByOrderInvoice(orderInvoiceNumber);
        if (currentDonation && currentDonation.payment_status === 'completed') {
            return res.status(HTTP_STATUS.OK).json({ status: "ok", message: "Donation already completed, callback ignored" });
        }

        let status = 'pending';
        if (sepayData.transaction_status === 'COMPLETED' || sepayData.status === 'COMPLETED') {
            status = 'completed';
        } else if (sepayData.transaction_status === 'FAILED' || sepayData.status === 'FAILED') {
            status = 'failed';
        } else if (sepayData.transaction_status === 'CANCELLED' || sepayData.status === 'CANCELLED') {
            status = 'cancelled';
        }

        const result = await donationService.updateSepayDonationStatus(orderInvoiceNumber, status, sepayData);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ status: "error", message: "Donation not found" });
        }

        res.status(HTTP_STATUS.OK).json({ status: "ok", message: "Callback processed successfully" });
    } catch (error) {
        console.error('[SePay][CALLBACK][ERROR]', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: "error", message: error.message });
    }
}

export const sepaySuccess = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.ORIGIN_PROD;

        if (order_invoice_number) {
            // Success redirect có quyền override cancelled/failed vì SePay chỉ redirect về đây khi thanh toán thành công
            const result = await donationService.updateSepayDonationStatus(order_invoice_number, 'completed', {});
            if (result && result.donation) {
                return res.redirect(`${frontendUrl}/campaigns/${result.donation.campaign}?donation=success`);
            }
        }

        return res.redirect(`${frontendUrl}?donation=success`);
    } catch (error) {
        console.error('[SePay][SUCCESS][ERROR]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}?donation=error`);
    }
}

export const sepayError = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.ORIGIN_PROD;

        if (order_invoice_number) {
            const result = await donationService.updateSepayDonationStatus(order_invoice_number, 'failed', {});
            if (result && result.donation) {
                return res.redirect(`${frontendUrl}/campaigns/${result.donation.campaign}?donation=error`);
            }
        }

        return res.redirect(`${frontendUrl}?donation=error`);
    } catch (error) {
        console.error('[SePay][ERROR][EXCEPTION]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}?donation=error`);
    }
}

export const sepayCancel = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.ORIGIN_PROD;

        if (order_invoice_number) {
            const donation = await donationService.getDonationByOrderInvoice(order_invoice_number);
            
            if (donation) {
                // Nếu đã completed, redirect về success
                if (donation.payment_status === 'completed') {
                    return res.redirect(`${frontendUrl}/campaigns/${donation.campaign}?donation=success`);
                }

                // Nếu có transaction_id hoặc paid_at, có thể thanh toán đã thành công
                // nhưng user click back. Không nên đánh dấu là cancelled
                if (donation.sepay_transaction_id || donation.paid_at) {
                    return res.redirect(`${frontendUrl}/campaigns/${donation.campaign}?donation=success`);
                }

                // Chỉ cập nhật thành cancelled nếu thực sự chưa có dấu hiệu thành công
                // Và chỉ update nếu status hiện tại là 'pending' (tránh duplicate updates)
                if (donation.payment_status === 'pending') {
                    // Đợi một chút để Success URL có cơ hội chạy trước
                    // Vì có thể user click back ngay sau khi thanh toán thành công
                    // nhưng Success redirect chưa kịp xử lý
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Đợi 2 giây
                    
                    // Kiểm tra lại status sau khi đợi
                    const recheckDonation = await donationService.getDonationByOrderInvoice(order_invoice_number);
                    if (recheckDonation) {
                        if (recheckDonation.payment_status === 'completed') {
                            // Success redirect đã chạy trong lúc đợi
                            return res.redirect(`${frontendUrl}/campaigns/${recheckDonation.campaign}?donation=success`);
                        }
                        if (recheckDonation.payment_status !== 'pending') {
                            // Status đã thay đổi (có thể do callback)
                            return res.redirect(`${frontendUrl}/campaigns/${recheckDonation.campaign}?donation=${recheckDonation.payment_status}`);
                        }
                    }
                    
                    // Vẫn là pending sau khi đợi, có thể thực sự bị cancel
                    const result = await donationService.updateSepayDonationStatus(order_invoice_number, 'cancelled', {});
                    if (result && result.donation) {
                        // Kiểm tra lại status sau khi update để đảm bảo không bị override
                        const updatedDonation = await donationService.getDonationByOrderInvoice(order_invoice_number);
                        if (updatedDonation && updatedDonation.payment_status === 'completed') {
                            // Đã bị override thành completed (có thể do success redirect chạy song song)
                            return res.redirect(`${frontendUrl}/campaigns/${updatedDonation.campaign}?donation=success`);
                        }
                        return res.redirect(`${frontendUrl}/campaigns/${result.donation.campaign}?donation=cancelled`);
                    }
                } else {
                    // Redirect về campaign với status hiện tại
                    return res.redirect(`${frontendUrl}/campaigns/${donation.campaign}?donation=${donation.payment_status}`);
                }
            }
        }

        return res.redirect(`${frontendUrl}?donation=cancelled`);
    } catch (error) {
        console.error('[SePay][CANCEL][EXCEPTION]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}?donation=cancelled`);
    }
}
