import { useState, useEffect, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Layout from '../components/Layout';
import BlogList from '../components/BlogList';
import PageRenderer from '../components/PageRenderer';

interface HomepageSettings {
  type: 'latest_posts' | 'static_page';
  pageId?: string;
  postsPerPage: number;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: { blocks?: Array<{ type: string; data: Record<string, unknown> }> } | string;
  template?: string;
}

// Global API client with proper error handling
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.neture.co.kr',
  timeout: 10000,
});

// Add request interceptor for authentication (skip for public endpoints)
apiClient.interceptors.request.use((config) => {
  // List of public endpoints that don't require authentication
  const publicEndpoints = [
    '/api/v1/settings/homepage',
    '/api/v1/settings/reading',
    '/api/public/',
    '/api/posts',
    '/api/pages',
    '/api/categories',
    '/api/tags'
  ];
  
  // Check if the request is for a public endpoint
  const isPublicEndpoint = publicEndpoints.some(endpoint => 
    config.url?.startsWith(endpoint)
  );
  
  // Only add Authorization header for non-public endpoints
  if (!isPublicEndpoint) {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Fetch homepage settings
const fetchHomepageSettings = async (): Promise<HomepageSettings> => {
  const { data } = await apiClient.get('/api/v1/settings/homepage');
  return data.data;
};

// Fetch specific page
const fetchPage = async (pageId: string): Promise<Page> => {
  const { data } = await apiClient.get(`/api/public/pages/${pageId}`);
  return data.data;
};

/**
 * WordPress-style Homepage Component
 * Implements WordPress "Settings → Reading" behavior:
 * - Show latest posts OR static page
 * - Configurable via admin settings
 * - Graceful fallback to blog list on API errors
 */
const HomePage: FC = () => {
  const [pageData, setPageData] = useState<Page | null>(null);

  // Fetch homepage settings with error handling
  const { 
    data: settings, 
    isLoading: settingsLoading, 
    error: settingsError 
  } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: fetchHomepageSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 2, // Retry failed requests twice
  });

  // Fetch page data if static page is selected
  const { 
    data: page, 
    isLoading: pageLoading,
    error: pageError 
  } = useQuery({
    queryKey: ['homepage-page', settings?.pageId],
    queryFn: () => fetchPage(settings!.pageId!),
    enabled: !!settings?.pageId && settings.type === 'static_page',
    retry: 1,
  });

  useEffect(() => {
    if (page) {
      setPageData(page);
    }
  }, [page]);

  // Context for template parts
  const context = {
    pageId: 'homepage',
    postType: 'page'
  };

  // Show loading state
  if (settingsLoading) {
    return (
      <Layout context={context}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // Error handling - show explicit error
  if (settingsError || !settings) {
    return (
      <Layout context={context}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">홈페이지 로딩 실패</h1>
            <p className="text-red-500 mb-4">API 오류: 홈페이지 설정을 불러올 수 없습니다</p>
            <details className="text-left">
              <summary className="cursor-pointer text-red-700 font-medium">에러 상세정보</summary>
              <pre className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded">
                {settingsError ? String(settingsError) : 'Settings data is null'}
              </pre>
            </details>
          </div>
        </div>
      </Layout>
    );
  }

  // Show latest posts (WordPress default)
  if (settings.type === 'latest_posts') {
    return (
      <Layout context={context}>
        <BlogList postsPerPage={settings.postsPerPage || 10} />
      </Layout>
    );
  }

  // Show static page
  if (settings.type === 'static_page' && settings.pageId) {
    // Still loading page
    if (pageLoading) {
      return (
        <Layout context={context}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Layout>
      );
    }

    // Page error - show explicit error with fallback option
    if (pageError || !pageData) {
      return (
        <Layout context={context}>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg max-w-2xl">
              <h1 className="text-2xl font-bold text-red-600 mb-4">페이지 로딩 실패</h1>
              <p className="text-red-500 mb-4">API 오류: 정적 페이지를 불러올 수 없습니다</p>
              <p className="text-gray-600 mb-4">페이지 ID: {settings.pageId}</p>
              <div className="mb-6">
                <details className="text-left">
                  <summary className="cursor-pointer text-red-700 font-medium">에러 상세정보</summary>
                  <pre className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded">
                    {pageError ? String(pageError) : 'Page data is null'}
                  </pre>
                </details>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">대안 방법</h2>
                <p className="text-yellow-700 text-sm mb-3">
                  관리자 설정에서 홈페이지 설정을 "최신 글 표시"로 변경하거나, 올바른 페이지를 선택해주세요.
                </p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  페이지 새로고침
                </button>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // Render the selected static page
    return (
      <Layout context={{ ...context, pageId: pageData.id }}>
        <div className="max-w-7xl mx-auto px-4 py-12">
          <PageRenderer page={pageData} />
        </div>
      </Layout>
    );
  }

  // Final fallback - should not reach here
  return (
    <Layout context={context}>
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl">
          <h1 className="text-2xl font-bold text-yellow-600 mb-4">알 수 없는 상태</h1>
          <p className="text-yellow-500 mb-4">예상하지 못한 홈페이지 상태입니다</p>
          <div className="mb-6">
            <details className="text-left">
              <summary className="cursor-pointer text-yellow-700 font-medium">설정 정보</summary>
              <pre className="mt-2 text-sm text-yellow-600 bg-yellow-100 p-2 rounded">
                {JSON.stringify(settings, null, 2)}
              </pre>
            </details>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">권장 조치</h2>
            <p className="text-blue-700 text-sm mb-3">
              관리자 설정에서 홈페이지 설정을 다시 구성해주세요.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;