/**
 * SimplifiedListBlock Component
 * WordPress-style list block with bullet points and real interactivity
 */

import React, { useState, useRef, useEffect } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';

interface SimplifiedListBlockProps {
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
    style?: 'unordered' | 'ordered';
    align?: 'left' | 'center' | 'right' | 'justify';
    items?: string[];
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

const SimplifiedListBlock: React.FC<SimplifiedListBlockProps> = ({
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
}) => {
  const { style = 'unordered', align = 'left', items: initialItems } = attributes;
  
  // Parse items from content if not in attributes
  const parseItemsFromContent = (contentStr: string) => {
    if (!contentStr) return [''];
    // Split by newlines and filter empty strings
    const parsed = contentStr.split('\n').filter(item => item.trim() !== '');
    return parsed.length > 0 ? parsed : [''];
  };

  const [items, setItems] = useState<string[]>(() => {
    return initialItems || parseItemsFromContent(content) || [''];
  });
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Sync with external content changes
  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
    } else if (content && content !== items.join('\n')) {
      setItems(parseItemsFromContent(content));
    }
  }, [content, initialItems]);

  // Update content when items change
  const updateContent = (newItems: string[]) => {
    const filteredItems = newItems.filter(item => item.trim() !== '');
    const finalItems = filteredItems.length > 0 ? filteredItems : [''];
    
    setItems(finalItems);
    onChange(finalItems.join('\n'), { 
      ...attributes, 
      style, 
      items: finalItems 
    });
  };


  // Handle alignment change
  const handleAlignChange = (newAlign: 'left' | 'center' | 'right' | 'justify') => {
    onChange(items.join('\n'), { 
      ...attributes, 
      align: newAlign, 
      items 
    });
  };

  // Add new item
  const addItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index + 1, 0, '');
    updateContent(newItems);
    
    // Focus the new item
    setTimeout(() => {
      const newIndex = index + 1;
      if (itemRefs.current[newIndex]) {
        itemRefs.current[newIndex]?.focus();
      }
    }, 50);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length === 1) {
      // If it's the last item, check if it's empty and delete the whole block
      if (items[0].trim() === '') {
        onDelete();
        return;
      }
      // Otherwise, just clear the content
      updateContent(['']);
    } else {
      const newItems = items.filter((_, i) => i !== index);
      updateContent(newItems);
      
      // Focus previous item or next item
      const newFocusIndex = index > 0 ? index - 1 : 0;
      setTimeout(() => {
        if (itemRefs.current[newFocusIndex]) {
          itemRefs.current[newFocusIndex]?.focus();
        }
      }, 50);
    }
  };

  // Update item content
  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    updateContent(newItems);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLLIElement>, index: number) => {
    const currentItem = items[index];
    
    // Enter: Add new item
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addItem(index);
    }
    
    // Backspace on empty item: Remove item
    if (e.key === 'Backspace' && currentItem.trim() === '') {
      e.preventDefault();
      removeItem(index);
    }
    
    // Tab: Indent (convert to nested style in the future)
    if (e.key === 'Tab') {
      e.preventDefault();
      // For now, just prevent default behavior
      // Future: implement indentation
    }
    
    // Arrow Up: Focus previous item
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        itemRefs.current[index - 1]?.focus();
      }
    }
    
    // Arrow Down: Focus next item
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < items.length - 1) {
        itemRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle input
  const handleInput = (e: React.FormEvent<HTMLLIElement>, index: number) => {
    const target = e.target as HTMLLIElement;
    updateItem(index, target.textContent || '');
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length <= 1) {
      // Single line: just insert as text
      const text = lines[0] || pastedText;
      document.execCommand('insertText', false, text);
    } else {
      // Multiple lines: create multiple list items
      const newItems = [...items];
      newItems[index] = lines[0];
      
      // Insert additional lines as new items
      for (let i = 1; i < lines.length; i++) {
        newItems.splice(index + i, 0, lines[i]);
      }
      
      updateContent(newItems);
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
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onAlignChange={handleAlignChange}
      currentAlign={align}
    >
      <div 
        className={cn(
          'list-editor outline-none',
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          align === 'justify' && 'text-justify'
        )}
      >
        {style === 'ordered' ? (
          <ol className="list-decimal list-inside space-y-1 marker:text-gray-600">
            {items.map((item, index) => (
              <li
                key={index}
                ref={el => itemRefs.current[index] = el}
                contentEditable
                suppressContentEditableWarning
                className={cn(
                  'outline-none min-h-[1.5em] px-1 py-0.5',
                  'focus:bg-blue-50 focus:ring-2 focus:ring-blue-200 focus:ring-inset rounded',
                  !item && 'text-gray-400'
                )}
                onInput={(e) => handleInput(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={(e) => handlePaste(e, index)}
                data-placeholder="Type list item..."
              >
                {item || ''}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="list-disc list-inside space-y-1 marker:text-gray-600">
            {items.map((item, index) => (
              <li
                key={index}
                ref={el => itemRefs.current[index] = el}
                contentEditable
                suppressContentEditableWarning
                className={cn(
                  'outline-none min-h-[1.5em] px-1 py-0.5',
                  'focus:bg-blue-50 focus:ring-2 focus:ring-blue-200 focus:ring-inset rounded',
                  !item && 'text-gray-400'
                )}
                onInput={(e) => handleInput(e, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={(e) => handlePaste(e, index)}
                data-placeholder="Type list item..."
              >
                {item || ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default SimplifiedListBlock;