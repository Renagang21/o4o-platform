/**
 * RightControls Component
 * Right section of the editor header containing actions and settings.
 * REFINED: On mobile and tablet, most controls are moved into the 'More' menu.
 */

import React from 'react';
import {
  Save,
  Visibility,
  Settings,
  Close,
  DesktopWindows,
  DesktopMac,
  Palette,
  MoreVert,
  Info,
  LibraryBooks,
} from '@mui/icons-material';
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
import { Sparkles } from 'lucide-react';

export const RightControls: React.FC<RightControlsProps> = ({
  isMobile,
  isTablet,
  isSaving,
  isDirty,
  sidebarOpen,
  postStatus,
  viewportMode,
  onViewportChange,
  containerWidth,
  isThemePreviewMode,
  onToggleThemePreview,
  onOpenCustomizer,
  onOpenDesignLibrary,
  onOpenAIGenerator,
  onSave,
  onPreview,
  onToggleSidebar,
  isPostDataLoaded,
  isNewPost,
}) => {
  const isSmallScreen = isMobile || isTablet;

  return (
    <div className="flex items-center flex-shrink-0 gap-1">
      {/* --- DESKTOP-ONLY CONTROLS --- */}
      {!isSmallScreen && (
        <>
          {/* Viewport Switcher */}
          {viewportMode && onViewportChange && containerWidth !== undefined && (
            <ViewportSwitcher
              currentMode={viewportMode}
              onModeChange={onViewportChange}
              containerWidth={containerWidth}
            />
          )}

          {/* Save Draft */}
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
                <Save sx={{ fontSize: 14, marginRight: '8px' }} />
                Save draft
              </>
            )}
          </Button>

          {/* Preview */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-700"
                  onClick={onPreview}
                >
                  <Visibility sx={{ fontSize: 18 }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preview</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      {/* --- ALWAYS VISIBLE (Primary Actions) --- */}

      {/* Publish/Update Button */}
      <Button
        size="sm"
        onClick={() => onSave(true)}
        disabled={isSaving}
        className="font-medium"
      >
        {postStatus === 'publish' ? 'Update' : 'Publish'}
      </Button>

      {/* Theme Preview Toggle (Desktop only) */}
      {!isSmallScreen && onToggleThemePreview && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-700"
                onClick={onToggleThemePreview}
              >
                {isThemePreviewMode ? (
                  <DesktopMac sx={{ fontSize: 20 }} />
                ) : (
                  <DesktopWindows sx={{ fontSize: 20 }} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isThemePreviewMode ? 'Disable Theme Preview' : 'Enable Theme Preview'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Customizer (Desktop only) */}
      {!isSmallScreen && onOpenCustomizer && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-700"
                onClick={onOpenCustomizer}
              >
                <Palette sx={{ fontSize: 20 }} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Customizer</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Settings Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-700"
              onClick={onToggleSidebar}
              disabled={!isPostDataLoaded && !isNewPost}
            >
              {sidebarOpen ? (
                <Close sx={{ fontSize: 20 }} />
              ) : (
                <Settings sx={{ fontSize: 20 }} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{sidebarOpen ? 'Close settings' : 'Settings'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* --- MORE OPTIONS MENU --- */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-700">
            <MoreVert sx={{ fontSize: 20 }} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* --- SMALL SCREEN ITEMS --- */}
          {isSmallScreen && (
            <>
              <DropdownMenuItem onClick={() => onSave(false)} disabled={isSaving || !isDirty}>
                  <Save sx={{ fontSize: 16, marginRight: '8px' }} />
                  Save draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onPreview}>
                <Visibility sx={{ fontSize: 16, marginRight: '8px' }} />
                Preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onOpenDesignLibrary && (
                  <DropdownMenuItem onClick={onOpenDesignLibrary}>
                      <LibraryBooks sx={{ fontSize: 16, marginRight: '8px' }} />
                      Design Library
                  </DropdownMenuItem>
              )}
              {onOpenAIGenerator && (
                   <DropdownMenuItem onClick={onOpenAIGenerator}>
                      <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                      AI Page Generator
                  </DropdownMenuItem>
              )}
              {onToggleThemePreview && (
                <DropdownMenuItem onClick={onToggleThemePreview}>
                     {isThemePreviewMode ? <DesktopMac sx={{ fontSize: 16, marginRight: '8px' }}/> : <DesktopWindows sx={{ fontSize: 16, marginRight: '8px' }}/>}
                    {isThemePreviewMode ? 'Disable Theme Preview' : 'Enable Theme Preview'}
                </DropdownMenuItem>
              )}
              {onOpenCustomizer && (
                <DropdownMenuItem onClick={onOpenCustomizer}>
                    <Palette sx={{ fontSize: 16, marginRight: '8px' }} />
                    Customizer
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
            </>
          )}

          {/* --- DESKTOP & SMALL SCREEN ITEMS --- */}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem>Copy all blocks</DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Info sx={{ fontSize: 16, marginRight: '8px' }} />
            Keyboard shortcuts
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
