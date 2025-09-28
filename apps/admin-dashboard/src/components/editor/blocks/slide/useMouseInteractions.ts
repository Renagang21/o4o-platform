/**
 * useMouseInteractions - Mouse wheel and hover interactions
 * Phase 3: Interaction features
 */

import { useEffect, useCallback, useRef } from 'react';

interface UseMouseInteractionsProps {
  onWheelNext?: () => void;
  onWheelPrev?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  enabled?: boolean;
  wheelThreshold?: number;
  wheelDebounceMs?: number;
  pauseOnHover?: boolean;
}

export const useMouseInteractions = ({
  onWheelNext,
  onWheelPrev,
  onHoverStart,
  onHoverEnd,
  enabled = true,
  wheelThreshold = 50,
  wheelDebounceMs = 300,
  pauseOnHover = true
}: UseMouseInteractionsProps) => {
  const lastWheelTime = useRef<number>(0);
  const wheelDelta = useRef<number>(0);
  const isHovering = useRef<boolean>(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse wheel
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastWheel = now - lastWheelTime.current;

    // Clear previous timeout
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }

    // Accumulate wheel delta
    if (timeSinceLastWheel < wheelDebounceMs) {
      wheelDelta.current += e.deltaY;
    } else {
      wheelDelta.current = e.deltaY;
    }

    lastWheelTime.current = now;

    // Set new timeout to process accumulated delta
    wheelTimeoutRef.current = setTimeout(() => {
      if (Math.abs(wheelDelta.current) >= wheelThreshold) {
        if (wheelDelta.current > 0 && onWheelNext) {
          onWheelNext();
        } else if (wheelDelta.current < 0 && onWheelPrev) {
          onWheelPrev();
        }
      }
      wheelDelta.current = 0;
    }, wheelDebounceMs);

    // Prevent default scrolling
    e.preventDefault();
  }, [enabled, onWheelNext, onWheelPrev, wheelThreshold, wheelDebounceMs]);

  // Handle mouse enter
  const handleMouseEnter = useCallback(() => {
    if (!enabled || !pauseOnHover) return;
    
    isHovering.current = true;
    if (onHoverStart) {
      onHoverStart();
    }
  }, [enabled, pauseOnHover, onHoverStart]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!enabled || !pauseOnHover) return;
    
    isHovering.current = false;
    if (onHoverEnd) {
      onHoverEnd();
    }
  }, [enabled, pauseOnHover, onHoverEnd]);

  // Attach to element
  const attachToElement = useCallback((element: HTMLElement | null) => {
    // Remove old listeners
    if (elementRef.current && elementRef.current !== element) {
      elementRef.current.removeEventListener('wheel', handleWheel);
      elementRef.current.removeEventListener('mouseenter', handleMouseEnter);
      elementRef.current.removeEventListener('mouseleave', handleMouseLeave);
    }

    elementRef.current = element;

    // Add new listeners
    if (element && enabled) {
      element.addEventListener('wheel', handleWheel, { passive: false });
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (element) {
        element.removeEventListener('wheel', handleWheel);
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [enabled, handleWheel, handleMouseEnter, handleMouseLeave]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('wheel', handleWheel);
        elementRef.current.removeEventListener('mouseenter', handleMouseEnter);
        elementRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

  return {
    attachToElement,
    isHovering: isHovering.current
  };
};

export default useMouseInteractions;