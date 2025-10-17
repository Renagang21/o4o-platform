/**
 * TypeScript interfaces for EditorHeader components
 */

/**
 * Main EditorHeader component props
 */
export interface EditorHeaderProps {
  // Document state
  postTitle: string;
  postStatus: 'draft' | 'publish' | 'pending' | 'private' | 'scheduled';
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;

  // Responsive breakpoints
  isMobile: boolean;
  isTablet: boolean;

  // Document handlers
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onSave: (publish?: boolean) => Promise<void>;
  onPublish: () => Promise<void>;
  onPreview: () => Promise<void>;

  // Sidebar
  sidebarOpen: boolean;
  onToggleSidebar: () => void;

  // Project-specific features (O4O)
  onOpenDesignLibrary: () => void;
  onOpenAIGenerator: () => void;

  // Additional features
  onToggleListView?: () => void;
  showListView?: boolean;

  // Viewport/Theme preview (passed through to RightControls)
  viewportMode?: string;
  onViewportChange?: (mode: string) => void;
  containerWidth?: number;
  isThemePreviewMode?: boolean;
  onToggleThemePreview?: () => void;
  onOpenCustomizer?: () => void;

  // Post data loaded state (for disabling settings button)
  isPostDataLoaded?: boolean;
  isNewPost?: boolean;
}

/**
 * LeftControls component props
 */
export interface LeftControlsProps {
  isMobile: boolean;
  isTablet: boolean;
  onBack: () => void;
  onOpenDesignLibrary: () => void;
  onOpenAIGenerator: () => void;
}

/**
 * CenterControls component props
 */
export interface CenterControlsProps {
  postTitle: string;
  postStatus: 'draft' | 'publish' | 'pending' | 'private' | 'scheduled';
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  isMobile: boolean;
}

/**
 * RightControls component props
 */
export interface RightControlsProps {
  isMobile: boolean;
  isTablet: boolean;
  isSaving: boolean;
  isDirty: boolean;
  sidebarOpen: boolean;
  showListView?: boolean;

  // Handlers
  onSave: (publish?: boolean) => Promise<void>;
  onPublish: () => Promise<void>;
  onPreview: () => Promise<void>;
  onToggleSidebar: () => void;
  onToggleListView?: () => void;

  // Publish button label
  postStatus: 'draft' | 'publish' | 'pending' | 'private' | 'scheduled';

  // Viewport/Theme preview
  viewportMode?: string;
  onViewportChange?: (mode: string) => void;
  containerWidth?: number;
  isThemePreviewMode?: boolean;
  onToggleThemePreview?: () => void;
  onOpenCustomizer?: () => void;

  // Post data loaded state
  isPostDataLoaded?: boolean;
  isNewPost?: boolean;
}
