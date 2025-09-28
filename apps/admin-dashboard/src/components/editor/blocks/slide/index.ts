/**
 * Slide Block Component Exports
 * Phase 3: Complete Slide System with Interactions
 */

// Core Components
export { default as SlideBlock } from './SlideBlock';
export { default as SlideEditor } from './SlideEditor';
export { default as AdvancedSlideEditor } from './AdvancedSlideEditor';
export { default as SlideViewer } from './SlideViewer';
export { default as EnhancedSlideViewer } from './EnhancedSlideViewer';

// Navigation Components
export { default as BasicNavigation } from './BasicNavigation';
export { default as SlideSortableList } from './SlideSortableList';
export { default as BulkEditPanel } from './BulkEditPanel';

// Progress & Loading Components
export { 
  SlideProgress, 
  SlideLoading, 
  ImageLoader 
} from './SlideProgress';

// Accessibility Components
export {
  SlideAnnouncer,
  FocusTrap,
  SkipLinks,
  ReducedMotion,
  AudioDescription,
  SlideErrorBoundary
} from './SlideAccessibility';

// Hooks
export { default as useKeyboardNavigation } from './useKeyboardNavigation';
export { default as useTouchGestures } from './useTouchGestures';
export { default as useMouseInteractions } from './useMouseInteractions';

// Types
export type { 
  Slide, 
  SlideBlockAttributes 
} from './types';