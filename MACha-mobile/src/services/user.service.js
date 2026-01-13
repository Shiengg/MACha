import apiClient from './apiClient';
import { SEARCH_USERS_ROUTE } from '../constants/api';

export const userService = {
  /**
   * Search users by username or fullname
   * @param {string} query - Search keyword
   * @param {number} limit - Maximum number of results (default: 50)
   * @returns {Promise<{query: string, count: number, users: Array}>}
   */
  async searchUsers(query, limit = 50) {
    try {
      const response = await apiClient.get(SEARCH_USERS_ROUTE, {
        params: { q: query, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  },
};

