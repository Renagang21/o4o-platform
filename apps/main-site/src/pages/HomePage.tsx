import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import BlogList from '../components/BlogList';
import PageRenderer from '../components/PageRenderer';
import Layout from '../components/Layout';

interface HomepageSettings {
  type: 'latest_posts' | 'static_page';
  pageId?: string;
  postsPerPage?: number;
}

interface HomepageResponse {
  success: boolean;
  data: HomepageSettings;
  meta?: {
    validation_failed?: boolean;
    reason?: string;
  };
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: any;
  template?: string;
  featuredImage?: string;
  status: string;
}

// Fetch homepage settings
const fetchHomepageSettings = async (): Promise<HomepageResponse> => {
  const response = await apiClient.get('/settings/homepage');
  return response.data;
};

// Fetch page data for static page mode
const fetchPageData = async (pageId: string): Promise<Page> => {
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
  const response = await fetch(`${baseUrl}/api/posts/${pageId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`);
  }
  const data = await response.json();
  return data.data;
};

const HomePage: FC = () => {
  // Get homepage settings
  const {
    data: settingsResponse,
    isLoading: isSettingsLoading,
    error: settingsError,
  } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: fetchHomepageSettings,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get page data if static page mode
  const {
    data: pageData,
    isLoading: isPageLoading,
    error: pageError,
  } = useQuery({
    queryKey: ['page', settingsResponse?.data.pageId],
    queryFn: () => fetchPageData(settingsResponse!.data.pageId!),
    enabled: 
      settingsResponse?.data.type === 'static_page' && 
      !!settingsResponse?.data.pageId &&
      !settingsResponse?.meta?.validation_failed,
    retry: 3,
  });

  // Loading state
  if (isSettingsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">홈페이지를 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Settings error
  if (settingsError) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              홈페이지 설정을 불러올 수 없습니다
            </h2>
            <p className="text-gray-600 mb-4">
              잠시 후 다시 시도해 주세요.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              새로고침
            </button>
            <details className="mt-4 text-sm text-gray-500">
              <summary className="cursor-pointer">기술적 세부사항</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto">
                {JSON.stringify(settingsError, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </Layout>
    );
  }

  const settings = settingsResponse?.data;
  
  if (!settings) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              홈페이지 설정이 없습니다
            </h2>
            <p className="text-gray-600">
              관리자에게 문의해 주세요.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Handle validation errors for static pages
  if (settings.type === 'static_page' && settingsResponse?.meta?.validation_failed) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              페이지를 찾을 수 없습니다
            </h2>
            <p className="text-gray-600 mb-4">
              {settingsResponse.meta.reason === 'page_not_found' && '지정된 페이지가 존재하지 않습니다.'}
              {settingsResponse.meta.reason === 'page_not_published' && '지정된 페이지가 게시되지 않았습니다.'}
              {settingsResponse.meta.reason === 'missing_page_id' && '페이지가 지정되지 않았습니다.'}
              {settingsResponse.meta.reason === 'page_validation_error' && '페이지 설정에 오류가 있습니다.'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              페이지 ID: {settings.pageId || 'None'}
            </p>
            <div className="space-x-2">
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Latest posts mode
  if (settings.type === 'latest_posts') {
    return (
      <Layout>
        <BlogList postsPerPage={settings.postsPerPage || 10} />
      </Layout>
    );
  }

  // Static page mode - loading
  if (settings.type === 'static_page' && isPageLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">페이지를 불러오는 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Static page mode - error
  if (settings.type === 'static_page' && pageError) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              페이지를 불러올 수 없습니다
            </h2>
            <p className="text-gray-600 mb-4">
              요청하신 페이지에 문제가 발생했습니다.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              페이지 ID: {settings.pageId}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              새로고침
            </button>
            <details className="mt-4 text-sm text-gray-500">
              <summary className="cursor-pointer">기술적 세부사항</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto">
                {JSON.stringify(pageError, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </Layout>
    );
  }

  // Static page mode - render page
  if (settings.type === 'static_page' && pageData) {
    return (
      <Layout>
        <PageRenderer page={pageData} />
      </Layout>
    );
  }

  // Fallback for unknown state
  return (
    <Layout>
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            알 수 없는 상태
          </h2>
          <p className="text-gray-600 mb-4">
            홈페이지 설정에 문제가 있습니다.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            새로고침
          </button>
          <details className="mt-4 text-sm text-gray-500">
            <summary className="cursor-pointer">디버그 정보</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto">
              {JSON.stringify(settingsResponse, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;