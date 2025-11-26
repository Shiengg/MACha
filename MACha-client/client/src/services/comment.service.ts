import apiClient from "@/lib/api-client";
import {
  ADD_COMMENT_ROUTE,
  GET_COMMENTS_ROUTE,
  DELETE_COMMENT_ROUTE,
} from "@/constants/api";

export interface CommentUser {
  _id: string;
  username: string;
  avatar?: string;
}

export interface Comment {
  _id: string;
  post: string;
  user: CommentUser;
  content_text: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddCommentData {
  content_text: string;
}

export interface DeleteCommentResponse {
  message: string;
}

export const addComment = async (
  postId: string,
  data: AddCommentData
): Promise<Comment> => {
  try {
    const response = await apiClient.post(ADD_COMMENT_ROUTE(postId), data);
    return response.data;
  } catch (error) {
    console.error(`Error adding comment to post ${postId}:`, error);
    throw error;
  }
};

export const getComments = async (postId: string): Promise<Comment[]> => {
  try {
    const response = await apiClient.get(GET_COMMENTS_ROUTE(postId));
    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error);
    throw error;
  }
};

export const deleteComment = async (
  commentId: string
): Promise<DeleteCommentResponse> => {
  try {
    const response = await apiClient.delete(DELETE_COMMENT_ROUTE(commentId));
    return response.data;
  } catch (error) {
    console.error(`Error deleting comment ${commentId}:`, error);
    throw error;
  }
};

