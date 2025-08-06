/**
 * Mobile Touch Handler Component
 * Optimizes block editor for touch devices
 */

import { FC, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { 
  MoreVertical, 
  Copy, 
  Trash2, 
  ChevronUp, 
  ChevronDown,
  GripVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface MobileTouchHandlerProps {
  onMove?: (direction: 'up' | 'down') => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

export const MobileTouchHandler: FC<MobileTouchHandlerProps> = ({
  onMove,
  onDuplicate,
  onDelete,
  children
}) => {
  const [isTouching, setIsTouching] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const touchTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if device is touch-enabled
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Handle long press
  const handleTouchStart = () => {
    if (!isTouchDevice) return;
    
    setIsTouching(true);
    touchTimer.current = setTimeout(() => {
      setShowControls(true);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    setIsTouching(false);
    if (touchTimer.current) {
      clearTimeout(touchTimer.current);
    }
  };

  // Hide controls when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowControls(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (!isTouchDevice) {
    return <>{children}</>;
  }

  return (
    <div 
      ref={containerRef}
      className="touch-block-wrapper relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Touch controls overlay */}
      {showControls && (
        <div className="absolute -left-12 top-0 z-10 flex flex-col gap-1">
          {/* Drag handle */}
          <Button
            size="sm"
            variant="ghost"
            className="touch-none h-8 w-8 p-0"
            onTouchStart={(e) => {
              e.preventDefault();
              // Initialize drag
            }}
          >
            <GripVertical className="h-4 w-4" />
          </Button>

          {/* Move up */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onMove?.('up')}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>

          {/* Move down */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onMove?.('down')}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Long press indicator */}
      {isTouching && !showControls && (
        <div className="absolute inset-0 bg-blue-500 opacity-10 pointer-events-none animate-pulse" />
      )}

      {children}
    </div>
  );
};

interface TouchScrollOptimizationProps {
  children: React.ReactNode;
}

export const TouchScrollOptimization: FC<TouchScrollOptimizationProps> = ({ children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Optimize scrolling performance
    const handleScrollStart = () => {
      element.style.willChange = 'transform';
      
      // Reduce render complexity during scroll
      element.classList.add('scrolling-active');
    };

    const handleScrollEnd = () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      scrollTimeout.current = setTimeout(() => {
        element.style.willChange = 'auto';
        element.classList.remove('scrolling-active');
      }, 150);
    };

    element.addEventListener('touchstart', handleScrollStart, { passive: true });
    element.addEventListener('scroll', handleScrollEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleScrollStart);
      element.removeEventListener('scroll', handleScrollEnd);
    };
  }, []);

  return (
    <div 
      ref={scrollRef}
      className="touch-scroll-container"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
    >
      {children}
      
      <style>{`
        .touch-scroll-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        
        .scrolling-active .wp-block {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        @media (hover: none) and (pointer: coarse) {
          /* Touch-specific styles */
          .wp-block {
            min-height: 44px; /* Minimum touch target size */
            position: relative;
          }
          
          .block-editor-button-block-appender {
            min-height: 44px;
            font-size: 16px; /* Prevent zoom on iOS */
          }
          
          .components-button {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Larger drop zones for touch */
          .block-editor-block-drop-zone {
            height: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileTouchHandler;