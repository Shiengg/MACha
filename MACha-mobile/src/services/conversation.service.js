import apiClient from './apiClient';
import {
  CREATE_CONVERSATION_PRIVATE_ROUTE,
  GET_CONVERSATIONS_ROUTE,
} from '../constants/api';

export const conversationService = {
  async createConversationPrivate(userId2) {
    try {
      const response = await apiClient.post(CREATE_CONVERSATION_PRIVATE_ROUTE(userId2));
      return response.data.conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  async getConversations() {
    try {
      const response = await apiClient.get(GET_CONVERSATIONS_ROUTE);
      return response.data.conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },
};

