/**
 * LeftControls Component
 * Left section of the editor header containing navigation and primary tools
 */

import React from 'react';
import { ArrowLeft, Library, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LeftControlsProps } from './types';

export const LeftControls: React.FC<LeftControlsProps> = ({
  isMobile,
  isTablet,
  onBack,
  onOpenDesignLibrary,
  onOpenAIGenerator,
}) => {
  return (
    <div
      className={cn(
        'flex items-center',
        isMobile ? 'gap-1 flex-1' : 'gap-2'
      )}
    >
      {/* Back to Dashboard */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                isMobile ? 'h-8 w-8' : 'h-9 w-9',
                'text-gray-700'
              )}
              onClick={onBack}
            >
              <ArrowLeft className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Back to dashboard</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* WordPress Logo */}
      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded flex items-center justify-center">
        <span className="text-white font-bold text-sm">W</span>
      </div>

      {/* Design Library - Hidden on mobile/tablet */}
      {!isMobile && !isTablet && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenDesignLibrary}
          className="h-8 px-3 text-gray-700 hover:bg-gray-100 border border-gray-300"
        >
          <Library className="h-4 w-4 mr-1.5" />
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
          <Sparkles className="h-4 w-4 mr-1.5" />
          AI 페이지 생성
        </Button>
      )}
    </div>
  );
};
