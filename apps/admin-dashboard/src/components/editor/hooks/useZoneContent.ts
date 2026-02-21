/**
 * useZoneContent - Hook for managing zone-based content state and API operations
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  ZoneBasedContent, 
  Zone, 
  ZoneBlock
} from '@o4o/types'
import { zoneApi } from '@/services/api/zoneApi'

export interface UseZoneContentReturn {
  content: ZoneBasedContent | null
  isLoading: boolean
  error: string | null
  isDirty: boolean
  
  // Zone operations
  updateZone: (zoneId: string, updates: Partial<Zone>) => Promise<void>
  
  // Block operations
  addBlock: (zoneId: string, block: ZoneBlock, position?: number) => Promise<void>
  updateBlock: (zoneId: string, blockId: string, updates: Partial<ZoneBlock>) => Promise<void>
  removeBlock: (zoneId: string, blockId: string) => Promise<void>
  moveBlock: (fromZoneId: string, toZoneId: string, blockId: string, position?: number) => Promise<void>
  reorderBlocks: (zoneId: string, blockIds: string[]) => Promise<void>
  duplicateBlock: (zoneId: string, blockId: string) => Promise<void>
  
  // Content operations
  save: () => Promise<void>
  reload: () => Promise<void>
  resetChanges: () => void
  
  // Auto-save
  enableAutoSave: (interval?: number) => void
  disableAutoSave: () => void
}

export const useZoneContent = (
  initialContent?: ZoneBasedContent,
  pageId?: string,
  autoSaveInterval = 30000 // 30 seconds
): UseZoneContentReturn => {
  const [content, setContent] = useState<ZoneBasedContent | null>(initialContent || null)
  const [originalContent, setOriginalContent] = useState<ZoneBasedContent | null>(initialContent || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout>(undefined)
  const isAutoSaveEnabled = useRef(false)

  // Track changes for dirty state
  useEffect(() => {
    if (!originalContent || !content) {
      setIsDirty(false)
      return
    }

    const isEqual = JSON.stringify(content) === JSON.stringify(originalContent)
    setIsDirty(!isEqual)
  }, [content, originalContent])

  // Load initial content if pageId is provided
  useEffect(() => {
    if (pageId && !initialContent) {
      loadContent(pageId)
    }
  }, [pageId])

  // Auto-save effect
  useEffect(() => {
    if (isAutoSaveEnabled.current && isDirty && !isLoading) {
      const timer = setTimeout(async () => {
        try {
          await save()
        } catch (error) {
          // console.error('Auto-save failed:', error)
        }
      }, autoSaveInterval)

      autoSaveTimerRef.current = timer
      return () => clearTimeout(timer)
    }
  }, [isDirty, isLoading, autoSaveInterval])

  // Load content from API
  const loadContent = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await zoneApi.getZoneContent(id)
      setContent(response.zones)
      setOriginalContent(response.zones)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
      // console.error('Error loading zone content:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Update entire zone
  const updateZone = useCallback(async (zoneId: string, updates: Partial<Zone>) => {
    if (!content) return

    const updatedContent = {
      ...content,
      zones: {
        ...content.zones,
        [zoneId]: {
          ...content.zones[zoneId],
          ...updates
        }
      }
    }

    setContent(updatedContent)
  }, [content])

  // Add block to zone
  const addBlock = useCallback(async (
    zoneId: string, 
    block: ZoneBlock, 
    position?: number
  ) => {
    if (!content) return

    const zone = content.zones[zoneId]
    if (!zone) return

    const newBlocks = [...zone.blocks]
    
    if (position !== undefined && position >= 0 && position <= newBlocks.length) {
      newBlocks.splice(position, 0, block)
    } else {
      newBlocks.push(block)
    }

    // Update block orders
    const orderedBlocks = newBlocks.map((b, index) => ({
      ...b,
      order: index
    }))

    await updateZone(zoneId, { blocks: orderedBlocks })
  }, [content, updateZone])

  // Update specific block
  const updateBlock = useCallback(async (
    zoneId: string, 
    blockId: string, 
    updates: Partial<ZoneBlock>
  ) => {
    if (!content) return

    const zone = content.zones[zoneId]
    if (!zone) return

    const updatedBlocks = zone.blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    )

    await updateZone(zoneId, { blocks: updatedBlocks })
  }, [content, updateZone])

  // Remove block from zone
  const removeBlock = useCallback(async (zoneId: string, blockId: string) => {
    if (!content) return

    const zone = content.zones[zoneId]
    if (!zone) return

    const updatedBlocks = zone.blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({ ...block, order: index }))

    await updateZone(zoneId, { blocks: updatedBlocks })
  }, [content, updateZone])

  // Move block between zones
  const moveBlock = useCallback(async (
    fromZoneId: string,
    toZoneId: string,
    blockId: string,
    position?: number
  ) => {
    if (!content) return

    const fromZone = content.zones[fromZoneId]
    const toZone = content.zones[toZoneId]
    
    if (!fromZone || !toZone) return

    // Find the block to move
    const blockToMove = fromZone.blocks.find(block => block.id === blockId)
    if (!blockToMove) return

    // Remove from source zone
    const updatedFromBlocks = fromZone.blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({ ...block, order: index }))

    // Add to target zone
    const updatedToBlocks = [...toZone.blocks]
    if (position !== undefined && position >= 0 && position <= updatedToBlocks.length) {
      updatedToBlocks.splice(position, 0, blockToMove)
    } else {
      updatedToBlocks.push(blockToMove)
    }

    // Update orders in target zone
    const orderedToBlocks = updatedToBlocks.map((block, index) => ({
      ...block,
      order: index
    }))

    // Update both zones
    const updatedContent = {
      ...content,
      zones: {
        ...content.zones,
        [fromZoneId]: { ...fromZone, blocks: updatedFromBlocks },
        [toZoneId]: { ...toZone, blocks: orderedToBlocks }
      }
    }

    setContent(updatedContent)
  }, [content])

  // Reorder blocks within a zone
  const reorderBlocks = useCallback(async (zoneId: string, blockIds: string[]) => {
    if (!content) return

    const zone = content.zones[zoneId]
    if (!zone) return

    // Create new blocks array in the specified order
    const blockMap = new Map(zone.blocks.map(block => [block.id, block]))
    const reorderedBlocks = blockIds
      .map(id => blockMap.get(id))
      .filter((block): block is ZoneBlock => block !== undefined)
      .map((block, index) => ({ ...block, order: index }))

    await updateZone(zoneId, { blocks: reorderedBlocks })
  }, [content, updateZone])

  // Duplicate block
  const duplicateBlock = useCallback(async (zoneId: string, blockId: string) => {
    if (!content) return

    const zone = content.zones[zoneId]
    if (!zone) return

    const blockToDuplicate = zone.blocks.find(block => block.id === blockId)
    if (!blockToDuplicate) return

    const duplicatedBlock: ZoneBlock = {
      ...blockToDuplicate,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // Clear any references that should be unique
      attributes: {
        ...blockToDuplicate.attributes,
        // Reset any IDs or unique attributes
      }
    }

    const blockIndex = zone.blocks.findIndex(block => block.id === blockId)
    await addBlock(zoneId, duplicatedBlock, blockIndex + 1)
  }, [content, addBlock])

  // Save content to API
  const save = useCallback(async () => {
    if (!content || !pageId) return

    setIsLoading(true)
    setError(null)

    try {
      await zoneApi.saveZoneContent(pageId, {
        zones: content,
        layout: content.layout
      })
      
      setOriginalContent(content)
      setIsDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [content, pageId])

  // Reload content from API
  const reload = useCallback(async () => {
    if (!pageId) return
    await loadContent(pageId)
  }, [pageId])

  // Reset to original content
  const resetChanges = useCallback(() => {
    if (originalContent) {
      setContent({ ...originalContent })
      setIsDirty(false)
    }
  }, [originalContent])

  // Enable auto-save
  const enableAutoSave = useCallback((interval?: number) => {
    isAutoSaveEnabled.current = true
    if (interval) {
      // Update auto-save interval if needed
    }
  }, [])

  // Disable auto-save
  const disableAutoSave = useCallback(() => {
    isAutoSaveEnabled.current = false
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  return {
    content,
    isLoading,
    error,
    isDirty,
    
    updateZone,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    reorderBlocks,
    duplicateBlock,
    
    save,
    reload,
    resetChanges,
    
    enableAutoSave,
    disableAutoSave
  }
}