/**
 * Link Field Display Component
 * Displays a formatted link with title and target
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import type { LinkValue } from '../../types/acf.types';

interface LinkFieldDisplayProps {
  value?: LinkValue | null;
  className?: string;
  showIcon?: boolean;
}

export const LinkFieldDisplay: React.FC<LinkFieldDisplayProps> = ({
  value,
  className = '',
  showIcon = true,
}) => {
  if (!value || !value.url) {
    return <span className="text-gray-400 text-sm">No link set</span>;
  }

  const displayText = value.title || value.url;
  const isExternal = value.target === '_blank';

  return (
    <a
      href={value.url}
      target={value.target || '_self'}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className={`
        text-blue-600 hover:text-blue-800 hover:underline
        inline-flex items-center gap-1
        ${className}
      `}
    >
      {displayText}
      {showIcon && isExternal && (
        <ExternalLink className="w-4 h-4 flex-shrink-0" />
      )}
    </a>
  );
};

export default LinkFieldDisplay;
