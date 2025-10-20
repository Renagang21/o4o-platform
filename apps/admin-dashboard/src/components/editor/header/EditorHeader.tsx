/**
 * EditorHeader Component
 * Main header component for the Gutenberg-style block editor
 *
 * Layout: [LeftControls] [CenterControls] [RightControls]
 * Height: 55px (Gutenberg standard)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { LeftControls } from './LeftControls';
import { CenterControls } from './CenterControls';
import { RightControls } from './RightControls';
import type { EditorHeaderProps } from './types';

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  // Document state
  postTitle,
  postStatus,
  isSaving,
  isDirty,
  lastSaved,

  // Responsive
  isMobile,
  isTablet,

  // Handlers
  onTitleChange,
  onBack,
  onSave,
  onPreview,
  onToggleSidebar,
  sidebarOpen,

  // Project-specific features
  onOpenDesignLibrary,
  onOpenAIGenerator,
  onOpenBlockInserter,

  // Additional features
  onToggleListView,
  showListView,

  // Viewport/Theme preview
  viewportMode,
  onViewportChange,
  containerWidth,
  isThemePreviewMode,
  onToggleThemePreview,
  onOpenCustomizer,

  // Post data loaded state
  isPostDataLoaded,
  isNewPost,
}) => {
  return (
    <div
      className={cn(
        'bg-white border-b border-gray-200 flex items-center overflow-hidden relative z-40',
        'h-[55px]', // Gutenberg standard height
        isMobile ? 'px-2 py-2' : 'px-4 py-2' // Adjusted padding
      )}
      style={{ isolation: 'isolate' }}
    >
      {/* Left Section: Fixed size */}
      <div className="flex-shrink-0">
        <LeftControls
          isMobile={isMobile}
          isTablet={isTablet}
          onBack={onBack}
          onOpenDesignLibrary={onOpenDesignLibrary}
          onOpenAIGenerator={onOpenAIGenerator}
          onOpenBlockInserter={onOpenBlockInserter}
        />
      </div>

      {/* Center Section: Flexible, contains secondary controls */}
      {/* FIXED: Removed redundant padding that was causing layout squeeze */}
      <div className="flex-1 min-w-0">
        <CenterControls
          postStatus={postStatus}
          isSaving={isSaving}
          isDirty={isDirty}
          lastSaved={lastSaved}
          isMobile={isMobile}
          isTablet={isTablet}
          onToggleListView={onToggleListView}
          showListView={showListView}
        />
      </div>

      {/* Right Section: Fixed size */}
      <div className="flex-shrink-0">
        <RightControls
          isMobile={isMobile}
          isTablet={isTablet}
          isSaving={isSaving}
          isDirty={isDirty}
          sidebarOpen={sidebarOpen}
          postStatus={postStatus}
          viewportMode={viewportMode}
          onViewportChange={onViewportChange}
          containerWidth={containerWidth}
          isThemePreviewMode={isThemePreviewMode}
          onToggleThemePreview={onToggleThemePreview}
          onOpenCustomizer={onOpenCustomizer}
          onOpenDesignLibrary={onOpenDesignLibrary}
          onOpenAIGenerator={onOpenAIGenerator}
          onSave={onSave}
          onPreview={onPreview}
          onToggleSidebar={onToggleSidebar}
          isPostDataLoaded={isPostDataLoaded}
          isNewPost={isNewPost}
        />
      </div>
    </div>
  );
};

export default EditorHeader;
