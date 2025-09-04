/**
 * ZoneEditor - Main Zone-based Editor Component
 * Handles zone-based content editing with constraints
 */

import React, { useState, useEffect, useCallback } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { 
  ZoneBasedContent, 
  Zone, 
  ZoneBlock, 
  LayoutType,
  ZoneConfig,
  LayoutConfig,
  ZoneValidationResult 
} from '@o4o/types'
import { ZoneSelector } from './ZoneSelector'
import { ZoneCanvas } from './ZoneCanvas'
import { ZoneInspector } from './ZoneInspector'
import { ZoneToolbar } from './ZoneToolbar'
import { useZoneContent } from '../hooks/useZoneContent'
import { useZoneConstraints } from '../hooks/useZoneConstraints'
import { EditorHeader } from '../EditorHeader'
import { toast } from 'react-hot-toast'

interface ZoneEditorProps {
  initialContent?: ZoneBasedContent
  layoutType?: LayoutType
  zoneConfig?: ZoneConfig
  layoutConfig?: LayoutConfig
  editable?: boolean
  onChange?: (content: ZoneBasedContent) => void
  onSave?: () => void
  onPublish?: () => void
  className?: string
}

export const ZoneEditor: React.FC<ZoneEditorProps> = ({
  initialContent,
  layoutType = 'single-column',
  zoneConfig,
  layoutConfig,
  editable = true,
  onChange,
  onSave,
  onPublish,
  className = ''
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('main')
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showConstraints, setShowConstraints] = useState<boolean>(false)

  // Custom hooks for zone content management
  const {
    content,
    updateZone,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    reorderBlocks,
    isLoading,
    error
  } = useZoneContent(initialContent)

  const {
    validateZoneConstraints,
    getBlockConstraints,
    isBlockAllowed,
    canAddMoreBlocks,
    validationResult
  } = useZoneConstraints(zoneConfig)

  // Notify parent of changes
  useEffect(() => {
    if (onChange && content) {
      onChange(content)
    }
  }, [content, onChange])

  // Handle zone selection
  const handleZoneSelect = useCallback((zoneId: string) => {
    setSelectedZoneId(zoneId)
    setSelectedBlockId(null)
  }, [])

  // Handle block selection
  const handleBlockSelect = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId)
  }, [])

  // Handle block addition with constraint validation
  const handleAddBlock = useCallback(async (
    zoneId: string, 
    blockType: string, 
    position?: number
  ) => {
    if (!isBlockAllowed(zoneId, blockType)) {
      toast.error(`Block type "${blockType}" is not allowed in this zone`)
      return
    }

    if (!canAddMoreBlocks(zoneId)) {
      toast.error('Maximum number of blocks reached for this zone')
      return
    }

    try {
      const newBlock: ZoneBlock = {
        id: `block-${Date.now()}`,
        type: blockType,
        attributes: {},
        content: '',
        order: position
      }

      await addBlock(zoneId, newBlock, position)
      setSelectedBlockId(newBlock.id)
      toast.success('Block added successfully')
    } catch (error) {
      toast.error('Failed to add block')
      // console.error('Error adding block:', error)
    }
  }, [isBlockAllowed, canAddMoreBlocks, addBlock])

  // Handle block update with validation
  const handleUpdateBlock = useCallback(async (
    zoneId: string,
    blockId: string,
    updates: Partial<ZoneBlock>
  ) => {
    try {
      await updateBlock(zoneId, blockId, updates)
    } catch (error) {
      toast.error('Failed to update block')
      // console.error('Error updating block:', error)
    }
  }, [updateBlock])

  // Handle block removal
  const handleRemoveBlock = useCallback(async (zoneId: string, blockId: string) => {
    try {
      await removeBlock(zoneId, blockId)
      if (selectedBlockId === blockId) {
        setSelectedBlockId(null)
      }
      toast.success('Block removed successfully')
    } catch (error) {
      toast.error('Failed to remove block')
      // console.error('Error removing block:', error)
    }
  }, [removeBlock, selectedBlockId])

  // Handle block move between zones
  const handleMoveBlock = useCallback(async (
    fromZoneId: string,
    toZoneId: string,
    blockId: string,
    position?: number
  ) => {
    const block = content?.zones[fromZoneId]?.blocks.find(b => b.id === blockId)
    if (!block) return

    if (!isBlockAllowed(toZoneId, block.type)) {
      toast.error(`Block type "${block.type}" is not allowed in the target zone`)
      return
    }

    if (!canAddMoreBlocks(toZoneId) && fromZoneId !== toZoneId) {
      toast.error('Maximum number of blocks reached for target zone')
      return
    }

    try {
      await moveBlock(fromZoneId, toZoneId, blockId, position)
      toast.success('Block moved successfully')
    } catch (error) {
      toast.error('Failed to move block')
      // console.error('Error moving block:', error)
    }
  }, [content, isBlockAllowed, canAddMoreBlocks, moveBlock])

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: LayoutType) => {
    if (!content) return
    
    const updatedContent: ZoneBasedContent = {
      ...content,
      layout: newLayout
    }
    
    onChange?.(updatedContent)
  }, [content, onChange])

  // Handle save with validation
  const handleSave = useCallback(async () => {
    if (!content) return

    const validation = validateZoneConstraints(content)
    if (!validation.valid) {
      toast.error('Please fix validation errors before saving')
      return
    }

    try {
      await onSave?.()
      toast.success('Content saved successfully')
    } catch (error) {
      toast.error('Failed to save content')
      // console.error('Save error:', error)
    }
  }, [content, validateZoneConstraints, onSave])

  if (error) {
    return (
      <div className="zone-editor-error p-8 text-center">
        <h3 className="text-lg font-semibold text-red-600 mb-2">Editor Error</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (isLoading || !content) {
    return (
      <div className="zone-editor-loading flex items-center justify-center h-96">
        <div className="loading-spinner animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const currentZone = content.zones[selectedZoneId]

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`zone-editor flex flex-col h-screen bg-gray-50 ${className}`}>
        {/* Editor Header */}
        <EditorHeader
          onSave={handleSave}
          onPublish={onPublish}
          title="Zone Editor"
          subtitle={`Layout: ${content.layout}`}
          actions={
            <ZoneToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              layout={content.layout}
              onLayoutChange={handleLayoutChange}
              showConstraints={showConstraints}
              onToggleConstraints={() => setShowConstraints(!showConstraints)}
            />
          }
        />

        <div className="zone-editor-body flex flex-1 overflow-hidden">
          {/* Zone Selector Sidebar */}
          <div className="zone-selector-sidebar w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <ZoneSelector
              zones={content.zones}
              selectedZoneId={selectedZoneId}
              onZoneSelect={handleZoneSelect}
              layoutConfig={layoutConfig}
              validationResult={validationResult}
            />
          </div>

          {/* Main Editor Canvas */}
          <div className="zone-canvas-container flex-1 flex flex-col overflow-hidden">
            <ZoneCanvas
              zone={currentZone}
              zoneId={selectedZoneId}
              selectedBlockId={selectedBlockId}
              viewMode={viewMode}
              editable={editable}
              showConstraints={showConstraints}
              zoneConfig={zoneConfig}
              onBlockSelect={handleBlockSelect}
              onBlockAdd={handleAddBlock}
              onBlockUpdate={handleUpdateBlock}
              onBlockRemove={handleRemoveBlock}
              onBlockMove={handleMoveBlock}
              onBlockReorder={(zoneId, blockIds) => reorderBlocks(zoneId, blockIds)}
            />
          </div>

          {/* Inspector Panel */}
          {selectedBlockId && (
            <div className="zone-inspector-sidebar w-80 bg-white border-l border-gray-200 overflow-y-auto">
              <ZoneInspector
                zone={currentZone}
                selectedBlock={currentZone?.blocks.find(b => b.id === selectedBlockId)}
                zoneConfig={zoneConfig}
                onBlockUpdate={(updates) => 
                  handleUpdateBlock(selectedZoneId, selectedBlockId, updates)
                }
                onClose={() => setSelectedBlockId(null)}
              />
            </div>
          )}
        </div>

        {/* Validation Errors Display */}
        {validationResult && !validationResult.valid && (
          <div className="validation-errors bg-red-50 border-t border-red-200 p-3">
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validationResult.errors?.map((error, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                  Zone "{error.zoneId}": {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DndProvider>
  )
}

export default ZoneEditor