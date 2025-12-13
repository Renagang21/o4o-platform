/**
 * BundleViewerPage
 *
 * ContentBundle 뷰어 페이지
 * Route: /lms/bundle/:bundleId
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  ContentBundleViewer,
  type ContentBundle,
} from '@/components/lms-core/viewer';

const apiClient = authClient.api;

export function BundleViewerPage() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const navigate = useNavigate();

  const [bundle, setBundle] = useState<ContentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bundleId) {
      loadBundle(bundleId);
    }
  }, [bundleId]);

  const loadBundle = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/v1/lms/bundles/${id}`);
      if (response.data?.success && response.data?.data) {
        setBundle(response.data.data);
      } else {
        setError(response.data?.error || '콘텐츠를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Failed to load bundle:', err);
      if (err.response?.status === 404) {
        setError('콘텐츠를 찾을 수 없습니다.');
      } else if (err.response?.status === 403) {
        setError('이 콘텐츠에 접근할 권한이 없습니다.');
      } else {
        setError('콘텐츠를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    console.log('Bundle completed');
    // Could show a toast notification or redirect
  };

  const handleQuizComplete = (attempt: any) => {
    console.log('Quiz completed:', attempt);
  };

  const handleSurveyComplete = (response: any) => {
    console.log('Survey completed:', response);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">콘텐츠를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😔</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">오류 발생</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              뒤로 가기
            </button>
            <button
              onClick={() => bundleId && loadBundle(bundleId)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No bundle found
  if (!bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">콘텐츠를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">요청하신 콘텐츠가 존재하지 않거나 삭제되었습니다.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>뒤로</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ContentBundleViewer
          bundle={bundle}
          autoLogView={true}
          showHeader={true}
          showProgress={true}
          onComplete={handleComplete}
          onQuizComplete={handleQuizComplete}
          onSurveyComplete={handleSurveyComplete}
        />
      </div>
    </div>
  );
}

export default BundleViewerPage;
