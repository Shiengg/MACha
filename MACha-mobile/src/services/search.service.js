import apiClient from './apiClient';
import {
  SAVE_SEARCH_HISTORY_ROUTE,
  GET_SEARCH_HISTORY_ROUTE,
  GET_ALL_SEARCH_HISTORY_ROUTE,
  DELETE_SEARCH_HISTORY_ROUTE,
  DELETE_ALL_SEARCH_HISTORY_ROUTE,
} from '../constants/api';

export const searchService = {
  async saveSearchHistory(query) {
    try {
      await apiClient.post(SAVE_SEARCH_HISTORY_ROUTE, { query });
    } catch (error) {
      console.error('Error saving search history:', error);
      throw error;
    }
  },

  async getSearchHistory() {
    try {
      const response = await apiClient.get(GET_SEARCH_HISTORY_ROUTE);
      // Web returns { history: [...] }
      return response.data?.history || [];
    } catch (error) {
      console.error('Error fetching search history:', error);
      throw error;
    }
  },

  async getAllSearchHistory() {
    try {
      const response = await apiClient.get(GET_ALL_SEARCH_HISTORY_ROUTE);
      return response.data?.history || [];
    } catch (error) {
      console.error('Error fetching all search history:', error);
      throw error;
    }
  },

  async deleteSearchHistory(historyIds) {
    try {
      await apiClient.delete(DELETE_SEARCH_HISTORY_ROUTE, {
        data: { historyIds },
      });
    } catch (error) {
      console.error('Error deleting search history:', error);
      throw error;
    }
  },

  async deleteAllSearchHistory() {
    try {
      await apiClient.delete(DELETE_ALL_SEARCH_HISTORY_ROUTE);
    } catch (error) {
      console.error('Error deleting all search history:', error);
      throw error;
    }
  },
};


