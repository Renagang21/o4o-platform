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
    '/settings/homepage',
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
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Fetch homepage settings
const fetchHomepageSettings = async (): Promise<HomepageSettings> => {
  try {
    const { data } = await apiClient.get('/settings/homepage');
    return data.data;
  } catch (error) {
    // If homepage settings API fails, default to latest posts
    console.warn('Homepage settings API failed, defaulting to latest posts:', error);
    return {
      type: 'latest_posts',
      postsPerPage: 10
    };
  }
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

  // Error fallback - show latest posts
  if (settingsError || !settings) {
    return (
      <Layout context={context}>
        <BlogList postsPerPage={10} />
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

    // Page error - fallback to latest posts
    if (pageError || !pageData) {
      return (
        <Layout context={context}>
          <BlogList postsPerPage={settings.postsPerPage || 10} />
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

  // Final fallback to latest posts
  return (
    <Layout context={context}>
      <BlogList postsPerPage={10} />
    </Layout>
  );
};

export default HomePage;