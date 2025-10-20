/**
 * Block Library Component
 * Shows available blocks grouped by category
 */

import React, { useState } from 'react';
import { blockRegistry } from '@/blocks/registry/BlockRegistry';
import { BlockCategory } from '@/blocks/registry/types';
import { Search, X } from 'lucide-react';

interface BlockLibraryProps {
  onSelect: (blockType: string) => void;
  onClose: () => void;
  allowedBlocks?: string[];
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  text: '텍스트',
  media: '미디어',
  design: '디자인',
  layout: '레이아웃',
  widgets: '위젯',
  embed: '임베드',
  dynamic: '동적 블록',
  common: '공통',
};

const CATEGORY_ORDER: BlockCategory[] = [
  'text',
  'media',
  'design',
  'layout',
  'dynamic',
  'widgets',
  'embed',
  'common',
];

export const BlockLibrary: React.FC<BlockLibraryProps> = ({
  onSelect,
  onClose,
  allowedBlocks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Get blocks by category
  const blocksByCategory = CATEGORY_ORDER.map(category => ({
    category,
    label: CATEGORY_LABELS[category],
    blocks: blockRegistry.getByCategory(category),
  })).filter(({ blocks }) => blocks.length > 0);

  // Filter by search query
  const filteredBlocksByCategory = searchQuery
    ? blocksByCategory.map(({ category, label, blocks }) => ({
        category,
        label,
        blocks: blocks.filter(block =>
          block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          block.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          block.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
        ),
      })).filter(({ blocks }) => blocks.length > 0)
    : blocksByCategory;

  // Filter by allowedBlocks
  const finalBlocksByCategory = allowedBlocks
    ? filteredBlocksByCategory.map(({ category, label, blocks }) => ({
        category,
        label,
        blocks: blocks.filter(block => allowedBlocks.includes(block.name)),
      })).filter(({ blocks }) => blocks.length > 0)
    : filteredBlocksByCategory;

  return (
    <div className="block-library fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">블록 추가</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="블록 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>

        {/* Block List */}
        <div className="flex-1 overflow-y-auto p-4">
          {finalBlocksByCategory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              검색 결과가 없습니다.
            </div>
          ) : (
            <div className="space-y-6">
              {finalBlocksByCategory.map(({ category, label, blocks }) => (
                <div key={category} className="block-category">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    {label}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {blocks.map(block => (
                      <button
                        key={block.name}
                        onClick={() => {
                          onSelect(block.name);
                          onClose();
                        }}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors text-left"
                      >
                        <div className="flex-shrink-0 w-6 h-6 text-gray-600">
                          {typeof block.icon === 'string' ? (
                            <span>{block.icon}</span>
                          ) : (
                            block.icon
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 mb-1">
                            {block.title}
                          </div>
                          {block.description && (
                            <div className="text-xs text-gray-500 line-clamp-2">
                              {block.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockLibrary;
