import { HTTP_STATUS } from "../utils/status.js";
import * as recoveryService from "../services/recovery.service.js";
import * as sepayService from "../services/sepay.service.js";

export const getRecoveryCasesByCreator = async (req, res) => {
    try {
        const creatorId = req.user._id;
        const cases = await recoveryService.getRecoveryCasesByCreator(creatorId);
        return res.status(HTTP_STATUS.OK).json({ recoveryCases: cases });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const getRecoveryCaseById = async (req, res) => {
    try {
        const { recoveryCaseId } = req.params;
        const userId = req.user._id;
        
        const recoveryCase = await recoveryService.getRecoveryCaseById(recoveryCaseId);
        
        if (!recoveryCase) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Recovery case not found"
            });
        }

        if (recoveryCase.creator._id.toString() !== userId.toString() && req.user.role !== 'owner' && req.user.role !== 'admin') {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "You don't have permission to view this recovery case"
            });
        }

        return res.status(HTTP_STATUS.OK).json({ recoveryCase });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const initSepayRecoveryPayment = async (req, res) => {
    try {
        const { recoveryCaseId } = req.params;
        const creatorId = req.user._id;
        const { paymentMethod } = req.body;

        const recoveryCase = await recoveryService.getRecoveryCaseById(recoveryCaseId);
        
        if (!recoveryCase) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                message: "Recovery case not found"
            });
        }

        if (recoveryCase.creator._id.toString() !== creatorId.toString()) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                message: "You don't have permission to pay for this recovery case"
            });
        }

        const remainingAmount = recoveryCase.total_amount - recoveryCase.recovered_amount;

        if (remainingAmount <= 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "No remaining amount to pay"
            });
        }

        if (recoveryCase.status === "completed") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Recovery case is already completed"
            });
        }

        const orderInvoiceNumber = `RECOVERY-${recoveryCaseId}-${Date.now()}`;
        const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';

        const paymentParams = {
            orderInvoiceNumber,
            orderAmount: remainingAmount,
            currency: 'VND',
            paymentMethod: paymentMethod || 'BANK_TRANSFER',
            customerId: creatorId.toString(),
            orderDescription: `Recovery payment for campaign: ${recoveryCase.campaign.title || 'Campaign'} - Full amount: ${remainingAmount.toLocaleString('vi-VN')} VND`,
            successUrl: `${serverUrl}/api/recovery/sepay/success?order_invoice_number=${orderInvoiceNumber}`,
            errorUrl: `${serverUrl}/api/recovery/sepay/error?order_invoice_number=${orderInvoiceNumber}`,
            cancelUrl: `${serverUrl}/api/recovery/sepay/cancel?order_invoice_number=${orderInvoiceNumber}`,
            callbackUrl: `${serverUrl}/api/recovery/sepay/callback`,
            customData: JSON.stringify({
                recoveryCaseId: recoveryCaseId,
                campaignId: recoveryCase.campaign._id.toString(),
                amount: remainingAmount
            })
        };

        const { checkoutUrl, formFields } = await sepayService.initPayment(paymentParams);

        return res.status(HTTP_STATUS.OK).json({
            checkoutUrl,
            formFields,
            recoveryCase: {
                _id: recoveryCase._id,
                total_amount: recoveryCase.total_amount,
                recovered_amount: recoveryCase.recovered_amount,
                remaining_amount: remainingAmount
            },
            paymentAmount: remainingAmount
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const sepayRecoveryCallback = async (req, res) => {
    try {
        console.log('[SePay][RECOVERY][CALLBACK] Received callback:', JSON.stringify(req.body));
        const sepayData = req.body;
        const orderInvoiceNumber = sepayData.order_invoice_number;

        if (!orderInvoiceNumber) {
            console.error('[SePay][RECOVERY][CALLBACK] Missing order_invoice_number');
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                status: "error",
                message: "order_invoice_number is required"
            });
        }

        if (!orderInvoiceNumber.startsWith('RECOVERY-')) {
            console.error('[SePay][RECOVERY][CALLBACK] Invalid order invoice number:', orderInvoiceNumber);
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                status: "error",
                message: "Invalid recovery payment order invoice number"
            });
        }

        const recoveryCaseId = orderInvoiceNumber.split('-')[1];
        console.log('[SePay][RECOVERY][CALLBACK] Processing recovery case:', recoveryCaseId);
        
        const recoveryCase = await recoveryService.getRecoveryCaseById(recoveryCaseId);
        
        if (!recoveryCase) {
            console.error('[SePay][RECOVERY][CALLBACK] Recovery case not found:', recoveryCaseId);
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                status: "error",
                message: "Recovery case not found"
            });
        }

        if (recoveryCase.status === "completed") {
            console.log('[SePay][RECOVERY][CALLBACK] Recovery case already completed, ignoring');
            return res.status(HTTP_STATUS.OK).json({
                status: "ok",
                message: "Recovery case already completed, callback ignored"
            });
        }

        let paymentStatus = 'pending';
        if (sepayData.transaction_status === 'COMPLETED' || sepayData.status === 'COMPLETED') {
            paymentStatus = 'completed';
        } else if (sepayData.transaction_status === 'FAILED' || sepayData.status === 'FAILED') {
            paymentStatus = 'failed';
        } else if (sepayData.transaction_status === 'CANCELLED' || sepayData.status === 'CANCELLED') {
            paymentStatus = 'cancelled';
        }

        console.log('[SePay][RECOVERY][CALLBACK] Payment status:', paymentStatus);

        if (paymentStatus === 'completed') {
            const customData = sepayData.custom_data ? JSON.parse(sepayData.custom_data) : {};
            const paymentAmount = customData.amount || sepayData.order_amount || (recoveryCase.total_amount - recoveryCase.recovered_amount);
            
            console.log('[SePay][RECOVERY][CALLBACK] Updating recovery amount:', paymentAmount);

            const result = await recoveryService.updateRecoveryAmount(
                recoveryCaseId,
                parseFloat(paymentAmount),
                "Creator payment via SePay",
                `Payment completed. Transaction ID: ${sepayData.transaction_id || orderInvoiceNumber}`,
                recoveryCase.creator._id
            );

            if (result && result.success && result.recoveryCase) {
                console.log('[SePay][RECOVERY][CALLBACK] Recovery amount updated successfully');
                const updatedRecoveredAmount = result.recoveryCase.recovered_amount;
                
                if (updatedRecoveredAmount > 0) {
                    try {
                        console.log('[SePay][RECOVERY][CALLBACK] Processing recovery refund');
                        await recoveryService.processRecoveryRefund(recoveryCaseId, recoveryCase.created_by);
                        console.log('[SePay][RECOVERY][CALLBACK] Recovery refund processed successfully');
                    } catch (refundError) {
                        console.error('[SePay][RECOVERY][CALLBACK] Error processing recovery refund:', refundError);
                    }
                }
            } else {
                console.error('[SePay][RECOVERY][CALLBACK] Failed to update recovery amount:', result);
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            status: "ok",
            message: "Callback processed successfully"
        });
    } catch (error) {
        console.error('[SePay][RECOVERY][CALLBACK][ERROR]', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            status: "error",
            message: error.message
        });
    }
};

