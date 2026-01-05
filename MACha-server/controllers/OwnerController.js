import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as ownerService from "../services/owner.service.js";
import * as escrowService from "../services/escrow.service.js";
import * as sepayService from "../services/sepay.service.js";

export const getDashboard = async (req, res) => {
    try {
        const dashboard = await ownerService.getDashboard();
        return res.status(HTTP_STATUS.OK).json(dashboard);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getUsersForAdminCreation = async (req, res) => {
    try {
        const users = await ownerService.getUsersForAdminCreation();
        return res.status(HTTP_STATUS.OK).json({ users });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getAdmins = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await ownerService.getAdmins(page, limit);
        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const createAdmin = async (req, res) => {
    try {
        const { username, email, password, fullname, avatar } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Username, email, and password are required"
            });
        }

        // Validate field formats
        if (typeof username !== 'string' || username.trim().length < 3) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Username must be at least 3 characters"
            });
        }

        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Invalid email format"
            });
        }

        if (typeof password !== 'string' || password.length < 6) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Password must be at least 6 characters"
            });
        }

        if (fullname && (typeof fullname !== 'string' || fullname.length > 100)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Fullname must be a string with max 100 characters"
            });
        }

        if (avatar && (typeof avatar !== 'string' || avatar.length > 500)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Avatar URL must be a string with max 500 characters"
            });
        }

        const result = await ownerService.createAdmin({
            username,
            email,
            password,
            fullname,
            avatar
        });

        if (!result.success) {
            if (result.error === "MISSING_REQUIRED_FIELDS") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Username, email, and password are required"
                });
            }
            if (result.error === "PASSWORD_TOO_SHORT") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Password must be at least 6 characters"
                });
            }
            if (result.error === "USERNAME_EXISTS") {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    message: "Username already exists"
                });
            }
            if (result.error === "EMAIL_EXISTS") {
                return res.status(HTTP_STATUS.CONFLICT).json({
                    message: "Email already exists"
                });
            }
        }

        return res.status(HTTP_STATUS.CREATED).json({
            message: "Admin created successfully",
            admin: result.admin
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const updateAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const updates = req.body;

        // Validate input
        if (!adminId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Admin ID is required"
            });
        }

        // Validate updates object
        if (!updates || typeof updates !== 'object') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Invalid update data"
            });
        }

        // Validate allowed fields
        const allowedFields = ["fullname", "avatar", "bio"];
        const updateKeys = Object.keys(updates);
        const invalidFields = updateKeys.filter(key => !allowedFields.includes(key));
        
        if (invalidFields.length > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: `Invalid fields: ${invalidFields.join(', ')}`
            });
        }

        // Validate field values
        if (updates.fullname !== undefined && (typeof updates.fullname !== 'string' || updates.fullname.length > 100)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Fullname must be a string with max 100 characters"
            });
        }

        if (updates.avatar !== undefined && (typeof updates.avatar !== 'string' || updates.avatar.length > 500)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Avatar URL must be a string with max 500 characters"
            });
        }

        if (updates.bio !== undefined && (typeof updates.bio !== 'string' || updates.bio.length > 500)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Bio must be a string with max 500 characters"
            });
        }

        const result = await ownerService.updateAdmin(adminId, updates);

        if (!result.success) {
            if (result.error === "ADMIN_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Admin not found"
                });
            }
            if (result.error === "NOT_AN_ADMIN") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "User is not an admin"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Admin updated successfully",
            admin: result.admin
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const ownerId = req.user._id;

        // Validate input
        if (!adminId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Admin ID is required"
            });
        }

        // Prevent owner from deleting themselves
        if (ownerId.toString() === adminId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Cannot delete yourself"
            });
        }

        const result = await ownerService.deleteAdmin(adminId, ownerId);

        if (!result.success) {
            if (result.error === "ADMIN_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Admin not found"
                });
            }
            if (result.error === "NOT_AN_ADMIN") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "User is not an admin"
                });
            }
            if (result.error === "CANNOT_DELETE_SELF") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Cannot delete yourself"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Admin removed successfully"
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getFinancialOverview = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const overview = await ownerService.getFinancialOverview(startDate, endDate);
        return res.status(HTTP_STATUS.OK).json(overview);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getCampaignFinancials = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const result = await ownerService.getCampaignFinancials(page, limit);
        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getAdminActivities = async (req, res) => {
    try {
        const adminId = req.query.adminId || null;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await ownerService.getAdminActivities(adminId, page, limit);
        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getApprovalHistory = async (req, res) => {
    try {
        const filters = {
            type: req.query.type || null,
            adminId: req.query.adminId || null,
            startDate: req.query.startDate || null,
            endDate: req.query.endDate || null
        };
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await ownerService.getApprovalHistory(filters, page, limit);
        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const banAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const { reason } = req.body;
        const ownerId = req.user._id;

        // Validate input
        if (!adminId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Admin ID is required"
            });
        }

        // Prevent owner from banning themselves
        if (ownerId.toString() === adminId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Cannot ban yourself"
            });
        }

        // Validate reason
        if (reason && (typeof reason !== 'string' || reason.length > 500)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Reason must be a string with max 500 characters"
            });
        }

        const result = await ownerService.banAdmin(adminId, reason, ownerId);

        if (!result.success) {
            if (result.error === "ADMIN_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Admin not found"
                });
            }
            if (result.error === "NOT_AN_ADMIN") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "User is not an admin"
                });
            }
            if (result.error === "CANNOT_BAN_OWNER") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Cannot ban owner"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Admin banned successfully",
            admin: result.admin
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const unbanAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;

        const result = await ownerService.unbanAdmin(adminId);

        if (!result.success) {
            if (result.error === "ADMIN_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "Admin not found"
                });
            }
            if (result.error === "NOT_AN_ADMIN") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "User is not an admin"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "Admin unbanned successfully",
            admin: result.admin
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

