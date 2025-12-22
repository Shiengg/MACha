import apiClient from "@/lib/api-client";
import {
  FOLLOW_USER_ROUTE,
  GET_USER_BY_ID_ROUTE,
  UNFOLLOW_USER_ROUTE,
} from "@/constants/api";

export interface User {
  _id: string;
  username: string;
  email: string;
  fullname?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  kyc_status?: string;
  followers_count?: number;
  following_count?: number;
  address?: {
    city?: string;
    district?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GetUserResponse {
  user: User;
}

export const getUserById = async (userId: string): Promise<User> => {
  try {
    const response = await apiClient.get(GET_USER_BY_ID_ROUTE(userId));
    return response.data.user;
  } catch (error: any) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const followUser = async (userId: string) => {
  try {
    const response = await apiClient.post(FOLLOW_USER_ROUTE(userId));
    return response.data;
  } catch (error: any) {
    console.error("Error following user:", error);
    throw error;
  }
};

export const unfollowUser = async (userId: string) => {
  try {
    const response = await apiClient.post(UNFOLLOW_USER_ROUTE(userId));
    return response.data;
  } catch (error: any) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
};