export const sepayRecoverySuccess = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (order_invoice_number && order_invoice_number.startsWith('RECOVERY-')) {
            const recoveryCaseId = order_invoice_number.split('-')[1];
            if (recoveryCaseId) {
                try {
                    const recoveryCase = await recoveryService.getRecoveryCaseById(recoveryCaseId);
                    if (recoveryCase && recoveryCase.status !== 'completed') {
                        console.log('[SePay][RECOVERY][SUCCESS] Processing payment in success handler for:', recoveryCaseId);
                        
                        const orderAmount = req.query.order_amount ? parseFloat(req.query.order_amount) : null;
                        const remainingAmount = recoveryCase.total_amount - recoveryCase.recovered_amount;
                        const paymentAmount = orderAmount || remainingAmount;
                        
                        if (paymentAmount > 0) {
                            const result = await recoveryService.updateRecoveryAmount(
                                recoveryCaseId,
                                paymentAmount,
                                "Creator payment via SePay (success redirect)",
                                `Payment completed via success redirect. Order: ${order_invoice_number}`,
                                recoveryCase.creator._id
                            );

                            if (result && result.success && result.recoveryCase) {
                                const updatedRecoveredAmount = result.recoveryCase.recovered_amount;
                                if (updatedRecoveredAmount > 0) {
                                    try {
                                        await recoveryService.processRecoveryRefund(recoveryCaseId, recoveryCase.created_by);
                                        console.log('[SePay][RECOVERY][SUCCESS] Recovery refund processed successfully');
                                    } catch (refundError) {
                                        console.error('[SePay][RECOVERY][SUCCESS] Error processing recovery refund:', refundError);
                                    }
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('[SePay][RECOVERY][SUCCESS] Error processing recovery in success handler:', error);
                }
                
                return res.redirect(`${frontendUrl}/creator/recovery-cases?payment=success&recoveryCaseId=${recoveryCaseId}`);
            }
        }

        return res.redirect(`${frontendUrl}/creator/recovery-cases?payment=success`);
    } catch (error) {
        console.error('[SePay][RECOVERY][SUCCESS][ERROR]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/creator/recovery-cases?payment=error`);
    }
};

export const sepayRecoveryError = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        return res.redirect(`${frontendUrl}/creator/recovery-cases?payment=error`);
    } catch (error) {
        console.error('[SePay][RECOVERY][ERROR][EXCEPTION]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/creator/recovery-cases?payment=error`);
    }
};

export const sepayRecoveryCancel = async (req, res) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/creator/recovery-cases?payment=cancelled`);
    } catch (error) {
        console.error('[SePay][RECOVERY][CANCEL][EXCEPTION]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/creator/recovery-cases?payment=cancelled`);
    }
};

