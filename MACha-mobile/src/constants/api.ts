export const AUTH_ROUTE = "api/auth";
export const LOGIN_ROUTE = `${AUTH_ROUTE}/login`;
export const SIGNUP_ROUTE = `${AUTH_ROUTE}/signup`;
export const SIGNUP_ORGANIZATION_ROUTE = `${AUTH_ROUTE}/signup/organization`;
export const VERIFY_SIGNUP_OTP_ROUTE = `${AUTH_ROUTE}/verify-user-account`;
export const GET_CURRENT_USER_ROUTE = `${AUTH_ROUTE}/me`;
export const LOGOUT_ROUTE = `${AUTH_ROUTE}/logout`;
export const UPDATE_USER_ROUTE = (userId: string) => `${AUTH_ROUTE}/${userId}`;
export const COMPLETE_ONBOARDING_ROUTE = (userId: string) => `${AUTH_ROUTE}/${userId}/onboarding`;
export const SEND_OTP_ROUTE = `${AUTH_ROUTE}/otp`;
export const VERIFY_OTP_ROUTE = `${AUTH_ROUTE}/verify-otp`;
export const CHANGE_PASSWORD_ROUTE = `${AUTH_ROUTE}/change-password`;
export const FORGOT_PASSWORD_ROUTE = `${AUTH_ROUTE}/forgot-password`;

