import { FC } from 'react';
import { BlockRenderer } from '@o4o/block-renderer';
import { useCustomizerSettings } from '../hooks/useCustomizerSettings';

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
  const { currentWidth, currentPadding } = useCustomizerSettings();

  // Prepare content for BlockRenderer
  const getContentForRenderer = () => {
    // Check blocks field first (from API response)
    // If blocks is empty array, use content instead
    let contentToRender = (page.blocks && page.blocks.length > 0) ? page.blocks : page.content;

    // Parse JSON string if needed (content might be stored as JSON string in DB)
    if (typeof contentToRender === 'string') {
      // Check if it's a JSON array string
      const trimmed = contentToRender.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          contentToRender = JSON.parse(contentToRender);
        } catch (e) {
          console.error('[PageRenderer] Failed to parse JSON:', e);
        }
      }
      // Check if it's a JSON object string
      else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          contentToRender = JSON.parse(contentToRender);
        } catch (e) {
          console.error('[PageRenderer] Failed to parse JSON:', e);
        }
      }
    }

    return contentToRender;
  };

  const renderContent = () => {
    const content = getContentForRenderer();

    // If content is a string (HTML), render as HTML
    if (content && typeof content === 'string') {
      return <div dangerouslySetInnerHTML={{ __html: content }} />;
    }

    // If content is an array of blocks or a single block object, use BlockRenderer
    if (content && typeof content === 'object') {
      return <BlockRenderer blocks={content} />;
    }

    return <p className="text-gray-500">콘텐츠가 없습니다.</p>;
  };

  return (
    <div className="page-content mx-auto py-10" style={{
      maxWidth: `${currentWidth}px`,
      paddingLeft: `${currentPadding.left}px`,
      paddingRight: `${currentPadding.right}px`,
    }}>
      <article>
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