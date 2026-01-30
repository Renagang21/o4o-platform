import { FC, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

export interface RowAction {
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  isDelete?: boolean;
  isDisabled?: boolean;
}

interface RowActionsProps {
  actions: RowAction[];
  visible?: boolean;
}

/**
 * WordPress-style Row Actions Component
 * Shows action links below table rows on hover
 */
export const RowActions: FC<RowActionsProps> = ({ actions, visible = false }) => {
  const [isVisible, setIsVisible] = useState(visible);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  return (
    <div 
      ref={containerRef}
      className={clsx(
        'row-actions',
        !isVisible && 'hidden'
      )}
    >
      {actions.map((action, index) => {
        const isLast = index === actions.length - 1;
        
        if (action.href) {
          return (
            <span key={index}>
              <Link
                to={action.href}
                className={clsx(
                  'row-action-link',
                  action.isDelete && 'text-red-600 hover:text-red-800',
                  action.isDisabled && 'opacity-50 cursor-not-allowed',
                  action.className
                )}
                onClick={action.isDisabled ? (e) => e.preventDefault() : undefined}
              >
                {action.label}
              </Link>
              {!isLast && <span className="text-gray-400 mx-1">|</span>}
            </span>
          );
        } else {
          return (
            <span key={index}>
              <button
                onClick={action.onClick}
                disabled={action.isDisabled}
                className={clsx(
                  'row-action-button',
                  action.isDelete && 'text-red-600 hover:text-red-800',
                  action.isDisabled && 'opacity-50 cursor-not-allowed',
                  action.className
                )}
              >
                {action.label}
              </button>
              {!isLast && <span className="text-gray-400 mx-1">|</span>}
            </span>
          );
        }
      })}
    </div>
  );
};

/**
 * Hook to manage row actions visibility
 */
export const useRowActions = () => {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleMouseEnter = (rowId: string) => {
    setHoveredRow(rowId);
  };

  const handleMouseLeave = () => {
    setHoveredRow(null);
  };

  const isRowHovered = (rowId: string) => {
    return hoveredRow === rowId;
  };

  return {
    hoveredRow,
    handleMouseEnter,
    handleMouseLeave,
    isRowHovered
  };
};

export default RowActions;