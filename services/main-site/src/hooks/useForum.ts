import { useState, useCallback } from 'react';
import { forumApi } from '../api/forum/forumApi';
import {
  Post,
  Comment,
  PostCreateRequest,
  PostUpdateRequest,
  CommentCreateRequest,
  CommentUpdateRequest,
  PostListParams,
  CommentListParams,
  PostListResponse,
  CommentListResponse,
  LikeResponse,
  PostStats,
} from '../api/forum/types';

export const useForum = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getPosts = useCallback(async (params: PostListParams) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await forumApi.getPosts(params);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPost = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const post = await forumApi.getPost(id);
      return post;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPost = useCallback(async (data: PostCreateRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const post = await forumApi.createPost(data);
      return post;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePost = useCallback(async (id: string, data: PostUpdateRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const post = await forumApi.updatePost(id, data);
      return post;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePost = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await forumApi.deletePost(id);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getComments = useCallback(async (postId: string, params: CommentListParams) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await forumApi.getComments(postId, params);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createComment = useCallback(async (postId: string, data: CommentCreateRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const comment = await forumApi.createComment(postId, data);
      return comment;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateComment = useCallback(async (postId: string, commentId: string, data: CommentUpdateRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      const comment = await forumApi.updateComment(postId, commentId, data);
      return comment;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteComment = useCallback(async (postId: string, commentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await forumApi.deleteComment(postId, commentId);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const likePost = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await forumApi.likePost(id);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const likeComment = useCallback(async (postId: string, commentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await forumApi.likeComment(postId, commentId);
      return response;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await forumApi.getStats();
      return stats;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    getComments,
    createComment,
    updateComment,
    deleteComment,
    likePost,
    likeComment,
    getStats,
  };
};