/**
 * BlockAIToolbar Component
 * Phase 2-C: Block-level AI editing toolbar
 *
 * Shows on block hover with quick AI actions
 */

import React from 'react';
import { Sparkles, FileText, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BlockAIToolbarProps {
  blockId: string;
  onAIEdit: () => void;
  onImprove: () => void;
  onTranslate: () => void;
  isVisible?: boolean;
  className?: string;
}

export const BlockAIToolbar: React.FC<BlockAIToolbarProps> = ({
  blockId,
  onAIEdit,
  onImprove,
  onTranslate,
  isVisible = true,
  className,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "absolute top-0 right-0 z-10",
        "flex items-center gap-1 p-1",
        "bg-white rounded-lg shadow-lg border border-gray-200",
        "transform translate-x-1 -translate-y-1",
        "opacity-0 group-hover:opacity-100",
        "transition-all duration-200",
        "pointer-events-none group-hover:pointer-events-auto",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* AI Edit Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAIEdit();
        }}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5",
          "text-xs font-medium text-purple-700",
          "hover:bg-purple-50 rounded-md transition-colors",
          "whitespace-nowrap"
        )}
        title="AI로 블록 편집"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI편집</span>
      </button>

      {/* Improve Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onImprove();
        }}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5",
          "text-xs font-medium text-blue-700",
          "hover:bg-blue-50 rounded-md transition-colors",
          "whitespace-nowrap"
        )}
        title="텍스트 개선"
      >
        <FileText className="w-3.5 h-3.5" />
        <span>개선</span>
      </button>

      {/* Translate Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTranslate();
        }}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5",
          "text-xs font-medium text-green-700",
          "hover:bg-green-50 rounded-md transition-colors",
          "whitespace-nowrap"
        )}
        title="번역"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>번역</span>
      </button>
    </div>
  );
};

export default BlockAIToolbar;
