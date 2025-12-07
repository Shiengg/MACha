import { DELETE_NOTIFICATION_ROUTE, GET_NOTIFICATIONS_ROUTE, MARK_ALL_AS_READ_ROUTE, MARK_AS_READ_ROUTE } from "@/constants/api";
import apiClient from "@/lib/api-client";

export interface Notification {
  _id: string;
  type: string;
  message: string;
  sender: {
    _id: string;
    username: string;
    avatar?: string;
  };
  post?: {
    _id: string;
    content_text: string;
  };
  campaign?: {
    _id: string;
    title: string;
  };
  is_read: boolean;
  createdAt: string;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
}

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await apiClient.get<GetNotificationsResponse>(GET_NOTIFICATIONS_ROUTE);
    return response.data.notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  try {
    await apiClient.patch(MARK_AS_READ_ROUTE(notificationId));
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllAsRead = async (): Promise<void> => {
  try {
    await apiClient.patch(MARK_ALL_AS_READ_ROUTE);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await apiClient.delete(DELETE_NOTIFICATION_ROUTE(notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

