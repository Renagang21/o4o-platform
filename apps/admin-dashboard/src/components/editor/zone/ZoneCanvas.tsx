/**
 * ZoneCanvas - Main editing canvas for zone content
 * Handles block rendering, drag & drop, and editing interactions
 */

import React, { useRef, useCallback } from 'react'
import { useDrop } from 'react-dnd'
import { Zone, ZoneBlock, ZoneConfig } from '@o4o/types'
import { ZoneBlockRenderer } from './ZoneBlockRenderer'
import { BlockInserter } from './BlockInserter'
import { ZoneConstraintIndicator } from './ZoneConstraintIndicator'
import { Plus, AlertCircle, Eye, Grid } from 'lucide-react'

interface ZoneCanvasProps {
  zone: Zone
  zoneId: string
  selectedBlockId?: string | null
  viewMode?: 'desktop' | 'tablet' | 'mobile'
  editable?: boolean
  showConstraints?: boolean
  zoneConfig?: ZoneConfig
  onBlockSelect?: (blockId: string | null) => void
  onBlockAdd?: (zoneId: string, blockType: string, position?: number) => void
  onBlockUpdate?: (zoneId: string, blockId: string, updates: Partial<ZoneBlock>) => void
  onBlockRemove?: (zoneId: string, blockId: string) => void
  onBlockMove?: (fromZoneId: string, toZoneId: string, blockId: string, position?: number) => void
  onBlockReorder?: (zoneId: string, blockIds: string[]) => void
  className?: string
}

// Drag and drop types
const BLOCK_ITEM_TYPE = 'zone-block'
const NEW_BLOCK_ITEM_TYPE = 'new-block'

interface BlockDragItem {
  type: string
  id: string
  zoneId: string
  blockType: string
  index: number
}

interface NewBlockDragItem {
  type: string
  blockType: string
}

