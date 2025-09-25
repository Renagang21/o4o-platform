import { useState, useEffect } from 'react';
import { postApi } from '@/services/api/postApi';

export interface Post {
  id: string;
  title: string;
  slug: string;
  author: string;
  categories: string[];
  tags: string[];
  comments: number;
  date: string;
  status: 'published' | 'draft' | 'pending' | 'trash';
  views: number;
}

export type PostStatus = 'all' | 'published' | 'draft' | 'trash';
export type SortField = 'title' | 'date' | null;
export type SortOrder = 'asc' | 'desc';

interface UsePostsDataProps {
  activeTab: PostStatus;
  searchQuery: string;
  sortField: SortField;
  sortOrder: SortOrder;
  itemsPerPage: number;
}

export const usePostsData = ({
  activeTab,
  searchQuery,
  sortField,
  sortOrder,
  itemsPerPage
}: UsePostsDataProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const params = new URLSearchParams();
        params.append('per_page', '1000');
        
        const response = await fetch(`${apiUrl}/api/posts?${params}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Authentication required. Please login.');
            window.location.href = '/login';
          } else if (response.status === 500 || response.status === 503) {
            setError('Server error. Please try again later.');
          } else {
            setError(`Failed to fetch posts: ${response.status}`);
          }
          setPosts([]);
          return;
        }
        
        const data = await response.json();
        const postsArray = data.data || data.posts || [];
        const transformedPosts = postsArray.map((post: any) => {
          let date = new Date().toISOString().split('T')[0];
          try {
            if (post.publishedAt && post.publishedAt !== null) {
              date = new Date(post.publishedAt).toISOString().split('T')[0];
            } else if (post.createdAt && post.createdAt !== null) {
              date = new Date(post.createdAt).toISOString().split('T')[0];
            } else if (post.created_at && post.created_at !== null) {
              date = new Date(post.created_at).toISOString().split('T')[0];
            }
          } catch (err) {
            // Keep default date
          }
          
          return {
            id: post.id,
            title: post.title || 'Untitled',
            slug: post.slug || '',
            author: post.author?.name || post.author?.email || 'Unknown',
            categories: post.categories?.map((cat: any) => typeof cat === 'string' ? cat : cat.name) || [],
            tags: post.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.name) || [],
            comments: post.commentCount || 0,
            date: date,
            status: post.status || 'draft',
            views: post.views || 0
          };
        });
        
        setPosts(transformedPosts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, []);

  // Filter and sort posts
  const getFilteredPosts = () => {
    let filtered = posts;
    
    // Filter by tab
    if (activeTab === 'published') {
      filtered = filtered.filter(p => (p.status as any) === 'published' || (p.status as any) === 'publish');
    } else if (activeTab === 'draft') {
      filtered = filtered.filter(p => p.status === 'draft');
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
    const published = posts.filter(p => (p.status as any) === 'published' || (p.status as any) === 'publish').length;
    const draft = posts.filter(p => p.status === 'draft').length;
    const trash = posts.filter(p => p.status === 'trash').length;
    const all = posts.length;
    return { all, published, draft, trash };
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