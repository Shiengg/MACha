import apiClient from "@/lib/api-client";
import {
  FOLLOW_USER_ROUTE,
  GET_USER_BY_ID_ROUTE,
  UNFOLLOW_USER_ROUTE,
  GET_PUBLIC_ADMINS_ROUTE,
  SEARCH_USERS_ROUTE,
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
  is_verified?: boolean;
  followers_count?: number;
  following_count?: number;
  followers?: string[]; // Array of user IDs who follow this user
  following?: string[]; // Array of user IDs this user follows
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

export interface PublicAdmin {
  _id: string;
  username: string;
  fullname?: string;
  avatar?: string;
  createdAt: string;
  is_verified?: boolean;
}

export interface GetPublicAdminsResponse {
  admins: PublicAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const getPublicAdmins = async (page = 1, limit = 20): Promise<GetPublicAdminsResponse> => {
  try {
    const response = await apiClient.get<GetPublicAdminsResponse>(GET_PUBLIC_ADMINS_ROUTE, {
      params: { page, limit },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching public admins:", error);
    throw error;
  }
};

export interface SearchUsersResponse {
  query: string;
  count: number;
  users: User[];
}

export const searchUsers = async (query: string, limit: number = 50): Promise<SearchUsersResponse> => {
  try {
    const response = await apiClient.get<SearchUsersResponse>(SEARCH_USERS_ROUTE, {
      params: { q: query, limit },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error searching users:", error);
    throw error;
  }
};

