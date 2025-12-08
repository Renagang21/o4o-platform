/**
 * useScrollDepthTracker - Hook for tracking scroll depth on posts
 *
 * Tracks when users scroll to 25%, 50%, 75%, and 100% of content.
 * Useful for understanding engagement depth with cosmetics reviews.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { forumEventTracker } from './forumEventTracker';

interface UseScrollDepthTrackerOptions {
  postId: string;
  thresholds?: number[];
  enabled?: boolean;
}

export function useScrollDepthTracker({
  postId,
  thresholds = [25, 50, 75, 100],
  enabled = true,
}: UseScrollDepthTrackerOptions) {
  const trackedThresholds = useRef<Set<number>>(new Set());
  const contentRef = useRef<HTMLElement | null>(null);

  const calculateScrollDepth = useCallback(() => {
    if (!contentRef.current || !enabled) return;

    const element = contentRef.current;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const elementHeight = element.offsetHeight;

    // Calculate how much of the element has been scrolled past
    const scrolledPast = windowHeight - rect.top;
    const visibleHeight = Math.min(scrolledPast, elementHeight);
    const scrollPercentage = Math.round((visibleHeight / elementHeight) * 100);

    // Track thresholds that have been reached
    thresholds.forEach((threshold) => {
      if (scrollPercentage >= threshold && !trackedThresholds.current.has(threshold)) {
        trackedThresholds.current.add(threshold);
        forumEventTracker.trackScrollDepth(postId, threshold);
      }
    });
  }, [postId, thresholds, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Reset tracked thresholds when postId changes
    trackedThresholds.current = new Set();

    const handleScroll = () => {
      requestAnimationFrame(calculateScrollDepth);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Initial check
    calculateScrollDepth();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [calculateScrollDepth, enabled, postId]);

  // Ref callback to set the content element
  const setContentRef = useCallback((element: HTMLElement | null) => {
    contentRef.current = element;
    if (element) {
      calculateScrollDepth();
    }
  }, [calculateScrollDepth]);

  return { setContentRef };
}

export default useScrollDepthTracker;
