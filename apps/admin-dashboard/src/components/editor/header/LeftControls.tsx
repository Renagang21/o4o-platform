/**
 * LeftControls Component
 * Left section of the editor header containing navigation and primary tools
 */

import React from 'react';
// UPDATED: Using Material-UI icons, which are already in the project dependencies
import {
  ArrowBack,
  Add,
  CollectionsBookmark,
  AutoAwesome,
} from '@mui/icons-material';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LeftControlsProps } from './types';

// TODO: Extend props to include onAddBlock, onUndo, onRedo from the editor's core

export const LeftControls: React.FC<LeftControlsProps> = ({
  isMobile,
  isTablet,
  onBack,
  onOpenDesignLibrary,
  onOpenAIGenerator,
  onOpenBlockInserter,
}) => {
  return (
    <div className={cn('flex items-center', isMobile ? 'gap-0' : 'gap-1')}>
      {/* Back to Dashboard */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-700"
              onClick={onBack}
            >
              {/* FIXED: Replaced lucide-react icon with MUI icon */}
              <ArrowBack sx={{ fontSize: 18 }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Back to dashboard</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* WordPress Logo - Clickable for back navigation */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center hover:from-blue-700 hover:to-blue-800 p-0"
              onClick={onBack}
            >
              <span className="text-white font-bold text-sm">W</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Back to dashboard</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Separator */}
      <div className="w-[1px] h-6 bg-gray-200 mx-2" />

      {/* Add Block Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-700"
              onClick={() => {
                if (onOpenBlockInserter) {
                  onOpenBlockInserter();
                } else {
                  // Fallback: dispatch custom event for GutenbergBlockEditor to listen
                  window.dispatchEvent(new CustomEvent('open-block-inserter'));
                }
              }}
            >
              <Add sx={{ fontSize: 20 }} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add block</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Separator - only show if custom buttons are visible */}
      {!isMobile && !isTablet && <div className="w-[1px] h-6 bg-gray-200 mx-2" />}

      {/* --- Custom Controls --- */}
      
      {/* Design Library - Hidden on mobile/tablet */}
      {!isMobile && !isTablet && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenDesignLibrary}
          className="h-8 px-3 text-gray-700 hover:bg-gray-100 border border-gray-300"
        >
          {/* FIXED: Replaced lucide-react icon */}
          <CollectionsBookmark sx={{ fontSize: 16, marginRight: '6px' }} />
          디자인 라이브러리
        </Button>
      )}

      {/* AI Page Generator - Hidden on mobile/tablet */}
      {!isMobile && !isTablet && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenAIGenerator}
          className="h-8 px-3 hover:bg-gray-100 border border-gray-300 text-purple-600 hover:text-purple-700"
        >
          {/* FIXED: Replaced lucide-react icon */}
          <AutoAwesome sx={{ fontSize: 16, marginRight: '6px' }} />
          AI 페이지 생성
        </Button>
      )}
    </div>
  );
};
