import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { 
  ForumComment, 
  CommentFormData, 
  CommentUpdateData,
  CommentFilters,
  CommentTree,
  LikeResponse 
} from '@o4o/forum-types';
import type { Pagination } from '@o4o/types';

interface CommentsResponse {
  comments: ForumComment[];
  pagination: Pagination;
}

// 댓글 목록 조회
export function useComments(postId: string, filters?: CommentFilters) {
  return useQuery<CommentsResponse>({
    queryKey: ['forum-comments', postId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('postId', postId);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      
      const response = await authClient.api.get(`/api/forum/comments?${params}`);
      return response.data;
    },
    enabled: !!postId,
  });
}

// 댓글 트리 조회 (중첩된 구조)
export function useCommentTree(postId: string) {
  return useQuery<CommentTree[]>({
    queryKey: ['forum-comment-tree', postId],
    queryFn: async () => {
      const response = await authClient.api.get(
        `/api/forum/posts/${postId}/comments/tree`
      );
      return response.data;
    },
    enabled: !!postId,
  });
}

// 댓글 생성
export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();
  
  return useMutation<ForumComment, Error, CommentFormData>({
    mutationFn: async (data) => {
      const response = await authClient.api.post(
        `/api/forum/posts/${postId}/comments`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-comment-tree', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
    },
  });
}

// 댓글 수정
export function useUpdateComment() {
  const queryClient = useQueryClient();
  
  return useMutation<ForumComment, Error, { commentId: string; data: CommentUpdateData }>({
    mutationFn: async ({ commentId, data }) => {
      const response = await authClient.api.patch(
        `/api/forum/comments/${commentId}`,
        data
      );
      return response.data;
    },
    onSuccess: (comment) => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', comment.postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-comment-tree', comment.postId] });
    },
  });
}

// 댓글 삭제
export function useDeleteComment() {
  const queryClient = useQueryClient();
  
  return useMutation<{ postId: string }, Error, string>({
    mutationFn: async (commentId) => {
      const response = await authClient.api.delete(`/api/forum/comments/${commentId}`);
      return response.data;
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-comment-tree', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', postId] });
    },
  });
}

// 댓글 좋아요
export function useLikeComment() {
  const queryClient = useQueryClient();
  
  return useMutation<LikeResponse & { postId: string }, Error, string>({
    mutationFn: async (commentId) => {
      const response = await authClient.api.post(`/api/forum/comments/${commentId}/like`);
      return response.data;
    },
    onSuccess: ({ postId }) => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-comment-tree', postId] });
    },
  });
}