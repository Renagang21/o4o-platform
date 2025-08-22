/**
 * ColumnsBlock Component
 * Gutenberg-style columns block with BlockControls and InspectorControls
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { 
  Layout,
  Plus,
  Trash2
} from 'lucide-react';
import BlockWrapper from './BlockWrapper';
import { BlockControls, ToolbarGroup, ToolbarButton } from '../gutenberg/BlockControls';
import { 
  InspectorControls, 
  PanelBody, 
  RangeControl,
  ToggleControl
} from '../gutenberg/InspectorControls';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Column {
  id: string;
  width?: number;
  content: any[];
}

interface ColumnsBlockProps {
  id: string;
  onChange: (content: any, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    columns?: Column[];
    columnCount?: number;
    verticalAlignment?: 'top' | 'center' | 'bottom';
    isStackedOnMobile?: boolean;
    gap?: number;
    minHeight?: number;
    backgroundColor?: string;
    padding?: number;
  };
}

const ColumnsBlock: React.FC<ColumnsBlockProps> = ({
  id,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {}
}) => {
  const {
    columns = [
      { id: '1', width: 50, content: [] },
      { id: '2', width: 50, content: [] }
    ],
    columnCount = 2,
    verticalAlignment = 'top',
    isStackedOnMobile = true,
    gap = 20,
    minHeight = 0,
    backgroundColor = '',
    padding = 0
  } = attributes;

  const [localColumns, setLocalColumns] = useState<Column[]>(columns);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

  // Sync columns
  useEffect(() => {
    setLocalColumns(columns);
  }, [columns]);

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  };

  // Update columns
  const updateColumns = (newColumns: Column[]) => {
    setLocalColumns(newColumns);
    updateAttribute('columns', newColumns);
    updateAttribute('columnCount', newColumns.length);
  };

  // Add column
  const addColumn = () => {
    const newColumn: Column = {
      id: Date.now().toString(),
      width: Math.floor(100 / (localColumns.length + 1)),
      content: []
    };
    
    // Recalculate widths
    const totalColumns = localColumns.length + 1;
    const newWidth = Math.floor(100 / totalColumns);
    const updatedColumns = localColumns.map(col => ({
      ...col,
      width: newWidth
    }));
    
    updateColumns([...updatedColumns, { ...newColumn, width: newWidth }]);
  };

  // Remove column
  const removeColumn = (columnId: string) => {
    if (localColumns.length <= 1) return;
    
    const newColumns = localColumns.filter(col => col.id !== columnId);
    // Recalculate widths
    const newWidth = Math.floor(100 / newColumns.length);
    const updatedColumns = newColumns.map(col => ({
      ...col,
      width: newWidth
    }));
    
    updateColumns(updatedColumns);
    setSelectedColumnId(null);
  };

  // Update column width
  const updateColumnWidth = (columnId: string, newWidth: number) => {
    const columnIndex = localColumns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) return;

    const oldWidth = localColumns[columnIndex].width || 50;
    const widthDiff = newWidth - oldWidth;
    
    // Adjust neighboring column
    const nextColumnIndex = columnIndex + 1 < localColumns.length ? columnIndex + 1 : columnIndex - 1;
    if (nextColumnIndex !== columnIndex && nextColumnIndex >= 0) {
      const updatedColumns = [...localColumns];
      updatedColumns[columnIndex] = { ...updatedColumns[columnIndex], width: newWidth };
      const neighborWidth = (updatedColumns[nextColumnIndex].width || 50) - widthDiff;
      updatedColumns[nextColumnIndex] = { 
        ...updatedColumns[nextColumnIndex], 
        width: Math.max(10, Math.min(90, neighborWidth))
      };
      updateColumns(updatedColumns);
    }
  };

  // Get column layout presets
  const getLayoutPresets = () => [
    { label: '50 / 50', value: '50-50', columns: 2, widths: [50, 50] },
    { label: '33 / 33 / 33', value: '33-33-33', columns: 3, widths: [33.33, 33.33, 33.34] },
    { label: '25 / 50 / 25', value: '25-50-25', columns: 3, widths: [25, 50, 25] },
    { label: '25 / 25 / 25 / 25', value: '25-25-25-25', columns: 4, widths: [25, 25, 25, 25] },
    { label: '30 / 70', value: '30-70', columns: 2, widths: [30, 70] },
    { label: '70 / 30', value: '70-30', columns: 2, widths: [70, 30] },
  ];

  // Apply layout preset
  const applyLayoutPreset = (preset: any) => {
    const newColumns: Column[] = [];
    for (let i = 0; i < preset.columns; i++) {
      newColumns.push({
        id: Date.now().toString() + i,
        width: preset.widths[i],
        content: localColumns[i]?.content || []
      });
    }
    updateColumns(newColumns);
  };

  // Get vertical alignment style
  const getAlignmentStyle = () => {
    switch (verticalAlignment) {
      case 'center': return 'items-center';
      case 'bottom': return 'items-end';
      default: return 'items-start';
    }
  };

  return (
    <>
      {/* Block Controls - Floating Toolbar */}
      {isSelected && (
        <BlockControls>
          {/* Column Actions */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Plus className="h-4 w-4" />}
              label="Add Column"
              onClick={addColumn}
            />
            {selectedColumnId && (
              <ToolbarButton
                icon={<Trash2 className="h-4 w-4" />}
                label="Remove Column"
                onClick={() => removeColumn(selectedColumnId)}
              />
            )}
          </ToolbarGroup>

          {/* Vertical Alignment */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<Layout className="h-4 w-4 rotate-90" />}
              label="Align top"
              isActive={verticalAlignment === 'top'}
              onClick={() => updateAttribute('verticalAlignment', 'top')}
            />
            <ToolbarButton
              icon={<Layout className="h-4 w-4" />}
              label="Align center"
              isActive={verticalAlignment === 'center'}
              onClick={() => updateAttribute('verticalAlignment', 'center')}
            />
            <ToolbarButton
              icon={<Layout className="h-4 w-4 rotate-90" />}
              label="Align bottom"
              isActive={verticalAlignment === 'bottom'}
              onClick={() => updateAttribute('verticalAlignment', 'bottom')}
            />
          </ToolbarGroup>
        </BlockControls>
      )}

      {/* Inspector Controls - Sidebar Settings */}
      {isSelected && (
        <InspectorControls>
          {/* Layout Settings */}
          <PanelBody title="Layout" initialOpen={true}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Layout Preset
              </label>
              <Select onValueChange={(value) => {
                const preset = getLayoutPresets().find(p => p.value === value);
                if (preset) applyLayoutPreset(preset);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose layout" />
                </SelectTrigger>
                <SelectContent>
                  {getLayoutPresets().map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <RangeControl
              label="Number of Columns"
              value={columnCount}
              onChange={(value) => {
                if (value > localColumns.length) {
                  for (let i = localColumns.length; i < value; i++) {
                    addColumn();
                  }
                } else if (value < localColumns.length) {
                  const newColumns = localColumns.slice(0, value);
                  updateColumns(newColumns);
                }
              }}
              min={1}
              max={6}
              step={1}
            />

            <ToggleControl
              label="Stack on mobile"
              help="Stack columns vertically on small screens"
              checked={isStackedOnMobile}
              onChange={(checked) => updateAttribute('isStackedOnMobile', checked)}
            />
          </PanelBody>

          {/* Column Settings */}
          {selectedColumnId && (
            <PanelBody title="Column Settings" initialOpen={true}>
              <RangeControl
                label="Column Width"
                value={localColumns.find(col => col.id === selectedColumnId)?.width || 50}
                onChange={(value) => updateColumnWidth(selectedColumnId, value)}
                min={10}
                max={90}
                step={5}
                help="Width in percentage (%)"
              />
            </PanelBody>
          )}

          {/* Spacing */}
          <PanelBody title="Spacing" initialOpen={false}>
            <RangeControl
              label="Gap Between Columns"
              value={gap}
              onChange={(value) => updateAttribute('gap', value)}
              min={0}
              max={100}
              step={5}
              help="Space between columns (px)"
            />

            <RangeControl
              label="Padding"
              value={padding}
              onChange={(value) => updateAttribute('padding', value)}
              min={0}
              max={100}
              step={5}
              help="Inner padding (px)"
            />

            <RangeControl
              label="Minimum Height"
              value={minHeight}
              onChange={(value) => updateAttribute('minHeight', value)}
              min={0}
              max={1000}
              step={50}
              help="Minimum column height (px)"
            />
          </PanelBody>

          {/* Appearance */}
          <PanelBody title="Appearance" initialOpen={false}>
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Background Color
              </label>
              <input
                type="color"
                value={backgroundColor || '#ffffff'}
                onChange={(e) => updateAttribute('backgroundColor', e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </PanelBody>
        </InspectorControls>
      )}

      {/* Block Content */}
      <BlockWrapper
        id={id}
        type="columns"
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onAddBlock={onAddBlock}
        className="wp-block wp-block-columns"
      >
        <div
          className={cn(
            'wp-block-columns__wrapper',
            'flex',
            isStackedOnMobile && 'flex-col md:flex-row',
            getAlignmentStyle()
          )}
          style={{
            gap: `${gap}px`,
            minHeight: minHeight ? `${minHeight}px` : undefined,
            backgroundColor: backgroundColor || undefined,
            padding: padding ? `${padding}px` : undefined
          }}
        >
          {localColumns.map((column, index) => (
            <div
              key={column.id}
              className={cn(
                'wp-block-column',
                'flex-1 border-2 border-dashed rounded',
                selectedColumnId === column.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
                'p-4 min-h-[100px] cursor-pointer transition-all'
              )}
              style={{
                flex: `0 0 ${column.width}%`,
                maxWidth: `${column.width}%`
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedColumnId(column.id);
              }}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-500 font-medium">
                  Column {index + 1} ({column.width}%)
                </span>
                <button
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeColumn(column.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Column Content Area */}
              <div className="min-h-[60px] flex items-center justify-center text-gray-400">
                {column.content.length > 0 ? (
                  <div className="w-full">
                    {/* Render nested blocks here */}
                    {column.content.map((block: any) => (
                      <div key={block.id} className="mb-2">
                        {/* Placeholder for nested block */}
                        <div className="p-2 bg-gray-100 rounded text-sm">
                          {block.type} block
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center">
                    <Plus className="h-6 w-6 mx-auto mb-2" />
                    <p className="text-sm">Add blocks here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </BlockWrapper>
    </>
  );
};

export default ColumnsBlock;