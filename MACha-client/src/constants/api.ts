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

export const POST_ROUTE = "api/posts";
export const GET_POSTS_ROUTE = `${POST_ROUTE}`;
export const GET_POST_BY_ID_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const CREATE_POST_ROUTE = `${POST_ROUTE}`;
export const UPDATE_POST_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const DELETE_POST_ROUTE = (id: string) => `${POST_ROUTE}/${id}`;
export const SEARCH_POSTS_BY_HASHTAG_ROUTE = `${POST_ROUTE}/search`;
export const SEARCH_POSTS_BY_TITLE_ROUTE = `${POST_ROUTE}/search/title`;
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
export const FOLLOW_USER_ROUTE = (userId: string) => `${USER_ROUTE}/${userId}/follow`;
export const UNFOLLOW_USER_ROUTE = (userId: string) => `${USER_ROUTE}/${userId}/unfollow`;
export const GET_PUBLIC_ADMINS_ROUTE = `${USER_ROUTE}/public/admins`;
export const SEARCH_USERS_ROUTE = `${USER_ROUTE}/search`;

export const CAMPAIGN_ROUTE = "api/campaigns";
export const GET_ALL_CAMPAIGNS_ROUTE = `${CAMPAIGN_ROUTE}`;
export const GET_CAMPAIGNS_FOR_MAP_ROUTE = `${CAMPAIGN_ROUTE}/map`;
export const GET_CAMPAIGN_MAP_STATISTICS_ROUTE = `${CAMPAIGN_ROUTE}/map/statistics`;
export const GET_CAMPAIGN_BY_ID_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}`;
export const CREATE_CAMPAIGN_ROUTE = `${CAMPAIGN_ROUTE}`;
export const UPDATE_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}`;
export const DELETE_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}`;
export const CANCEL_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}/cancel`;
export const GET_CAMPAIGNS_BY_CREATOR_ROUTE = `${CAMPAIGN_ROUTE}/creator`;
export const GET_CAMPAIGNS_BY_CREATOR_PAGINATED_ROUTE = `${CAMPAIGN_ROUTE}/creator/paginated`;
export const GET_CAMPAIGNS_BY_CATEGORY_ROUTE = `${CAMPAIGN_ROUTE}/category`;
export const SEARCH_CAMPAIGNS_BY_HASHTAG_ROUTE = `${CAMPAIGN_ROUTE}/search/hashtag`;
export const SEARCH_CAMPAIGNS_BY_TITLE_ROUTE = `${CAMPAIGN_ROUTE}/search/title`;
export const GET_ACTIVE_CATEGORIES_ROUTE = `${CAMPAIGN_ROUTE}/categories/active`;
export const GET_PENDING_CAMPAIGNS_ROUTE = `${CAMPAIGN_ROUTE}/pending`;
export const APPROVE_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}/approve`;
export const REJECT_CAMPAIGN_ROUTE = (id: string) => `${CAMPAIGN_ROUTE}/${id}/reject`;
export const CREATE_CAMPAIGN_UPDATE_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/updates`;
export const GET_CAMPAIGN_UPDATES_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/updates`;
export const DELETE_CAMPAIGN_UPDATE_ROUTE = (updateId: string) => `${CAMPAIGN_ROUTE}/updates/${updateId}`;
export const CREATE_CAMPAIGN_UPDATE_REQUEST_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/update-request`;
export const GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/update-requests`;

export const KYC_ROUTE = "api/kyc";
export const GET_PENDING_KYC_ROUTE = `${KYC_ROUTE}/pending`;
export const GET_KYC_DETAILS_ROUTE = (userId: string) => `${KYC_ROUTE}/${userId}/details`;
export const APPROVE_KYC_ROUTE = (userId: string) => `${KYC_ROUTE}/${userId}/approve`;
export const REJECT_KYC_ROUTE = (userId: string) => `${KYC_ROUTE}/${userId}/reject`;
export const SUBMIT_KYC_ROUTE = `${KYC_ROUTE}/submit`;
export const SUBMIT_KYC_VNPT_ROUTE = `${KYC_ROUTE}/submit-vnpt`;
export const GET_KYC_STATUS_ROUTE = `${KYC_ROUTE}/status`;
export const GET_KYC_HISTORY_ROUTE = `${KYC_ROUTE}/history`;
export const GET_KYC_HISTORY_BY_USER_ROUTE = (userId: string) => `${KYC_ROUTE}/history/${userId}`;
export const VNPT_VERIFY_QUALITY_ROUTE = `${KYC_ROUTE}/vnpt/verify-quality`;
export const VNPT_OCR_ROUTE = `${KYC_ROUTE}/vnpt/ocr`;
export const VNPT_COMPARE_FACES_ROUTE = `${KYC_ROUTE}/vnpt/compare-faces`;
export const SUBMIT_ORGANIZATION_KYC_ROUTE = `${KYC_ROUTE}/organization/submit`;
export const GET_ORGANIZATION_KYC_STATUS_ROUTE = `${KYC_ROUTE}/organization/status`;

export const DONATION_ROUTE = "api/donations";
export const GET_DONATIONS_BY_CAMPAIGN_ROUTE = (campaignId: string) => `${DONATION_ROUTE}/${campaignId}/donations`;
export const INIT_SEPAY_PAYMENT_ROUTE = (campaignId: string) => `${DONATION_ROUTE}/${campaignId}/sepay/init`;
export const SEPAY_CALLBACK_ROUTE = `${DONATION_ROUTE}/sepay/callback`;
export const SEPAY_SUCCESS_ROUTE = `${DONATION_ROUTE}/sepay/success`;
export const SEPAY_ERROR_ROUTE = `${DONATION_ROUTE}/sepay/error`;
export const SEPAY_CANCEL_ROUTE = `${DONATION_ROUTE}/sepay/cancel`;
export const CREATE_DONATION_ROUTE = (campaignId: string) => `${DONATION_ROUTE}/${campaignId}/donate`;

export const CAMPAIGN_COMPANION_ROUTE = "api";
export const JOIN_CAMPAIGN_COMPANION_ROUTE = (campaignId: string) => `${CAMPAIGN_COMPANION_ROUTE}/campaigns/${campaignId}/companion/join`;
export const LEAVE_CAMPAIGN_COMPANION_ROUTE = (campaignId: string) => `${CAMPAIGN_COMPANION_ROUTE}/campaigns/${campaignId}/companion/leave`;
export const GET_CAMPAIGN_COMPANIONS_ROUTE = (campaignId: string) => `${CAMPAIGN_COMPANION_ROUTE}/campaigns/${campaignId}/companions`;
export const GET_USER_COMPANION_CAMPAIGNS_ROUTE = (userId: string) => `${CAMPAIGN_COMPANION_ROUTE}/users/${userId}/companion-campaigns`;

export const CONVERSATION_ROUTE = "api/conversations";
export const CREATE_CONVERSATION_PRIVATE_ROUTE = (userId2: string) => `${CONVERSATION_ROUTE}/private/${userId2}`;
export const GET_CONVERSATIONS_ROUTE = `${CONVERSATION_ROUTE}`;

export const MESSAGE_ROUTE = "api/messages";
export const SEND_MESSAGE_ROUTE = (conversationId: string) => `${MESSAGE_ROUTE}/${conversationId}`;
export const GET_MESSAGES_ROUTE = (conversationId: string) => `${MESSAGE_ROUTE}/${conversationId}`;

export const ESCROW_ROUTE = "api/escrow";
export const CREATE_WITHDRAWAL_REQUEST_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/withdrawal-requests`;
export const GET_WITHDRAWAL_REQUESTS_BY_CAMPAIGN_ROUTE = (campaignId: string) => `${CAMPAIGN_ROUTE}/${campaignId}/withdrawal-requests`;
export const GET_WITHDRAWAL_REQUEST_BY_ID_ROUTE = (escrowId: string) => `${ESCROW_ROUTE}/${escrowId}`;
export const SUBMIT_VOTE_ROUTE = (escrowId: string) => `${ESCROW_ROUTE}/${escrowId}/vote`;
export const GET_VOTES_BY_ESCROW_ROUTE = (escrowId: string) => `${ESCROW_ROUTE}/${escrowId}/votes`;

