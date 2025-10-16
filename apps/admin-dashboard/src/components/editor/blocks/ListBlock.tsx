/**
 * ListBlock Component
 * Inline editable list with Tab/Shift+Tab indentation control
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  List,
  ListOrdered,
  Plus,
  Minus,
  ChevronRight,
  ChevronLeft,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Circle,
  Square,
  CheckSquare,
  ArrowRight,
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import './list/list-styles.css';

interface ListItem {
  id: string;
  content: string;
  level: number;
  checked?: boolean;
}

interface ListBlockProps {
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
    items?: ListItem[];
    type?: 'ordered' | 'unordered' | 'checklist';
    style?: 'disc' | 'circle' | 'square' | 'arrow' | 'dash' | 'plus' | 'star' | 'diamond' | 'triangle' | 'heart' | 'custom-emoji';
    numbering?: 'decimal' | 'decimal-zero' | 'lower-roman' | 'upper-roman' | 'lower-alpha' | 'upper-alpha' | 'lower-greek' | 'parentheses' | 'brackets';
    startNumber?: number;
    align?: 'left' | 'center' | 'right';
    color?: 'default' | 'blue' | 'green' | 'purple' | 'red' | 'orange';
  };
}

const ListBlock: React.FC<ListBlockProps> = ({
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
    items = [{ id: '1', content: '', level: 0 }],
    type = 'unordered',
    style = 'disc',
    numbering = 'decimal',
    startNumber = 1,
    align = 'left',
    color = 'default'
  } = attributes;

  const [localItems, setLocalItems] = useState<ListItem[]>(items);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const itemRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Sync items
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Focus on editing item
  useEffect(() => {
    if (editingItemId && itemRefs.current[editingItemId]) {
      const element = itemRefs.current[editingItemId];
      element?.focus();
      
      // Select all text
      if (element) {
        try {
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (error) {
          console.debug('Range positioning error in ListBlock:', error);
        }
      }
    }
  }, [editingItemId]);

  // Update items
  const updateItems = (newItems: ListItem[]) => {
    setLocalItems(newItems);
    onChange('', { ...attributes, items: newItems });
  };

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  };

  // Add new item
  const addItem = (afterId?: string) => {
    const newItem: ListItem = {
      id: Date.now().toString(),
      content: '',
      level: 0,
      checked: type === 'checklist' ? false : undefined
    };

    if (afterId) {
      const index = localItems.findIndex(item => item.id === afterId);
      const referenceItem = localItems[index];
      newItem.level = referenceItem?.level || 0;
      
      const newItems = [...localItems];
      newItems.splice(index + 1, 0, newItem);
      updateItems(newItems);
      
      // Focus new item
      setTimeout(() => setEditingItemId(newItem.id), 100);
    } else {
      updateItems([...localItems, newItem]);
      setTimeout(() => setEditingItemId(newItem.id), 100);
    }
  };

  // Remove item
  const removeItem = (itemId: string) => {
    if (localItems.length === 1) {
      // Don't remove the last item, just clear it
      updateItems([{ ...localItems[0], content: '' }]);
    } else {
      const newItems = localItems.filter(item => item.id !== itemId);
      updateItems(newItems);
    }
  };

  // Update item content
  const updateItemContent = (itemId: string, content: string) => {
    const newItems = localItems.map(item =>
      item.id === itemId ? { ...item, content } : item
    );
    updateItems(newItems);
  };

  // Toggle checkbox
  const toggleCheckbox = (itemId: string) => {
    const newItems = localItems.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    updateItems(newItems);
  };

  // Indent item
  const indentItem = (itemId: string) => {
    const newItems = localItems.map(item =>
      item.id === itemId && item.level < 3
        ? { ...item, level: item.level + 1 }
        : item
    );
    updateItems(newItems);
  };

  // Outdent item
  const outdentItem = (itemId: string) => {
    const newItems = localItems.map(item =>
      item.id === itemId && item.level > 0
        ? { ...item, level: item.level - 1 }
        : item
    );
    updateItems(newItems);
  };

  // Move item up
  const moveItemUp = (itemId: string) => {
    const index = localItems.findIndex(item => item.id === itemId);
    if (index > 0) {
      const newItems = [...localItems];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      updateItems(newItems);
    }
  };

  // Move item down
  const moveItemDown = (itemId: string) => {
    const index = localItems.findIndex(item => item.id === itemId);
    if (index < localItems.length - 1) {
      const newItems = [...localItems];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      updateItems(newItems);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggingItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItemId(itemId);
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault();
    const sourceItemId = e.dataTransfer.getData('text/plain');

    if (sourceItemId && sourceItemId !== targetItemId) {
      const sourceIndex = localItems.findIndex(item => item.id === sourceItemId);
      const targetIndex = localItems.findIndex(item => item.id === targetItemId);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        const newItems = [...localItems];
        const [movedItem] = newItems.splice(sourceIndex, 1);
        newItems.splice(targetIndex, 0, movedItem);
        updateItems(newItems);
      }
    }

    setDraggingItemId(null);
    setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDragOverItemId(null);
  };

  // Handle key down for item
  const handleItemKeyDown = (e: React.KeyboardEvent, itemId: string, index: number) => {
    const item = localItems.find(i => i.id === itemId);
    if (!item) return;

    // Tab to indent
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      if (item.level < 3) {
        indentItem(itemId);
      }
    }

    // Shift+Tab to outdent
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      if (item.level > 0) {
        outdentItem(itemId);
      }
    }

    // Enter to add new item
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addItem(itemId);
    }

    // Backspace on empty item to remove or merge with previous
    if (e.key === 'Backspace' && item.content === '') {
      e.preventDefault();
      if (localItems.length > 1) {
        // Focus previous item
        if (index > 0) {
          const prevItem = localItems[index - 1];
          setEditingItemId(prevItem.id);
        }
        removeItem(itemId);
      }
    }

    // Arrow up to focus previous item
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        const prevItem = localItems[index - 1];
        setEditingItemId(prevItem.id);
      }
    }

    // Arrow down to focus next item
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < localItems.length - 1) {
        const nextItem = localItems[index + 1];
        setEditingItemId(nextItem.id);
      }
    }
  };

  // Get enhanced list styles class
  const getListStyleClass = () => {
    const baseClass = 'enhanced-list-block';
    const styleClass = type === 'ordered' ? `list-style-${numbering}` :
                      type === 'checklist' ? 'list-checklist' :
                      `list-style-${style}`;
    const alignClass = `align-${align}`;
    const colorClass = `list-color-${color}`;

    return cn(baseClass, styleClass, alignClass, colorClass);
  };

  // Get list type icon
  const getListTypeIcon = () => {
    if (type === 'ordered') return <ListOrdered className="h-4 w-4" />;
    if (type === 'checklist') return <CheckSquare className="h-4 w-4" />;
    return <List className="h-4 w-4" />;
  };

  // Get alignment classes
  const getAlignmentClasses = () => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="list"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
    >
      {/* Toolbar - shows when selected */}
      {isSelected && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded">
          {/* Type selector */}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="sm" className="gap-2">
                {getListTypeIcon()}
                {type === 'ordered' ? 'Ordered' : type === 'checklist' ? 'Checklist' : 'Unordered'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => updateAttribute('type', 'unordered')}>
                <List className="h-4 w-4 mr-2" />
                Unordered List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateAttribute('type', 'ordered')}>
                <ListOrdered className="h-4 w-4 mr-2" />
                Ordered List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateAttribute('type', 'checklist')}>
                <CheckSquare className="h-4 w-4 mr-2" />
                Checklist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Style selector for unordered lists */}
          {type === 'unordered' && (
            <Select value={style} onValueChange={(v) => updateAttribute('style', v)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disc">• Disc</SelectItem>
                <SelectItem value="circle">○ Circle</SelectItem>
                <SelectItem value="square">■ Square</SelectItem>
                <SelectItem value="arrow">→ Arrow</SelectItem>
                <SelectItem value="dash">– Dash</SelectItem>
                <SelectItem value="plus">+ Plus</SelectItem>
                <SelectItem value="star">★ Star</SelectItem>
                <SelectItem value="diamond">◆ Diamond</SelectItem>
                <SelectItem value="triangle">▸ Triangle</SelectItem>
                <SelectItem value="heart">♥ Heart</SelectItem>
                <SelectItem value="custom-emoji">🔸 Emoji</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Numbering style selector for ordered lists */}
          {type === 'ordered' && (
            <Select value={numbering} onValueChange={(v) => updateAttribute('numbering', v)}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decimal">1. Decimal</SelectItem>
                <SelectItem value="decimal-zero">01. Zero-padded</SelectItem>
                <SelectItem value="lower-roman">i. Lower Roman</SelectItem>
                <SelectItem value="upper-roman">I. Upper Roman</SelectItem>
                <SelectItem value="lower-alpha">a. Lower Alpha</SelectItem>
                <SelectItem value="upper-alpha">A. Upper Alpha</SelectItem>
                <SelectItem value="lower-greek">α. Lower Greek</SelectItem>
                <SelectItem value="parentheses">(1) Parentheses</SelectItem>
                <SelectItem value="brackets">[1] Brackets</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Color theme selector */}
          <Select value={color} onValueChange={(v) => updateAttribute('color', v)}>
            <SelectTrigger className="w-24 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="blue">Blue</SelectItem>
              <SelectItem value="green">Green</SelectItem>
              <SelectItem value="purple">Purple</SelectItem>
              <SelectItem value="red">Red</SelectItem>
              <SelectItem value="orange">Orange</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-gray-300" />

          {/* Alignment */}
          <div className="flex gap-1">
            <Button
              variant={align === 'left' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'left')}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'center' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'center')}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={align === 'right' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => updateAttribute('align', 'right')}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* Add item */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addItem()}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      )}

      {/* List items - Enhanced styling */}
      <div className={getListStyleClass()}>
        <ul>
          {localItems.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                'list-item-wrapper group',
                'hover:bg-gray-50 rounded px-2 py-1 transition-all duration-200',
                editingItemId === item.id && 'bg-blue-50',
                type === 'checklist' && item.checked && 'checked',
                draggingItemId === item.id && 'list-item-dragging',
                dragOverItemId === item.id && 'list-item-drop-target'
              )}
              style={{
                marginLeft: `${item.level * 24}px`,
                '--start-number': startNumber - 1
              } as React.CSSProperties}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id)}
            >
              {/* Item controls - show on hover */}
              {isSelected && focusedItemId === item.id && (
                <div className="flex gap-1 mr-2 opacity-0 group-hover:opacity-100">
                  {/* Drag handle */}
                  <div
                    className="cursor-move flex items-center justify-center h-6 w-6 text-gray-400 hover:text-gray-600"
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={handleDragEnd}
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-3 w-3" />
                  </div>

                  {/* Move up/down buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveItemUp(item.id)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveItemDown(item.id)}
                    disabled={index === localItems.length - 1}
                    title="Move down"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>

                  {/* Indent/outdent buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => outdentItem(item.id)}
                    disabled={item.level === 0}
                    title="Decrease indent"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => indentItem(item.id)}
                    disabled={item.level >= 3}
                    title="Increase indent"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>

                  {/* Remove button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => removeItem(item.id)}
                    title="Remove item"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Checkbox for checklist */}
              {type === 'checklist' && (
                <button
                  className="mr-2 flex-shrink-0"
                  onClick={() => toggleCheckbox(item.id)}
                  contentEditable={false}
                >
                  {item.checked ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              )}

              {/* Item content with enhanced CSS marker */}
              <div
                ref={(el) => { itemRefs.current[item.id] = el; }}
                contentEditable
                suppressContentEditableWarning
                className={cn(
                  'list-item-content flex-1 outline-none min-h-[1.5em]',
                  editingItemId === item.id && 'ring-2 ring-blue-500 ring-offset-1 rounded px-1',
                  !item.content && 'text-gray-400',
                  type === 'checklist' && item.checked && 'line-through text-gray-500'
                )}
                onFocus={() => {
                  setEditingItemId(item.id);
                  setFocusedItemId(item.id);
                }}
                onBlur={() => {
                  setEditingItemId(null);
                  setFocusedItemId(null);
                }}
                onInput={(e) => {
                  const target = e.target as HTMLDivElement;
                  updateItemContent(item.id, target.innerText);
                }}
                onKeyDown={(e) => handleItemKeyDown(e, item.id, index)}
                data-placeholder="리스트 항목 입력..."
              >
                {item.content || '리스트 항목 입력...'}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ListBlock;