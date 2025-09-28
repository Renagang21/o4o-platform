/**
 * useTouchGestures - Touch gesture support for mobile/tablet
 * Phase 3: Interaction features
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseTouchGesturesProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  enabled?: boolean;
  swipeThreshold?: number;
  swipeVelocityThreshold?: number;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export const useTouchGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchZoom,
  onTap,
  onDoubleTap,
  enabled = true,
  swipeThreshold = 50,
  swipeVelocityThreshold = 0.3
}: UseTouchGesturesProps) => {
  const touchStartRef = useRef<TouchPoint | null>(null);
  const touchEndRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartDistanceRef = useRef<number>(0);
  const isPinchingRef = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  // Calculate distance between two touch points
  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    // Handle pinch zoom start
    if (e.touches.length === 2 && onPinchZoom) {
      isPinchingRef.current = true;
      pinchStartDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
      e.preventDefault();
      return;
    }

    // Single touch
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      touchEndRef.current = null;
    }
  }, [enabled, onPinchZoom]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    // Handle pinch zoom
    if (e.touches.length === 2 && isPinchingRef.current && onPinchZoom) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / pinchStartDistanceRef.current;
      onPinchZoom(scale);
      e.preventDefault();
      return;
    }

    // Track single touch movement
    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    }
  }, [enabled, onPinchZoom]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return;

    // End pinch zoom
    if (isPinchingRef.current) {
      isPinchingRef.current = false;
      pinchStartDistanceRef.current = 0;
      return;
    }

    const start = touchStartRef.current;
    const end = touchEndRef.current || (e.changedTouches.length > 0 ? {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
      time: Date.now()
    } : null);

    if (!start || !end) return;

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const deltaTime = end.time - start.time;
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check for tap or double tap
    if (distance < 10 && deltaTime < 200) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < 300 && onDoubleTap) {
        onDoubleTap();
        lastTapRef.current = 0;
      } else if (onTap) {
        onTap();
        lastTapRef.current = now;
      }
      return;
    }

    // Check for swipe
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    
    if (isHorizontalSwipe && Math.abs(deltaX) > swipeThreshold && velocityX > swipeVelocityThreshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else if (!isHorizontalSwipe && Math.abs(deltaY) > swipeThreshold && velocityY > swipeVelocityThreshold) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    // Reset
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [
    enabled,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    swipeThreshold,
    swipeVelocityThreshold
  ]);

  // Handle touch cancel
  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    touchEndRef.current = null;
    isPinchingRef.current = false;
    pinchStartDistanceRef.current = 0;
  }, []);

  // Set up event listeners
  const attachToElement = useCallback((element: HTMLElement | null) => {
    if (elementRef.current && elementRef.current !== element) {
      // Remove old listeners
      elementRef.current.removeEventListener('touchstart', handleTouchStart as any);
      elementRef.current.removeEventListener('touchmove', handleTouchMove as any);
      elementRef.current.removeEventListener('touchend', handleTouchEnd as any);
      elementRef.current.removeEventListener('touchcancel', handleTouchCancel);
    }

    elementRef.current = element;

    if (element && enabled) {
      // Add new listeners with passive: false for preventDefault to work
      element.addEventListener('touchstart', handleTouchStart as any, { passive: false });
      element.addEventListener('touchmove', handleTouchMove as any, { passive: false });
      element.addEventListener('touchend', handleTouchEnd as any, { passive: false });
      element.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    }

    return () => {
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart as any);
        element.removeEventListener('touchmove', handleTouchMove as any);
        element.removeEventListener('touchend', handleTouchEnd as any);
        element.removeEventListener('touchcancel', handleTouchCancel);
      }
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart as any);
        elementRef.current.removeEventListener('touchmove', handleTouchMove as any);
        elementRef.current.removeEventListener('touchend', handleTouchEnd as any);
        elementRef.current.removeEventListener('touchcancel', handleTouchCancel);
      }
    };
  }, []);

  return {
    attachToElement,
    touchIndicators: {
      isTouching: touchStartRef.current !== null,
      isPinching: isPinchingRef.current
    }
  };
};

export default useTouchGestures;