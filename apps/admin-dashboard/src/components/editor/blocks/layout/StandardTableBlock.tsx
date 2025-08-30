/**
 * Standard Table Block
 * 표준 템플릿 기반의 테이블 블록
 */

import { useState, useCallback, useRef } from 'react';
import { 
  Table as TableIcon,
  Plus,
  Minus,
  MoreHorizontal,
  MoreVertical,
  Settings,
  Download,
  Upload,
  Trash2,
  Move
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';
import { cn } from '@/lib/utils';

interface TableCell {
  id: string;
  content: string;
  isHeader?: boolean;
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
}

interface TableRow {
  id: string;
  cells: TableCell[];
}

interface TableBlockProps extends StandardBlockProps {
  attributes?: {
    rows: TableRow[];
    hasHeader?: boolean;
    hasFooter?: boolean;
    striped?: boolean;
    bordered?: boolean;
    compact?: boolean;
    responsive?: boolean;
    headerBackgroundColor?: string;
    headerTextColor?: string;
    borderColor?: string;
    hoverColor?: string;
    fontSize?: number;
    cellPadding?: number;
    caption?: string;
  };
}

const tableConfig: StandardBlockConfig = {
  type: 'table',
  icon: TableIcon,
  category: 'layout',
  title: 'Table',
  description: 'Insert a table to display data in rows and columns.',
  keywords: ['table', 'data', 'rows', 'columns', 'grid'],
  supports: {
    align: true,
    color: false,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const StandardTableBlock: React.FC<TableBlockProps> = (props) => {
  const { onChange, attributes = {}, isSelected } = props;
  const {
    rows = [
      {
        id: 'row-1',
        cells: [
          { id: 'cell-1-1', content: 'Header 1', isHeader: true },
          { id: 'cell-1-2', content: 'Header 2', isHeader: true }
        ]
      },
      {
        id: 'row-2', 
        cells: [
          { id: 'cell-2-1', content: 'Row 1, Col 1' },
          { id: 'cell-2-2', content: 'Row 1, Col 2' }
        ]
      }
    ],
    hasHeader = true,
    hasFooter = false,
    striped = false,
    bordered = true,
    compact = false,
    responsive = true,
    headerBackgroundColor = '#f8fafc',
    headerTextColor = '#1f2937',
    borderColor = '#e5e7eb',
    hoverColor = '#f1f5f9',
    fontSize = 14,
    cellPadding = 12,
    caption = ''
  } = attributes;

  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  }, [onChange, attributes]);

  // Add row
  const addRow = (position: 'top' | 'bottom' = 'bottom') => {
    const columnCount = rows[0]?.cells.length || 2;
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
      cells: Array.from({ length: columnCount }, (_, index) => ({
        id: `cell-${Date.now()}-${index}`,
        content: '',
        isHeader: position === 'top' && hasHeader
      }))
    };

    const updatedRows = position === 'top' 
      ? [newRow, ...rows]
      : [...rows, newRow];

    updateAttribute('rows', updatedRows);
  };

  // Remove row
  const removeRow = (rowId: string) => {
    if (rows.length > 1) {
      const updatedRows = rows.filter(row => row.id !== rowId);
      updateAttribute('rows', updatedRows);
    }
  };

  // Add column
  const addColumn = () => {
    const updatedRows = rows.map(row => ({
      ...row,
      cells: [
        ...row.cells,
        {
          id: `cell-${Date.now()}-${row.cells.length}`,
          content: '',
          isHeader: row === rows[0] && hasHeader
        }
      ]
    }));
    updateAttribute('rows', updatedRows);
  };

  // Remove column
  const removeColumn = (columnIndex: number) => {
    if (rows[0]?.cells.length > 1) {
      const updatedRows = rows.map(row => ({
        ...row,
        cells: row.cells.filter((_, index) => index !== columnIndex)
      }));
      updateAttribute('rows', updatedRows);
    }
  };

  // Update cell content
  const updateCellContent = (rowId: string, cellId: string, content: string) => {
    const updatedRows = rows.map(row =>
      row.id === rowId
        ? {
            ...row,
            cells: row.cells.map(cell =>
              cell.id === cellId ? { ...cell, content } : cell
            )
          }
        : row
    );
    updateAttribute('rows', updatedRows);
  };

  // Update cell property
  const updateCellProperty = (rowId: string, cellId: string, property: string, value: any) => {
    const updatedRows = rows.map(row =>
      row.id === rowId
        ? {
            ...row,
            cells: row.cells.map(cell =>
              cell.id === cellId ? { ...cell, [property]: value } : cell
            )
          }
        : row
    );
    updateAttribute('rows', updatedRows);
  };

  // Export table as CSV
  const exportCSV = () => {
    const csvContent = rows.map(row =>
      row.cells.map(cell => `"${cell.content.replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'table-data.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Import CSV
  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const csvRows = text.split('\n').filter(row => row.trim());
        
        const newRows: TableRow[] = csvRows.map((csvRow, rowIndex) => {
          const cells = csvRow.split(',').map(cell => cell.replace(/"/g, '').trim());
          return {
            id: `row-${Date.now()}-${rowIndex}`,
            cells: cells.map((content, cellIndex) => ({
              id: `cell-${Date.now()}-${rowIndex}-${cellIndex}`,
              content,
              isHeader: rowIndex === 0 && hasHeader
            }))
          };
        });

        updateAttribute('rows', newRows);
      };
      reader.readAsText(file);
    }
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => addRow('bottom')}
        className="h-9 px-2"
        title="Add row"
      >
        <Plus className="h-4 w-4 mr-1" />
        <span className="text-xs">Row</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={addColumn}
        className="h-9 px-2"
        title="Add column"
      >
        <Plus className="h-4 w-4 mr-1" />
        <span className="text-xs">Column</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" className="h-9 px-2">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Table Structure</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="hasHeader" className="text-xs text-gray-600">Header Row</Label>
            <Switch
              id="hasHeader"
              checked={hasHeader}
              onCheckedChange={(checked) => updateAttribute('hasHeader', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="hasFooter" className="text-xs text-gray-600">Footer Row</Label>
            <Switch
              id="hasFooter"
              checked={hasFooter}
              onCheckedChange={(checked) => updateAttribute('hasFooter', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Table Style</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bordered" className="text-xs text-gray-600">Borders</Label>
            <Switch
              id="bordered"
              checked={bordered}
              onCheckedChange={(checked) => updateAttribute('bordered', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="striped" className="text-xs text-gray-600">Striped Rows</Label>
            <Switch
              id="striped"
              checked={striped}
              onCheckedChange={(checked) => updateAttribute('striped', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="compact" className="text-xs text-gray-600">Compact</Label>
            <Switch
              id="compact"
              checked={compact}
              onCheckedChange={(checked) => updateAttribute('compact', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="responsive" className="text-xs text-gray-600">Responsive</Label>
            <Switch
              id="responsive"
              checked={responsive}
              onCheckedChange={(checked) => updateAttribute('responsive', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Appearance</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="fontSize" className="text-xs text-gray-600">Font Size (px)</Label>
            <Input
              id="fontSize"
              type="number"
              min="8"
              max="24"
              value={fontSize}
              onChange={(e) => updateAttribute('fontSize', parseInt(e.target.value) || 14)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cellPadding" className="text-xs text-gray-600">Cell Padding (px)</Label>
            <Input
              id="cellPadding"
              type="number"
              min="4"
              max="32"
              value={cellPadding}
              onChange={(e) => updateAttribute('cellPadding', parseInt(e.target.value) || 12)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="borderColor" className="text-xs text-gray-600">Border Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="borderColor"
                type="color"
                value={borderColor}
                onChange={(e) => updateAttribute('borderColor', e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <Input
                value={borderColor}
                onChange={(e) => updateAttribute('borderColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {hasHeader && (
        <div>
          <Label className="text-sm font-medium">Header Style</Label>
          <div className="mt-2 space-y-3">
            <div>
              <Label htmlFor="headerBg" className="text-xs text-gray-600">Background Color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="headerBg"
                  type="color"
                  value={headerBackgroundColor}
                  onChange={(e) => updateAttribute('headerBackgroundColor', e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={headerBackgroundColor}
                  onChange={(e) => updateAttribute('headerBackgroundColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="headerText" className="text-xs text-gray-600">Text Color</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="headerText"
                  type="color"
                  value={headerTextColor}
                  onChange={(e) => updateAttribute('headerTextColor', e.target.value)}
                  className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <Input
                  value={headerTextColor}
                  onChange={(e) => updateAttribute('headerTextColor', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="caption" className="text-xs text-gray-600">Table Caption</Label>
        <Input
          id="caption"
          placeholder="Optional table caption"
          value={caption}
          onChange={(e) => updateAttribute('caption', e.target.value)}
          className="mt-1"
        />
      </div>
    </div>
  );

  // Get table classes
  const getTableClasses = () => {
    return cn(
      "w-full border-collapse",
      bordered && "border",
      responsive && "table-auto",
      compact ? "text-sm" : "text-base"
    );
  };

  // Get row classes
  const getRowClasses = (rowIndex: number, isHeaderRow: boolean) => {
    return cn(
      striped && !isHeaderRow && rowIndex % 2 === 1 && "bg-gray-50",
      !isHeaderRow && "hover:bg-gray-100 transition-colors"
    );
  };

  // Get cell classes
  const getCellClasses = (cell: TableCell, isHeaderRow: boolean) => {
    return cn(
      "border-r border-b transition-colors",
      bordered && "border",
      "text-left",
      cell.align === 'center' && "text-center",
      cell.align === 'right' && "text-right"
    );
  };

  // Get cell styles
  const getCellStyles = (cell: TableCell, isHeaderRow: boolean) => {
    return {
      padding: `${cellPadding}px`,
      fontSize: `${fontSize}px`,
      backgroundColor: isHeaderRow 
        ? headerBackgroundColor 
        : cell.backgroundColor || 'transparent',
      color: isHeaderRow 
        ? headerTextColor 
        : cell.textColor || 'inherit',
      borderColor: borderColor
    };
  };

  // Table content
  const TableContent = () => (
    <div className={cn("w-full", responsive && "overflow-x-auto")}>
      {caption && (
        <div className="mb-2">
          <RichText
            tagName="caption"
            value={caption}
            onChange={(value) => updateAttribute('caption', value)}
            placeholder="Table caption..."
            className="text-sm text-gray-600 italic text-center outline-none"
          />
        </div>
      )}
      
      <table 
        className={getTableClasses()}
        style={{ borderColor: borderColor }}
      >
        <tbody>
          {rows.map((row, rowIndex) => {
            const isHeaderRow = hasHeader && rowIndex === 0;
            const isFooterRow = hasFooter && rowIndex === rows.length - 1;
            const Tag = (isHeaderRow || isFooterRow) ? 'th' : 'td';

            return (
              <tr 
                key={row.id}
                className={getRowClasses(rowIndex, isHeaderRow)}
              >
                {row.cells.map((cell, cellIndex) => (
                  <Tag
                    key={cell.id}
                    className={getCellClasses(cell, isHeaderRow)}
                    style={getCellStyles(cell, isHeaderRow)}
                    onClick={() => setSelectedCell(cell.id)}
                  >
                    <div className="relative group">
                      <RichText
                        tagName="div"
                        value={cell.content}
                        onChange={(value) => updateCellContent(row.id, cell.id, value)}
                        placeholder={`${isHeaderRow ? 'Header' : 'Cell'} ${rowIndex + 1}, ${cellIndex + 1}`}
                        className="outline-none min-h-[1em]"
                        allowedFormats={['core/bold', 'core/italic', 'core/link']}
                      />
                      
                      {isSelected && selectedCell === cell.id && (
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => addRow('bottom')}>
                                Add Row Below
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={addColumn}>
                                Add Column Right
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => removeRow(row.id)}
                                className="text-red-600"
                              >
                                Delete Row
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => removeColumn(cellIndex)}
                                className="text-red-600"
                              >
                                Delete Column
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </Tag>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <StandardBlockTemplate
      {...props}
      config={tableConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <div className="w-full">
        <TableContent />
        
        {/* Hidden file input for CSV import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={importCSV}
          className="hidden"
        />
      </div>
    </StandardBlockTemplate>
  );
};

export default StandardTableBlock;