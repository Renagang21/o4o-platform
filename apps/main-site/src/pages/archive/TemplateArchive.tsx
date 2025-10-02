import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { apiClient as api } from '../../services/api';
import { renderShortcodes } from '@o4o/shortcodes';

interface Template {
  id: string;
  name: string;
  type: string;
  postType?: string;
  content: {
    blocks: any[];
  };
  status: string;
}

interface CPTPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meta?: any;
  acf?: any;
}

const TemplateArchive: React.FC = () => {
  const { cptSlug } = useParams<{ cptSlug: string }>();
  const [searchParams] = useSearchParams();
  const [template, setTemplate] = useState<Template | null>(null);
  const [posts, setPosts] = useState<CPTPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const postsPerPage = 12;

  // Fetch archive template for this CPT
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        // Try to find an archive template for this CPT
        const response = await api.get(`/templates`, {
          params: {
            type: 'archive',
            postType: cptSlug,
            status: 'active'
          }
        });

        if (response.data.data && response.data.data.length > 0) {
          setTemplate(response.data.data[0]);
        } else {
          // Try to find a generic archive template
          const genericResponse = await api.get(`/templates`, {
            params: {
              type: 'archive',
              status: 'active'
            }
          });
          
          if (genericResponse.data.data && genericResponse.data.data.length > 0) {
            setTemplate(genericResponse.data.data[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching template:', err);
      }
    };

    if (cptSlug) {
      fetchTemplate();
    }
  }, [cptSlug]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: postsPerPage.toString(),
          status: 'publish',
          orderby: 'date',
          order: 'DESC'
        });

        const response = await api.get(`/cpt/${cptSlug}/posts?${params}`);
        
        if (response.data.success) {
          setPosts(response.data.data || []);
        } else {
          setPosts([]);
        }
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    if (cptSlug) {
      fetchPosts();
    }
  }, [cptSlug, currentPage]);

  // Render template with dynamic data
  const renderTemplateContent = () => {
    if (!template || !template.content?.blocks) {
      return null;
    }

    // Create context for shortcodes
    const context = {
      postType: cptSlug,
      posts: posts,
      pagination: {
        currentPage,
        postsPerPage,
        totalPosts: posts.length
      }
    };

    // Render each block
    return template.content.blocks.map((block: any, index: number) => {
      // Handle shortcode blocks
      if (block.type === 'shortcode' && block.content) {
        const renderedContent = renderShortcodes(block.content, context);
        return (
          <div key={index} className="block-shortcode">
            {renderedContent}
          </div>
        );
      }

      // Handle HTML blocks
      if (block.type === 'html' && block.content) {
        return (
          <div 
            key={index} 
            className="block-html"
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        );
      }

      // Handle heading blocks
      if (block.type === 'heading') {
        const Tag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
        return (
          <Tag key={index} className={`block-heading heading-${block.level || 2}`}>
            {block.content}
          </Tag>
        );
      }

      // Handle paragraph blocks
      if (block.type === 'paragraph') {
        return (
          <p key={index} className="block-paragraph">
            {block.content}
          </p>
        );
      }

      // Handle list blocks
      if (block.type === 'list') {
        const ListTag = block.ordered ? 'ol' : 'ul';
        return (
          <ListTag key={index} className="block-list">
            {block.items?.map((item: string, itemIndex: number) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ListTag>
        );
      }

      // Handle image blocks
      if (block.type === 'image' && block.url) {
        return (
          <figure key={index} className="block-image">
            <img src={block.url} alt={block.alt || ''} />
            {block.caption && <figcaption>{block.caption}</figcaption>}
          </figure>
        );
      }

      // Handle Dynamic Shortcode for CPT List
      if (!block.type && posts.length > 0) {
        // Auto-generate CPT list if no specific block
        return (
          <div key={index} className="auto-cpt-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article key={post.id} className="post-item bg-white rounded-lg shadow p-4">
                {post.featuredImage && (
                  <img 
                    src={post.featuredImage} 
                    alt={post.title}
                    className="w-full h-48 object-cover rounded mb-3"
                  />
                )}
                <h3 className="text-lg font-semibold mb-2">
                  <a href={`/cpt/${cptSlug}/${post.slug}`} className="hover:text-blue-600">
                    {post.title}
                  </a>
                </h3>
                {post.excerpt && (
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
              </article>
            ))}
          </div>
        );
      }

      return null;
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // If template exists, render it
  if (template) {
    return (
      <Layout>
        <div className="template-archive">
          {renderTemplateContent()}
        </div>
      </Layout>
    );
  }

  // Fallback to basic archive display
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">Archive: {cptSlug}</h1>
        
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-3">
                  <a 
                    href={`/cpt/${cptSlug}/${post.slug}`}
                    className="hover:text-blue-600"
                  >
                    {post.title}
                  </a>
                </h2>
                {post.excerpt && (
                  <p className="text-gray-600">{post.excerpt}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No posts found.</p>
        )}
      </div>
    </Layout>
  );
};

export default TemplateArchive;