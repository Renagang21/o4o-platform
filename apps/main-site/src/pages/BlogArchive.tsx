/**
 * Blog Archive Page
 * Displays blog posts using the BlogArchive component with customizer settings
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BlogArchive from '../components/blog/BlogArchive';
import { PostItem, BlogSettings } from '@/types/customizer-types';
import { useBlogSettings } from '../hooks/useBlogSettings';
import { useInView } from 'react-intersection-observer';
import { blogAPI, BlogPostsParams } from '../api/blog/blogApi';

interface BlogArchivePageProps {
  className?: string;
}

// Mock data for development - replace with actual API calls
const generateMockPosts = (count: number, startId: number = 1): PostItem[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `post-${startId + index}`,
    title: `Sample Blog Post ${startId + index}`,
    slug: `sample-blog-post-${startId + index}`,
    url: `/blog/sample-blog-post-${startId + index}`,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    excerpt: `This is a sample excerpt for blog post ${startId + index}. It provides a brief summary of the content to give readers an idea of what to expect from the full article. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
    content: `<p>This is the full content of blog post ${startId + index}. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`,
    author: {
      id: 'author-1',
      name: 'John Doe',
      avatar: '',
      url: '/author/john-doe'
    },
    featuredImage: {
      id: `image-${startId + index}`,
      url: `https://picsum.photos/800/600?random=${startId + index}`,
      alt: `Featured image for post ${startId + index}`,
      caption: '',
      width: 800,
      height: 600
    },
    categories: [
      {
        id: 'tech',
        name: 'Technology',
        slug: 'technology',
        url: '/category/technology'
      }
    ],
    tags: [
      {
        id: 'web-dev',
        name: 'Web Development',
        slug: 'web-development',
        url: '/tag/web-development'
      },
      {
        id: 'react',
        name: 'React',
        slug: 'react',
        url: '/tag/react'
      }
    ],
    commentCount: Math.floor(Math.random() * 20),
    viewCount: Math.floor(Math.random() * 1000) + 100,
    readTime: Math.floor(Math.random() * 8) + 3,
    status: 'published',
    type: 'post'
  }));
};

const BlogArchivePage: React.FC<BlogArchivePageProps> = ({ className = '' }) => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings: blogSettings, isLoading: settingsLoading } = useBlogSettings();
  
  // State management
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Infinite scroll setup
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Initialize from URL params
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1', 10);
    const sort = searchParams.get('sort') || 'date';
    const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';
    
    setCurrentPage(page);
    setSortBy(sort);
    setSortOrder(order);
  }, [searchParams]);

  // Fetch posts from API
  const fetchPosts = async (page: number, append: boolean = false) => {
    setLoading(true);
    
    try {
      const postsPerPage = blogSettings?.archive.pagination.postsPerPage || 12;
      
      const params: BlogPostsParams = {
        page,
        limit: postsPerPage,
        sortBy: sortBy as any,
        order: sortOrder,
        status: 'published'
      };

      const response = await blogAPI.getPosts(params);
      
      if (response.data.success) {
        const { posts: newPosts, pagination } = response.data.data;
        
        if (append) {
          setPosts(prev => [...prev, ...newPosts]);
        } else {
          setPosts(newPosts);
        }
        
        setTotalPosts(pagination.totalPosts);
      } else {
        // Fallback to mock data if API fails
        // console.log('API failed, using mock data');
        const startId = (page - 1) * postsPerPage + 1;
        const mockPosts = generateMockPosts(postsPerPage, startId);
        
        if (append) {
          setPosts(prev => [...prev, ...mockPosts]);
        } else {
          setPosts(mockPosts);
        }
        
        setTotalPosts(50); // Mock total
      }
    } catch (error) {
      // console.log('API call failed, using mock data:', error);
      
      // Fallback to mock data
      const postsPerPage = blogSettings?.archive.pagination.postsPerPage || 12;
      const startId = (page - 1) * postsPerPage + 1;
      const mockPosts = generateMockPosts(postsPerPage, startId);
      
      if (append) {
        setPosts(prev => [...prev, ...mockPosts]);
      } else {
        setPosts(mockPosts);
      }
      
      setTotalPosts(50); // Mock total
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!settingsLoading && blogSettings) {
      fetchPosts(currentPage);
    }
  }, [currentPage, sortBy, sortOrder, settingsLoading, blogSettings]);

  // Infinite scroll for load more pagination
  useEffect(() => {
    if (
      inView && 
      !loading && 
      blogSettings?.archive.pagination.type === 'loadMore' &&
      posts.length < totalPosts
    ) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPosts(nextPage, true);
    }
  }, [inView, loading, blogSettings, posts.length, totalPosts, currentPage]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('page', page.toString());
      return newParams;
    });
    
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle sort change
  const handleSortChange = (newSortBy: string, newOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newOrder);
    setCurrentPage(1);
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('sort', newSortBy);
      newParams.set('order', newOrder);
      newParams.set('page', '1');
      return newParams;
    });
  };

  // Handle load more
  const handleLoadMore = async () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchPosts(nextPage, true);
  };

  // Page context for breadcrumbs and SEO
  const pageContext = useMemo(() => ({
    pageId: 'blog-archive',
    postType: 'page',
    categories: [],
    title: 'Blog',
    description: 'Browse our latest blog posts and articles'
  }), []);

  // Show loading state while settings are loading
  if (settingsLoading || !blogSettings) {
    return (
      <Layout context={pageContext} className={className}>
        <div className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blog settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout context={pageContext} className={className}>
      <div className="py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Blog</h1>
          <p className="text-lg text-gray-600">
            Discover our latest insights, tutorials, and industry updates
          </p>
        </div>

        {/* Blog Archive Component */}
        <BlogArchive
          posts={posts}
          settings={blogSettings.archive}
          loading={loading}
          totalPosts={totalPosts}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
        />

        {/* Load More Trigger for Infinite Scroll */}
        {blogSettings.archive.pagination.type === 'loadMore' && posts.length < totalPosts && (
          <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
            {loading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading more posts...</p>
              </div>
            )}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {blogSettings.archive.pagination.type === 'infinite' && posts.length < totalPosts && (
          <div ref={loadMoreRef} className="h-20" />
        )}

        {/* SEO and Meta Information */}
        <div className="sr-only">
          <h2>Blog Archive - Page {currentPage}</h2>
          <p>
            Showing {posts.length} of {totalPosts} blog posts, 
            sorted by {sortBy} in {sortOrder}ending order.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default BlogArchivePage;