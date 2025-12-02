import { CSSProperties, FC } from 'react';
import DOMPurify from 'dompurify';
import { ShortcodeRenderer } from '@o4o/shortcodes';

interface ParagraphBlockProps {
  text?: string;
  content?: string; // AI-generated blocks use "content"
  alignment?: 'left' | 'center' | 'right';
  settings?: {
    fontSize?: string;
    color?: string;
    marginBottom?: string;
    processShortcodes?: boolean;
  };
}

const ParagraphBlock: FC<ParagraphBlockProps> = ({
  text,
  content,
  alignment = 'left',
  settings = {}
}) => {
  // Support both "text" and "content" props
  const paragraphText = content || text || '';
  const style: CSSProperties = {
    textAlign: alignment,
    fontSize: settings.fontSize || '1rem',
    color: settings.color || 'inherit',
    marginBottom: settings.marginBottom || '1rem',
  };

  // Process shortcodes if enabled
  if (settings.processShortcodes !== false) {
    return (
      <div
        className="paragraph-block"
        style={style}
      >
        <ShortcodeRenderer content={paragraphText} />
      </div>
    );
  }

  return (
    <p
      className="paragraph-block"
      style={style}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraphText) }}
    />
  );
};

export default ParagraphBlock;