import apiClient from "@/lib/api-client";
import {
  CREATE_CONVERSATION_PRIVATE_ROUTE,
  GET_CONVERSATIONS_ROUTE,
} from "@/constants/api";

export interface Conversation {
  _id: string;
  members: Array<{
    _id: string;
    username: string;
    avatar?: string;
    email: string;
  }>;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  updatedAt: string;
  createdAt: string;
}

export interface CreateConversationResponse {
  success: boolean;
  conversation: Conversation;
}

export interface GetConversationsResponse {
  success: boolean;
  conversations: Conversation[];
}

export const createConversationPrivate = async (
  userId2: string
): Promise<Conversation> => {
  try {
    const response = await apiClient.post<CreateConversationResponse>(
      CREATE_CONVERSATION_PRIVATE_ROUTE(userId2)
    );
    return response.data.conversation;
  } catch (error: any) {
    console.error("Error creating conversation:", error);
    throw error;
  }
};

export const getConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await apiClient.get<GetConversationsResponse>(
      GET_CONVERSATIONS_ROUTE
    );
    return response.data.conversations;
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    throw error;
  }
};

