/**
 * CenterControls Component
 * Center section of the editor header showing document status and list view toggle.
 * REFINED: On mobile and tablet, most controls are hidden for a cleaner UI.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CenterControlsProps } from './types';
import { FormatListBulleted } from '@mui/icons-material';

export const CenterControls: React.FC<CenterControlsProps> = ({
  postStatus,
  isSaving,
  isDirty,
  lastSaved,
  isMobile,
  isTablet, // Added prop for tablet detection
  onToggleListView,
  showListView,
}) => {
  const isSmallScreen = isMobile || isTablet;

  return (
    <div
      className={cn(
        'flex-1 flex items-center justify-center gap-2 min-w-0 px-2'
      )}
    >
      {/* --- List View Toggle --- */}
      {/* Always show on all screen sizes */}
      {onToggleListView && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleListView}
                className={cn(
                  'h-8 w-8 text-gray-700',
                  showListView && 'bg-blue-100 text-blue-600'
                )}
              >
                <FormatListBulleted sx={{ fontSize: 20 }} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Document Overview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* --- Document Status --- */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        {/* Save Status Indicator - Hidden on mobile and tablet */}
        {!isSmallScreen && (
          <div className="text-xs h-4">
            {isSaving ? (
              <span className="text-gray-500 flex items-center gap-1">
                <div className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                Saving...
              </span>
            ) : isDirty ? (
              <span className="text-orange-600">Unsaved changes</span>
            ) : lastSaved ? (
              <span className="text-gray-500">
                Saved
              </span>
            ) : (
              <span /> // Empty space to prevent layout shift
            )}
          </div>
        )}
      </div>

      {/* Status Badge - Hidden on mobile and tablet */}
      {!isSmallScreen && postStatus && (
        <Badge
          variant={postStatus === 'publish' ? 'default' : 'secondary'}
          className="capitalize flex-shrink-0"
        >
          {postStatus}
        </Badge>
      )}
    </div>
  );
};
