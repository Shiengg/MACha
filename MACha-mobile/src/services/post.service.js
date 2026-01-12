import apiClient from './apiClient';

const POST_ROUTE = 'api/posts';
const GET_POSTS_ROUTE = `${POST_ROUTE}`;
const GET_POST_BY_ID_ROUTE = (id) => `${POST_ROUTE}/${id}`;
const CREATE_POST_ROUTE = `${POST_ROUTE}`;
const UPDATE_POST_ROUTE = (id) => `${POST_ROUTE}/${id}`;
const DELETE_POST_ROUTE = (id) => `${POST_ROUTE}/${id}`;
const LIKE_POST_ROUTE = (postId) => `api/likes/${postId}/like`;
const UNLIKE_POST_ROUTE = (postId) => `api/likes/${postId}/unlike`;

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
};

