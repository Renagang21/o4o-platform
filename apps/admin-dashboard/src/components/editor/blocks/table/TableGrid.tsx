/**
 * TableGrid Component
 * Pure React table management with 2D array state and drag & drop
 */

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Plus,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Merge,
  Split,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TableCell {
  content: string;
  rowSpan?: number;
  colSpan?: number;
  align?: 'left' | 'center' | 'right';
  isHeader?: boolean;
  backgroundColor?: string;
  textColor?: string;
  isSelected?: boolean;
  isMerged?: boolean; // Cell is part of a merged range
  mergeOrigin?: { row: number; col: number }; // Points to the origin cell if this is merged
}

export interface TableData {
  rows: number;
  cols: number;
  cells: TableCell[][];
  style?: 'default' | 'striped' | 'bordered' | 'minimal';
  hasHeaderRow?: boolean;
  hasHeaderCol?: boolean;
  caption?: string;
}

export interface CellSelection {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

export interface TableGridProps {
  data: TableData;
  onChange: (data: TableData) => void;
  selection?: CellSelection;
  onSelectionChange?: (selection: CellSelection | undefined) => void;
  isSelected?: boolean;
  className?: string;
}

/**
 * Helper function to create empty cell
 */
const createEmptyCell = (isHeader = false): TableCell => ({
  content: '',
  rowSpan: 1,
  colSpan: 1,
  align: 'left',
  isHeader,
  isSelected: false,
  isMerged: false
});

/**
 * Helper function to initialize table data
 */
export const initializeTableData = (rows: number, cols: number): TableData => {
  const cells: TableCell[][] = [];

  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      cells[r][c] = createEmptyCell(r === 0); // First row as header by default
    }
  }

  return {
    rows,
    cols,
    cells,
    style: 'default',
    hasHeaderRow: true,
    hasHeaderCol: false,
    caption: ''
  };
};

/**
 * Helper function to check if cells can be merged
 */
const canMergeCells = (data: TableData, selection: CellSelection): boolean => {
  const { start, end } = selection;

  // Single cell selected
  if (start.row === end.row && start.col === end.col) {
    return false;
  }

  // Check if any cells in range are already merged
  for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r++) {
    for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c++) {
      if (data.cells[r]?.[c]?.isMerged || (data.cells[r]?.[c]?.rowSpan || 1) > 1 || (data.cells[r]?.[c]?.colSpan || 1) > 1) {
        return false;
      }
    }
  }

  return true;
};

/**
 * Main TableGrid component
 */
