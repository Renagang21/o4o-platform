/**
 * EditorHeader Component
 * Main header component for the Gutenberg-style block editor
 *
 * Layout: [LeftControls] [CenterControls] [RightControls]
 * Height: 55px (Gutenberg standard)
 * Padding: 12px 16px (8px vertical, 16px horizontal)
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
  onPublish,
  onPreview,
  onToggleSidebar,
  sidebarOpen,

  // Project-specific features
  onOpenDesignLibrary,
  onOpenAIGenerator,

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
        isMobile ? 'px-2 py-2' : 'px-3 py-2' // Responsive padding
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
        />
      </div>

      {/* Center Section: Flexible and truncates */}
      <div className="flex-1 min-w-0 px-4">
        <CenterControls
          postTitle={postTitle}
          postStatus={postStatus}
          isSaving={isSaving}
          isDirty={isDirty}
          lastSaved={lastSaved}
          isMobile={isMobile}
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
          showListView={showListView}
          postStatus={postStatus}
          viewportMode={viewportMode}
          onViewportChange={onViewportChange}
          containerWidth={containerWidth}
          isThemePreviewMode={isThemePreviewMode}
          onToggleThemePreview={onToggleThemePreview}
          onOpenCustomizer={onOpenCustomizer}
          onSave={onSave}
          onPublish={onPublish}
          onPreview={onPreview}
          onToggleSidebar={onToggleSidebar}
          onToggleListView={onToggleListView}
          isPostDataLoaded={isPostDataLoaded}
          isNewPost={isNewPost}
        />
      </div>
    </div>
  );
};

export default EditorHeader;
