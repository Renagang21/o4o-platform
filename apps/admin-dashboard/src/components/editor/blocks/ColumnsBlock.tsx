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
    // columnCount = 2,  // Currently unused
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

      {/* Inspector Controls removed - now handled by InspectorPanel in sidebar */}

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