export const TableGrid: React.FC<TableGridProps> = ({
  data,
  onChange,
  selection,
  onSelectionChange,
  isSelected = false,
  className
}) => {
  const [draggedCell, setDraggedCell] = useState<{ row: number; col: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastClickCell, setLastClickCell] = useState<{ row: number; col: number } | null>(null);

  const tableRef = useRef<HTMLTableElement>(null);

  // Handle cell content change
  const handleCellChange = useCallback((row: number, col: number, content: string) => {
    const newData = { ...data };
    newData.cells[row][col] = { ...newData.cells[row][col], content };
    onChange(newData);
  }, [data, onChange]);

  // Handle cell click for selection
  const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    if (!onSelectionChange) return;

    if (e.shiftKey && lastClickCell) {
      // Extend selection with Shift+click
      onSelectionChange({
        start: lastClickCell,
        end: { row, col }
      });
    } else {
      // Single cell selection
      const newSelection = { start: { row, col }, end: { row, col } };
      onSelectionChange(newSelection);
      setLastClickCell({ row, col });
    }
  }, [onSelectionChange, lastClickCell]);

  // Handle cell alignment change
  const handleCellAlign = useCallback((row: number, col: number, align: 'left' | 'center' | 'right') => {
    const newData = { ...data };
    newData.cells[row][col] = { ...newData.cells[row][col], align };
    onChange(newData);
  }, [data, onChange]);

  // Add row
  const addRow = useCallback((position: 'above' | 'below', targetRow: number) => {
    const newData = { ...data };
    const newRow: TableCell[] = [];

    for (let c = 0; c < data.cols; c++) {
      newRow[c] = createEmptyCell(false);
    }

    const insertIndex = position === 'above' ? targetRow : targetRow + 1;
    newData.cells.splice(insertIndex, 0, newRow);
    newData.rows += 1;

    onChange(newData);
  }, [data, onChange]);

  // Remove row
  const removeRow = useCallback((targetRow: number) => {
    if (data.rows <= 1) return;

    const newData = { ...data };
    newData.cells.splice(targetRow, 1);
    newData.rows -= 1;

    onChange(newData);
  }, [data, onChange]);

  // Add column
  const addColumn = useCallback((position: 'left' | 'right', targetCol: number) => {
    const newData = { ...data };
    const insertIndex = position === 'left' ? targetCol : targetCol + 1;

    for (let r = 0; r < data.rows; r++) {
      const newCell = createEmptyCell(r === 0 && data.hasHeaderRow);
      newData.cells[r].splice(insertIndex, 0, newCell);
    }

    newData.cols += 1;
    onChange(newData);
  }, [data, onChange]);

  // Remove column
  const removeColumn = useCallback((targetCol: number) => {
    if (data.cols <= 1) return;

    const newData = { ...data };
    for (let r = 0; r < data.rows; r++) {
      newData.cells[r].splice(targetCol, 1);
    }

    newData.cols -= 1;
    onChange(newData);
  }, [data, onChange]);

  // Merge cells
  const mergeCells = useCallback(() => {
    if (!selection || !canMergeCells(data, selection)) return;

    const { start, end } = selection;
    const topRow = Math.min(start.row, end.row);
    const bottomRow = Math.max(start.row, end.row);
    const leftCol = Math.min(start.col, end.col);
    const rightCol = Math.max(start.col, end.col);

    const rowSpan = bottomRow - topRow + 1;
    const colSpan = rightCol - leftCol + 1;

    const newData = { ...data };

    // Combine content from all selected cells
    let combinedContent = '';
    for (let r = topRow; r <= bottomRow; r++) {
      for (let c = leftCol; c <= rightCol; c++) {
        if (newData.cells[r][c].content) {
          if (combinedContent) combinedContent += ' ';
          combinedContent += newData.cells[r][c].content;
        }
      }
    }

    // Set the origin cell with span
    newData.cells[topRow][leftCol] = {
      ...newData.cells[topRow][leftCol],
      content: combinedContent,
      rowSpan,
      colSpan,
      isMerged: false
    };

    // Mark other cells as merged and reference the origin
    for (let r = topRow; r <= bottomRow; r++) {
      for (let c = leftCol; c <= rightCol; c++) {
        if (r !== topRow || c !== leftCol) {
          newData.cells[r][c] = {
            ...createEmptyCell(),
            isMerged: true,
            mergeOrigin: { row: topRow, col: leftCol }
          };
        }
      }
    }

    onChange(newData);
    onSelectionChange?.(undefined);
  }, [data, selection, onChange, onSelectionChange]);

  // Split cell
  const splitCell = useCallback((row: number, col: number) => {
    const cell = data.cells[row][col];
    if (!cell.rowSpan || !cell.colSpan || (cell.rowSpan === 1 && cell.colSpan === 1)) return;

    const newData = { ...data };

    // Reset the origin cell
    newData.cells[row][col] = {
      ...cell,
      rowSpan: 1,
      colSpan: 1
    };

    // Restore merged cells
    for (let r = row; r < row + (cell.rowSpan || 1); r++) {
      for (let c = col; c < col + (cell.colSpan || 1); c++) {
        if (r !== row || c !== col) {
          newData.cells[r][c] = createEmptyCell(r === 0 && data.hasHeaderRow);
        }
      }
    }

    onChange(newData);
  }, [data, onChange]);

  // Check if cell is in selection
  const isCellSelected = useCallback((row: number, col: number): boolean => {
    if (!selection) return false;

    const { start, end } = selection;
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  }, [selection]);

  // Get cell styles
  const getCellStyles = useCallback((cell: TableCell, row: number, col: number) => {
    const styles: React.CSSProperties = {
      textAlign: cell.align || 'left',
      backgroundColor: cell.backgroundColor,
      color: cell.textColor
    };

    if (cell.isMerged) {
      styles.display = 'none';
    }

    return styles;
  }, []);

  // Get table style classes
  const getTableClasses = () => {
    const baseClasses = 'table-auto border-collapse w-full';

    switch (data.style) {
      case 'striped':
        return cn(baseClasses, 'table-striped');
      case 'bordered':
        return cn(baseClasses, 'table-bordered');
      case 'minimal':
        return cn(baseClasses, 'table-minimal');
      default:
        return cn(baseClasses, 'table-default');
    }
  };

  return (
    <div className={cn('table-grid-wrapper', className)}>
      <div className="overflow-auto">
        <table ref={tableRef} className={getTableClasses()}>
          {data.caption && (
            <caption className="text-sm text-gray-600 mb-2 text-left">
              {data.caption}
            </caption>
          )}

          <tbody>
            {data.cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  // Skip rendering merged cells
                  if (cell.isMerged) return null;

                  const CellTag = cell.isHeader ? 'th' : 'td';
                  const isSelected = isCellSelected(rowIndex, colIndex);

                  return (
                    <CellTag
                      key={`${rowIndex}-${colIndex}`}
                      rowSpan={cell.rowSpan || 1}
                      colSpan={cell.colSpan || 1}
                      style={getCellStyles(cell, rowIndex, colIndex)}
                      className={cn(
                        'border border-gray-300 p-2 min-w-[100px] min-h-[40px] relative',
                        'focus-within:ring-2 focus-within:ring-blue-500',
                        isSelected && 'bg-blue-50 border-blue-400',
                        cell.isHeader && 'font-medium bg-gray-50',
                        'hover:bg-gray-50'
                      )}
                      onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                    >
                      <div
                        contentEditable={isSelected}
                        suppressContentEditableWarning
                        className={cn(
                          'w-full h-full outline-none',
                          'focus:bg-white focus:ring-1 focus:ring-blue-300 focus:rounded px-1'
                        )}
                        onInput={(e) => {
                          const target = e.target as HTMLElement;
                          handleCellChange(rowIndex, colIndex, target.textContent || '');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            // Move to next row
                            if (rowIndex < data.rows - 1) {
                              handleCellClick(rowIndex + 1, colIndex, e as any);
                            }
                          } else if (e.key === 'Tab') {
                            e.preventDefault();
                            // Move to next cell
                            const nextCol = colIndex + 1;
                            const nextRow = nextCol >= data.cols ? rowIndex + 1 : rowIndex;
                            const finalCol = nextCol >= data.cols ? 0 : nextCol;

                            if (nextRow < data.rows) {
                              handleCellClick(nextRow, finalCol, e as any);
                            }
                          }
                        }}
                        style={{
                          textAlign: cell.align || 'left'
                        }}
                      >
                        {cell.content}
                      </div>

                      {/* Cell controls (show on hover when selected) */}
                      {isSelected && isSelected && (
                        <div className="absolute -top-6 -right-6 flex gap-1 z-10">
                          <div className="bg-white border border-gray-300 rounded shadow-lg p-1 flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCellAlign(rowIndex, colIndex, 'left')}
                              title="Align left"
                            >
                              <AlignLeft className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCellAlign(rowIndex, colIndex, 'center')}
                              title="Align center"
                            >
                              <AlignCenter className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCellAlign(rowIndex, colIndex, 'right')}
                              title="Align right"
                            >
                              <AlignRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CellTag>
                  );
                })}

                {/* Row controls */}
                {isSelected && (
                  <td className="border-none p-0 w-8">
                    <div className="flex flex-col gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => addRow('above', rowIndex)}
                        title="Add row above"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => addRow('below', rowIndex)}
                        title="Add row below"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      {data.rows > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={() => removeRow(rowIndex)}
                          title="Remove row"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}

            {/* Column controls */}
            {isSelected && (
              <tr>
                {Array.from({ length: data.cols }).map((_, colIndex) => (
                  <td key={colIndex} className="border-none p-0 h-8">
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => addColumn('left', colIndex)}
                        title="Add column left"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => addColumn('right', colIndex)}
                        title="Add column right"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                      {data.cols > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={() => removeColumn(colIndex)}
                          title="Remove column"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                ))}
                <td className="border-none"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Selection controls */}
      {selection && onSelectionChange && (
        <div className="mt-2 flex gap-2">
          {canMergeCells(data, selection) && (
            <Button size="sm" onClick={mergeCells}>
              <Merge className="h-3 w-3 mr-1" />
              Merge Cells
            </Button>
          )}

          {selection.start.row === selection.end.row &&
           selection.start.col === selection.end.col &&
           (data.cells[selection.start.row][selection.start.col].rowSpan || 1) > 1 ||
           (data.cells[selection.start.row][selection.start.col].colSpan || 1) > 1 && (
            <Button size="sm" onClick={() => splitCell(selection.start.row, selection.start.col)}>
              <Split className="h-3 w-3 mr-1" />
              Split Cell
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default TableGrid;