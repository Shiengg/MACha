import apiClient from "@/lib/api-client";
import {
  GET_POSTS_ROUTE,
  GET_POST_BY_ID_ROUTE,
  CREATE_POST_ROUTE,
  UPDATE_POST_ROUTE,
  DELETE_POST_ROUTE,
  SEARCH_POSTS_BY_HASHTAG_ROUTE,
  SEARCH_POSTS_BY_TITLE_ROUTE,
  GET_POSTS_BY_HASHTAG_ROUTE,
  LIKE_POST_ROUTE,
  UNLIKE_POST_ROUTE,
} from "@/constants/api";

export interface User {
  _id: string;
  username: string;
  avatar?: string; 
}

export interface Hashtag {
  _id: string;
  name: string;
}

export interface Campaign {
  _id: string;
  title: string;
}

export interface Post {
  _id: string;
  user: User;
  content_text: string;
  media_url?: string[];
  hashtags?: Hashtag[];
  campaign_id?: Campaign | null;
  createdAt: string;
  updatedAt: string;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
}

export interface CreatePostData {
  content_text: string;
  media_url?: string[];
  campaign_id?: string;
}

export interface GetPostsResponse {
  posts: Post[];
}

export interface CreatePostResponse {
  populatedPost: Post;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface GetPostsByHashtagResponse {
  count: number;
  posts: Post[];
  pagination?: PaginationInfo;
}

export interface SearchPostsResponse {
  count?: number;
  posts: Post[];
  message?: string;
}

export const getPosts = async (page: number = 0, limit: number = 20): Promise<Post[]> => {
  try {
    const response = await apiClient.get(GET_POSTS_ROUTE, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
};

export const getPostById = async (id: string): Promise<Post> => {
  try {
    const response = await apiClient.get(GET_POST_BY_ID_ROUTE(id));
    return response.data;
  } catch (error) {
    console.error(`Error fetching post ${id}:`, error);
    throw error;
  }
};

export const createPost = async (data: CreatePostData): Promise<Post> => {
  try {
    const response = await apiClient.post(CREATE_POST_ROUTE, data);
    return response.data.populatedPost;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

export const updatePost = async (id: string, data: CreatePostData): Promise<Post> => {
  try {
    const response = await apiClient.put(UPDATE_POST_ROUTE(id), data);
    return response.data.populatedPost;
  } catch (error) {
    console.error(`Error updating post ${id}:`, error);
    throw error;
  }
};

export const deletePost = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(DELETE_POST_ROUTE(id));
  } catch (error) {
    console.error(`Error deleting post ${id}:`, error);
    throw error;
  }
};

export const searchPostsByHashtag = async (
  keyword: string
): Promise<SearchPostsResponse> => {
  try {
    const response = await apiClient.get(SEARCH_POSTS_BY_HASHTAG_ROUTE, {
      params: { query: keyword },
    });
    return response.data;
  } catch (error) {
    console.error(`Error searching posts by hashtag "${keyword}":`, error);
    throw error;
  }
};

export const getPostsByHashtag = async (
  name: string,
  page: number = 1,
  limit: number = 50
): Promise<GetPostsByHashtagResponse> => {
  try {
    const response = await apiClient.get(GET_POSTS_BY_HASHTAG_ROUTE(name), {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching posts by hashtag "${name}":`, error);
    throw error;
  }
};

export const searchPostsByTitle = async (
  keyword: string,
  limit: number = 50
): Promise<SearchPostsResponse> => {
  try {
    const response = await apiClient.get(SEARCH_POSTS_BY_TITLE_ROUTE, {
      params: { q: keyword, limit },
    });
    return response.data;
  } catch (error) {
    console.error(`Error searching posts by title "${keyword}":`, error);
    throw error;
  }
};

export const toggleLikePost = async (
  postId: string,
  isLiked: boolean
): Promise<{ message: string }> => {
  try {
    const route = isLiked ? UNLIKE_POST_ROUTE(postId) : LIKE_POST_ROUTE(postId);
    const response = await apiClient.post(route);
    return response.data;
  } catch (error: any) {
    console.error(`Error toggling like for post ${postId}:`, error);
    // Better error message
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
};
