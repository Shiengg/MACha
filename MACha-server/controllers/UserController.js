import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";
import * as userService from "../services/user.service.js";

export const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await userService.getUserById(userId);

        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                message: "User not found" 
            });
        }

        return res.status(HTTP_STATUS.OK).json({ user });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const followUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.user._id;

        const result = await userService.followUser(currentUserId, targetUserId);

        if (!result.success) {
            if (result.error === 'SELF_FOLLOW') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "You can't follow your own account." 
                });
            }
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "We couldn't find the user you want to follow." 
                });
            }
            if (result.error === 'ALREADY_FOLLOWING') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "You're already following this person." 
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ 
            message: "Followed successfully.", 
            following: result.targetUserId 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const unfollowUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.user._id;

        const result = await userService.unfollowUser(currentUserId, targetUserId);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "We couldn't find the user you want to unfollow." 
                });
            }
            if (result.error === 'NOT_FOLLOWING') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "You're not following this person." 
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ message: "Successfully unfollowed." });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getFollowers = async (req, res) => {
    try {
        const result = await userService.getFollowers(req.params.id);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getFollowing = async (req, res) => {
    try {
        const result = await userService.getFollowing(req.params.id);

        if (!result) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: HTTP_STATUS_TEXT.NOT_FOUND });
        }

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const searchUsers = async (req, res) => {
    try {
        const query = req.query.query;

        const result = await userService.searchUsers(query);

        if (!result.success) {
            if (result.error === 'EMPTY_QUERY') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "Search keyword is missing." 
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ results: result.users });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const submitKYC = async (req, res) => {
    try {
        const userId = req.user._id;
        const kycData = req.body;

        const result = await userService.submitKYC(userId, kycData);

        if (!result.success) {
            if (result.error === 'ALREADY_VERIFIED') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "Your account is already verified" 
                });
            }
            if (result.error === 'PENDING_REVIEW') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: "Your KYC is already pending review" 
                });
            }
            if (result.error === 'MISSING_REQUIRED_FIELDS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: result.message,
                    missingFields: result.missingFields
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ 
            message: "KYC submitted successfully. Please wait for admin review.",
            user: result.user 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getKYCStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const result = await userService.getKYCStatus(userId);

        return res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getPendingKYCs = async (req, res) => {
    try {
        const users = await userService.getPendingKYCs();
        
        return res.status(HTTP_STATUS.OK).json({ 
            count: users.length,
            users 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const getKYCDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await userService.getKYCDetails(userId);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                    message: "User not found" 
                });
            }
            if (result.error === 'NO_KYC_DATA') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                    message: "No KYC data found for this user" 
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json(result.data);
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const approveKYC = async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user._id;

        const result = await userService.approveKYC(userId, adminId);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                    message: "User not found" 
                });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: result.message 
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ 
            message: "KYC approved successfully",
            user: result.user 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}

export const rejectKYC = async (req, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body;

        if (!reason || reason.trim().length === 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                message: "Rejection reason is required" 
            });
        }

        const result = await userService.rejectKYC(userId, reason);

        if (!result.success) {
            if (result.error === 'USER_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ 
                    message: "User not found" 
                });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
                    message: result.message 
                });
            }
        }

        return res.status(HTTP_STATUS.OK).json({ 
            message: "KYC rejected successfully",
            user: result.user 
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
}