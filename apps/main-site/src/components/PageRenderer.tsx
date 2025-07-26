import React from 'react';
import TemplateRenderer from './TemplateRenderer';
import Footer from './home/Footer';

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
  // If page has template blocks, use TemplateRenderer
  if (typeof page.content === 'object' && page.content.blocks && Array.isArray(page.content.blocks)) {
    return (
      <div className="page-content">
        <TemplateRenderer blocks={page.content.blocks} />
        <Footer />
      </div>
    );
  }

  // If page has HTML content
  if (page.content && typeof page.content === 'string') {
    return (
      <div className="page-content">
        <div className="max-w-7xl mx-auto px-4 py-12">
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
        <Footer />
      </div>
    );
  }

  // If page has TipTap JSON content
  if (page.content && typeof page.content === 'object' && page.content.type === 'doc') {
    // This would need a TipTap renderer component
    return (
      <div className="page-content">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <article className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
            <div className="tiptap-content">
              {/* TODO: Implement TipTap JSON renderer */}
              <p className="text-gray-500">Content rendering not yet implemented for this format.</p>
            </div>
          </article>
        </div>
        <Footer />
      </div>
    );
  }

  // Fallback for empty or unknown content
  return (
    <div className="page-content">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <article className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>
          <p className="text-gray-500">No content available.</p>
        </article>
      </div>
      <Footer />
    </div>
  );
};

export default PageRenderer;