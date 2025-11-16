import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { cookieAuthClient } from '@o4o/auth-client';
import { BlockRenderer } from '@o4o/block-renderer';
import type { TemplatePreset, TemplateLayoutConfig, BlockReference } from '@o4o/types';

interface CPTPost {
  id: string;
  title: string;
  slug: string;
  content?: any;
  excerpt?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meta?: any;
  customFields?: Record<string, any>;
  featuredImage?: string;
  author?: {
    id: string;
    name: string;
  };
}

interface CPTType {
  id: string;
  name: string;
  slug: string;
  labels?: any;
  hasArchive: boolean;
  public: boolean;
  rewrite?: any;
  defaultViewPresetId?: string;
  defaultTemplatePresetId?: string;
}

const CPTSingle: React.FC = () => {
  const { cptSlug, slug } = useParams<{ cptSlug: string; slug: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<CPTPost | null>(null);
  const [cptInfo, setCptInfo] = useState<CPTType | null>(null);
  const [templatePreset, setTemplatePreset] = useState<TemplatePreset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch CPT information and TemplatePreset
  useEffect(() => {
    const fetchCPTInfo = async () => {
      try {
        const response = await cookieAuthClient.api.get(`/cpt/types/${cptSlug}`);
        const cptData = response.data;

        setCptInfo(cptData);

        // Phase 1: Fetch TemplatePreset if configured
        if (cptData.defaultTemplatePresetId) {
          try {
            const presetResponse = await cookieAuthClient.api.get(
              `/presets/templates/${cptData.defaultTemplatePresetId}`
            );
            if (presetResponse.data.success && presetResponse.data.data) {
              setTemplatePreset(presetResponse.data.data);
            }
          } catch (presetErr) {
            console.warn('[CPTSingle] Failed to load TemplatePreset, using fallback:', presetErr);
            // Graceful fallback - continue without preset
            setTemplatePreset(null);
          }
        } else {
          setTemplatePreset(null);
        }
      } catch (err: any) {
        console.error('Error fetching CPT info:', err);
        setError('Post type not found');
        setLoading(false);
      }
    };

    if (cptSlug) {
      fetchCPTInfo();
    }
  }, [cptSlug]);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!cptInfo || !slug) return;

      try {
        setLoading(true);

        const response = await cookieAuthClient.api.get(`/cpt/${cptSlug}/posts/${slug}`);

        if (response.data.success) {
          const fetchedPost = response.data.data;
          setPost({
            id: fetchedPost.id,
            title: fetchedPost.title,
            slug: fetchedPost.slug,
            content: fetchedPost.content || fetchedPost.blocks,
            excerpt: fetchedPost.excerpt,
            status: fetchedPost.status,
            createdAt: fetchedPost.createdAt,
            updatedAt: fetchedPost.updatedAt,
            meta: fetchedPost.meta,
            customFields: fetchedPost.customFields,
            featuredImage: fetchedPost.featuredImage,
            author: fetchedPost.author,
          });
          setError(null);
        } else {
          setError('Post not found');
          setPost(null);
        }
      } catch (err: any) {
        console.error('Error fetching post:', err);
        setError(err?.response?.data?.message || 'Failed to load post');
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    if (cptInfo && slug) {
      fetchPost();
    }
  }, [cptSlug, cptInfo, slug]);

  // Render blocks from slot configuration
  const renderSlot = (blocks: BlockReference[], post: CPTPost) => {
    if (!blocks || blocks.length === 0) return null;

    // Sort blocks by order
    const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

    return (
      <div className="space-y-4">
        {sortedBlocks.map((blockRef, index) => {
          // Convert blockRef to block format for BlockRenderer
          const block = {
            type: blockRef.blockName,
            ...blockRef.props,
            // Inject post data as context for blocks
            _postData: post,
          };

          return (
            <div key={`${blockRef.blockName}-${index}`}>
              <BlockRenderer blocks={[block]} />
            </div>
          );
        })}
      </div>
    );
  };

  // Render layout based on TemplatePreset
  const renderTemplateLayout = (layout: TemplateLayoutConfig, post: CPTPost) => {
    const { type, header, main, sidebar, footer } = layout;

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Slot */}
        {header && <div className="mb-6">{renderSlot(header.blocks, post)}</div>}

        {/* Main Content Area */}
        {type === '1-column' && (
          <div className="max-w-4xl mx-auto">
            <div>{renderSlot(main.blocks, post)}</div>
            {footer && <div className="mt-6">{renderSlot(footer.blocks, post)}</div>}
          </div>
        )}

        {type === '2-column-left' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Left */}
            <aside className="lg:col-span-1">
              {sidebar && renderSlot(sidebar.blocks, post)}
            </aside>
            {/* Main Content */}
            <main className="lg:col-span-3">
              <div>{renderSlot(main.blocks, post)}</div>
              {footer && <div className="mt-6">{renderSlot(footer.blocks, post)}</div>}
            </main>
          </div>
        )}

        {type === '2-column-right' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <main className="lg:col-span-3">
              <div>{renderSlot(main.blocks, post)}</div>
              {footer && <div className="mt-6">{renderSlot(footer.blocks, post)}</div>}
            </main>
            {/* Sidebar Right */}
            <aside className="lg:col-span-1">
              {sidebar && renderSlot(sidebar.blocks, post)}
            </aside>
          </div>
        )}

        {type === '3-column' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar */}
            <aside className="lg:col-span-1">
              {sidebar && renderSlot(sidebar.blocks, post)}
            </aside>
            {/* Main Content */}
            <main className="lg:col-span-2">
              <div>{renderSlot(main.blocks, post)}</div>
            </main>
            {/* Right Sidebar */}
            <aside className="lg:col-span-1">
              {footer && renderSlot(footer.blocks, post)}
            </aside>
          </div>
        )}
      </div>
    );
  };

  // Fallback: Render with BlockRenderer (like PostDetail.tsx)
  const renderFallback = (post: CPTPost) => {
    return (
      <article className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        {post.excerpt && <p className="text-gray-600 mb-6">{post.excerpt}</p>}
        {post.content && <BlockRenderer blocks={post.content} />}
      </article>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !post) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'Post not found'}</p>
            <button
              onClick={() => navigate(`/archive/${cptSlug}`)}
              className="text-blue-600 hover:underline"
            >
              Back to {cptInfo?.labels?.all_items || 'Archive'}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {templatePreset && templatePreset.config?.layout ? (
        // Render with TemplatePreset layout
        renderTemplateLayout(templatePreset.config.layout, post)
      ) : (
        // Fallback to simple BlockRenderer layout
        renderFallback(post)
      )}
    </Layout>
  );
};

export default CPTSingle;
