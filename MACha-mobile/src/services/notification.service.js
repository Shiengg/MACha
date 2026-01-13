import apiClient from './apiClient';
import {
  GET_NOTIFICATIONS_ROUTE,
  MARK_AS_READ_ROUTE,
  MARK_ALL_AS_READ_ROUTE,
  DELETE_NOTIFICATION_ROUTE,
} from '../constants/api';

export const notificationService = {
  async getNotifications() {
    try {
      const response = await apiClient.get(GET_NOTIFICATIONS_ROUTE);
      return response.data?.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  async markAsRead(notificationId) {
    try {
      await apiClient.patch(MARK_AS_READ_ROUTE(notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async markAllAsRead() {
    try {
      await apiClient.patch(MARK_ALL_AS_READ_ROUTE);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  async deleteNotification(notificationId) {
    try {
      await apiClient.delete(DELETE_NOTIFICATION_ROUTE(notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },
};

