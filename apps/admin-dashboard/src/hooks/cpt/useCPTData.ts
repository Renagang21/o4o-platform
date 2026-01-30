import { useState, useEffect } from 'react';
import { cptPostApi } from '@/features/cpt-acf/services/cpt.api';

export interface CPTPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  date: string;
  status: 'publish' | 'draft' | 'private' | 'trash';
  customFields?: Record<string, any>;
  [key: string]: any; // 커스텀 필드 유연성
}

export type CPTStatus = 'all' | 'publish' | 'draft' | 'private' | 'trash';
export type CPTSortField = 'title' | 'date' | null;
export type CPTSortOrder = 'asc' | 'desc';

interface UseCPTDataProps {
  cptSlug: string;
  activeTab: CPTStatus;
  searchQuery: string;
  sortField: CPTSortField;
  sortOrder: CPTSortOrder;
  itemsPerPage: number;
}

export const useCPTData = ({
  cptSlug,
  activeTab,
  searchQuery,
  sortField,
  sortOrder,
  itemsPerPage
}: UseCPTDataProps) => {
  const [posts, setPosts] = useState<CPTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch CPT posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      if (!cptSlug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await cptPostApi.getPostsByType(cptSlug, {
          page: 1,
          limit: 1000,
          orderBy: 'updatedAt',
          order: 'desc'
        });

        // Handle both response formats: { data: [...] } or { success: true, data: [...] }
        const responseData = response.data as any;
        const postsArray = Array.isArray(responseData)
          ? responseData
          : (responseData?.data || responseData || []);

        // Ensure postsArray is actually an array
        const safePostsArray = Array.isArray(postsArray) ? postsArray : [];

        const transformedPosts = safePostsArray.map((post: any) => {
          let date = new Date().toISOString().split('T')[0];
          try {
            if (post.publishedAt && post.publishedAt !== null) {
              date = new Date(post.publishedAt).toISOString().split('T')[0];
            } else if (post.updatedAt && post.updatedAt !== null) {
              date = new Date(post.updatedAt).toISOString().split('T')[0];
            } else if (post.createdAt && post.createdAt !== null) {
              date = new Date(post.createdAt).toISOString().split('T')[0];
            }
          } catch (err) {
            // Keep default date
          }

          return {
            id: post.id,
            title: post.title || 'Untitled',
            slug: post.slug || '',
            author: post.author?.name || post.author?.email || post.authorId || 'Unknown',
            date: date,
            status: post.status || 'draft',
            customFields: post.customFields || {},
            ...post // 모든 필드 포함 (커스텀 필드 접근 위해)
          };
        });

        setPosts(transformedPosts);
      } catch (err) {
        console.error('Failed to load CPT posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [cptSlug]);

  // Filter and sort posts
  const getFilteredPosts = () => {
    let filtered = posts;

    // Filter by tab
    if (activeTab === 'publish') {
      filtered = filtered.filter(p => p.status === 'publish');
    } else if (activeTab === 'draft') {
      filtered = filtered.filter(p => p.status === 'draft');
    } else if (activeTab === 'private') {
      filtered = filtered.filter(p => p.status === 'private');
    } else if (activeTab === 'trash') {
      filtered = filtered.filter(p => p.status === 'trash');
    } else if (activeTab === 'all') {
      filtered = filtered.filter(p => p.status !== 'trash');
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        if (sortField === 'title') {
          return sortOrder === 'asc'
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        } else if (sortField === 'date') {
          return sortOrder === 'asc'
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
    } else {
      // Default sort by date desc
      filtered = [...filtered].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    // Apply pagination limit
    return filtered.slice(0, itemsPerPage);
  };

  // Get status counts
  const getStatusCounts = () => {
    const publish = posts.filter(p => p.status === 'publish').length;
    const draft = posts.filter(p => p.status === 'draft').length;
    const private_ = posts.filter(p => p.status === 'private').length;
    const trash = posts.filter(p => p.status === 'trash').length;
    const all = posts.length;
    return { all, publish, draft, private: private_, trash };
  };

  return {
    posts,
    setPosts,
    loading,
    error,
    filteredPosts: getFilteredPosts(),
    counts: getStatusCounts()
  };
};
