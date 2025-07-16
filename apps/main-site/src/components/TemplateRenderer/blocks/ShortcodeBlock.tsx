import React from 'react';
import { ShortcodeContent } from '@/utils/shortcodeParser';

interface ShortcodeBlockProps {
  content: string;
  settings?: {
    className?: string;
  };
}

const ShortcodeBlock: React.FC<ShortcodeBlockProps> = ({ content, settings }) => {
  if (!content) {
    return null;
  }

  return (
    <div className={`shortcode-block ${settings?.className || ''}`}>
      <ShortcodeContent content={content} />
    </div>
  );
};

export default ShortcodeBlock;