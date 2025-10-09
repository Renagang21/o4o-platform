/**
 * ImageToolbar Component
 * 이미지 블록 툴바
 */

import React from 'react';
import { Replace, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageToolbarProps {
  linkTo: 'none' | 'media' | 'custom';
  onReplace: () => void;
  onToggleLink: () => void;
  onDelete: () => void;
}

const ImageToolbar: React.FC<ImageToolbarProps> = ({
  linkTo,
  onReplace,
  onToggleLink,
  onDelete
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onReplace}
        className="h-7 px-2 text-xs"
      >
        <Replace className="h-3 w-3 mr-1" />
        Replace
      </Button>

      <div className="w-px h-4 bg-gray-300" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleLink}
        className={cn("h-7 px-2 text-xs", linkTo === 'media' && "bg-blue-100")}
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        Link to Media
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Remove
      </Button>
    </div>
  );
};

export default ImageToolbar;
