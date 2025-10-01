/**
 * ZoneBlockRenderer - Renders individual blocks within zones with drag & drop
 * Handles block interactions, selection, and drag operations
 */

import React, { useRef, useCallback, useState } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { ZoneBlock } from '@o4o/types'
import { BlockInserter } from './BlockInserter'
import { 
  Move, 
  Trash2, 
  Copy, 
  MoreVertical, 
  Plus,
  GripVertical,
  Edit3,
  Eye
} from 'lucide-react'

// Import existing block components
import ParagraphBlock from '../blocks/ParagraphBlock'
import EnhancedHeadingBlock from '../blocks/EnhancedHeadingBlock'
import ListBlock from '../blocks/ListBlock'
import ImageBlock from '../blocks/ImageBlock'
import ButtonBlock from '../blocks/ButtonBlock'
import ColumnsBlock from '../blocks/ColumnsBlock'
import { SlideBlock } from '../blocks/slide'

interface ZoneBlockRendererProps {
  block: ZoneBlock
  index: number
  zoneId: string
  isSelected?: boolean
  editable?: boolean
  viewMode?: 'desktop' | 'tablet' | 'mobile'
  onSelect?: (blockId: string | null, event?: React.MouseEvent) => void
  onUpdate?: (updates: Partial<ZoneBlock>) => void
  onRemove?: () => void
  onMove?: (dragIndex: number, hoverIndex: number) => void
  allowedBlocks?: string[]
  onBlockAdd?: (zoneId: string, blockType: string, position?: number) => void
}

const BLOCK_ITEM_TYPE = 'zone-block'

// Block component mapping
const BLOCK_COMPONENTS = {
  'core/paragraph': ParagraphBlock,
  'core/heading': EnhancedHeadingBlock,
  'core/list': ListBlock,
  'core/image': ImageBlock,
  'core/button': ButtonBlock,
  'core/buttons': ButtonBlock, // Handle buttons group
  'core/columns': ColumnsBlock,
  'core/group': 'div', // Simple wrapper
  'core/spacer': 'div', // Simple spacer
  'core/separator': 'hr', // Horizontal rule
  'o4o/slide': SlideBlock, // Slide presentation block
}

