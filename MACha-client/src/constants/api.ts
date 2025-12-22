export const AUTH_ROUTE = "api/auth";
export const LOGIN_ROUTE = `${AUTH_ROUTE}/login`;
export const SIGNUP_ROUTE = `${AUTH_ROUTE}/signup`;
export const GET_CURRENT_USER_ROUTE = `${AUTH_ROUTE}/me`;
export const LOGOUT_ROUTE = `${AUTH_ROUTE}/logout`;
export const UPDATE_USER_ROUTE = (userId: string) => `${AUTH_ROUTE}/${userId}`;
export const SEND_OTP_ROUTE = `${AUTH_ROUTE}/otp`;
export const CHANGE_PASSWORD_ROUTE = `${AUTH_ROUTE}/change-password`;
export const FORGOT_PASSWORD_ROUTE = `${AUTH_ROUTE}/forgot-password`;

export const POST_ROUTE = "api/posts";
export const GET_POSTS_ROUTE = `${POST_ROUTE}`;
export const GET_POST_BY_ID_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const CREATE_POST_ROUTE = `${POST_ROUTE}`;
export const DELETE_POST_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const SEARCH_POSTS_BY_HASHTAG_ROUTE = `${POST_ROUTE}/search`;
export const GET_POSTS_BY_HASHTAG_ROUTE = (name: string) => `${POST_ROUTE}/hashtag/${name}`;

export const HASHTAG_ROUTE = "api/hashtags";
export const GET_TRENDING_HASHTAGS_ROUTE = `${HASHTAG_ROUTE}/trending`;
export const GET_ALL_HASHTAGS_ROUTE = `${HASHTAG_ROUTE}`;

export const LIKE_ROUTE = "api/likes";
export const LIKE_POST_ROUTE = (postId: string) => `${LIKE_ROUTE}/${postId}/like`;
export const UNLIKE_POST_ROUTE = (postId: string) => `${LIKE_ROUTE}/${postId}/unlike`;
export const GET_POST_LIKES_ROUTE = (postId: string) => `${LIKE_ROUTE}/${postId}/likes`;

export const COMMENT_ROUTE = "api/comments";
export const ADD_COMMENT_ROUTE = (postId: string) => `${COMMENT_ROUTE}/${postId}/comments`;
export const GET_COMMENTS_ROUTE = (postId: string) => `${COMMENT_ROUTE}/${postId}/comments`;
export const DELETE_COMMENT_ROUTE = (commentId: string) => `${COMMENT_ROUTE}/comments/${commentId}`;

export const NOTIFICATION_ROUTE = "api/notifications";
export const GET_NOTIFICATIONS_ROUTE = `${NOTIFICATION_ROUTE}`;
export const MARK_AS_READ_ROUTE = (notificationId: string) => `${NOTIFICATION_ROUTE}/${notificationId}/read`;
export const MARK_ALL_AS_READ_ROUTE = `${NOTIFICATION_ROUTE}/read-all`;
export const DELETE_NOTIFICATION_ROUTE = (notificationId: string) => `${NOTIFICATION_ROUTE}/${notificationId}`;

export const USER_ROUTE = "api/users";
export const GET_USER_BY_ID_ROUTE = (userId: string) => `${USER_ROUTE}/${userId}`;

export const CAMPAIGN_ROUTE = "api/campaigns";
export const GET_ALL_CAMPAIGNS_ROUTE = `${CAMPAIGN_ROUTE}`;
export const GET_CAMPAIGN_BY_ID_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}`;
export const CREATE_CAMPAIGN_ROUTE = `${CAMPAIGN_ROUTE}`;
export const UPDATE_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}`;
export const DELETE_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}`;
export const CANCEL_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}/cancel`;
export const GET_CAMPAIGNS_BY_CATEGORY_ROUTE = `${CAMPAIGN_ROUTE}/category`;
export const GET_ACTIVE_CATEGORIES_ROUTE = `${CAMPAIGN_ROUTE}/categories/active`;
export const GET_PENDING_CAMPAIGNS_ROUTE = `${CAMPAIGN_ROUTE}/pending`;
export const APPROVE_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}/approve`;
export const REJECT_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}/reject`;

export const KYC_ROUTE = `${USER_ROUTE}/kyc`;
export const GET_PENDING_KYC_ROUTE = `${KYC_ROUTE}/pending`;
export const GET_KYC_DETAILS_ROUTE = (userId: string) => `${KYC_ROUTE}/${userId}/details`;
export const APPROVE_KYC_ROUTE = (userId: string) => `${KYC_ROUTE}/${userId}/approve`;
export const REJECT_KYC_ROUTE = (userId: string) => `${KYC_ROUTE}/${userId}/reject`;
export const SUBMIT_KYC_ROUTE = `${KYC_ROUTE}/submit`;
export const GET_KYC_STATUS_ROUTE = `${KYC_ROUTE}/status`;

export const DONATION_ROUTE = "api/donations";
export const GET_DONATIONS_BY_CAMPAIGN_ROUTE = (campaignId: string) => `${DONATION_ROUTE}/${campaignId}/donations`;
export const INIT_SEPAY_PAYMENT_ROUTE = (campaignId: string) => `${DONATION_ROUTE}/${campaignId}/sepay/init`;
export const SEPAY_CALLBACK_ROUTE = `${DONATION_ROUTE}/sepay/callback`;
export const SEPAY_SUCCESS_ROUTE = `${DONATION_ROUTE}/sepay/success`;
export const SEPAY_ERROR_ROUTE = `${DONATION_ROUTE}/sepay/error`;
export const SEPAY_CANCEL_ROUTE = `${DONATION_ROUTE}/sepay/cancel`;