/**
 * Slide Mock Data
 * M3: Temporary dummy data for editor preview ONLY
 *
 * ⚠️ DELETE IN M6: This file is temporary scaffolding
 * Real data will come from block attributes
 */

import type { Slide } from '@o4o/slide-app';

/**
 * Mock slides for editor preview when attributes.slides is empty
 * Used ONLY in SlidePreview.tsx as fallback
 */
export const mockSlides: Slide[] = [
  {
    id: 'mock-1',
    type: 'text',
    title: 'Preview Slide 1',
    subtitle: 'Editor Preview Mode',
    content: 'This is a temporary mock slide for editor preview. Add real slides using the block controls.',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: 'mock-2',
    type: 'text',
    title: 'Preview Slide 2',
    subtitle: 'Configuration Options',
    content: 'Use the sidebar panel to configure autoplay, loop, pagination, and navigation settings.',
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: 'mock-3',
    type: 'text',
    title: 'Preview Slide 3',
    subtitle: 'Accessibility Features',
    content: 'SlideApp includes WCAG 2.2 compliance, keyboard navigation, and screen reader support.',
    backgroundColor: '#f59e0b',
    textColor: '#ffffff',
    visible: true,
  },
];
