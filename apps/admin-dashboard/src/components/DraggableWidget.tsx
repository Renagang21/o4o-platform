import React, { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  id: string;
  title: string;
  children: React.ReactNode;
  isCollapsible?: boolean;
  isClosable?: boolean;
  onClose?: (id: string) => void;
  defaultCollapsed?: boolean;
}

const DraggableWidget: React.FC<DraggableWidgetProps> = ({
  id,
  title,
  children,
  isCollapsible = true,
  isClosable = false,
  onClose,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('widgetId', id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClose = () => {
    if (onClose) {
      onClose(id);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "wp-card transition-all duration-200",
        isDragging && "opacity-50 scale-[0.98]",
        "hover:shadow-lg"
      )}
    >
      <div className="wp-card-header flex items-center justify-between cursor-move select-none">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {isCollapsible && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              className={cn(
                "p-1 rounded transition-colors",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "text-neutral-500 hover:text-neutral-700",
                "dark:text-neutral-400 dark:hover:text-neutral-200"
              )}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
          {isClosable && onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className={cn(
                "p-1 rounded transition-colors",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "text-neutral-500 hover:text-error-600",
                "dark:text-neutral-400 dark:hover:text-error-400"
              )}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="wp-card-body">
          {children}
        </div>
      )}
    </div>
  );
};

interface WidgetContainerProps {
  children: React.ReactNode;
  onReorder: (fromIndex: number, toIndex: number) => void;
  columns?: number;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  children,
  onReorder,
  columns = 2,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('widgetId');
    
    // Find the index of the dragged widget
    const childrenArray = React.Children.toArray(children);
    const draggedIndex = childrenArray.findIndex(
      (child: any) => child.props.id === draggedId
    );

    if (draggedIndex !== -1 && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }

    setDragOverIndex(null);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const gridColumns = {
    1: 'grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  }[columns] || 'lg:grid-cols-2';

  return (
    <div className={cn("grid grid-cols-1 gap-6", gridColumns)}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative transition-all duration-200",
            dragOverIndex === index && "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-neutral-900"
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export default DraggableWidget;