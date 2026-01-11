export const AUTH_ROUTE = "api/auth";
export const LOGIN_ROUTE = `${AUTH_ROUTE}/login`;
export const SIGNUP_ROUTE = `${AUTH_ROUTE}/signup`;
export const VERIFY_SIGNUP_OTP_ROUTE = `${AUTH_ROUTE}/verify-user-account`;
export const GET_CURRENT_USER_ROUTE = `${AUTH_ROUTE}/me`;
export const LOGOUT_ROUTE = `${AUTH_ROUTE}/logout`;
export const UPDATE_USER_ROUTE = (userId: string) => `${AUTH_ROUTE}/${userId}`;
export const COMPLETE_ONBOARDING_ROUTE = (userId: string) => `${AUTH_ROUTE}/${userId}/onboarding`;
export const SEND_OTP_ROUTE = `${AUTH_ROUTE}/otp`;
export const VERIFY_OTP_ROUTE = `${AUTH_ROUTE}/verify-otp`;
export const CHANGE_PASSWORD_ROUTE = `${AUTH_ROUTE}/change-password`;
export const FORGOT_PASSWORD_ROUTE = `${AUTH_ROUTE}/forgot-password`;

