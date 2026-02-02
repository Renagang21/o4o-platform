import { useState, FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Eye, MessageCircle, Lock, Pin, Trash2, Edit, Reply } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import OrganizationBadge from '../components/OrganizationBadge';


interface ForumComment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  parentId?: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: ForumComment[];
}

const ForumPostDetail: FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Fetch post
  const { data: postData, isLoading: postLoading } = useQuery({
    queryKey: ['forum-post', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/forum/posts/${id}`);
      return response.data;
    }
  });
  const post = postData?.data;

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['forum-comments', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/forum/posts/${id}/comments`);
      return response.data;
    }
  });
  const comments = commentsData?.data || [];

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentId?: string }) => {
      const response = await authClient.api.post(`/v1/forum/posts/${id}/comments`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('댓글이 작성되었습니다');
      setReplyContent('');
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ['forum-comments', id] });
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const response = await authClient.api.put(`/v1/forum/comments/${commentId}`, { content });
      return response.data;
    },
    onSuccess: () => {
      toast.success('댓글이 수정되었습니다');
      setEditingComment(null);
      setEditContent('');
      queryClient.invalidateQueries({ queryKey: ['forum-comments', id] });
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await authClient.api.delete(`/v1/forum/comments/${commentId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('댓글이 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-comments', id] });
    }
  });

  // Post actions mutations
  const togglePinMutation = useMutation({
    mutationFn: async () => {
      const response = await authClient.api.post(`/v1/forum/posts/${id}/toggle-pin`);
      return response.data;
    },
    onSuccess: () => {
      toast.success(post?.isPinned ? '고정이 해제되었습니다' : '게시글이 고정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-post', id] });
    }
  });

  const toggleLockMutation = useMutation({
    mutationFn: async () => {
      const response = await authClient.api.post(`/v1/forum/posts/${id}/toggle-lock`);
      return response.data;
    },
    onSuccess: () => {
      toast.success(post?.isLocked ? '잠금이 해제되었습니다' : '게시글이 잠금되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-post', id] });
    }
  });

  const handleReply = (parentId?: string) => {
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({ content: replyContent, parentId });
  };

  const handleEditComment = (commentId: string) => {
    if (!editContent.trim()) return;
    updateCommentMutation.mutate({ commentId, content: editContent });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderComment = (comment: ForumComment, level = 0) => {
    const isEditing = editingComment === comment.id;

    return (
      <div key={comment.id} className={`${level > 0 ? 'ml-12' : ''}`}>
        <div className="bg-white p-4 rounded-lg border border-modern-border-primary mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-modern-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                {comment.author.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-modern-text-primary">{comment.author.name}</span>
                  <Badge variant={"outline" as const} className="text-xs">{comment.author.role}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-modern-text-secondary">
                  <span>{formatDate(comment.createdAt)}</span>
                  {comment.isEdited && <span>(수정됨)</span>}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant={"ghost" as const} size={"sm" as const}>
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setEditingComment(comment.id);
                  setEditContent(comment.content);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => {
                    if (confirm('정말 삭제하시겠습니까?')) {
                      deleteCommentMutation.mutate(comment.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editContent}
                onChange={(e: any) => setEditContent(e.target.value)}
                rows={3}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button 
                  size={"sm" as const}
                  onClick={() => handleEditComment(comment.id)}
                  disabled={updateCommentMutation.isPending}
                >
                  수정 완료
                </Button>
                <Button
                  size={"sm" as const}
                  variant={"outline" as const}
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-modern-text-primary mb-3 whitespace-pre-wrap">{comment.content}</p>
              {!post?.isLocked && (
                <Button
                  size={"sm" as const}
                  variant={"ghost" as const}
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setReplyContent('');
                  }}
                >
                  <Reply className="w-4 h-4 mr-2" />
                  답글
                </Button>
              )}
            </>
          )}
        </div>

        {replyingTo === comment.id && !post?.isLocked && (
          <div className="ml-12 mb-4">
            <Textarea
              value={replyContent}
              onChange={(e: any) => setReplyContent(e.target.value)}
              placeholder="답글을 작성하세요..."
              rows={3}
              className="w-full mb-2"
            />
            <div className="flex gap-2">
              <Button
                size={"sm" as const}
                onClick={() => handleReply(comment.id)}
                disabled={createCommentMutation.isPending}
              >
                답글 작성
              </Button>
              <Button
                size={"sm" as const}
                variant={"outline" as const}
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {comment.replies && comment.replies.map((reply: any) => renderComment(reply, level + 1))}
      </div>
    );
  };

  if (postLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-modern-text-secondary">게시글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => navigate('/forum')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          게시판 목록
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={() => togglePinMutation.mutate()}
          >
            <Pin className="w-4 h-4 mr-2" />
            {post.isPinned ? '고정 해제' : '고정'}
          </Button>
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={() => toggleLockMutation.mutate()}
          >
            <Lock className="w-4 h-4 mr-2" />
            {post.isLocked ? '잠금 해제' : '잠금'}
          </Button>
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={() => navigate(`/forum/posts/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            수정
          </Button>
        </div>
      </div>

      {/* Post Content */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              {post.isPinned && <Badge variant="secondary">고정</Badge>}
              {post.isLocked && <Badge variant={"outline" as const}>잠김</Badge>}
              <Badge variant={"outline" as const}>{post.category.name}</Badge>
              <OrganizationBadge
                organizationId={post.organizationId}
                isOrganizationExclusive={post.isOrganizationExclusive}
                size="md"
              />
              {post.status === 'reported' && <Badge variant="destructive">신고됨</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-modern-text-primary mb-4">{post.title}</h1>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-modern-primary text-white rounded-full flex items-center justify-center text-lg font-medium">
                  {post.author.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-modern-text-primary">{post.author.name}</p>
                  <p className="text-sm text-modern-text-secondary">{formatDate(post.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-modern-text-secondary">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{post.views} 조회</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.replyCount} 댓글</span>
                </div>
              </div>
            </div>
            <div className="prose prose-modern max-w-none">
              <div className="whitespace-pre-wrap text-modern-text-primary">{post.content}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-semibold">댓글 {comments.length}개</h2>
        </div>
        <div className="wp-card-body">
          {/* New Comment Form */}
          {!post.isLocked && (
            <div className="mb-6">
              <Textarea
                value={replyContent}
                onChange={(e: any) => setReplyContent(e.target.value)}
                placeholder="댓글을 작성하세요..."
                rows={4}
                className="w-full mb-2"
              />
              <Button
                onClick={() => handleReply()}
                disabled={createCommentMutation.isPending || !replyContent.trim()}
              >
                댓글 작성
              </Button>
            </div>
          )}

          {/* Comments List */}
          {commentsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary mx-auto"></div>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-modern-text-secondary py-8">
              아직 댓글이 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment: ForumComment) => renderComment(comment))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPostDetail;