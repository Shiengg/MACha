import apiClient from "@/lib/api-client";
import { GET_USER_BY_ID_ROUTE } from "@/constants/api";

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
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

