/**
 * Gutenberg-style Block Inserter
 * WordPress-style grid layout with icons
 */
import React, { useState, useMemo, useEffect } from 'react';
import '@/styles/gutenberg-inserter.css';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  X,
  Plus,
  Clock,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { getBlockManager } from '@/utils/block-manager';
import { renderBlockIcon } from '@/utils/block-icons';

interface Block {
  name: string;
  title: string;
  description?: string;
  category: string;
  icon?: any;
  keywords?: string[];
}

interface Category {
  slug: string;
  title: string;
  icon?: any;
}

interface BlockInserterProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (blockName: string) => void;
}

const BlockInserter: React.FC<BlockInserterProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mostUsedBlocks, setMostUsedBlocks] = useState<string[]>([]);

  // Load blocks and categories from WordPress
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      // Initialize block manager and load blocks
      const blockManager = getBlockManager();
      
      // Load all block categories progressively
      await blockManager.loadBlocksProgressive();
      
      // Wait a bit for blocks to be registered
      setTimeout(() => {
        // Get categories from WordPress
        const wpCategories = (window.wp?.blocks?.getCategories?.() as Category[] | undefined) || [];
        setCategories(wpCategories);

        // Get blocks from WordPress
        const wpBlocks = window.wp?.blocks?.getBlockTypes?.() || [];
        setBlocks(wpBlocks.map((block: any) => ({
          name: block.name,
          title: block.title || block.name,
          description: block.description,
          category: block.category || 'common',
          icon: block.icon,
          keywords: block.keywords || []
        })));

        // Get most used blocks (from localStorage or default)
        const stored = localStorage.getItem('gutenberg_most_used_blocks');
        if (stored) {
          try {
            setMostUsedBlocks(JSON.parse(stored));
          } catch {
            setMostUsedBlocks(['o4o/paragraph', 'o4o/heading', 'o4o/image']);
          }
        } else {
          setMostUsedBlocks(['o4o/paragraph', 'o4o/heading', 'o4o/image']);
        }
      }, 100);
    };

    loadData();

    // Subscribe to block changes
    const unsubscribe = window.wp?.data?.subscribe?.(loadData);
    return () => unsubscribe?.();
  }, [isOpen]);

  // Handle Escape key to close inserter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter blocks based on search and category
  const filteredBlocks = useMemo(() => {
    let result = blocks;

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(block =>
        block.title.toLowerCase().includes(term) ||
        block.description?.toLowerCase().includes(term) ||
        block.keywords?.some(k => k.toLowerCase().includes(term))
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter(block => block.category === selectedCategory);
    }

    return result;
  }, [blocks, searchTerm, selectedCategory]);

  // Group blocks by category
  const groupedBlocks = useMemo(() => {
    const groups: Record<string, Block[]> = {};
    
    if (searchTerm || selectedCategory) {
      // When searching or filtering, don't group
      return { results: filteredBlocks };
    }

    // Add most used section
    const mostUsed = blocks.filter(b => mostUsedBlocks.includes(b.name));
    if (mostUsed.length > 0) {
      groups['mostUsed'] = mostUsed;
    }

    // Group by categories
    categories.forEach(cat => {
      const catBlocks = blocks.filter(b => b.category === cat.slug);
      if (catBlocks.length > 0) {
        groups[cat.slug] = catBlocks;
      }
    });

    // Add uncategorized blocks
    const uncategorized = blocks.filter(
      b => !categories.some(c => c.slug === b.category)
    );
    if (uncategorized.length > 0) {
      groups['common'] = uncategorized;
    }

    return groups;
  }, [blocks, categories, filteredBlocks, searchTerm, selectedCategory, mostUsedBlocks]);

  // Handle block selection
  const handleBlockSelect = (blockName: string) => {
    // Update most used blocks
    const updated = [blockName, ...mostUsedBlocks.filter(b => b !== blockName)].slice(0, 6);
    setMostUsedBlocks(updated);
    localStorage.setItem('gutenberg_most_used_blocks', JSON.stringify(updated));

    // Trigger selection
    onSelect(blockName);

    // Close inserter after selection
    onClose();
  };

  if (!isOpen) return null;

  // Get category title
  const getCategoryTitle = (slug: string) => {
    if (slug === 'mostUsed') return 'Most Used';
    if (slug === 'results') return `${filteredBlocks.length} results`;
    const category = categories.find(c => c.slug === slug);
    return category?.title || slug;
  };

  return (
    <div className="gutenberg-block-inserter fixed inset-y-0 left-0 w-64 sm:w-72 md:w-80 bg-white border-r shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gray-50">
        <h2 className="text-sm sm:text-base font-semibold text-gray-900">Add Block</h2>
        <button
          onClick={onClose}
          className="p-1 sm:p-1.5 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 sm:p-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search blocks"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredBlocks.length > 0) {
                e.preventDefault();
                handleBlockSelect(filteredBlocks[0].name);
              }
            }}
            className="pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-50 border-gray-200 focus:bg-white"
            autoFocus
          />
        </div>
      </div>

      {/* Category tabs */}
      {!searchTerm && categories.length > 0 && (
        <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2 border-b bg-gray-50 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              !selectedCategory
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat.slug
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {/* Blocks Grid */}
      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-2 sm:p-4">
          {Object.entries(groupedBlocks).map(([categorySlug, categoryBlocks]) => (
            <div key={categorySlug} className="mb-6">
              {/* Category header */}
              {!searchTerm && !selectedCategory && (
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  {categorySlug === 'mostUsed' && (
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                  )}
                  <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {getCategoryTitle(categorySlug)}
                  </h3>
                </div>
              )}

              {/* WordPress-style Grid Layout */}
              <div className="grid grid-cols-3 gap-1">
                {categoryBlocks.map(block => (
                  <button
                    key={block.name}
                    onClick={() => handleBlockSelect(block.name)}
                    className="relative flex flex-col items-center justify-center p-1.5 sm:p-2 h-16 sm:h-18 text-center bg-white border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all group"
                    title={block.description || block.title}
                  >
                    {/* Block Icon */}
                    <div className="mb-1 transition-transform group-hover:scale-110">
                      {renderBlockIcon(block.name, block.category, '', 'sm')}
                    </div>

                    {/* Block Title */}
                    <div className="text-[9px] sm:text-[10px] font-medium text-gray-700 group-hover:text-blue-700 line-clamp-2 leading-tight">
                      {block.title}
                    </div>
                    
                    {/* Hover indicator */}
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400 rounded-md pointer-events-none" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* No results */}
          {searchTerm && filteredBlocks.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No blocks found</p>
              <p className="text-sm text-gray-500 mt-1">Try searching with different keywords</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default BlockInserter;