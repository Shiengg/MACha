import apiClient from './apiClient';
import {
  SEND_MESSAGE_ROUTE,
  GET_MESSAGES_ROUTE,
} from '../constants/api';

export const messageService = {
  async sendMessage(conversationId, data) {
    try {
      const response = await apiClient.post(SEND_MESSAGE_ROUTE(conversationId), data);
      return response.data.message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  async getMessages(conversationId, page = 0, limit = 50) {
    try {
      const response = await apiClient.get(GET_MESSAGES_ROUTE(conversationId), {
        params: { page, limit },
      });
      return response.data.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  },
};

