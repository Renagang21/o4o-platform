/**
 * Standard Columns Block
 * 표준 템플릿 기반의 컬럼 레이아웃 블록
 */

import { useState, useCallback } from 'react';
import { 
  Columns,
  Plus,
  Minus,
  LayoutGrid
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { cn } from '@/lib/utils';

interface ColumnData {
  id: string;
  width: number;
  content: any[];
}

interface ColumnsBlockProps extends StandardBlockProps {
  attributes?: {
    columns: ColumnData[];
    gap?: number;
    verticalAlignment?: 'top' | 'center' | 'bottom' | 'stretch';
    stackOnMobile?: boolean;
    backgroundColor?: string;
    padding?: number;
    borderRadius?: number;
    minHeight?: number;
  };
}

const columnsConfig: StandardBlockConfig = {
  type: 'columns',
  icon: Columns,
  category: 'layout',
  title: 'Columns',
  description: 'Add a block that displays content in multiple columns.',
  keywords: ['columns', 'layout', 'grid', 'multi-column'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const COLUMN_LAYOUTS = [
  { columns: 2, widths: [50, 50], label: '50 / 50', icon: '▢ ▢' },
  { columns: 3, widths: [33.33, 33.33, 33.33], label: '33 / 33 / 33', icon: '▢ ▢ ▢' },
  { columns: 2, widths: [66.67, 33.33], label: '66 / 33', icon: '▬ ▢' },
  { columns: 2, widths: [33.33, 66.67], label: '33 / 66', icon: '▢ ▬' },
  { columns: 4, widths: [25, 25, 25, 25], label: '25 / 25 / 25 / 25', icon: '▢▢▢▢' },
  { columns: 3, widths: [50, 25, 25], label: '50 / 25 / 25', icon: '▬▢▢' }
];

const StandardColumnsBlock: React.FC<ColumnsBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected, onAddBlock } = props;
  
  const defaultColumns = [
    { id: 'col-1', width: 50, content: [] },
    { id: 'col-2', width: 50, content: [] }
  ];
  
  const defaultAttributes = {
    columns: defaultColumns,
    gap: 20,
    verticalAlignment: 'top',
    stackOnMobile: true,
    backgroundColor: '',
    padding: 0,
    borderRadius: 0,
    minHeight: 0
  };
  
  const {
    columns,
    gap,
    verticalAlignment,
    stackOnMobile,
    backgroundColor,
    padding,
    borderRadius,
    minHeight
  } = { ...defaultAttributes, ...attributes };


  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Add column
  const addColumn = () => {
    if (columns.length < 6) {
      const newColumn: ColumnData = {
        id: `col-${Date.now()}`,
        width: Math.floor(100 / (columns.length + 1)),
        content: []
      };
      
      // Redistribute widths
      const redistributedColumns = columns.map((col: ColumnData) => ({
        ...col,
        width: Math.floor(100 / (columns.length + 1))
      }));
      
      updateAttribute('columns', [...redistributedColumns, newColumn]);
    }
  };

  // Remove column
  const removeColumn = (columnId: string) => {
    if (columns.length > 1) {
      const filteredColumns = columns.filter(col => col.id !== columnId);
      // Redistribute widths
      const redistributedColumns = filteredColumns.map((col: ColumnData) => ({
        ...col,
        width: Math.floor(100 / filteredColumns.length)
      }));
      updateAttribute('columns', redistributedColumns);
    }
  };

  // Update column width
  const updateColumnWidth = (columnId: string, width: number) => {
    const updatedColumns = columns.map((col: ColumnData) =>
      col.id === columnId ? { ...col, width } : col
    );
    updateAttribute('columns', updatedColumns);
  };

  // Apply layout preset
  const applyLayout = (layout: typeof COLUMN_LAYOUTS[0]) => {
    const newColumns = layout.widths.map((width, index) => ({
      id: `col-${Date.now()}-${index}`,
      width,
      content: columns[index]?.content || []
    }));
    updateAttribute('columns', newColumns);
  };

  // Layout selector dropdown
  const LayoutSelector = () => (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm" className="h-9 px-2">
          <LayoutGrid className="h-4 w-4 mr-1" />
          <span className="text-xs">Layout</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {COLUMN_LAYOUTS.map((layout, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => applyLayout(layout)}
            className="flex items-center justify-between"
          >
            <span className="font-mono text-xs mr-2">{layout.icon}</span>
            <span className="text-xs">{layout.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <LayoutSelector />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={addColumn}
        disabled={columns.length >= 6}
        className="h-9 px-2"
        title="Add column"
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => removeColumn(columns[columns.length - 1]?.id)}
        disabled={columns.length <= 1}
        className="h-9 px-2"
        title="Remove column"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Layout Settings</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="gap" className="text-xs text-gray-600">Column Gap (px)</Label>
            <div className="mt-1 space-y-2">
              <Slider
                min={0}
                max={60}
                step={5}
                value={[gap]}
                onValueChange={([value]) => updateAttribute('gap', value)}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">{gap}px</div>
            </div>
          </div>

          <div>
            <Label htmlFor="verticalAlignment" className="text-xs text-gray-600">Vertical Alignment</Label>
            <Select value={verticalAlignment} onValueChange={(value) => updateAttribute('verticalAlignment', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
                <SelectItem value="stretch">Stretch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="minHeight" className="text-xs text-gray-600">Min Height (px)</Label>
            <Input
              id="minHeight"
              type="number"
              min="0"
              value={minHeight}
              onChange={(e) => updateAttribute('minHeight', parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Column Widths</Label>
        <div className="mt-2 space-y-2">
          {columns.map((column: ColumnData, index: number) => (
            <div key={column.id} className="flex items-center gap-2">
              <Label className="text-xs text-gray-600 w-12">Col {index + 1}</Label>
              <Input
                type="number"
                min="5"
                max="95"
                value={Math.round(column.width)}
                onChange={(e) => updateColumnWidth(column.id, parseInt(e.target.value) || 0)}
                className="flex-1 h-8"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Appearance</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="backgroundColor" className="text-xs text-gray-600">Background Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="backgroundColor"
                type="color"
                value={backgroundColor || '#ffffff'}
                onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                placeholder="Transparent"
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="padding" className="text-xs text-gray-600">Padding (px)</Label>
              <Input
                id="padding"
                type="number"
                min="0"
                max="100"
                value={padding}
                onChange={(e) => updateAttribute('padding', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius (px)</Label>
              <Input
                id="borderRadius"
                type="number"
                min="0"
                max="50"
                value={borderRadius}
                onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Get alignment classes
  const getAlignmentClasses = () => {
    switch (verticalAlignment) {
      case 'center':
        return 'items-center';
      case 'bottom':
        return 'items-end';
      case 'stretch':
        return 'items-stretch';
      default:
        return 'items-start';
    }
  };

  // Column placeholder
  const ColumnPlaceholder = ({ columnId, width }: { columnId: string; width: number }) => (
    <div 
      className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[100px] flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
      onClick={() => onAddBlock?.('after')}
    >
      <div className="text-center text-gray-500">
        <Plus className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">Click to add content</p>
        <p className="text-xs">{Math.round(width)}% width</p>
      </div>
    </div>
  );

  // Columns content
  const ColumnsContent = () => (
    <div
      className="w-full"
      style={{
        backgroundColor: backgroundColor || undefined,
        padding: padding ? `${padding}px` : undefined,
        borderRadius: borderRadius ? `${borderRadius}px` : undefined,
        minHeight: minHeight ? `${minHeight}px` : undefined
      }}
    >
      <div
        className={cn(
          "flex gap-0",
          getAlignmentClasses(),
          stackOnMobile && "flex-col sm:flex-row"
        )}
        style={{ gap: `${gap}px` }}
      >
        {columns.map((column: ColumnData, index: number) => (
          <div
            key={column.id}
            className={cn(
              "relative",
              verticalAlignment === 'stretch' && "h-full"
            )}
            style={{ 
              width: `${column.width}%`,
              minWidth: stackOnMobile ? '100%' : `${column.width}%`
            }}
          >
            {isSelected && (
              <div className="absolute top-0 left-0 right-0 h-6 bg-blue-500 text-white text-xs flex items-center justify-between px-2 rounded-t -mb-6 z-10">
                <span>Column {index + 1}</span>
                <div className="flex items-center gap-1">
                  <span>{Math.round(column.width)}%</span>
                  {columns.length > 1 && (
                    <button
                      onClick={() => removeColumn(column.id)}
                      className="text-white hover:text-red-200 ml-1"
                      title="Remove column"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="h-full">
              {column.content.length > 0 ? (
                // Render column content here
                <div>Column content placeholder</div>
              ) : (
                <ColumnPlaceholder columnId={column.id} width={column.width} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <StandardBlockTemplate
      {...props}
      config={columnsConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <ColumnsContent />
    </StandardBlockTemplate>
  );
};

export default StandardColumnsBlock;