import apiClient from './apiClient';
import {
  GET_POSTS_ROUTE,
  GET_POST_BY_ID_ROUTE,
  CREATE_POST_ROUTE,
  UPDATE_POST_ROUTE,
  DELETE_POST_ROUTE,
  LIKE_POST_ROUTE,
  UNLIKE_POST_ROUTE,
  SEARCH_POSTS_BY_TITLE_ROUTE,
  GET_POSTS_BY_HASHTAG_ROUTE,
} from '../constants/api';

export const postService = {
  async getPosts(page = 0, limit = 20) {
    const response = await apiClient.get(GET_POSTS_ROUTE, {
      params: { page, limit },
    });
    return response.data || [];
  },

  async getPostById(id) {
    const response = await apiClient.get(GET_POST_BY_ID_ROUTE(id));
    return response.data;
  },

  async createPost(data) {
    const response = await apiClient.post(CREATE_POST_ROUTE, data);
    return response.data.populatedPost;
  },

  async updatePost(id, data) {
    const response = await apiClient.put(UPDATE_POST_ROUTE(id), data);
    return response.data.populatedPost;
  },

  async deletePost(id) {
    await apiClient.delete(DELETE_POST_ROUTE(id));
  },

  async toggleLikePost(postId, isLiked) {
    const route = isLiked ? UNLIKE_POST_ROUTE(postId) : LIKE_POST_ROUTE(postId);
    const response = await apiClient.post(route);
    return response.data;
  },

  async searchPostsByTitle(keyword, limit = 50) {
    try {
      const response = await apiClient.get(SEARCH_POSTS_BY_TITLE_ROUTE, {
        params: { q: keyword, limit },
      });
      // Web returns { posts, ... }
      return response.data?.posts || [];
    } catch (error) {
      console.error(`Error searching posts by title "${keyword}":`, error);
      throw error;
    }
  },

  async getPostsByHashtag(name, page = 1, limit = 50) {
    try {
      const normalizedHashtag = (name || '').toLowerCase().trim();
      const response = await apiClient.get(GET_POSTS_BY_HASHTAG_ROUTE(normalizedHashtag), {
        params: { page, limit },
      });
      // Returns { posts, count, pagination }
      return response.data || { posts: [], count: 0 };
    } catch (error) {
      console.error(`Error fetching posts by hashtag "${name}":`, error);
      throw error;
    }
  },
};

