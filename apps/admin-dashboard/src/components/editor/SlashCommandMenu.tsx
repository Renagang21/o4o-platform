/**
 * SlashCommandMenu Component
 * Inline block inserter triggered by "/" command
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { blockRegistry } from '../../blocks/registry/BlockRegistry';
import { BlockDefinition } from '../../blocks/registry/types';
import * as LucideIcons from 'lucide-react';

interface SlashCommandMenuProps {
  /** Search query from "/" input */
  query: string;
  /** Callback when block is selected */
  onSelectBlock: (blockType: string) => void;
  /** Callback when menu should close */
  onClose: () => void;
  /** Position of the menu relative to cursor */
  position: { top: number; left: number };
  /** Recent block types (for prioritization) */
  recentBlocks?: string[];
}

const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  query,
  onSelectBlock,
  onClose,
  position,
  recentBlocks = []
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Get filtered blocks based on query
  const getFilteredBlocks = useCallback((): BlockDefinition[] => {
    if (!query.trim()) {
      // No query: show recent blocks first, then all blocks
      const allBlocks = blockRegistry.getAll();

      if (recentBlocks.length > 0) {
        const recent = recentBlocks
          .map(name => blockRegistry.get(name))
          .filter((block): block is BlockDefinition => block !== undefined);

        const otherBlocks = allBlocks.filter(
          block => !recentBlocks.includes(block.name)
        );

        return [...recent, ...otherBlocks];
      }

      return allBlocks;
    }

    // Search blocks
    const results = blockRegistry.search(query);
    return results.map(result => result.block);
  }, [query, recentBlocks]);

  const [filteredBlocks, setFilteredBlocks] = useState<BlockDefinition[]>(getFilteredBlocks());

  // Update filtered blocks when query changes
  useEffect(() => {
    const blocks = getFilteredBlocks();
    setFilteredBlocks(blocks);
    setSelectedIndex(0); // Reset selection on query change
  }, [query, getFilteredBlocks]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredBlocks.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredBlocks.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredBlocks.length - 1
          );
          break;

        case 'Enter':
          e.preventDefault();
          if (filteredBlocks[selectedIndex]) {
            onSelectBlock(filteredBlocks[selectedIndex].name);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'Tab':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredBlocks.length - 1 ? prev + 1 : 0
          );
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredBlocks, selectedIndex, onSelectBlock, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedItem = itemRefs.current.get(selectedIndex);
    if (selectedItem && menuRef.current) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  // Get icon component from block definition
  const getBlockIcon = (block: BlockDefinition): React.ReactNode => {
    if (typeof block.icon === 'string') {
      // Assume it's a Lucide icon name
      const IconComponent = (LucideIcons as any)[block.icon];
      if (IconComponent) {
        return <IconComponent size={20} />;
      }
      // Fallback to first letter
      return <span className="slash-menu-icon-fallback">{block.title.charAt(0)}</span>;
    }
    return block.icon;
  };

  // Highlight matching text in title
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) return text;

    return (
      <>
        {text.substring(0, index)}
        <mark className="slash-menu-highlight">
          {text.substring(index, index + query.length)}
        </mark>
        {text.substring(index + query.length)}
      </>
    );
  };

  if (filteredBlocks.length === 0) {
    return (
      <div
        ref={menuRef}
        className="slash-command-menu"
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="slash-menu-empty">
          No blocks found for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="slash-command-menu"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="slash-menu-header">
        {query ? `Searching for "${query}"` : 'Add a block'}
      </div>
      <div className="slash-menu-list">
        {filteredBlocks.map((block, index) => (
          <div
            key={block.name}
            ref={el => {
              if (el) itemRefs.current.set(index, el);
            }}
            className={`slash-menu-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => onSelectBlock(block.name)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="slash-menu-item-icon">
              {getBlockIcon(block)}
            </div>
            <div className="slash-menu-item-content">
              <div className="slash-menu-item-title">
                {highlightMatch(block.title, query)}
              </div>
              {block.description && (
                <div className="slash-menu-item-description">
                  {block.description}
                </div>
              )}
            </div>
            {recentBlocks.includes(block.name) && (
              <div className="slash-menu-item-badge">Recent</div>
            )}
          </div>
        ))}
      </div>
      <div className="slash-menu-footer">
        <kbd>↑↓</kbd> Navigate • <kbd>Enter</kbd> Select • <kbd>Esc</kbd> Close
      </div>
    </div>
  );
};

export default SlashCommandMenu;
