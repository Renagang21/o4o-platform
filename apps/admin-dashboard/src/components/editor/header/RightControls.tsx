/**
 * RightControls Component
 * Right section of the editor header containing actions and settings
 */

import React from 'react';
import {
  Eye,
  Save,
  Settings2,
  X,
  List,
  Monitor,
  MonitorOff,
  Palette,
  MoreVertical,
  Library,
  Sparkles,
  Plus,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ViewportSwitcher } from '@/components/editor/ViewportSwitcher';
import type { RightControlsProps } from './types';

export const RightControls: React.FC<RightControlsProps> = ({
  isMobile,
  isTablet,
  isSaving,
  isDirty,
  sidebarOpen,
  showListView,
  postStatus,
  viewportMode,
  onViewportChange,
  containerWidth,
  isThemePreviewMode,
  onToggleThemePreview,
  onOpenCustomizer,
  onSave,
  onPublish,
  onPreview,
  onToggleSidebar,
  onToggleListView,
  isPostDataLoaded,
  isNewPost,
}) => {
  return (
    <div
      className={cn(
        'flex items-center flex-shrink-0',
        isMobile ? 'gap-0' : isTablet ? 'gap-0.5' : 'gap-1'
      )}
    >
      {/* List View - Hidden on mobile */}
      {!isMobile && onToggleListView && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={onToggleListView}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>List view</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Viewport Switcher - Hidden on mobile */}
      {!isMobile && viewportMode && onViewportChange && containerWidth !== undefined && (
        <ViewportSwitcher
          currentMode={viewportMode}
          onModeChange={onViewportChange}
          containerWidth={containerWidth}
        />
      )}

      {/* Theme Preview Mode Toggle */}
      {onToggleThemePreview && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  isMobile ? 'h-8 w-8' : 'h-9 w-9',
                  isThemePreviewMode && 'bg-blue-100 text-blue-600'
                )}
                onClick={onToggleThemePreview}
              >
                {isThemePreviewMode ? (
                  <Monitor className="h-4 w-4" />
                ) : (
                  <MonitorOff className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isThemePreviewMode ? 'Disable' : 'Enable'} theme width preview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Customizer Button */}
      {onOpenCustomizer && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={isMobile ? 'h-8 w-8' : 'h-9 w-9'}
                onClick={onOpenCustomizer}
              >
                <Palette className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>사용자 정의하기</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Preview - Hidden on mobile */}
      {!isMobile && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={onPreview}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Preview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Save Draft */}
      {!isMobile ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSave(false)}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? (
            <>
              <div className="animate-spin h-3 w-3 border-2 border-gray-500 border-t-transparent rounded-full mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-2" />
              Save draft
            </>
          )}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onSave(false)}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? (
            <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-transparent rounded-full" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Publish/Update Button - PRIMARY ACTION */}
      <Button
        size="sm"
        onClick={() => onSave(true)}
        disabled={isSaving}
        className="font-medium"
      >
        {postStatus === 'publish' ? 'Update' : 'Publish'}
      </Button>

      {/* Settings Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={isMobile ? 'h-8 w-8' : 'h-9 w-9'}
              onClick={onToggleSidebar}
              disabled={!isPostDataLoaded && !isNewPost}
            >
              {sidebarOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Settings2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{sidebarOpen ? 'Close settings' : 'Settings'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* More Options Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={isMobile ? 'h-8 w-8' : 'h-9 w-9'}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Mobile-only: Show Preview in menu */}
          {isMobile && (
            <>
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Tablet/Mobile: Show Design Library and AI Generator in menu */}
          {(isMobile || isTablet) && (
            <>
              <DropdownMenuItem onClick={() => {/* onOpenDesignLibrary will be passed from parent */}}>
                <Library className="h-4 w-4 mr-2" />
                디자인 라이브러리
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {/* onOpenAIGenerator will be passed from parent */}}>
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                AI 페이지 생성
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem>
            <Plus className="h-4 w-4 mr-2" />
            Add template
          </DropdownMenuItem>
          <DropdownMenuItem>Add media</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Copy all blocks</DropdownMenuItem>
          <DropdownMenuItem>Export</DropdownMenuItem>

          {!isMobile && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Info className="h-4 w-4 mr-2" />
                Keyboard shortcuts
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
