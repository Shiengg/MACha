import apiClient from '@/lib/api-client';
import { USER_ROUTE } from '@/constants/api';

export interface User {
  _id: string;
  username: string;
  email: string;
  fullname?: string;
  avatar?: string;
  role: string;
  kyc_status: string;
  createdAt: string;
  followers_count?: number;
  following_count?: number;
}

export interface GetUsersResponse {
  users: User[];
  total?: number;
}

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await apiClient.get(USER_ROUTE, { withCredentials: true });
    return response.data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const getUserById = async (userId: string): Promise<User> => {
  try {
    const response = await apiClient.get(`${USER_ROUTE}/${userId}`, { withCredentials: true });
    return response.data.user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

export const searchUsers = async (query: string): Promise<User[]> => {
  try {
    const response = await apiClient.get(`${USER_ROUTE}/search`, {
      params: { query },
      withCredentials: true,
    });
    return response.data.results || [];
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

