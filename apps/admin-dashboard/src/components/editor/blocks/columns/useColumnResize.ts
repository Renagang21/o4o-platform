/**
 * useColumnResize Hook
 * 컬럼 드래그 리사이즈 로직
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseColumnResizeProps {
  leftIndex: number;
  rightIndex: number;
  columnWidths: number[];
  onResize: (newWidths: number[]) => void;
  minWidth?: number;
}

export function useColumnResize({
  leftIndex,
  rightIndex,
  columnWidths,
  onResize,
  minWidth = 10,
}: UseColumnResizeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthsRef = useRef<number[]>([]);
  const containerWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthsRef.current = [...columnWidths];

    // Get container width
    const columnsContainer = (e.target as HTMLElement).closest('.wp-block-columns');
    if (columnsContainer) {
      containerWidthRef.current = columnsContainer.clientWidth;
    }
  }, [columnWidths]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startXRef.current;
    const deltaPercent = (deltaX / containerWidthRef.current) * 100;

    const newWidths = [...startWidthsRef.current];

    // Calculate new widths
    const newLeftWidth = Math.max(minWidth, Math.min(100 - minWidth, startWidthsRef.current[leftIndex] + deltaPercent));
    const newRightWidth = Math.max(minWidth, Math.min(100 - minWidth, startWidthsRef.current[rightIndex] - deltaPercent));

    // Check if both widths are valid
    if (newLeftWidth >= minWidth && newRightWidth >= minWidth) {
      newWidths[leftIndex] = newLeftWidth;
      newWidths[rightIndex] = newRightWidth;

      // Ensure total is 100%
      const total = newWidths.reduce((sum, w) => sum + w, 0);
      if (Math.abs(total - 100) > 0.01) {
        const factor = 100 / total;
        for (let i = 0; i < newWidths.length; i++) {
          newWidths[i] *= factor;
        }
      }

      onResize(newWidths);
    }
  }, [isDragging, leftIndex, rightIndex, minWidth, onResize]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Add/remove event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    handleMouseDown,
  };
}