export const ADMIN_ESCROW_ROUTE = "api/admin";
export const ADMIN_GET_WITHDRAWAL_REQUESTS_ROUTE = `${ADMIN_ESCROW_ROUTE}/withdrawal-requests`;
export const ADMIN_APPROVE_WITHDRAWAL_REQUEST_ROUTE = (escrowId: string) => `${ADMIN_ESCROW_ROUTE}/withdrawal-requests/${escrowId}/approve`;
export const ADMIN_REJECT_WITHDRAWAL_REQUEST_ROUTE = (escrowId: string) => `${ADMIN_ESCROW_ROUTE}/withdrawal-requests/${escrowId}/reject`;
export const ADMIN_EXTEND_VOTING_PERIOD_ROUTE = (escrowId: string) => `${ADMIN_ESCROW_ROUTE}/withdrawal-requests/${escrowId}/extend-vote`;
export const ADMIN_CANCEL_CAMPAIGN_BY_REJECTION_ROUTE = (escrowId: string) => `${ADMIN_ESCROW_ROUTE}/withdrawal-requests/${escrowId}/cancel-campaign`;

export const REPORT_ROUTE = "api/reports";
export const CREATE_REPORT_ROUTE = `${REPORT_ROUTE}`;
export const GET_REPORTS_ROUTE = `${REPORT_ROUTE}`;
export const GET_GROUPED_REPORTS_ROUTE = `${REPORT_ROUTE}/grouped`;
export const GET_REPORT_BY_ID_ROUTE = (id: string) => `${REPORT_ROUTE}/${id}`;
export const UPDATE_REPORT_STATUS_ROUTE = (id: string) => `${REPORT_ROUTE}/${id}/status`;
export const GET_REPORTS_BY_ITEM_ROUTE = (reportedType: string, reportedId: string) => `${REPORT_ROUTE}/item/${reportedType}/${reportedId}`;
export const BATCH_UPDATE_REPORTS_BY_ITEM_ROUTE = (reportedType: string, reportedId: string) => `${REPORT_ROUTE}/item/${reportedType}/${reportedId}/batch`;
export const GET_ADMIN_REPORTS_ROUTE = `${REPORT_ROUTE}/admins`;
export const GET_REPORTS_BY_ADMIN_ROUTE = (adminId: string) => `${REPORT_ROUTE}/admins/${adminId}`;

