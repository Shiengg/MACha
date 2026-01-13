import apiClient from './apiClient';
import {
  ADD_COMMENT_ROUTE,
  GET_COMMENTS_ROUTE,
  DELETE_COMMENT_ROUTE,
} from '../constants/api';

export const commentService = {
  async addComment(postId, data) {
    const response = await apiClient.post(ADD_COMMENT_ROUTE(postId), data);
    return response.data;
  },

  async getComments(postId) {
    const response = await apiClient.get(GET_COMMENTS_ROUTE(postId));
    return response.data;
  },

  async deleteComment(commentId) {
    const response = await apiClient.delete(DELETE_COMMENT_ROUTE(commentId));
    return response.data;
  },
};

