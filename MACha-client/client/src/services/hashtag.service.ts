import apiClient from "@/lib/api-client";
import {
  GET_TRENDING_HASHTAGS_ROUTE,
  GET_ALL_HASHTAGS_ROUTE,
} from "@/constants/api";

export interface Hashtag {
  _id: string;
  name: string;
  count?: number;
  created_at?: string;
}

export interface GetTrendingHashtagsParams {
  limit?: number;
}


export const getTrendingHashtags = async (
  params?: GetTrendingHashtagsParams
): Promise<Hashtag[]> => {
  try {
    const response = await apiClient.get(GET_TRENDING_HASHTAGS_ROUTE, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching trending hashtags:", error);
    throw error;
  }
};

export const getAllHashtags = async (): Promise<Hashtag[]> => {
  try {
    const response = await apiClient.get(GET_ALL_HASHTAGS_ROUTE);
    return response.data;
  } catch (error) {
    console.error("Error fetching all hashtags:", error);
    throw error;
  }
};