export const SEARCH_ROUTE = "api/search";
export const SAVE_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history`;
export const GET_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history`;
export const GET_ALL_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history/all`;
export const DELETE_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history`;
export const DELETE_ALL_SEARCH_HISTORY_ROUTE = `${SEARCH_ROUTE}/history/all`;

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
export const GET_PENDING_EVENTS_ROUTE = `${EVENT_ROUTE}/pending`;
export const APPROVE_EVENT_ROUTE = (id: string) => `${EVENT_ROUTE}/${id}/approve`;
export const REJECT_EVENT_ROUTE = (id: string) => `${EVENT_ROUTE}/${id}/reject`;
export const CREATE_EVENT_RSVP_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp`;
export const GET_EVENT_RSVP_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp`;
export const DELETE_EVENT_RSVP_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp`;
export const GET_EVENT_RSVP_STATS_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp/stats`;
export const GET_EVENT_RSVP_LIST_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/rsvp/list`;
export const CREATE_EVENT_UPDATE_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/updates`;
export const GET_EVENT_UPDATES_ROUTE = (eventId: string) => `${EVENT_ROUTE}/${eventId}/updates`;
export const UPDATE_EVENT_UPDATE_ROUTE = (eventId: string, updateId: string) => `${EVENT_ROUTE}/${eventId}/updates/${updateId}`;
export const DELETE_EVENT_UPDATE_ROUTE = (eventId: string, updateId: string) => `${EVENT_ROUTE}/${eventId}/updates/${updateId}`;

