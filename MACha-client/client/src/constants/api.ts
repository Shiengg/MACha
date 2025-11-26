export const AUTH_ROUTE = "api/auth";
export const LOGIN_ROUTE = `${AUTH_ROUTE}/login`;
export const SIGNUP_ROUTE = `${AUTH_ROUTE}/signup`;
export const GET_CURRENT_USER_ROUTE = `${AUTH_ROUTE}/me`;
export const LOGOUT_ROUTE = `${AUTH_ROUTE}/logout`;

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