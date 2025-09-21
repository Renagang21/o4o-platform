/**
 * TableBlock Component
 * Complete table block with React-based management, cell merging, and CSV support
 */

import React, { useState, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { TableGrid, initializeTableData, TableData, CellSelection } from './table/TableGrid';
import { DataProcessor } from './table/DataProcessor';
import { cn } from '@/lib/utils';
import {
  Table,
  Settings,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import './table/table-styles.css';

interface TableBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    tableData?: TableData;
    caption?: string;
    style?: 'default' | 'striped' | 'bordered' | 'minimal';
    hasHeaderRow?: boolean;
    hasHeaderCol?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
    theme?: 'default' | 'blue' | 'green' | 'purple' | 'red';
    alignment?: 'left' | 'center' | 'right';
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

const STYLE_OPTIONS = [
  { value: 'default', label: 'Default', description: 'Standard table with borders' },
  { value: 'striped', label: 'Striped', description: 'Alternating row colors' },
  { value: 'bordered', label: 'Bordered', description: 'Heavy borders' },
  { value: 'minimal', label: 'Minimal', description: 'Clean, minimal styling' }
];

const THEME_OPTIONS = [
  { value: 'default', label: 'Default', color: '#6b7280' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#10b981' },
  { value: 'purple', label: 'Purple', color: '#8b5cf6' },
  { value: 'red', label: 'Red', color: '#ef4444' }
];

const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', size: '14px' },
  { value: 'medium', label: 'Medium', size: '16px' },
  { value: 'large', label: 'Large', size: '18px' }
];

const TableBlock: React.FC<TableBlockProps> = ({
  id,
  content,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const {
    tableData: initialTableData,
    caption = '',
    style = 'default',
    hasHeaderRow = true,
    hasHeaderCol = false,
    fontSize = 'medium',
    theme = 'default',
    alignment = 'left'
  } = attributes;

  const [tableData, setTableData] = useState<TableData>(
    initialTableData || initializeTableData(3, 3)
  );
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Sync with external changes
  useEffect(() => {
    if (initialTableData) {
      setTableData(initialTableData);
    }
  }, [initialTableData]);

  // Update attributes helper
  const updateAttributes = (updates: Partial<typeof attributes>) => {
    const newAttributes = { ...attributes, ...updates };
    onChange(JSON.stringify(tableData), newAttributes);
  };

  // Handle table data change
  const handleTableDataChange = (newData: TableData) => {
    setTableData(newData);
    updateAttributes({ tableData: newData });
  };

  // Handle table import
  const handleTableImport = (importedData: TableData) => {
    setTableData(importedData);
    updateAttributes({
      tableData: importedData,
      caption: importedData.caption || caption
    });
  };

  // Handle style change
  const handleStyleChange = (newStyle: string) => {
    const newData = { ...tableData, style: newStyle as any };
    setTableData(newData);
    updateAttributes({
      tableData: newData,
      style: newStyle as any
    });
  };

  // Handle caption change
  const handleCaptionChange = (newCaption: string) => {
    const newData = { ...tableData, caption: newCaption };
    setTableData(newData);
    updateAttributes({
      tableData: newData,
      caption: newCaption
    });
  };

  // Handle header settings change
  const handleHeaderRowChange = (hasHeader: boolean) => {
    const newData = { ...tableData, hasHeaderRow: hasHeader };

    // Update first row cells to be headers or not
    if (newData.cells[0]) {
      newData.cells[0].forEach(cell => {
        cell.isHeader = hasHeader;
      });
    }

    setTableData(newData);
    updateAttributes({
      tableData: newData,
      hasHeaderRow: hasHeader
    });
  };

  const handleHeaderColChange = (hasHeader: boolean) => {
    const newData = { ...tableData, hasHeaderCol: hasHeader };

    // Update first column cells to be headers or not
    newData.cells.forEach(row => {
      if (row[0]) {
        row[0].isHeader = hasHeader;
      }
    });

    setTableData(newData);
    updateAttributes({
      tableData: newData,
      hasHeaderCol: hasHeader
    });
  };

  // Get table wrapper classes
  const getTableWrapperClasses = () => {
    return cn(
      'table-grid-wrapper',
      `table-theme-${theme}`,
      `font-size-${fontSize}`,
      `align-${alignment}`
    );
  };

  // Get font size style
  const getFontSizeStyle = () => {
    const sizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    return { fontSize: sizeMap[fontSize] };
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="table"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onChangeType={onChangeType}
      currentType="core/table"
      customToolbarContent={
        isSelected ? (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Style Selector */}
            <Select value={style} onValueChange={handleStyleChange}>
              <SelectTrigger className="w-32 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Table className="h-3 w-3" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-px h-4 bg-gray-300" />

            {/* Data Processor */}
            <DataProcessor
              data={tableData}
              onImport={handleTableImport}
            />

            <div className="w-px h-4 bg-gray-300" />

            {/* Settings Toggle */}
            <Button
              variant={showSettings ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </Button>

            {/* Table Info */}
            <div className="text-xs text-gray-500">
              {tableData.rows} × {tableData.cols}
            </div>
          </div>
        ) : null
      }
      customSidebarContent={
        isSelected && showSettings ? (
          <div className="space-y-4">
            {/* Caption */}
            <div>
              <Label className="text-sm font-medium">Table Caption</Label>
              <Input
                value={tableData.caption || ''}
                onChange={(e) => handleCaptionChange(e.target.value)}
                placeholder="Enter table caption..."
                className="mt-1 text-xs"
              />
              <p className="text-xs text-gray-500 mt-1">
                Improves accessibility and SEO
              </p>
            </div>

            {/* Table Style */}
            <div>
              <Label className="text-sm font-medium">Style</Label>
              <Select value={style} onValueChange={handleStyleChange}>
                <SelectTrigger className="w-full mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-gray-500">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Theme */}
            <div>
              <Label className="text-sm font-medium">Color Theme</Label>
              <Select value={theme} onValueChange={(value) => updateAttributes({ theme: value })}>
                <SelectTrigger className="w-full mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded border"
                          style={{ backgroundColor: option.color }}
                        />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div>
              <Label className="text-sm font-medium">Font Size</Label>
              <Select value={fontSize} onValueChange={(value) => updateAttributes({ fontSize: value })}>
                <SelectTrigger className="w-full mt-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Type className="h-3 w-3" />
                        {option.label} ({option.size})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table Alignment */}
            <div>
              <Label className="text-sm font-medium">Table Alignment</Label>
              <div className="flex gap-1 mt-1">
                {[
                  { value: 'left', icon: AlignLeft, label: 'Left' },
                  { value: 'center', icon: AlignCenter, label: 'Center' },
                  { value: 'right', icon: AlignRight, label: 'Right' }
                ].map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={alignment === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateAttributes({ alignment: value })}
                    className="flex-1 text-xs h-8"
                    title={label}
                  >
                    <Icon className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Header Settings */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium">Header Options</Label>

              <div className="space-y-3 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tableData.hasHeaderRow}
                    onChange={(e) => handleHeaderRowChange(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs">Header row</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tableData.hasHeaderCol}
                    onChange={(e) => handleHeaderColChange(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs">Header column</span>
                </label>
              </div>
            </div>

            {/* Table Statistics */}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-gray-700">Table Info</Label>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Dimensions:</span>
                  <span>{tableData.rows} × {tableData.cols}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total cells:</span>
                  <span>{tableData.rows * tableData.cols}</span>
                </div>
                <div className="flex justify-between">
                  <span>Style:</span>
                  <span className="capitalize">{style}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null
      }
    >
      <div className={getTableWrapperClasses()} style={getFontSizeStyle()}>
        <TableGrid
          data={tableData}
          onChange={handleTableDataChange}
          selection={selection}
          onSelectionChange={setSelection}
          isSelected={isSelected}
        />

        {/* Empty state */}
        {tableData.rows === 0 || tableData.cols === 0 ? (
          <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <Table className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Empty Table</h3>
            <p className="text-sm">Use the toolbar to add rows and columns or import CSV data.</p>
          </div>
        ) : null}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default TableBlock;