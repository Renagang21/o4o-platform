/**
 * CPTItem (Single Post Display) Block Renderer
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import type { CMSPost } from '@/lib/cms/client';

export const CPTItemBlock = ({ node }: BlockRendererProps) => {
  const {
    layout = 'card',
    showImage = true,
    showDate = true,
    showAuthor = true,
    showExcerpt = true,
    data,
  } = node.props;

  // Get post from injected data
  const post: CMSPost | null = data?.post || null;

  if (!post) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600">Post not found</div>
      </div>
    );
  }

  if (layout === 'full') {
    return (
      <article className="max-w-4xl mx-auto">
        {showImage && post.featuredImage && (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-96 object-cover rounded-lg mb-6"
          />
        )}
        <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
        <div className="flex gap-4 text-sm text-gray-600 mb-6">
          {showDate && post.publishedAt && (
            <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
          )}
          {showAuthor && post.author && <span>By {post.author.name}</span>}
        </div>
        <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    );
  }

  if (layout === 'minimal') {
    return (
      <div className="py-4 border-b border-gray-200">
        <h3 className="font-semibold mb-2">{post.title}</h3>
        {showExcerpt && post.excerpt && <p className="text-sm text-gray-600">{post.excerpt}</p>}
      </div>
    );
  }

  // Default card layout
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {showImage && post.featuredImage && (
        <img src={post.featuredImage} alt={post.title} className="w-full h-48 object-cover" />
      )}
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">{post.title}</h2>
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          {showDate && post.publishedAt && (
            <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
          )}
          {showAuthor && post.author && <span>By {post.author.name}</span>}
        </div>
        {showExcerpt && post.excerpt && <p className="text-gray-600">{post.excerpt}</p>}
      </div>
    </div>
  );
};
