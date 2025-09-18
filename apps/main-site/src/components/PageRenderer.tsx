import { FC } from 'react';
import WordPressBlockRenderer from './WordPressBlockRenderer';

interface PageContent {
  blocks?: Array<{ type: string; data: Record<string, unknown> }>;
  type?: string;
  [key: string]: unknown;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  content: PageContent | string;
  template?: string;
  featuredImage?: string;
}

interface PageRendererProps {
  page: Page;
}

const PageRenderer: FC<PageRendererProps> = ({ page }) => {
  // Context for conditional template parts
  const context = {
    pageId: page.id,
    postType: 'page'
  };

  // Check if content is WordPress blocks (array or JSON string)
  const isWordPressBlocks = (content: any): boolean => {
    if (Array.isArray(content)) {
      return content.length > 0 && (content[0].name !== undefined || content[0].type !== undefined);
    }
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) && parsed.length > 0 && (parsed[0].name !== undefined || parsed[0].type !== undefined);
      } catch {
        return false;
      }
    }
    return false;
  };

  // If page has WordPress blocks, use WordPressBlockRenderer
  if (isWordPressBlocks(page.content)) {
    return (
      <div className="page-content">
        <WordPressBlockRenderer blocks={page.content as any} />
      </div>
    );
  }

  // If page has template blocks (old format), render as HTML
  if (typeof page.content === 'object' && page.content.blocks && Array.isArray(page.content.blocks)) {
    return (
      <div className="page-content">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
          <div>Template blocks format no longer supported. Please update content.</div>
        </article>
      </div>
    );
  }

  // If page has HTML content
  if (page.content && typeof page.content === 'string') {
    return (
      <div className="page-content">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
          {page.featuredImage && (
            <img 
              src={page.featuredImage} 
              alt={page.title}
              className="w-full h-auto rounded-lg mb-8"
            />
          )}
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        </article>
      </div>
    );
  }

  // If page has TipTap JSON content
  if (page.content && typeof page.content === 'object' && page.content.type === 'doc') {
    return (
      <div className="page-content">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
          <div className="tiptap-content">
            {/* TODO: Implement TipTap JSON renderer */}
            <p className="text-gray-500">Content rendering not yet implemented for this format.</p>
          </div>
        </article>
      </div>
    );
  }

  // Fallback for empty or unknown content
  return (
    <div className="page-content">
      <article className="prose prose-lg max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
        <p className="text-gray-500">No content available.</p>
      </article>
    </div>
  );
};

export default PageRenderer;