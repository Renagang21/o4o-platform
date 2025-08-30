/**
 * Standard List Block
 * 표준 템플릿 기반의 목록 블록
 */

import { useState, useCallback, useRef } from 'react';
import { 
  List,
  ListOrdered,
  Indent,
  Outdent,
  MoreHorizontal,
  Plus,
  Minus
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { RichText } from '../../gutenberg/RichText';
import { cn } from '@/lib/utils';

interface ListItem {
  id: string;
  content: string;
  level: number;
  children?: ListItem[];
}

interface ListBlockProps extends StandardBlockProps {
  content: string;
  attributes?: {
    ordered?: boolean;
    items?: ListItem[];
    startNumber?: number;
    listStyle?: 'default' | 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman' | 'disc' | 'circle' | 'square';
    fontSize?: number;
    fontWeight?: number;
    textColor?: string;
    lineHeight?: number;
    itemSpacing?: number;
    indentSize?: number;
    align?: 'left' | 'center' | 'right';
  };
}

const listConfig: StandardBlockConfig = {
  type: 'list',
  icon: List,
  category: 'text',
  title: 'List',
  description: 'Create a bulleted or numbered list.',
  keywords: ['list', 'bullet', 'numbered', 'ordered', 'unordered'],
  supports: {
    align: true,
    color: true,
    spacing: true,
    border: false,
    customClassName: true
  }
};

const LIST_STYLES = {
  ordered: [
    { value: 'decimal', label: 'Numbers (1, 2, 3)', style: 'decimal' },
    { value: 'lower-alpha', label: 'Letters (a, b, c)', style: 'lower-alpha' },
    { value: 'upper-alpha', label: 'Letters (A, B, C)', style: 'upper-alpha' },
    { value: 'lower-roman', label: 'Roman (i, ii, iii)', style: 'lower-roman' },
    { value: 'upper-roman', label: 'Roman (I, II, III)', style: 'upper-roman' }
  ],
  unordered: [
    { value: 'disc', label: 'Filled Circle (•)', style: 'disc' },
    { value: 'circle', label: 'Empty Circle (○)', style: 'circle' },
    { value: 'square', label: 'Square (■)', style: 'square' }
  ]
};

const StandardListBlock: React.FC<ListBlockProps> = (props) => {
  const { content, onChange, attributes = {}, isSelected } = props;
  const {
    ordered = false,
    items = [
      { id: 'item-1', content: 'First item', level: 0 },
      { id: 'item-2', content: 'Second item', level: 0 },
      { id: 'item-3', content: 'Third item', level: 0 }
    ],
    startNumber = 1,
    listStyle = ordered ? 'decimal' : 'disc',
    fontSize = 16,
    fontWeight = 400,
    textColor,
    lineHeight = 1.6,
    itemSpacing = 4,
    indentSize = 24,
    align = 'left'
  } = attributes;

  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  }, [onChange, content, attributes]);

  // Update item content
  const updateItemContent = (itemId: string, newContent: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, content: newContent } : item
    );
    updateAttribute('items', updatedItems);
  };

  // Add new item
  const addItem = (afterItemId?: string) => {
    const newItem: ListItem = {
      id: `item-${Date.now()}`,
      content: '',
      level: 0
    };

    if (afterItemId) {
      const index = items.findIndex(item => item.id === afterItemId);
      const updatedItems = [...items];
      updatedItems.splice(index + 1, 0, newItem);
      updateAttribute('items', updatedItems);
    } else {
      updateAttribute('items', [...items, newItem]);
    }
    
    setFocusedItem(newItem.id);
  };

  // Remove item
  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      const updatedItems = items.filter(item => item.id !== itemId);
      updateAttribute('items', updatedItems);
    }
  };

  // Indent item
  const indentItem = (itemId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId && item.level < 5 
        ? { ...item, level: item.level + 1 }
        : item
    );
    updateAttribute('items', updatedItems);
  };

  // Outdent item
  const outdentItem = (itemId: string) => {
    const updatedItems = items.map(item =>
      item.id === itemId && item.level > 0 
        ? { ...item, level: item.level - 1 }
        : item
    );
    updateAttribute('items', updatedItems);
  };

  // Convert between ordered/unordered
  const toggleListType = () => {
    const newOrdered = !ordered;
    updateAttribute('ordered', newOrdered);
    updateAttribute('listStyle', newOrdered ? 'decimal' : 'disc');
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Button
        variant={ordered ? "default" : "ghost"}
        size="sm"
        onClick={() => {
          updateAttribute('ordered', false);
          updateAttribute('listStyle', 'disc');
        }}
        className="h-9 px-2"
        title="Bulleted list"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        variant={ordered ? "ghost" : "default"}
        size="sm"
        onClick={() => {
          updateAttribute('ordered', true);
          updateAttribute('listStyle', 'decimal');
        }}
        className="h-9 px-2"
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => focusedItem && indentItem(focusedItem)}
        disabled={!focusedItem}
        className="h-9 px-2"
        title="Increase indent"
      >
        <Indent className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => focusedItem && outdentItem(focusedItem)}
        disabled={!focusedItem}
        className="h-9 px-2"
        title="Decrease indent"
      >
        <Outdent className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" className="h-9 px-2">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => addItem()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => focusedItem && removeItem(focusedItem)}
            disabled={!focusedItem || items.length <= 1}
          >
            <Minus className="mr-2 h-4 w-4" />
            Remove Item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">List Settings</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="listType" className="text-xs text-gray-600">List Type</Label>
            <Select 
              value={ordered ? 'ordered' : 'unordered'} 
              onValueChange={(value) => {
                const newOrdered = value === 'ordered';
                updateAttribute('ordered', newOrdered);
                updateAttribute('listStyle', newOrdered ? 'decimal' : 'disc');
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unordered">Bulleted List</SelectItem>
                <SelectItem value="ordered">Numbered List</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="listStyle" className="text-xs text-gray-600">List Style</Label>
            <Select value={listStyle} onValueChange={(value) => updateAttribute('listStyle', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(ordered ? LIST_STYLES.ordered : LIST_STYLES.unordered).map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {ordered && (
            <div>
              <Label htmlFor="startNumber" className="text-xs text-gray-600">Start Number</Label>
              <Input
                id="startNumber"
                type="number"
                min="1"
                value={startNumber}
                onChange={(e) => updateAttribute('startNumber', parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Typography</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="fontSize" className="text-xs text-gray-600">Font Size (px)</Label>
            <Input
              id="fontSize"
              type="number"
              min="8"
              max="32"
              value={fontSize}
              onChange={(e) => updateAttribute('fontSize', parseInt(e.target.value) || 16)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fontWeight" className="text-xs text-gray-600">Font Weight</Label>
            <Select 
              value={fontWeight.toString()} 
              onValueChange={(value) => updateAttribute('fontWeight', parseInt(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Normal (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semibold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="lineHeight" className="text-xs text-gray-600">Line Height</Label>
            <Input
              id="lineHeight"
              type="number"
              step="0.1"
              min="1"
              max="3"
              value={lineHeight}
              onChange={(e) => updateAttribute('lineHeight', parseFloat(e.target.value) || 1.6)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs text-gray-600">Text Color</Label>
            <div className="grid grid-cols-6 gap-2 mt-1">
              {['#000000', '#374151', '#6b7280', '#9ca3af', '#3b82f6', '#ef4444'].map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
                  style={{ backgroundColor: color }}
                  onClick={() => updateAttribute('textColor', color)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Spacing</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="itemSpacing" className="text-xs text-gray-600">Item Spacing (px)</Label>
            <Input
              id="itemSpacing"
              type="number"
              min="0"
              max="20"
              value={itemSpacing}
              onChange={(e) => updateAttribute('itemSpacing', parseInt(e.target.value) || 4)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="indentSize" className="text-xs text-gray-600">Indent Size (px)</Label>
            <Input
              id="indentSize"
              type="number"
              min="12"
              max="60"
              value={indentSize}
              onChange={(e) => updateAttribute('indentSize', parseInt(e.target.value) || 24)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Handle key events for list management
  const handleKeyDown = (e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(itemId);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        outdentItem(itemId);
      } else {
        indentItem(itemId);
      }
    } else if (e.key === 'Backspace') {
      const item = items.find(i => i.id === itemId);
      if (item && item.content === '' && items.length > 1) {
        e.preventDefault();
        removeItem(itemId);
      }
    }
  };

  // Get list item styles
  const getListItemStyles = (item: ListItem) => ({
    fontSize: `${fontSize}px`,
    fontWeight: fontWeight,
    color: textColor || undefined,
    lineHeight: lineHeight,
    marginBottom: `${itemSpacing}px`,
    paddingLeft: `${item.level * indentSize}px`
  });

  // Get list style type
  const getListStyleType = () => {
    if (ordered) {
      return listStyle;
    }
    return listStyle;
  };

  // List content
  const ListContent = () => {
    const ListTag = ordered ? 'ol' : 'ul';
    
    return (
      <div 
        ref={listRef}
        className={cn(
          "w-full",
          align === 'center' && 'text-center',
          align === 'right' && 'text-right'
        )}
      >
        <ListTag
          className="list-none p-0 m-0"
          style={{
            counterReset: ordered ? `list-counter ${startNumber - 1}` : undefined
          }}
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              className="relative"
              style={getListItemStyles(item)}
              onFocus={() => setFocusedItem(item.id)}
            >
              <div className="flex items-start">
                {/* Custom bullet/number */}
                <div
                  className="flex-shrink-0 mr-2 mt-1"
                  style={{
                    width: '20px',
                    textAlign: 'right'
                  }}
                >
                  {ordered ? (
                    <span
                      className="inline-block"
                      style={{
                        counterIncrement: 'list-counter',
                        listStyleType: getListStyleType()
                      }}
                    >
                      {listStyle === 'decimal' && `${startNumber + index}.`}
                      {listStyle === 'lower-alpha' && `${String.fromCharCode(97 + index)}.`}
                      {listStyle === 'upper-alpha' && `${String.fromCharCode(65 + index)}.`}
                      {listStyle === 'lower-roman' && `${toRoman(startNumber + index).toLowerCase()}.`}
                      {listStyle === 'upper-roman' && `${toRoman(startNumber + index)}.`}
                    </span>
                  ) : (
                    <span
                      className="inline-block"
                      style={{
                        fontSize: listStyle === 'square' ? '8px' : '12px',
                        lineHeight: 1
                      }}
                    >
                      {listStyle === 'disc' && '•'}
                      {listStyle === 'circle' && '○'}
                      {listStyle === 'square' && '■'}
                    </span>
                  )}
                </div>

                {/* Item content */}
                <div className="flex-1 min-w-0">
                  <RichText
                    tagName="div"
                    value={item.content}
                    onChange={(value) => updateItemContent(item.id, value)}
                    placeholder={`List item ${index + 1}...`}
                    className="outline-none"
                    allowedFormats={['core/bold', 'core/italic', 'core/link']}
                    onKeyDown={(e) => handleKeyDown(e, item.id)}
                    onSplit={() => addItem(item.id)}
                  />
                </div>

                {/* Item controls */}
                {isSelected && focusedItem === item.id && (
                  <div className="flex items-center gap-1 ml-2 opacity-0 hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => indentItem(item.id)}
                      disabled={item.level >= 5}
                      className="h-6 w-6 p-0"
                      title="Indent"
                    >
                      <Indent className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => outdentItem(item.id)}
                      disabled={item.level <= 0}
                      className="h-6 w-6 p-0"
                      title="Outdent"
                    >
                      <Outdent className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="h-6 w-6 p-0"
                      title="Remove"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ListTag>

        {/* Add new item button */}
        {isSelected && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addItem()}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add item
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={listConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <ListContent />
    </StandardBlockTemplate>
  );
};

// Helper function to convert numbers to Roman numerals
function toRoman(num: number): string {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const literals = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  
  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += literals[i];
      num -= values[i];
    }
  }
  
  return result;
}

export default StandardListBlock;