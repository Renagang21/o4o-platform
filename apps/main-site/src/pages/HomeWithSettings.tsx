import { useState, useEffect, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import HomeDynamic from './HomeDynamic';
import PageRenderer from '../components/PageRenderer';
import BlogList from '../components/BlogList';

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

// API client
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1',
});

// Fetch homepage settings
const fetchHomepageSettings = async (): Promise<HomepageSettings> => {
  const { data } = await apiClient.get('/settings/homepage');
  return data.data;
};

// Fetch specific page
const fetchPage = async (pageId: string): Promise<Page> => {
  const { data } = await apiClient.get(`/pages/${pageId}`);
  return data.data;
};

const HomeWithSettings: FC = () => {
  const [pageData, setPageData] = useState<Page | null>(null);

  // Fetch homepage settings
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['homepage-settings'],
    queryFn: fetchHomepageSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch page data if static page is selected
  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ['homepage-page', settings?.pageId],
    queryFn: () => fetchPage(settings!.pageId!),
    enabled: !!settings?.pageId && settings.type === 'static_page',
  });

  useEffect(() => {
    if (page) {
      setPageData(page);
    }
  }, [page]);

  // Show loading state
  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error fallback - show dynamic homepage
  if (settingsError) {
    // Error logging - use proper error handler
    return <HomeDynamic />;
  }

  // If settings indicate latest posts
  if (settings?.type === 'latest_posts') {
    return <BlogList postsPerPage={settings.postsPerPage} />;
  }

  // If settings indicate static page
  if (settings?.type === 'static_page' && settings.pageId) {
    // Still loading page
    if (pageLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    // Render the selected page
    if (pageData) {
      return <PageRenderer page={pageData} />;
    }
  }

  // Default fallback to dynamic homepage
  return <HomeDynamic />;
};

export default HomeWithSettings;