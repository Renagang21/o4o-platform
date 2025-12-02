import { FC } from 'react';

interface HTMLBlockProps {
  data?: {
    html?: string;
    className?: string;
  };
  className?: string;
}

/**
 * HTMLBlock component for rendering custom HTML in template parts
 * Note: HTML is sanitized on the backend before storage
 */
export const HTMLBlock: FC<HTMLBlockProps> = ({ data, className }) => {
  const html = data?.html || '';
  const customClass = data?.className || className || '';

  if (!html) {
    return null;
  }

  return (
    <div
      className={`html-block ${customClass}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default HTMLBlock;
