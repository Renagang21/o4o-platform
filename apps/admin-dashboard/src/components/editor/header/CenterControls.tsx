/**
 * CenterControls Component
 * Center section of the editor header showing document info and status
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CenterControlsProps } from './types';

export const CenterControls: React.FC<CenterControlsProps> = ({
  postTitle,
  postStatus,
  isSaving,
  isDirty,
  lastSaved,
  isMobile,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-3',
      isMobile ? 'flex-1 min-w-0' : 'flex-1 max-w-md min-w-0'
    )}>
      {/* Document Title Display - Hidden on mobile (title is in GutenbergBlockEditor) */}
      {!isMobile && postTitle && (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {postTitle || 'Untitled'}
          </p>
        </div>
      )}

      {/* Status Badge - Hidden on mobile */}
      {!isMobile && (
        <Badge
          variant={postStatus === 'publish' ? 'default' : 'secondary'}
          className="capitalize flex-shrink-0"
        >
          {postStatus}
        </Badge>
      )}

      {/* Save Status Indicator - Hidden on mobile */}
      {!isMobile && (
        <div className="flex-shrink-0">
          {isSaving ? (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
              Saving...
            </span>
          ) : isDirty ? (
            <span className="text-xs text-orange-600">Unsaved changes</span>
          ) : lastSaved ? (
            <span className="text-xs text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};