export const CAMPAIGN_ROUTE = "api/campaigns";
export const GET_ALL_CAMPAIGNS_ROUTE = `${CAMPAIGN_ROUTE}`;
export const GET_CAMPAIGNS_FOR_MAP_ROUTE = `${CAMPAIGN_ROUTE}/map`;
export const GET_CAMPAIGN_MAP_STATISTICS_ROUTE = `${CAMPAIGN_ROUTE}/map/statistics`;
export const GET_CAMPAIGN_BY_ID_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}`;
export const CREATE_CAMPAIGN_ROUTE = `${CAMPAIGN_ROUTE}`;
export const GET_CAMPAIGNS_BY_CATEGORY_ROUTE = `${CAMPAIGN_ROUTE}/category`;
export const GET_ACTIVE_CATEGORIES_ROUTE = `${CAMPAIGN_ROUTE}/categories/active`;
export const CREATE_CAMPAIGN_UPDATE_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/updates`;
export const GET_CAMPAIGN_UPDATES_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/updates`;
export const DELETE_CAMPAIGN_UPDATE_ROUTE = (updateId: string) => `${CAMPAIGN_ROUTE}/updates/${updateId}`;
export const CREATE_CAMPAIGN_UPDATE_REQUEST_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/update-request`;
export const GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/update-requests`;

export const DONATION_ROUTE = "api/donations";
export const GET_DONATIONS_BY_CAMPAIGN_ROUTE = (campaignId: string) => `${DONATION_ROUTE}/${campaignId}/donations`;
export const INIT_SEPAY_PAYMENT_ROUTE = (campaignId: string) => `${DONATION_ROUTE}/${campaignId}/sepay/init`;
export const UPLOAD_DONATION_PROOF_ROUTE = (donationId: string) => `${DONATION_ROUTE}/${donationId}/proof`;

export const CAMPAIGN_COMPANION_ROUTE = "api";
export const JOIN_CAMPAIGN_COMPANION_ROUTE = (campaignId: string) => `${CAMPAIGN_COMPANION_ROUTE}/campaigns/${campaignId}/companion/join`;
export const LEAVE_CAMPAIGN_COMPANION_ROUTE = (campaignId: string) => `${CAMPAIGN_COMPANION_ROUTE}/campaigns/${campaignId}/companion/leave`;
export const GET_CAMPAIGN_COMPANIONS_ROUTE = (campaignId: string) => `${CAMPAIGN_COMPANION_ROUTE}/campaigns/${campaignId}/companions`;
export const GET_USER_COMPANION_CAMPAIGNS_ROUTE = (userId: string) => `${CAMPAIGN_COMPANION_ROUTE}/users/${userId}/companion-campaigns`;

export const USER_ROUTE = "api/users";
export const SEARCH_USERS_ROUTE = `${USER_ROUTE}/search`;

export const ESCROW_ROUTE = "api/escrow";
export const CREATE_WITHDRAWAL_REQUEST_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/withdrawal-requests`;
export const GET_WITHDRAWAL_REQUESTS_BY_CAMPAIGN_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/withdrawal-requests`;
export const GET_WITHDRAWAL_REQUEST_BY_ID_ROUTE = (escrowId: string) => `${ESCROW_ROUTE}/${escrowId}`;
export const SUBMIT_VOTE_ROUTE = (escrowId: string) => `${ESCROW_ROUTE}/${escrowId}/vote`;
export const GET_VOTES_BY_ESCROW_ROUTE = (escrowId: string) => `${ESCROW_ROUTE}/${escrowId}/votes`;

export const EVENT_ROUTE = "api/events";
export const GET_ALL_EVENTS_ROUTE = `${EVENT_ROUTE}`;
export const GET_EVENT_BY_ID_ROUTE = (id: string) => `${EVENT_ROUTE}/${id}`;
export const CREATE_EVENT_ROUTE = `${EVENT_ROUTE}`;
export const UPDATE_EVENT_ROUTE = (id: string) => `${EVENT_ROUTE}/${id}`;
export const DELETE_EVENT_ROUTE = (id: string) => `${EVENT_ROUTE}/${id}`;
export const CANCEL_EVENT_ROUTE = (id: string) => `${EVENT_ROUTE}/${id}/cancel`;
export const GET_EVENTS_BY_CATEGORY_ROUTE = `${EVENT_ROUTE}/category`;
export const GET_UPCOMING_EVENTS_ROUTE = `${EVENT_ROUTE}/upcoming`;
export const GET_PAST_EVENTS_ROUTE = `${EVENT_ROUTE}/past`;
export const GET_EVENTS_FOR_MAP_ROUTE = `${EVENT_ROUTE}/map`;
export const SEARCH_EVENTS_ROUTE = `${EVENT_ROUTE}/search`;
export const GET_EVENTS_BY_CREATOR_ROUTE = `${EVENT_ROUTE}/creator`;
export const GET_MY_EVENTS_ROUTE = `${EVENT_ROUTE}/my-events`;
export const GET_MY_RSVPS_ROUTE = `${EVENT_ROUTE}/my-rsvps`;
export const GET_UPCOMING_RSVPS_ROUTE = `${EVENT_ROUTE}/upcoming-rsvps`;
export const CREATE_EVENT_RSVP_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp`;
export const GET_EVENT_RSVP_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp`;
export const DELETE_EVENT_RSVP_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp`;
export const GET_EVENT_RSVP_STATS_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp/stats`;
export const GET_EVENT_RSVP_LIST_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp/list`;
export const CREATE_EVENT_UPDATE_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/updates`;
export const GET_EVENT_UPDATES_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/updates`;
export const UPDATE_EVENT_UPDATE_ROUTE = (eventId: string, updateId: string) => `${EVENT_ROUTE}/${eventId}/updates/${updateId}`;
export const DELETE_EVENT_UPDATE_ROUTE = (eventId: string, updateId: string) => `${EVENT_ROUTE}/${eventId}/updates/${updateId}`;

export const KYC_ROUTE = "api/kyc";
export const GET_KYC_STATUS_ROUTE = `${KYC_ROUTE}/status`;
export const SUBMIT_KYC_VNPT_ROUTE = `${KYC_ROUTE}/submit-vnpt`;
export const VNPT_VERIFY_QUALITY_ROUTE = `${KYC_ROUTE}/vnpt/verify-quality`;
export const VNPT_OCR_ROUTE = `${KYC_ROUTE}/vnpt/ocr`;
export const VNPT_COMPARE_FACES_ROUTE = `${KYC_ROUTE}/vnpt/compare-faces`;
export const SUBMIT_ORGANIZATION_KYC_ROUTE = `${KYC_ROUTE}/organization/submit`;
export const GET_ORGANIZATION_KYC_STATUS_ROUTE = `${KYC_ROUTE}/organization/status`;

export const REPORT_ROUTE = "api/reports";
export const CREATE_REPORT_ROUTE = `${REPORT_ROUTE}`;
export const GET_REPORTS_ROUTE = `${REPORT_ROUTE}`;
export const GET_REPORTS_BY_ITEM_ROUTE = (reportedType: string, reportedId: string) => `${REPORT_ROUTE}/item/${reportedType}/${reportedId}`;

