import apiClient from "@/lib/api-client";
import {
  SEND_MESSAGE_ROUTE,
  GET_MESSAGES_ROUTE,
} from "@/constants/api";

export interface Message {
  _id: string;
  conversationId: string;
  senderId:
    | string
    | {
        _id: string;
        username?: string;
        avatar?: string;
        fullname?: string;
      };
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageRequest {
  content: string;
  type: 'text' | 'image' | 'file';
}

export interface SendMessageResponse {
  message: Message;
}

export interface GetMessagesResponse {
  success: boolean;
  messages: Message[];
}

export const sendMessage = async (
  conversationId: string,
  data: SendMessageRequest
): Promise<Message> => {
  try {
    const response = await apiClient.post<SendMessageResponse>(
      SEND_MESSAGE_ROUTE(conversationId),
      data
    );
    return response.data.message;
  } catch (error: any) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const getMessages = async (
  conversationId: string,
  page: number = 0,
  limit: number = 20
): Promise<Message[]> => {
  try {
    const response = await apiClient.get<GetMessagesResponse>(
      GET_MESSAGES_ROUTE(conversationId),
      {
        params: { page, limit },
      }
    );
    return response.data.messages;
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

