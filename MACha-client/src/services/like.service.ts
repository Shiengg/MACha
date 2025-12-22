import apiClient from "@/lib/api-client";
import {
  LIKE_POST_ROUTE,
  UNLIKE_POST_ROUTE,
  GET_POST_LIKES_ROUTE,
} from "@/constants/api";

export interface LikeUser {
  _id: string;
  username: string;
  avatar?: string;
}

export interface GetPostLikesResponse {
  totalLikes: number;
  users: LikeUser[];
}

export interface LikeResponse {
  message: string;
}

export const likePost = async (postId: string): Promise<LikeResponse> => {
  try {
    const response = await apiClient.post(LIKE_POST_ROUTE(postId));
    return response.data;
  } catch (error) {
    console.error(`Error liking post ${postId}:`, error);
    throw error;
  }
};

export const unlikePost = async (postId: string): Promise<LikeResponse> => {
  try {
    const response = await apiClient.post(UNLIKE_POST_ROUTE(postId));
    return response.data;
  } catch (error) {
    console.error(`Error unliking post ${postId}:`, error);
    throw error;
  }
};

export const getPostLikes = async (
  postId: string
): Promise<GetPostLikesResponse> => {
  try {
    const response = await apiClient.get(GET_POST_LIKES_ROUTE(postId));
    return response.data;
  } catch (error) {
    console.error(`Error fetching likes for post ${postId}:`, error);
    throw error;
  }
};

