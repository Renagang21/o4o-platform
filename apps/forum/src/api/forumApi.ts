import { createApiInstance, createEndpoints } from '@o4o/utils';
import {
  Post,
  Comment,
  PostCreateRequest,
  PostUpdateRequest,
  CommentCreateRequest,
  CommentUpdateRequest,
  PostListResponse,
  CommentListResponse,
  PostListParams,
  CommentListParams,
  LikeResponse,
  PostStats,
} from './types';

// Create axios instance
const axiosInstance = createApiInstance();

// Define forum endpoints
const FORUM_ENDPOINTS = createEndpoints({
  POSTS: '/api/forum/posts',
  POST: (id: string) => `/api/forum/posts/${id}`,
  COMMENTS: (postId: string) => `/api/forum/posts/${postId}/comments`,
  STATS: '/api/forum/stats',
});

export const forumApi = {
  // 게시글 목록 조회
  getPosts: async (params: PostListParams): Promise<PostListResponse> => {
    const response = await axiosInstance.get<PostListResponse>(
      FORUM_ENDPOINTS.POSTS,
      { params }
    );
    return response.data;
  },

  // 게시글 상세 조회
  getPost: async (id: string): Promise<Post> => {
    const response = await axiosInstance.get<Post>(
      FORUM_ENDPOINTS.POST(id)
    );
    return response.data;
  },

  // 게시글 생성
  createPost: async (data: PostCreateRequest): Promise<Post> => {
    const response = await axiosInstance.post<Post>(
      FORUM_ENDPOINTS.POSTS,
      data
    );
    return response.data;
  },

  // 게시글 수정
  updatePost: async (id: string, data: PostUpdateRequest): Promise<Post> => {
    const response = await axiosInstance.patch<Post>(
      FORUM_ENDPOINTS.POST(id),
      data
    );
    return response.data;
  },

  // 게시글 삭제
  deletePost: async (id: string): Promise<void> => {
    await axiosInstance.delete(FORUM_ENDPOINTS.POST(id));
  },

  // 댓글 목록 조회
  getComments: async (postId: string, params: CommentListParams): Promise<CommentListResponse> => {
    const response = await axiosInstance.get<CommentListResponse>(
      FORUM_ENDPOINTS.COMMENTS(postId),
      { params }
    );
    return response.data;
  },

  // 댓글 작성
  createComment: async (postId: string, data: CommentCreateRequest): Promise<Comment> => {
    const response = await axiosInstance.post<Comment>(
      FORUM_ENDPOINTS.COMMENTS(postId),
      data
    );
    return response.data;
  },

  // 댓글 수정
  updateComment: async (postId: string, commentId: string, data: CommentUpdateRequest): Promise<Comment> => {
    const response = await axiosInstance.patch<Comment>(
      `${FORUM_ENDPOINTS.COMMENTS(postId)}/${commentId}`,
      data
    );
    return response.data;
  },

  // 댓글 삭제
  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    await axiosInstance.delete(
      `${FORUM_ENDPOINTS.COMMENTS(postId)}/${commentId}`
    );
  },

  // 게시글 좋아요
  likePost: async (id: string): Promise<LikeResponse> => {
    const response = await axiosInstance.post<LikeResponse>(
      `${FORUM_ENDPOINTS.POST(id)}/like`
    );
    return response.data;
  },

  // 댓글 좋아요
  likeComment: async (postId: string, commentId: string): Promise<LikeResponse> => {
    const response = await axiosInstance.post<LikeResponse>(
      `${FORUM_ENDPOINTS.COMMENTS(postId)}/${commentId}/like`
    );
    return response.data;
  },

  // 포럼 통계 조회
  getStats: async (): Promise<PostStats> => {
    const response = await axiosInstance.get<PostStats>(FORUM_ENDPOINTS.STATS);
    return response.data;
  },
};