export const OWNER_ROUTE = "api/owner";
export const OWNER_DASHBOARD_ROUTE = `${OWNER_ROUTE}/dashboard`;
export const OWNER_GET_USERS_ROUTE = `${OWNER_ROUTE}/users/for-admin-creation`;
export const OWNER_GET_ADMINS_ROUTE = `${OWNER_ROUTE}/admins`;
export const OWNER_CREATE_ADMIN_ROUTE = `${OWNER_ROUTE}/admins`;
export const OWNER_UPDATE_ADMIN_ROUTE = (adminId: string) => `${OWNER_ROUTE}/admins/${adminId}`;
export const OWNER_DELETE_ADMIN_ROUTE = (adminId: string) => `${OWNER_ROUTE}/admins/${adminId}`;
export const OWNER_BAN_ADMIN_ROUTE = (adminId: string) => `${OWNER_ROUTE}/admins/${adminId}/ban`;
export const OWNER_UNBAN_ADMIN_ROUTE = (adminId: string) => `${OWNER_ROUTE}/admins/${adminId}/unban`;
export const OWNER_FINANCIAL_OVERVIEW_ROUTE = `${OWNER_ROUTE}/financial-overview`;
export const OWNER_CAMPAIGN_FINANCIALS_ROUTE = `${OWNER_ROUTE}/financial/campaigns`;
export const OWNER_ADMIN_ACTIVITIES_ROUTE = `${OWNER_ROUTE}/admin-activities`;
export const OWNER_APPROVAL_HISTORY_ROUTE = `${OWNER_ROUTE}/approval-history`;
export const OWNER_GET_ALL_USERS_ROUTE = `${OWNER_ROUTE}/users`;
export const OWNER_BAN_USER_ROUTE = (userId: string) => `${OWNER_ROUTE}/users/${userId}/ban`;
export const OWNER_UNBAN_USER_ROUTE = (userId: string) => `${OWNER_ROUTE}/users/${userId}/unban`;
export const OWNER_RESET_USER_KYC_ROUTE = (userId: string) => `${OWNER_ROUTE}/users/${userId}/reset-kyc`;
export const OWNER_GET_USER_HISTORY_ROUTE = (userId: string) => `${OWNER_ROUTE}/users/${userId}/history`;
export const OWNER_GET_WITHDRAWAL_REQUESTS_ROUTE = `${OWNER_ROUTE}/withdrawal-requests`;
export const OWNER_INIT_SEPAY_WITHDRAWAL_ROUTE = (escrowId: string) => `${OWNER_ROUTE}/escrow/${escrowId}/sepay/init`;
export const OWNER_GET_REFUNDS_ROUTE = `${OWNER_ROUTE}/refunds`;
export const OWNER_INIT_SEPAY_REFUND_ROUTE = (refundId: string) => `${OWNER_ROUTE}/refund/${refundId}/sepay/init`;

export const RECOVERY_ROUTE = "api/recovery";
export const GET_RECOVERY_CASES_BY_CREATOR_ROUTE = `${RECOVERY_ROUTE}/creator`;
export const GET_RECOVERY_CASE_BY_ID_ROUTE = (recoveryCaseId: string) => `${RECOVERY_ROUTE}/${recoveryCaseId}`;
export const INIT_SEPAY_RECOVERY_PAYMENT_ROUTE = (recoveryCaseId: string) => `${RECOVERY_ROUTE}/${recoveryCaseId}/sepay/init`;

export const RECOMMENDATION_ROUTE = "api/recommendations";
export const GET_RECOMMENDED_CAMPAIGNS_ROUTE = `${RECOMMENDATION_ROUTE}`;
export const GET_ANONYMOUS_RECOMMENDATIONS_ROUTE = `${RECOMMENDATION_ROUTE}/anonymous`;

export const ADMIN_ROUTE = "api/admin";
export const ADMIN_DASHBOARD_ROUTE = `${ADMIN_ROUTE}/dashboard`;
export const ADMIN_GET_CAMPAIGN_UPDATE_REQUESTS_ROUTE = `${ADMIN_ROUTE}/campaign-update-requests`;
export const ADMIN_GET_CAMPAIGN_UPDATE_REQUEST_BY_ID_ROUTE = (requestId: string) => `${ADMIN_ROUTE}/campaign-update-requests/${requestId}`;
export const ADMIN_APPROVE_CAMPAIGN_UPDATE_REQUEST_ROUTE = (requestId: string) => `${ADMIN_ROUTE}/campaign-update-requests/${requestId}/approve`;
export const ADMIN_REJECT_CAMPAIGN_UPDATE_REQUEST_ROUTE = (requestId: string) => `${ADMIN_ROUTE}/campaign-update-requests/${requestId}/reject`;