export const ZoneCanvas: React.FC<ZoneCanvasProps> = ({
  zone,
  zoneId,
  selectedBlockId,
  viewMode = 'desktop',
  editable = true,
  showConstraints = false,
  zoneConfig,
  onBlockSelect,
  onBlockAdd,
  onBlockUpdate,
  onBlockRemove,
  onBlockMove,
  onBlockReorder,
  className = ''
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Drop zone for blocks
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [BLOCK_ITEM_TYPE, NEW_BLOCK_ITEM_TYPE],
    drop: (item: BlockDragItem | NewBlockDragItem, monitor) => {
      if (!monitor.didDrop()) {
        if (item.type === NEW_BLOCK_ITEM_TYPE) {
          const newBlockItem = item as NewBlockDragItem
          onBlockAdd?.(zoneId, newBlockItem.blockType)
        } else {
          const blockItem = item as BlockDragItem
          if (blockItem.zoneId !== zoneId) {
            onBlockMove?.(blockItem.zoneId, zoneId, blockItem.id)
          }
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    })
  })

  // Combine refs
  const setRef = useCallback((node: HTMLDivElement) => {
    canvasRef.current = node
    drop(node)
  }, [drop])

  // Handle block reordering
  const handleBlockMove = useCallback((dragIndex: number, hoverIndex: number) => {
    if (!zone.blocks || dragIndex === hoverIndex) return

    const dragBlock = zone.blocks[dragIndex]
    const newBlocks = [...zone.blocks]
    
    // Remove dragged block
    newBlocks.splice(dragIndex, 1)
    
    // Insert at new position
    newBlocks.splice(hoverIndex, 0, dragBlock)
    
    // Update block orders and notify parent
    const blockIds = newBlocks.map(block => block.id)
    onBlockReorder?.(zoneId, blockIds)
  }, [zone.blocks, zoneId, onBlockReorder])

  // Handle block selection
  const handleBlockSelect = useCallback((blockId: string | null, event?: React.MouseEvent) => {
    event?.stopPropagation()
    onBlockSelect?.(blockId)
  }, [onBlockSelect])

  // Handle canvas click (deselect blocks)
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onBlockSelect?.(null)
    }
  }, [onBlockSelect])

  // Get canvas styles based on view mode and zone settings
  const getCanvasStyles = () => {
    const baseStyles = 'zone-canvas relative min-h-96 transition-all duration-300'
    const viewModeStyles = {
      desktop: 'w-full max-w-none',
      tablet: 'w-[768px] max-w-full mx-auto',
      mobile: 'w-[375px] max-w-full mx-auto'
    }
    
    const zoneStyles = zone.settings ? {
      maxWidth: zone.settings.maxWidth,
      padding: zone.settings.padding,
      backgroundColor: zone.settings.backgroundColor,
      minHeight: zone.settings.minHeight,
      borderRadius: zone.settings.borderRadius
    } : {}

    return {
      className: `${baseStyles} ${viewModeStyles[viewMode]} ${className}`,
      style: zoneStyles
    }
  }

  const canvasStyles = getCanvasStyles()
  const hasBlocks = zone.blocks && zone.blocks.length > 0
  const showDropZone = isOver && canDrop

  return (
    <div className="zone-canvas-container flex-1 overflow-auto bg-gray-50">
      {/* Zone Header */}
      <div className="zone-canvas-header sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">{zone.name}</h2>
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              {zone.type}
            </span>
            {!zone.editable && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                Read-only
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Mode Indicator */}
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Eye size={14} />
              <span className="capitalize">{viewMode}</span>
            </div>
            
            {/* Constraints Indicator */}
            {showConstraints && zoneConfig && (
              <ZoneConstraintIndicator
                zone={zone}
                zoneId={zoneId}
                zoneConfig={zoneConfig}
              />
            )}
          </div>
        </div>

        {/* Zone Description */}
        {zone.description && (
          <p className="mt-2 text-sm text-gray-600">{zone.description}</p>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="zone-canvas-content p-4">
        <div
          ref={setRef}
          className={`${canvasStyles.className} ${
            showDropZone ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
          } ${
            !hasBlocks ? 'border-2 border-dashed border-gray-300' : 'border border-gray-200'
          }`}
          style={canvasStyles.style}
          onClick={handleCanvasClick}
        >
          {/* Empty State */}
          {!hasBlocks && (
            <div className="empty-zone-state flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Grid size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No blocks in this zone
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                {zone.constraints.required 
                  ? 'This zone requires at least one block. Add a block to get started.'
                  : 'This zone is empty. You can add blocks here or leave it empty.'
                }
              </p>
              
              {editable && (
                <BlockInserter
                  zoneId={zoneId}
                  allowedBlocks={zone.constraints.allowedBlocks}
                  onBlockAdd={onBlockAdd}
                  trigger={
                    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      <Plus size={16} className="mr-2" />
                      Add Block
                    </button>
                  }
                />
              )}
            </div>
          )}

          {/* Blocks List */}
          {hasBlocks && (
            <div className="zone-blocks space-y-2">
              {zone.blocks.map((block, index) => (
                <ZoneBlockRenderer
                  key={block.id}
                  block={block}
                  index={index}
                  zoneId={zoneId}
                  isSelected={selectedBlockId === block.id}
                  editable={editable}
                  viewMode={viewMode}
                  onSelect={handleBlockSelect}
                  onUpdate={(updates) => onBlockUpdate?.(zoneId, block.id, updates)}
                  onRemove={() => onBlockRemove?.(zoneId, block.id)}
                  onMove={handleBlockMove}
                  allowedBlocks={zone.constraints.allowedBlocks}
                  onBlockAdd={onBlockAdd}
                />
              ))}
            </div>
          )}

          {/* Drop Zone Indicator */}
          {showDropZone && (
            <div className="absolute inset-0 bg-blue-50 bg-opacity-50 border-2 border-blue-400 border-dashed rounded flex items-center justify-center">
              <div className="text-blue-600 text-center">
                <Plus size={32} className="mx-auto mb-2" />
                <p className="text-sm font-medium">Drop block here</p>
              </div>
            </div>
          )}

          {/* Zone Constraints Violation Warning */}
          {zone.constraints.maxBlocks && zone.blocks.length >= zone.constraints.maxBlocks && (
            <div className="zone-limit-warning absolute top-2 right-2 bg-yellow-100 border border-yellow-400 rounded-md p-2 flex items-center text-yellow-800 text-xs">
              <AlertCircle size={14} className="mr-1" />
              Block limit reached ({zone.blocks.length}/{zone.constraints.maxBlocks})
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ZoneCanvas