export const ZoneBlockRenderer: React.FC<ZoneBlockRendererProps> = ({
  block,
  index,
  zoneId,
  isSelected = false,
  editable = true,
  viewMode = 'desktop',
  onSelect,
  onUpdate,
  onRemove,
  onMove,
  allowedBlocks = [],
  onBlockAdd
}) => {
  const ref = useRef<HTMLElement>(null)
  const [showActions, setShowActions] = useState(false)

  // Drag functionality
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: BLOCK_ITEM_TYPE,
    item: { 
      type: BLOCK_ITEM_TYPE,
      id: block.id, 
      zoneId, 
      blockType: block.type, 
      index 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: editable
  })

  // Drop functionality for reordering
  const [{ isOver }, drop] = useDrop({
    accept: BLOCK_ITEM_TYPE,
    hover: (item: any, monitor) => {
      if (!ref.current || !onMove) return

      const dragIndex = item.index
      const hoverIndex = index

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      
      if (!clientOffset) return

      const hoverClientY = clientOffset.y - hoverBoundingRect.top

      // Only perform the move when the mouse has crossed half of the items height
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  // Combine drag and drop refs
  const setRef = useCallback((node: HTMLElement | null) => {
    if (node) {
      // Use a type assertion since we know node is not null here
      (ref as React.MutableRefObject<HTMLElement | null>).current = node
      drag(drop(node))
    }
  }, [drag, drop])

  // Handle block selection
  const handleSelect = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onSelect?.(block.id, event)
  }, [block.id, onSelect])

  // Handle block updates
  const handleUpdate = useCallback((updates: Partial<ZoneBlock>) => {
    onUpdate?.(updates)
  }, [onUpdate])

  // Render block content based on type
  const renderBlockContent = () => {
    const BlockComponent = BLOCK_COMPONENTS[block.type as keyof typeof BLOCK_COMPONENTS]
    
    if (!BlockComponent) {
      // Fallback for unknown block types
      return (
        <div className="unknown-block p-4 bg-gray-100 border border-gray-300 rounded">
          <div className="text-sm text-gray-600 mb-2">Unknown block type: {block.type}</div>
          <pre className="text-xs text-gray-500 overflow-auto">
            {JSON.stringify(block, null, 2)}
          </pre>
        </div>
      )
    }

    // Handle simple HTML elements
    if (typeof BlockComponent === 'string') {
      const Element = BlockComponent as keyof JSX.IntrinsicElements
      return (
        <Element
          className={`block-${block.type.replace('/', '-')} ${block.attributes?.className || ''}`}
          style={block.attributes?.style}
        >
          {block.content || (block.type === 'core/separator' ? undefined : 'Empty block')}
        </Element>
      )
    }

    // Handle React components with proper props
    const blockProps = {
      id: block.id,
      content: block.content || '',
      attributes: block.attributes || {},
      onChange: (content: string, attributes?: Record<string, unknown>) => {
        handleUpdate({ content, attributes })
      },
      onDelete: onRemove || (() => {}),
      onDuplicate: () => {
        // TODO: Implement duplication
      },
      onMoveUp: () => onMove?.(index, index - 1),
      onMoveDown: () => onMove?.(index, index + 1),
      isSelected,
      onSelect: () => onSelect?.(block.id),
      canMoveUp: index > 0,
      canMoveDown: true, // Will be determined by parent
      viewMode,
      setAttributes: (newAttributes: Record<string, unknown>) => {
        // Update the block's attributes
        onUpdate?.({ attributes: { ...block.attributes, ...newAttributes } });
      }
    }

    return <BlockComponent {...blockProps} {...(block.attributes || {})} />
  }

  // Handle inner blocks for nested structures
  const renderInnerBlocks = () => {
    if (!block.innerBlocks || block.innerBlocks.length === 0) return null

    return (
      <div className="inner-blocks ml-4 border-l-2 border-gray-200 pl-4">
        {block.innerBlocks.map((innerBlock, innerIndex) => (
          <ZoneBlockRenderer
            key={innerBlock.id}
            block={innerBlock}
            index={innerIndex}
            zoneId={zoneId}
            isSelected={false} // Inner blocks have separate selection
            editable={editable}
            viewMode={viewMode}
            onSelect={onSelect}
            onUpdate={(updates) => {
              const newInnerBlocks = [...(block.innerBlocks || [])]
              newInnerBlocks[innerIndex] = { ...innerBlock, ...updates }
              handleUpdate({ innerBlocks: newInnerBlocks })
            }}
            onRemove={() => {
              const newInnerBlocks = block.innerBlocks?.filter((_, i) => i !== innerIndex) || []
              handleUpdate({ innerBlocks: newInnerBlocks })
            }}
            allowedBlocks={allowedBlocks}
            onBlockAdd={onBlockAdd}
          />
        ))}
      </div>
    )
  }

  const blockWrapperClass = `
    zone-block-wrapper
    relative group
    transition-all duration-200
    ${isDragging ? 'opacity-50' : ''}
    ${isOver ? 'border-blue-400 border-2' : 'border border-transparent'}
    ${isSelected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
    ${editable ? 'cursor-pointer' : 'cursor-default'}
    hover:border-gray-300
  `.trim()

  return (
    <>
      <div
        ref={dragPreview}
        className={blockWrapperClass}
        onClick={handleSelect}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Block Actions Toolbar */}
        {editable && (showActions || isSelected) && (
          <div className="block-actions absolute -top-8 left-0 flex items-center space-x-1 bg-white border border-gray-200 rounded-md shadow-sm px-2 py-1 z-10">
            {/* Drag Handle */}
            <button
              ref={setRef}
              className="drag-handle p-1 text-gray-400 hover:text-gray-600 cursor-move"
              title="Drag to reorder"
            >
              <GripVertical size={14} />
            </button>

            {/* Block Type Indicator */}
            <span className="block-type text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">
              {block.type.replace('core/', '')}
            </span>

            {/* Action Buttons */}
            <div className="action-buttons flex space-x-1">
              <button
                className="action-button p-1 text-gray-400 hover:text-blue-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.(block.id)
                }}
                title="Edit block"
              >
                <Edit3 size={12} />
              </button>

              <button
                className="action-button p-1 text-gray-400 hover:text-green-600"
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: Implement duplication
                }}
                title="Duplicate block"
              >
                <Copy size={12} />
              </button>

              <button
                className="action-button p-1 text-gray-400 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove?.()
                }}
                title="Remove block"
              >
                <Trash2 size={12} />
              </button>

              {/* More Actions */}
              <button
                className="action-button p-1 text-gray-400 hover:text-gray-600"
                title="More actions"
              >
                <MoreVertical size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Block Content */}
        <div className="block-content">
          {renderBlockContent()}
        </div>

        {/* Inner Blocks */}
        {renderInnerBlocks()}

        {/* Block Inserter */}
        {editable && isSelected && (
          <div className="block-inserter-wrapper mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <BlockInserter
              zoneId={zoneId}
              allowedBlocks={allowedBlocks}
              onBlockAdd={(zoneId, blockType) => 
                onBlockAdd?.(zoneId, blockType, index + 1)
              }
              trigger={
                <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors flex items-center justify-center text-gray-500 hover:text-blue-600">
                  <Plus size={16} className="mr-2" />
                  <span className="text-sm">Add block below</span>
                </button>
              }
            />
          </div>
        )}

        {/* Drop Indicator */}
        {isOver && (
          <div className="drop-indicator absolute inset-0 bg-blue-100 bg-opacity-50 border-2 border-blue-400 border-dashed rounded pointer-events-none" />
        )}
      </div>
    </>
  )
}

export default ZoneBlockRenderer