export const POST_ROUTE = "api/posts";
export const GET_POSTS_ROUTE = `${POST_ROUTE}`;
export const GET_POST_BY_ID_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const CREATE_POST_ROUTE = `${POST_ROUTE}`;
export const UPDATE_POST_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const DELETE_POST_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const LIKE_POST_ROUTE = (postId: string) => `api/likes/${postId}/like`;
export const UNLIKE_POST_ROUTE = (postId: string) => `api/likes/${postId}/unlike`;

// Comment routes
export const COMMENT_ROUTE = "api/comments";
export const ADD_COMMENT_ROUTE = (postId: string) => `${COMMENT_ROUTE}/${postId}/comments`;
export const GET_COMMENTS_ROUTE = (postId: string) => `${COMMENT_ROUTE}/${postId}/comments`;
export const DELETE_COMMENT_ROUTE = (commentId: string) => `${COMMENT_ROUTE}/comments/${commentId}`;

// Post search routes
export const SEARCH_POSTS_BY_HASHTAG_ROUTE = `${POST_ROUTE}/search`;
export const SEARCH_POSTS_BY_TITLE_ROUTE = `${POST_ROUTE}/search/title`;
export const GET_POSTS_BY_HASHTAG_ROUTE = (name: string) => `${POST_ROUTE}/hashtag/${name}`;

export const RECOMMENDATION_ROUTE = "api/recommendations";
export const GET_RECOMMENDED_CAMPAIGNS_ROUTE = `${RECOMMENDATION_ROUTE}`;
export const GET_ANONYMOUS_RECOMMENDATIONS_ROUTE = `${RECOMMENDATION_ROUTE}/anonymous`;

// Campaign search routes
export const SEARCH_CAMPAIGNS_BY_HASHTAG_ROUTE = `${CAMPAIGN_ROUTE}/search/hashtag`;
export const SEARCH_CAMPAIGNS_BY_TITLE_ROUTE = `${CAMPAIGN_ROUTE}/search/title`;

// Global search + history routes
export const SEARCH_ROUTE = "api/search";
export const SAVE_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history`;
export const GET_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history`;
export const GET_ALL_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history/all`;
export const DELETE_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history`;
export const DELETE_ALL_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history/all`;

// Notification routes
export const NOTIFICATION_ROUTE = "api/notifications";
export const GET_NOTIFICATIONS_ROUTE = `${NOTIFICATION_ROUTE}`;
export const MARK_AS_READ_ROUTE = (notificationId: string) => `${NOTIFICATION_ROUTE}/${notificationId}/read`;
export const MARK_ALL_AS_READ_ROUTE = `${NOTIFICATION_ROUTE}/read-all`;
export const DELETE_NOTIFICATION_ROUTE = (notificationId: string) => `${NOTIFICATION_ROUTE}/${notificationId}`;

// Conversation routes
export const CONVERSATION_ROUTE = "api/conversations";
export const CREATE_CONVERSATION_PRIVATE_ROUTE = (userId2: string) => `${CONVERSATION_ROUTE}/private/${userId2}`;
export const GET_CONVERSATIONS_ROUTE = `${CONVERSATION_ROUTE}`;

// Message routes
export const MESSAGE_ROUTE = "api/messages";
export const SEND_MESSAGE_ROUTE = (conversationId: string) => `${MESSAGE_ROUTE}/${conversationId}`;
export const GET_MESSAGES_ROUTE = (conversationId: string) => `${MESSAGE_ROUTE}/${conversationId}`;

// Recovery routes
export const RECOVERY_ROUTE = "api/recovery";
export const GET_RECOVERY_CASES_BY_CREATOR_ROUTE = `${RECOVERY_ROUTE}/creator`;
export const GET_RECOVERY_CASE_BY_ID_ROUTE = (recoveryCaseId: string) => `${RECOVERY_ROUTE}/${recoveryCaseId}`;
export const INIT_SEPAY_RECOVERY_PAYMENT_ROUTE = (recoveryCaseId: string) => `${RECOVERY_ROUTE}/${recoveryCaseId}/sepay/init`;

