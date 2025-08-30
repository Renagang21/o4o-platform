/**
 * BlockInserter - Block insertion interface for zones
 * Shows available blocks that can be added to the current zone
 */

import React, { useState, useMemo } from 'react'
import { useDrag } from 'react-dnd'
import { 
  Plus, 
  Search, 
  Type, 
  Image, 
  List, 
  Quote, 
  Code, 
  Columns, 
  Button,
  Video,
  Grid,
  Layout,
  X,
  Star,
  Bookmark
} from 'lucide-react'

interface BlockInserterProps {
  zoneId: string
  allowedBlocks?: string[]
  onBlockAdd?: (zoneId: string, blockType: string, position?: number) => void
  trigger?: React.ReactNode
  position?: number
  className?: string
}

// Block type definitions with metadata
const AVAILABLE_BLOCKS = [
  {
    type: 'core/paragraph',
    name: 'Paragraph',
    description: 'Start with the basic building block of all text.',
    icon: Type,
    category: 'text',
    keywords: ['text', 'content', 'writing']
  },
  {
    type: 'core/heading',
    name: 'Heading',
    description: 'Structure your content with headings.',
    icon: Type,
    category: 'text',
    keywords: ['title', 'heading', 'h1', 'h2', 'h3']
  },
  {
    type: 'core/image',
    name: 'Image',
    description: 'Insert an image from your media library.',
    icon: Image,
    category: 'media',
    keywords: ['photo', 'picture', 'media']
  },
  {
    type: 'core/list',
    name: 'List',
    description: 'Create bulleted or numbered lists.',
    icon: List,
    category: 'text',
    keywords: ['bullet', 'numbered', 'items']
  },
  {
    type: 'core/quote',
    name: 'Quote',
    description: 'Highlight important quotes or testimonials.',
    icon: Quote,
    category: 'text',
    keywords: ['blockquote', 'citation', 'testimonial']
  },
  {
    type: 'core/code',
    name: 'Code',
    description: 'Display code snippets with syntax highlighting.',
    icon: Code,
    category: 'text',
    keywords: ['programming', 'syntax', 'snippet']
  },
  {
    type: 'core/button',
    name: 'Button',
    description: 'Add a call-to-action button.',
    icon: Button,
    category: 'design',
    keywords: ['cta', 'link', 'action']
  },
  {
    type: 'core/columns',
    name: 'Columns',
    description: 'Add multiple columns for complex layouts.',
    icon: Columns,
    category: 'design',
    keywords: ['layout', 'grid', 'responsive']
  },
  {
    type: 'core/group',
    name: 'Group',
    description: 'Group blocks together with styling options.',
    icon: Grid,
    category: 'design',
    keywords: ['container', 'wrapper', 'section']
  },
  {
    type: 'core/spacer',
    name: 'Spacer',
    description: 'Add vertical space between blocks.',
    icon: Layout,
    category: 'design',
    keywords: ['space', 'margin', 'gap']
  },
  {
    type: 'core/separator',
    name: 'Separator',
    description: 'Add a horizontal line to divide content.',
    icon: Layout,
    category: 'design',
    keywords: ['divider', 'line', 'break']
  },
  {
    type: 'core/video',
    name: 'Video',
    description: 'Embed or upload video content.',
    icon: Video,
    category: 'media',
    keywords: ['media', 'embed', 'youtube']
  },
  // Zone-specific blocks
  {
    type: 'core/site-logo',
    name: 'Site Logo',
    description: 'Display your site logo.',
    icon: Star,
    category: 'site',
    keywords: ['brand', 'identity', 'header']
  },
  {
    type: 'core/navigation',
    name: 'Navigation',
    description: 'Add a navigation menu.',
    icon: Bookmark,
    category: 'site',
    keywords: ['menu', 'nav', 'links']
  }
]

const CATEGORIES = [
  { id: 'all', name: 'All', icon: Grid },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'media', name: 'Media', icon: Image },
  { id: 'design', name: 'Design', icon: Layout },
  { id: 'site', name: 'Site', icon: Star }
]

const NEW_BLOCK_ITEM_TYPE = 'new-block'

// Draggable block item
const DraggableBlockItem: React.FC<{
  block: typeof AVAILABLE_BLOCKS[0]
  onAdd: () => void
}> = ({ block, onAdd }) => {
  const [{ isDragging }, drag] = useDrag({
    type: NEW_BLOCK_ITEM_TYPE,
    item: { type: NEW_BLOCK_ITEM_TYPE, blockType: block.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const IconComponent = block.icon

  return (
    <button
      ref={drag}
      className={`block-item w-full p-3 text-left border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors group ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={onAdd}
    >
      <div className="flex items-start space-x-3">
        <div className="block-icon p-2 bg-gray-100 group-hover:bg-blue-100 rounded-md">
          <IconComponent size={16} className="text-gray-600 group-hover:text-blue-600" />
        </div>
        <div className="block-info flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
            {block.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {block.description}
          </p>
        </div>
      </div>
    </button>
  )
}

export const BlockInserter: React.FC<BlockInserterProps> = ({
  zoneId,
  allowedBlocks = [],
  onBlockAdd,
  trigger,
  position,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Filter blocks based on zone constraints and search
  const filteredBlocks = useMemo(() => {
    let blocks = AVAILABLE_BLOCKS

    // Filter by allowed blocks if specified
    if (allowedBlocks.length > 0) {
      blocks = blocks.filter(block => allowedBlocks.includes(block.type))
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      blocks = blocks.filter(block => block.category === selectedCategory)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      blocks = blocks.filter(block =>
        block.name.toLowerCase().includes(term) ||
        block.description.toLowerCase().includes(term) ||
        block.keywords.some(keyword => keyword.toLowerCase().includes(term))
      )
    }

    return blocks
  }, [allowedBlocks, selectedCategory, searchTerm])

  // Handle block addition
  const handleBlockAdd = (blockType: string) => {
    onBlockAdd?.(zoneId, blockType, position)
    setIsOpen(false)
    setSearchTerm('')
    setSelectedCategory('all')
  }

  // Default trigger if none provided
  const defaultTrigger = (
    <button
      className="block-inserter-trigger inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
      onClick={() => setIsOpen(true)}
    >
      <Plus size={16} className="mr-2" />
      Add Block
    </button>
  )

  return (
    <div className={`block-inserter relative ${className}`}>
      {/* Trigger */}
      <div onClick={() => setIsOpen(true)}>
        {trigger || defaultTrigger}
      </div>

      {/* Block Inserter Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="block-inserter-modal absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="modal-header flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Add Block</h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="search-section p-4 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search blocks..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="categories-section p-4 border-b border-gray-200">
              <div className="flex space-x-1 overflow-x-auto">
                {CATEGORIES.map(category => {
                  const IconComponent = category.icon
                  const isSelected = selectedCategory === category.id
                  
                  return (
                    <button
                      key={category.id}
                      className={`flex items-center px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <IconComponent size={12} className="mr-2" />
                      {category.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Blocks List */}
            <div className="blocks-list p-4 max-h-64 overflow-y-auto">
              {filteredBlocks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Grid size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No blocks found</p>
                  {allowedBlocks.length > 0 && (
                    <p className="text-xs mt-1">
                      This zone only allows specific block types
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBlocks.map(block => (
                    <DraggableBlockItem
                      key={block.type}
                      block={block}
                      onAdd={() => handleBlockAdd(block.type)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {allowedBlocks.length > 0 && (
              <div className="modal-footer p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Showing {filteredBlocks.length} of {allowedBlocks.length} allowed blocks for this zone
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default BlockInserter