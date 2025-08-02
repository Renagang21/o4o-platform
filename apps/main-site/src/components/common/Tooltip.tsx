import { useState, useEffect, useRef, FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';
export type TooltipVariant = 'light' | 'dark';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  variant?: TooltipVariant;
  className?: string;
  delay?: number;
  maxWidth?: number;
}

const Tooltip: FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  variant = 'dark',
  className,
  delay = 200,
  maxWidth = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  let timeout: NodeJS.Timeout;

  const showTooltip = () => {
    timeout = setTimeout(() => {
      if (triggerRef.current && tooltipRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            top = triggerRect.top - tooltipRect.height - 8 + scrollTop;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + scrollLeft;
            break;
          case 'right':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + scrollTop;
            left = triggerRect.right + 8 + scrollLeft;
            break;
          case 'bottom':
            top = triggerRect.bottom + 8 + scrollTop;
            left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2 + scrollLeft;
            break;
          case 'left':
            top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2 + scrollTop;
            left = triggerRect.left - tooltipRect.width - 8 + scrollLeft;
            break;
        }

        setTooltipPosition({ top, left });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    clearTimeout(timeout);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  const variantStyles = {
    light: 'bg-white text-gray-900 border border-gray-200 shadow-lg',
    dark: 'bg-gray-900 text-white',
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <div
      ref={triggerRef}
      className="inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={twMerge(
            'fixed z-50 px-3 py-2 text-sm rounded-lg',
            variantStyles[variant],
            className
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth: maxWidth,
          }}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip; 