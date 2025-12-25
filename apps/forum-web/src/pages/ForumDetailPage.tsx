/**
 * Forum Detail Page
 * =============================================================================
 * Displays single forum thread with replies.
 * Demonstrates Forum API integration via authClient.
 * =============================================================================
 */

import { useState, FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useThread, useReplies, useCreateReply } from '../hooks/useForumData';
import { useAuth } from '../stores/AuthContext';

export function ForumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { thread, isLoading, error, refetch: refetchThread } = useThread(id || '');
  const { replies, isLoading: repliesLoading, refetch: refetchReplies } = useReplies(id || '');
  const { isAuthenticated } = useAuth();
  const { createReply, isLoading: creatingReply, error: replyError } = useCreateReply();

  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!id) return;

    const reply = await createReply(id, { content: replyContent });

    if (reply) {
      setReplyContent('');
      setShowReplyForm(false);
      refetchReplies();
      refetchThread();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-red-500 mb-4">{error || '게시글을 찾을 수 없습니다.'}</p>
        <Link to="/forum" className="text-blue-600 hover:text-blue-700">
          ← 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/forum"
        className="text-blue-600 hover:text-blue-700 text-sm inline-flex items-center"
      >
        ← 목록으로
      </Link>

      {/* Thread Content */}
      <article className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mb-2">
                {thread.category}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{thread.title}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
            <span>{thread.authorName}</span>
            <span>•</span>
            <span>{new Date(thread.createdAt).toLocaleString('ko-KR')}</span>
            <span>•</span>
            <span>조회 {thread.viewCount}</span>
          </div>
        </div>

        <div className="p-6">
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-gray-700">{thread.content}</p>
          </div>
        </div>

        {/* Actions */}
        {isAuthenticated && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showReplyForm ? '취소' : '댓글 작성'}
            </button>
          </div>
        )}
      </article>

      {/* Reply Form */}
      {showReplyForm && isAuthenticated && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">댓글 작성</h3>

          {replyError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
              {replyError}
            </div>
          )}

          <form onSubmit={handleReplySubmit}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="댓글을 입력하세요 (최소 2자)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              required
              minLength={2}
              maxLength={10000}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-gray-500">{replyContent.length}/10000</p>
              <button
                type="submit"
                disabled={creatingReply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingReply ? '작성 중...' : '댓글 등록'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Replies Section */}
      <section className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">
            댓글 ({thread.replyCount})
          </h2>
        </div>

        {repliesLoading ? (
          <div className="p-6 text-center text-gray-500">댓글 로딩 중...</div>
        ) : replies.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>아직 댓글이 없습니다.</p>
            {isAuthenticated ? (
              <p className="text-sm mt-2">첫 번째 댓글을 작성해보세요!</p>
            ) : (
              <p className="text-sm mt-2">
                <Link to="/login" className="text-blue-600 hover:text-blue-700">
                  로그인
                </Link>
                하여 댓글을 작성할 수 있습니다.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {replies.map((reply) => (
              <div key={reply.id} className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{reply.authorName}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(reply.createdAt).toLocaleString('ko-KR')}
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-gray-700">{reply.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Login prompt for non-authenticated users */}
      {!isAuthenticated && (
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-blue-700">
            <Link to="/login" className="font-medium hover:underline">
              로그인
            </Link>
            하시면 댓글을 작성할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
