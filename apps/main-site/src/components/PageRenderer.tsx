import { FC } from 'react';

interface Page {
  id: string;
  title: string;
  slug: string;
  content: any;
  blocks?: any;
  template?: string;
  featuredImage?: string;
}

interface PageRendererProps {
  page: Page;
}

const PageRenderer: FC<PageRendererProps> = ({ page }) => {
  // Simple rendering logic - prioritize displaying content
  const renderContent = () => {
    // Check blocks field first (from API response)
    const contentToRender = page.blocks || page.content;

    // If content is a string, render as HTML
    if (contentToRender && typeof contentToRender === 'string') {
      return <div dangerouslySetInnerHTML={{ __html: contentToRender }} />;
    }

    // If content is JSON (TipTap or other format), convert to string
    if (contentToRender && typeof contentToRender === 'object') {
      // Try to extract text content from TipTap format
      if (contentToRender.type === 'doc' && contentToRender.content) {
        // Simple extraction of text from TipTap nodes
        const extractText = (nodes: any[]): string => {
          return nodes.map(node => {
            if (node.type === 'text') return node.text;
            if (node.type === 'paragraph' && node.content) {
              return `<p>${extractText(node.content)}</p>`;
            }
            if (node.type === 'heading' && node.content) {
              const level = node.attrs?.level || 2;
              return `<h${level}>${extractText(node.content)}</h${level}>`;
            }
            if (node.content) return extractText(node.content);
            return '';
          }).join('');
        };

        const htmlContent = extractText(contentToRender.content);
        if (htmlContent) {
          return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
        }
      }

      // If it's WordPress blocks format, render each block
      if (Array.isArray(contentToRender)) {
        const htmlContent = contentToRender
          .map(block => {
            // Handle different block types
            if (block.type === 'core/paragraph') {
              const text = block.content?.text ?? block.innerHTML ?? '';
              // Render even empty paragraphs for proper spacing
              return `<p>${text}</p>`;
            }

            if (block.type === 'core/heading') {
              const level = block.attributes?.level || 2;
              const text = block.content?.text ?? block.innerHTML ?? '';
              // Render heading even if text is empty (for spacing/structure)
              return `<h${level}>${text}</h${level}>`;
            }

            if (block.type === 'core/list') {
              const items = block.content?.items || [];
              const tag = block.attributes?.ordered ? 'ol' : 'ul';
              const listItems = items.map((item: string) => `<li>${item}</li>`).join('');
              return listItems ? `<${tag}>${listItems}</${tag}>` : '';
            }

            if (block.type === 'core/image') {
              const src = block.attributes?.url || block.content?.url || '';
              const alt = block.attributes?.alt || block.content?.alt || '';
              return src ? `<img src="${src}" alt="${alt}" class="w-full h-auto rounded-lg" />` : '';
            }

            if (block.type === 'core/quote') {
              const text = block.content?.text ?? block.innerHTML ?? '';
              const citation = block.attributes?.citation || '';
              return text !== undefined ? `<blockquote>${text}${citation ? `<cite>${citation}</cite>` : ''}</blockquote>` : '';
            }

            // Fallback for other block types
            if (block.innerHTML !== undefined) return block.innerHTML;
            if (block.attributes?.content !== undefined) return block.attributes.content;
            if (block.content?.text !== undefined) return `<div>${block.content.text}</div>`;

            return '';
          })
          .filter(html => html !== '')
          .join('');

        // Always render the container, even if empty
        return <div dangerouslySetInnerHTML={{ __html: htmlContent || '' }} />;
      }
    }

    return <p className="text-gray-500">콘텐츠가 없습니다.</p>;
  };

  return (
    <div className="page-content">
      <article className="prose prose-lg max-w-none">
        {/* Always show title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{page.title}</h1>

        {/* Show featured image if available */}
        {page.featuredImage && (
          <img
            src={page.featuredImage}
            alt={page.title}
            className="w-full h-auto rounded-lg mb-8"
          />
        )}

        {/* Render content with simplified logic */}
        {renderContent()}
      </article>
    </div>
  );
};

export default PageRenderer;