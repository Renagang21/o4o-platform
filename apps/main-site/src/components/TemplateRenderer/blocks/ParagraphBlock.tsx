import React from 'react';
import DOMPurify from 'dompurify';
import { shortcodeParser } from '@/utils/shortcodeParser';

interface ParagraphBlockProps {
  text: string;
  alignment?: 'left' | 'center' | 'right';
  settings?: {
    fontSize?: string;
    color?: string;
    marginBottom?: string;
    processShortcodes?: boolean;
  };
}

const ParagraphBlock: React.FC<ParagraphBlockProps> = ({ 
  text, 
  alignment = 'left',
  settings = {}
}) => {
  const style: React.CSSProperties = {
    textAlign: alignment,
    fontSize: settings.fontSize || '1rem',
    color: settings.color || 'inherit',
    marginBottom: settings.marginBottom || '1rem',
  };

  // Process shortcodes if enabled
  if (settings.processShortcodes !== false) {
    const parsedContent = shortcodeParser.parseAsElement(text);
    return (
      <div 
        className="paragraph-block"
        style={style}
      >
        {parsedContent}
      </div>
    );
  }

  return (
    <p 
      className="paragraph-block"
      style={style}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(text) }}
    />
  );
};

export default ParagraphBlock;