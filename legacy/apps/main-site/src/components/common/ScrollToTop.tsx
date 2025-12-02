/**
 * Scroll to Top Button Component
 * Displays a button to scroll back to the top of the page
 */

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopProps {
  enabled?: boolean;
  displayType?: 'desktop' | 'mobile' | 'both';
  threshold?: number;
  backgroundColor?: string;
  iconColor?: string;
  position?: 'left' | 'right';
}

const ScrollToTop: React.FC<ScrollToTopProps> = ({
  enabled = true,
  displayType = 'both',
  threshold = 300,
  backgroundColor = '#333',
  iconColor = '#ffffff',
  position = 'right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const toggleVisibility = () => {
      if (window.scrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Check initial state
    toggleVisibility();

    // Add scroll event listener
    window.addEventListener('scroll', toggleVisibility);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [enabled, threshold]);

  const scrollToTop = () => {
    setIsScrolling(true);
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Reset scrolling state after animation
    setTimeout(() => {
      setIsScrolling(false);
    }, 600);
  };

  if (!enabled) return null;

  return (
    <>
      <button
        className={`scroll-to-top ${isVisible ? 'visible' : ''} ${isScrolling ? 'scrolling' : ''} display-${displayType} position-${position}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Scroll to top"
        style={{
          backgroundColor: backgroundColor,
          color: iconColor
        }}
      >
        <ChevronUp className="scroll-icon" size={24} />
      </button>

      <style>{`
        .scroll-to-top {
          position: fixed;
          bottom: 30px;
          width: 48px;
          height: 48px;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          visibility: hidden;
          transition: all 0.3s ease;
          z-index: 999;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .scroll-to-top.position-right {
          right: 30px;
        }
        
        .scroll-to-top.position-left {
          left: 30px;
        }
        
        .scroll-to-top:hover {
          filter: brightness(1.2);
          transform: translateY(-3px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .scroll-to-top:active {
          transform: translateY(-1px);
        }

        .scroll-to-top.visible {
          opacity: 0.9;
          visibility: visible;
        }

        .scroll-to-top.scrolling {
          animation: pulse 0.6s ease-in-out;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        /* Display type controls */
        @media (min-width: 768px) {
          .scroll-to-top.display-mobile {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .scroll-to-top.display-desktop {
            display: none !important;
          }
          
          .scroll-to-top {
            bottom: 20px;
            right: 20px;
            width: 44px;
            height: 44px;
          }
        }

        /* Accessibility - Focus styles */
        .scroll-to-top:focus {
          outline: 2px solid #007cba;
          outline-offset: 2px;
        }

        /* Reduced motion preference */
        @media (prefers-reduced-motion: reduce) {
          .scroll-to-top {
            transition: opacity 0.2s ease;
          }
          
          .scroll-to-top:hover {
            transform: none;
          }
        }
      `}</style>
    </>
  );
};

export default ScrollToTop;