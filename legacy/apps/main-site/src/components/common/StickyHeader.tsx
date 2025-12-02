/**
 * Sticky Header Component
 * Handles sticky header behavior with shrink effect and animations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface StickyHeaderProps {
  children: React.ReactNode;
  enabled?: boolean;
  triggerHeight?: number;
  shrinkEffect?: boolean;
  shrinkHeight?: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  backgroundColor?: string;
  backgroundOpacity?: number;
  boxShadow?: boolean;
  shadowIntensity?: 'light' | 'medium' | 'strong';
  animationDuration?: number;
  hideOnScrollDown?: boolean;
  zIndex?: number;
  stickyOn?: ('above' | 'primary' | 'below')[];
  currentSection?: 'above' | 'primary' | 'below';
}

const StickyHeader: React.FC<StickyHeaderProps> = ({
  children,
  enabled = true,
  triggerHeight = 100,
  shrinkEffect = false,
  shrinkHeight = { desktop: 60, tablet: 55, mobile: 50 },
  backgroundColor = '#ffffff',
  backgroundOpacity = 1,
  boxShadow = true,
  shadowIntensity = 'medium',
  animationDuration = 300,
  hideOnScrollDown = false,
  zIndex = 999,
  stickyOn = ['primary'],
  currentSection = 'primary'
}) => {
  const [isSticky, setIsSticky] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [currentShrinkHeight, setCurrentShrinkHeight] = useState(shrinkHeight.desktop);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const originalHeight = useRef<number>(0);

  // Update shrink height based on screen size
  useEffect(() => {
    const updateShrinkHeight = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setCurrentShrinkHeight(shrinkHeight.mobile);
      } else if (width <= 1024) {
        setCurrentShrinkHeight(shrinkHeight.tablet);
      } else {
        setCurrentShrinkHeight(shrinkHeight.desktop);
      }
    };

    updateShrinkHeight();
    window.addEventListener('resize', updateShrinkHeight);
    return () => window.removeEventListener('resize', updateShrinkHeight);
  }, [shrinkHeight]);

  // Throttle function for scroll events
  const throttle = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastExecTime = 0;
    
    return (...args: any[]) => {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func(...args);
        lastExecTime = currentTime;
      } else {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func(...args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }, []);

  // Handle scroll behavior
  const handleScroll = useCallback(() => {
    if (!enabled || !stickyOn.includes(currentSection)) return;

    const scrollY = window.scrollY;
    
    // Check if should be sticky
    if (scrollY > triggerHeight) {
      setIsSticky(true);
      
      // Handle hide on scroll down
      if (hideOnScrollDown) {
        if (scrollY > lastScrollY.current && scrollY > triggerHeight + 100) {
          setIsHidden(true);
        } else {
          setIsHidden(false);
        }
      }
    } else {
      setIsSticky(false);
      setIsHidden(false);
    }
    
    lastScrollY.current = scrollY;
  }, [enabled, triggerHeight, hideOnScrollDown, stickyOn, currentSection]);

  // Set up scroll listener with throttling
  useEffect(() => {
    if (!enabled || !stickyOn.includes(currentSection)) return;

    // Store original height
    if (headerRef.current && originalHeight.current === 0) {
      originalHeight.current = headerRef.current.offsetHeight;
    }

    const throttledHandleScroll = throttle(handleScroll, 16); // ~60fps
    
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, [enabled, handleScroll, throttle, stickyOn, currentSection]);

  // Get shadow styles based on intensity
  const getShadowStyle = () => {
    if (!boxShadow || !isSticky) return 'none';
    
    switch (shadowIntensity) {
      case 'light':
        return '0 1px 3px rgba(0, 0, 0, 0.08)';
      case 'medium':
        return '0 2px 8px rgba(0, 0, 0, 0.12)';
      case 'strong':
        return '0 4px 16px rgba(0, 0, 0, 0.16)';
      default:
        return '0 2px 8px rgba(0, 0, 0, 0.12)';
    }
  };

  // Calculate dynamic height
  const getDynamicHeight = () => {
    if (!shrinkEffect || !isSticky) return 'auto';
    return `${currentShrinkHeight}px`;
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  if (!enabled || !stickyOn.includes(currentSection)) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Placeholder to prevent content jump */}
      {isSticky && (
        <div 
          ref={placeholderRef}
          style={{ 
            height: originalHeight.current || 'auto',
            visibility: 'hidden'
          }} 
        />
      )}
      
      {/* Sticky Header */}
      <div
        ref={headerRef}
        className={`sticky-header-wrapper ${isSticky ? 'is-sticky' : ''} ${isHidden ? 'is-hidden' : ''}`}
        style={{
          position: isSticky ? 'fixed' : 'relative',
          top: isHidden ? `-${originalHeight.current}px` : '0',
          left: 0,
          right: 0,
          zIndex: isSticky ? zIndex : 'auto',
          backgroundColor: isSticky ? hexToRgba(backgroundColor, backgroundOpacity) : 'transparent',
          boxShadow: getShadowStyle(),
          transition: `all ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          height: getDynamicHeight(),
          overflow: shrinkEffect && isSticky ? 'hidden' : 'visible'
        }}
      >
        <div
          className={`sticky-header-content ${shrinkEffect && isSticky ? 'is-shrunk' : ''}`}
          style={{
            transition: `transform ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            transform: shrinkEffect && isSticky ? 'scale(0.95)' : 'scale(1)',
            transformOrigin: 'center center',
            height: '100%'
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        .sticky-header-wrapper {
          will-change: transform;
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        .sticky-header-wrapper.is-sticky {
          animation: slideDown ${animationDuration}ms ease-out;
        }

        .sticky-header-wrapper.is-hidden {
          pointer-events: none;
        }

        .sticky-header-content {
          display: flex;
          align-items: center;
          height: 100%;
          width: 100%;
        }

        .sticky-header-content.is-shrunk {
          /* Logo and text scaling for shrink effect */
        }

        .sticky-header-content.is-shrunk img {
          max-height: calc(100% - 20px);
          transition: max-height ${animationDuration}ms ease;
        }

        .sticky-header-content.is-shrunk .menu-item {
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          transition: padding ${animationDuration}ms ease;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .sticky-header-wrapper,
          .sticky-header-content {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default StickyHeader;