/**
 * Slide Block Component Exports
 * Complete Phase 1-4 Implementation
 */

// Core Components
export { default as SlideBlock } from './SlideBlock';
export { default as SlideBlockComplete } from './SlideBlockComplete';
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

// Phase 4 Components
export { default as VideoSlide } from './VideoSlide';
export { default as SlideLink, LinkEditor } from './SlideLink';
export { default as SlideTemplates } from './SlideTemplates';
export { SlideTiming, SlideTimingManager } from './SlideTiming';
export { default as SlideConditional, evaluateSlideConditions } from './SlideConditional';
export { default as SlideGroups } from './SlideGroups';

// Hooks
export { default as useKeyboardNavigation } from './useKeyboardNavigation';
export { default as useTouchGestures } from './useTouchGestures';
export { default as useMouseInteractions } from './useMouseInteractions';

// Types
export * from './types';

// Convenience export for the complete implementation
export const SlidePresentation = SlideBlockComplete;