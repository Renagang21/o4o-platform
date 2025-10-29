/**
 * Public Page Component
 * Fetches and displays published pages by slug from the API
 */

import { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import PageRenderer from '../components/PageRenderer';
import Layout from '../components/layout/Layout';
import { ArrowLeft } from 'lucide-react';

interface PageData {
  contentType?: 'page' | 'post' | 'custom-post';
  postType?: string; // For custom posts
  id: string;
  title: string;
  slug: string;
  content: any;
  blocks?: any;
  metadata?: {
    excerpt?: string;
    featuredImage?: string;
    author?: {
      id: string;
      name: string;
      email: string;
    };
    categories?: any[];
    tags?: any[];
    seo?: {
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
    };
    publishedAt?: string;
    updatedAt?: string;
  };
}

interface PageResponse {
  success: boolean;
  data: PageData;
}

// WordPress-standard unified content fetch by slug
// Searches Pages -> Posts -> Custom Posts (same hierarchy as WordPress)
const fetchPageBySlug = async (slug: string): Promise<PageData> => {
  // Use new unified slug endpoint that searches all content types
  // apiClient baseURL is /api, and public routes are at /api/public
  const response = await apiClient.get(`/public/content/slug/${slug}`);

  // API returns {success: true, data: {...}} format
  const apiResponse = response.data as PageResponse;
  return apiResponse.data;
};

const PublicPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Fetch page data
  const {
    data: pageData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-page', slug],
    queryFn: () => fetchPageBySlug(slug!),
    enabled: !!slug,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Loading state
  if (isLoading) {
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

  // Error state
  if (error || !pageData) {
    return (
      <Layout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              페이지를 찾을 수 없습니다
            </h2>
            <p className="text-gray-600 mb-4">
              요청하신 페이지가 존재하지 않거나 게시되지 않았습니다.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Set page meta tags
  if (pageData.metadata?.seo?.metaTitle) {
    document.title = pageData.metadata.seo.metaTitle;
  } else {
    document.title = pageData.title;
  }

  if (pageData.metadata?.seo?.metaDescription) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', pageData.metadata.seo.metaDescription);
    }
  }

  // Transform API response (Post entity) to PageRenderer format
  const pageForRenderer = {
    id: pageData.id,
    title: pageData.title,
    slug: pageData.slug,
    content: pageData.content, // Post entity uses 'content' field directly
    featuredImage: pageData.metadata?.featuredImage,
  };

  return (
    <Layout>
      <PageRenderer page={pageForRenderer} />
    </Layout>
  );
};

export default PublicPage;
