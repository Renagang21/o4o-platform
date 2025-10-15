import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface MarkdownReaderBlockProps {
  block: MainSiteBlock;
}

/**
 * Markdown Reader Block Component
 * Renders markdown content that was parsed and saved by the editor
 */
export const MarkdownReaderBlock: FC<MarkdownReaderBlockProps> = ({ block }) => {
  const { data } = block;

  // Extract saved markdown content (already parsed to HTML by the save function)
  const markdownContent = data?.markdownContent;
  const fontSize = data?.fontSize || 16;
  const theme = data?.theme || 'github';

  if (!markdownContent) {
    return null;
  }

  // Build class names following WordPress/Gutenberg conventions
  const classNames = [
    'wp-block-markdown-reader',
    `markdown-theme-${theme}`,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      style={{ fontSize: `${fontSize}px` }}
      dangerouslySetInnerHTML={{ __html: markdownContent }}
    />
  );
};
