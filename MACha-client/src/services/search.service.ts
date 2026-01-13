import apiClient from "@/lib/api-client";
import {
  SAVE_SEARCH_HISTORY_ROUTE,
  GET_SEARCH_HISTORY_ROUTE,
  GET_ALL_SEARCH_HISTORY_ROUTE,
  DELETE_SEARCH_HISTORY_ROUTE,
  DELETE_ALL_SEARCH_HISTORY_ROUTE,
} from "@/constants/api";

export interface SearchHistoryItem {
  _id: string;
  keyword: string;
  type: "hashtag" | "keyword" | "USER_SEARCH";
  searchedAt: string;
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[];
}

export const saveSearchHistory = async (query: string): Promise<void> => {
  try {
    await apiClient.post(SAVE_SEARCH_HISTORY_ROUTE, { query });
  } catch (error: any) {
    console.error("Error saving search history:", error);
    throw error;
  }
};

export const getSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const response = await apiClient.get<SearchHistoryResponse>(GET_SEARCH_HISTORY_ROUTE);
    return response.data.history;
  } catch (error: any) {
    console.error("Error fetching search history:", error);
    throw error;
  }
};

export const getAllSearchHistory = async (): Promise<SearchHistoryItem[]> => {
  try {
    const response = await apiClient.get<SearchHistoryResponse>(GET_ALL_SEARCH_HISTORY_ROUTE);
    return response.data.history;
  } catch (error: any) {
    console.error("Error fetching all search history:", error);
    throw error;
  }
};

export const deleteSearchHistory = async (historyIds: string[]): Promise<void> => {
  try {
    await apiClient.delete(DELETE_SEARCH_HISTORY_ROUTE, {
      data: { historyIds },
    });
  } catch (error: any) {
    console.error("Error deleting search history:", error);
    throw error;
  }
};

export const deleteAllSearchHistory = async (): Promise<void> => {
  try {
    await apiClient.delete(DELETE_ALL_SEARCH_HISTORY_ROUTE);
  } catch (error: any) {
    console.error("Error deleting all search history:", error);
    throw error;
  }
};

