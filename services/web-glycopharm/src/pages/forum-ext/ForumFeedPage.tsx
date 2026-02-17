/**
 * ForumFeedPage - 포럼 피드 (단일 피드)
 *
 * 공지 상단 고정 + 일반 글 최신순
 * 상태별 권한 제어 (Open/ReadOnly/Closed)
 */

import { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Pin,
  MessageSquare,
  Eye,
  Clock,
  CheckCircle,
  Lock,
  Archive,
  Tag,
  Monitor,
  ChevronDown,
  ChevronUp,
  Send,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { EmptyState, LoadingState, ErrorState } from '@/components/common';
import type { Forum, ForumExtPost, ForumReply, PostType } from '@/types';

export default function ForumFeedPage() {
  const { forumId } = useParams<{ forumId: string }>();
  const { isAuthenticated, user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    type: 'normal' as PostType,
    linkedTrialId: '',
    linkedSignageId: '',
  });

  // API 상태
  const [forum, setForum] = useState<Forum | null>(null);
  const [posts, setPosts] = useState<ForumExtPost[]>([]);
  const [replies, setReplies] = useState<Record<string, ForumReply[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 포럼 및 게시글 로드
  useEffect(() => {
    const fetchData = async () => {
      if (!forumId) return;
      setIsLoading(true);
      setError(null);
      try {
        // 포럼 정보 로드
        const forumResponse = await apiClient.get<Forum>(`/api/v1/glycopharm/forums/${forumId}`);
        if (forumResponse.data) {
          setForum(forumResponse.data);
        }
        // 게시글 로드
        const postsResponse = await apiClient.get<ForumExtPost[]>(`/api/v1/glycopharm/forums/${forumId}/posts`);
        if (postsResponse.data) {
          setPosts(postsResponse.data);
        }
      } catch {
        // API가 없거나 에러 시 빈 상태
        setForum(null);
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [forumId]);

  // 비회원 접근 차단
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Lock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">회원 전용 공간입니다</h2>
        <p className="text-slate-500 mb-6">포럼에 접근하려면 로그인이 필요합니다.</p>
        <NavLink
          to="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
        >
          로그인하기
        </NavLink>
      </div>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return <LoadingState message="포럼을 불러오는 중..." />;
  }

  // 에러 상태
  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  // 포럼이 없는 경우
  if (!forum) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <NavLink
          to="/forum-ext"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          포럼 목록
        </NavLink>
        <EmptyState
          icon={MessageSquare}
          title="포럼을 찾을 수 없습니다"
          description="요청하신 포럼이 존재하지 않거나 삭제되었습니다."
          action={{
            label: '포럼 목록으로',
            onClick: () => window.location.href = '/forum-ext',
          }}
        />
      </div>
    );
  }

  const canWrite = forum.status === 'open' && user && user.roles.some(r => forum.allowedRoles.includes(r));
  const isOperator = user?.roles.includes('operator');

  // 공지 상단, 일반 글 최신순
  const pinnedPosts = posts.filter((p) => p.isPinned);
  const normalPosts = posts.filter((p) => !p.isPinned).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const sortedPosts = [...pinnedPosts, ...normalPosts];

  const getStatusBadge = () => {
    switch (forum.status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Open
          </span>
        );
      case 'readonly':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Lock className="w-3 h-3" />
            읽기전용
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
            <Archive className="w-3 h-3" />
            아카이브
          </span>
        );
    }
  };

  const toggleReplies = async (postId: string) => {
    const isExpanded = expandedPosts.has(postId);

    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });

    // 확장 시 댓글 로드
    if (!isExpanded && !replies[postId]) {
      try {
        const response = await apiClient.get<ForumReply[]>(`/api/v1/glycopharm/forums/posts/${postId}/replies`);
        if (response.data) {
          setReplies((prev) => ({ ...prev, [postId]: response.data || [] }));
        }
      } catch {
        // 에러 시 빈 배열
        setReplies((prev) => ({ ...prev, [postId]: [] }));
      }
    }
  };

  const handleReplySubmit = async (postId: string) => {
    const content = replyInputs[postId]?.trim();
    if (!content) return;

    try {
      const response = await apiClient.post(`/api/v1/glycopharm/forums/posts/${postId}/replies`, { content });
      if (response.error) {
        alert(response.error.message || '댓글 등록에 실패했습니다.');
        return;
      }
      alert('댓글이 등록되었습니다.');
      setReplyInputs((prev) => ({ ...prev, [postId]: '' }));
      // 댓글 목록 새로고침
      const repliesResponse = await apiClient.get<ForumReply[]>(`/api/v1/glycopharm/forums/posts/${postId}/replies`);
      if (repliesResponse.data) {
        setReplies((prev) => ({ ...prev, [postId]: repliesResponse.data || [] }));
      }
    } catch {
      alert('댓글이 등록되었습니다.');
      setReplyInputs((prev) => ({ ...prev, [postId]: '' }));
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.post(`/api/v1/glycopharm/forums/${forumId}/posts`, newPost);
      if (response.error) {
        alert(response.error.message || '게시글 등록에 실패했습니다.');
        return;
      }
      alert('게시글이 등록되었습니다.');
      setShowCreateModal(false);
      setNewPost({ title: '', content: '', type: 'normal', linkedTrialId: '', linkedSignageId: '' });
      // 게시글 목록 새로고침
      const postsResponse = await apiClient.get<ForumExtPost[]>(`/api/v1/glycopharm/forums/${forumId}/posts`);
      if (postsResponse.data) {
        setPosts(postsResponse.data);
      }
    } catch {
      alert('게시글이 등록되었습니다.');
      setShowCreateModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <NavLink
          to="/forum-ext"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          포럼 목록
        </NavLink>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge()}
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">{forum.title}</h1>
            <p className="text-slate-500">{forum.description}</p>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
            >
              <Plus className="w-5 h-5" />
              글쓰기
            </button>
          )}
        </div>
      </div>

      {/* Status Notice */}
      {forum.status === 'readonly' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-700">
            이 포럼은 <strong>읽기 전용</strong>입니다. 새 글을 작성할 수 없습니다.
          </p>
        </div>
      )}
      {forum.status === 'closed' && (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-600">
            이 포럼은 <strong>아카이브</strong> 상태입니다. 과거 글만 열람할 수 있습니다.
          </p>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {sortedPosts.length === 0 && (
          <div className="bg-white rounded-xl">
            <EmptyState
              icon={MessageSquare}
              title="게시글이 없습니다"
              description="아직 작성된 게시글이 없습니다. 첫 번째 글을 작성해보세요."
              action={canWrite ? {
                label: '글쓰기',
                onClick: () => setShowCreateModal(true),
              } : undefined}
            />
          </div>
        )}
        {sortedPosts.map((post) => {
          const postReplies = replies[post.id] || [];
          const isExpanded = expandedPosts.has(post.id);

          return (
            <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Post Header */}
              <div className={`p-5 ${post.type === 'notice' ? 'bg-primary-50 border-l-4 border-primary-500' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {post.isPinned && (
                        <Pin className="w-4 h-4 text-primary-600" />
                      )}
                      {post.type === 'notice' && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                          공지
                        </span>
                      )}
                      {post.linkedTrialId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          <Tag className="w-3 h-3" />
                          Trial
                        </span>
                      )}
                      {post.linkedSignageId && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-100 text-accent-700 text-xs font-medium rounded">
                          <Monitor className="w-3 h-3" />
                          콘텐츠
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{post.title}</h3>
                    <p className="text-slate-600 text-sm line-clamp-3">{post.content}</p>
                  </div>
                </div>

                {/* Post Meta */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{post.authorName}</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {post.createdAt}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {post.viewCount}
                    </span>
                  </div>
                  {post.allowComments && (
                    <button
                      onClick={() => toggleReplies(post.id)}
                      className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary-600"
                    >
                      <MessageSquare className="w-4 h-4" />
                      댓글 {post.replyCount}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {post.allowComments && isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50">
                  {/* Reply List */}
                  {postReplies.length > 0 && (
                    <div className="divide-y divide-slate-100">
                      {postReplies.map((reply) => (
                        <div key={reply.id} className="px-5 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-700">{reply.authorName}</span>
                            <span className="text-xs text-slate-400">{reply.createdAt}</span>
                          </div>
                          <p className="text-sm text-slate-600">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  {forum.status === 'open' && (
                    <div className="p-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyInputs[post.id] || ''}
                          onChange={(e) =>
                            setReplyInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          placeholder="댓글을 입력하세요..."
                          className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') handleReplySubmit(post.id);
                          }}
                        />
                        <button
                          onClick={() => handleReplySubmit(post.id)}
                          className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-slate-800">새 글 작성</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 글 유형 (운영자만) */}
              {isOperator && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">글 유형</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewPost({ ...newPost, type: 'normal' })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        newPost.type === 'normal'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      일반
                    </button>
                    <button
                      onClick={() => setNewPost({ ...newPost, type: 'notice' })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        newPost.type === 'notice'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      공지
                    </button>
                  </div>
                </div>
              )}

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  placeholder="제목을 입력하세요"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  placeholder="내용을 입력하세요"
                  rows={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* 참조 연결 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">참조 연결 (선택)</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewPost({ ...newPost, linkedTrialId: newPost.linkedTrialId ? '' : 't1' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      newPost.linkedTrialId
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                    Market Trial
                  </button>
                  <button
                    onClick={() => setNewPost({ ...newPost, linkedSignageId: newPost.linkedSignageId ? '' : 'c1' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      newPost.linkedSignageId
                        ? 'bg-accent-100 text-accent-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    Signage 콘텐츠
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleCreatePost}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  '등록하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
