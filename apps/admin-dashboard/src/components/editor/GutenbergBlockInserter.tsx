/**
 * Gutenberg-style Block Inserter
 * Simplified implementation following WordPress Gutenberg patterns
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
  ChevronDown
} from 'lucide-react';
import { getBlockManager } from '@/utils/block-manager';

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

interface GutenbergBlockInserterProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (blockName: string) => void;
}

const GutenbergBlockInserter: React.FC<GutenbergBlockInserterProps> = ({
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
        const wpCategories = window.wp?.blocks?.getCategories?.() || [];
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
            setMostUsedBlocks(['core/paragraph', 'core/heading', 'core/image']);
          }
        } else {
          setMostUsedBlocks(['core/paragraph', 'core/heading', 'core/image']);
        }
      }, 100);
    };

    loadData();

    // Subscribe to block changes
    const unsubscribe = window.wp?.data?.subscribe?.(loadData);
    return () => unsubscribe?.();
  }, [isOpen]);

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
  };

  if (!isOpen) return null;

  // Get category title
  const getCategoryTitle = (slug: string) => {
    if (slug === 'mostUsed') return 'Most Used';
    if (slug === 'results') return `${filteredBlocks.length} results`;
    const category = categories.find(c => c.slug === slug);
    return category?.title || slug;
  };

  // Render block icon
  const renderIcon = (icon: any) => {
    if (!icon) return <Plus className="h-5 w-5" />;
    if (typeof icon === 'string') {
      // Dashicon name
      return <span className={`dashicons dashicons-${icon}`} />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (icon.src) {
      // SVG or image src
      return <img src={icon.src} alt="" className="h-5 w-5" />;
    }
    return <Plus className="h-5 w-5" />;
  };

  return (
    <div className="gutenberg-block-inserter fixed inset-y-0 left-0 w-80 bg-white border-r shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-base font-medium">Add block</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for a block"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-3 py-2"
            autoFocus
          />
        </div>
      </div>

      {/* Category filter (optional) */}
      {!searchTerm && categories.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
              !selectedCategory ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                selectedCategory === cat.slug ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>
      )}

      {/* Blocks list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {Object.entries(groupedBlocks).map(([categorySlug, categoryBlocks]) => (
            <div key={categorySlug} className="mb-6">
              {/* Category header */}
              {!searchTerm && !selectedCategory && (
                <div className="flex items-center gap-2 mb-3">
                  {categorySlug === 'mostUsed' && <Clock className="h-4 w-4 text-gray-400" />}
                  <h3 className="text-xs font-semibold uppercase text-gray-600">
                    {getCategoryTitle(categorySlug)}
                  </h3>
                </div>
              )}

              {/* Blocks grid */}
              <div className="grid grid-cols-1 gap-1">
                {categoryBlocks.map(block => (
                  <button
                    key={block.name}
                    onClick={() => handleBlockSelect(block.name)}
                    className="flex items-start gap-3 p-3 text-left hover:bg-gray-50 rounded transition-colors group"
                  >
                    <div className="flex-shrink-0 text-gray-600 group-hover:text-gray-900">
                      {renderIcon(block.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600">
                        {block.title}
                      </div>
                      {block.description && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {block.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* No results */}
          {searchTerm && filteredBlocks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No blocks found.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default GutenbergBlockInserter;