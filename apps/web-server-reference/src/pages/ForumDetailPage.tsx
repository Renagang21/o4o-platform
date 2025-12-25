/**
 * Forum Detail Page
 * =============================================================================
 * Displays single forum thread.
 * Demonstrates Forum API integration via authClient.
 * =============================================================================
 */

import { Link, useParams } from 'react-router-dom';
import { useThread } from '../hooks/useForumData';
import { useAuth } from '../stores/AuthContext';

export function ForumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { thread, isLoading, error } = useThread(id || '');
  const { isAuthenticated } = useAuth();

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
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              댓글 작성
            </button>
          </div>
        )}
      </article>

      {/* Replies Section */}
      <section className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-medium text-gray-900">
            댓글 ({thread.replyCount})
          </h2>
        </div>

        <div className="p-6 text-center text-gray-500">
          <p>댓글 기능은 실제 구현에서 추가됩니다.</p>
          <p className="text-sm mt-2">
            (이 Reference에서는 API 연동 패턴만 시연)
          </p>
        </div>
      </section>

      {/* Architecture Note */}
      <div className="bg-gray-100 rounded p-4 text-sm text-gray-600">
        <p className="font-medium mb-1">아키텍처 노트:</p>
        <p>
          이 페이지는 forumService.getThread(id)를 통해 Forum API를 호출합니다.
          URL 파라미터(id)를 사용하여 특정 스레드를 조회합니다.
        </p>
      </div>
    </div>
  );
}