// ==================== USER MANAGEMENT ====================

export const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const filters = {
            search: req.query.search || null,
            role: req.query.role || null,
            is_banned: req.query.is_banned || null,
            kyc_status: req.query.kyc_status || null
        };

        const result = await ownerService.getAllUsers(page, limit, filters);
        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const banUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const ownerId = req.user._id;
        const { reason } = req.body;

        const result = await ownerService.banUser(userId, ownerId, reason);

        if (!result.success) {
            if (result.error === "USER_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
            if (result.error === "CANNOT_BAN_OWNER") {
                return res.status(HTTP_STATUS.FORBIDDEN).json({
                    message: "Cannot ban owner account"
                });
            }
            if (result.error === "CANNOT_BAN_SELF") {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    message: "Cannot ban yourself"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "User banned successfully",
            user: result.user
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const unbanUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const result = await ownerService.unbanUser(userId);

        if (!result.success) {
            if (result.error === "USER_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "User unbanned successfully",
            user: result.user
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const resetUserKYC = async (req, res) => {
    try {
        const userId = req.params.id;

        const result = await ownerService.resetUserKYC(userId);

        if (!result.success) {
            if (result.error === "USER_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({
            message: "User KYC status reset successfully",
            user: result.user
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getUserHistory = async (req, res) => {
    try {
        const userId = req.params.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await ownerService.getUserHistory(userId, page, limit);

        if (!result.success) {
            if (result.error === "USER_NOT_FOUND") {
                return res.status(HTTP_STATUS.NOT_FOUND).json({
                    message: "User not found"
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getAdminApprovedWithdrawalRequests = async (req, res) => {
    try {
        const escrows = await escrowService.getAdminApprovedWithdrawalRequests();
        
        return res.status(HTTP_STATUS.OK).json({
            escrows,
            count: escrows.length
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const initSepayWithdrawalPayment = async (req, res) => {
    try {
        const { escrowId } = req.params;
        const ownerId = req.user._id;
        const { paymentMethod } = req.body;

        const result = await escrowService.initSepayWithdrawalPayment(escrowId, paymentMethod || 'BANK_TRANSFER');

        if (!result.success) {
            const errorStatusMap = {
                "ESCROW_NOT_FOUND": HTTP_STATUS.NOT_FOUND,
                "INVALID_STATUS": HTTP_STATUS.BAD_REQUEST,
                "PAYMENT_ALREADY_INITIATED": HTTP_STATUS.BAD_REQUEST
            };
            
            const statusCode = errorStatusMap[result.error] || HTTP_STATUS.BAD_REQUEST;
            
            return res.status(statusCode).json({
                message: result.message,
                error: result.error
            });
        }

        const { escrow, orderInvoiceNumber } = result;
        const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';

        const paymentParams = {
            orderInvoiceNumber,
            orderAmount: escrow.withdrawal_request_amount,
            currency: 'VND',
            paymentMethod: escrow.sepay_payment_method,
            customerId: ownerId.toString(),
            orderDescription: `Withdrawal payment for campaign: ${escrow.campaign.title}`,
            successUrl: `${serverUrl}/api/owner/escrow/sepay/success?order_invoice_number=${orderInvoiceNumber}`,
            errorUrl: `${serverUrl}/api/owner/escrow/sepay/error?order_invoice_number=${orderInvoiceNumber}`,
            cancelUrl: `${serverUrl}/api/owner/escrow/sepay/cancel?order_invoice_number=${orderInvoiceNumber}`,
            customData: JSON.stringify({
                escrowId: escrow._id.toString(),
                campaignId: escrow.campaign._id.toString()
            })
        };

        const { checkoutUrl, formFields } = await sepayService.initPayment(paymentParams);

        return res.status(HTTP_STATUS.OK).json({
            checkoutUrl,
            formFields,
            escrow: {
                _id: escrow._id,
                withdrawal_request_amount: escrow.withdrawal_request_amount,
                order_invoice_number: escrow.order_invoice_number,
                request_status: escrow.request_status
            }
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            message: error.message || "Internal server error"
        });
    }
};

export const sepayWithdrawalCallback = async (req, res) => {
    try {
        const sepayData = req.body;
        const orderInvoiceNumber = sepayData.order_invoice_number;

        if (!orderInvoiceNumber) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                status: "error",
                message: "order_invoice_number is required"
            });
        }

        const currentEscrow = await escrowService.getEscrowByOrderInvoice(orderInvoiceNumber);
        if (currentEscrow && currentEscrow.request_status === 'released') {
            return res.status(HTTP_STATUS.OK).json({
                status: "ok",
                message: "Withdrawal already released, callback ignored"
            });
        }

        let status = 'pending';
        if (sepayData.transaction_status === 'COMPLETED' || sepayData.status === 'COMPLETED') {
            status = 'completed';
        } else if (sepayData.transaction_status === 'FAILED' || sepayData.status === 'FAILED') {
            status = 'failed';
        } else if (sepayData.transaction_status === 'CANCELLED' || sepayData.status === 'CANCELLED') {
            status = 'cancelled';
        }

        const result = await escrowService.updateSepayWithdrawalStatus(orderInvoiceNumber, status, sepayData);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                status: "error",
                message: "Withdrawal request not found"
            });
        }

        return res.status(HTTP_STATUS.OK).json({
            status: "ok",
            message: "Callback processed successfully"
        });
    } catch (error) {
        console.error('[SePay][WITHDRAWAL][CALLBACK][ERROR]', error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            status: "error",
            message: error.message
        });
    }
};

export const sepayWithdrawalSuccess = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (order_invoice_number) {
            const result = await escrowService.updateSepayWithdrawalStatus(order_invoice_number, 'completed', {});
            if (result && result.escrow) {
                return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=success`);
            }
        }

        return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=success`);
    } catch (error) {
        console.error('[SePay][WITHDRAWAL][SUCCESS][ERROR]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=error`);
    }
};

export const sepayWithdrawalError = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (order_invoice_number) {
            const result = await escrowService.updateSepayWithdrawalStatus(order_invoice_number, 'failed', {});
            if (result && result.escrow) {
                return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=error`);
            }
        }

        return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=error`);
    } catch (error) {
        console.error('[SePay][WITHDRAWAL][ERROR][EXCEPTION]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=error`);
    }
};

export const sepayWithdrawalCancel = async (req, res) => {
    try {
        const { order_invoice_number } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        if (order_invoice_number) {
            const escrow = await escrowService.getEscrowByOrderInvoice(order_invoice_number);
            
            if (escrow) {
                if (escrow.request_status === 'released') {
                    return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=success`);
                }

                if (escrow.sepay_transaction_id || escrow.released_at) {
                    return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=success`);
                }

                if (escrow.request_status === 'admin_approved') {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const recheckEscrow = await escrowService.getEscrowByOrderInvoice(order_invoice_number);
                    if (recheckEscrow) {
                        if (recheckEscrow.request_status === 'released') {
                            return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=success`);
                        }
                        if (recheckEscrow.request_status !== 'admin_approved') {
                            return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=${recheckEscrow.request_status}`);
                        }
                    }
                    
                    const result = await escrowService.updateSepayWithdrawalStatus(order_invoice_number, 'cancelled', {});
                    if (result && result.escrow) {
                        const updatedEscrow = await escrowService.getEscrowByOrderInvoice(order_invoice_number);
                        if (updatedEscrow && updatedEscrow.request_status === 'released') {
                            return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=success`);
                        }
                        return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=cancelled`);
                    }
                } else {
                    return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=${escrow.request_status}`);
                }
            }
        }

        return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=cancelled`);
    } catch (error) {
        console.error('[SePay][WITHDRAWAL][CANCEL][EXCEPTION]', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/owner/withdrawal-requests?payment=cancelled`);
    }
};

