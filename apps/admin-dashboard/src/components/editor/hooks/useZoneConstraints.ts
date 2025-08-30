/**
 * useZoneConstraints - Hook for managing zone constraint validation
 */

import { useCallback, useMemo } from 'react'
import { 
  ZoneConfig, 
  ZoneBasedContent, 
  Zone, 
  ZoneValidationResult,
  ZoneValidationError,
  ZoneValidationWarning,
  BlockConstraint
} from '@o4o/types'

export interface UseZoneConstraintsReturn {
  validateZoneConstraints: (content: ZoneBasedContent) => ZoneValidationResult
  getBlockConstraints: (zoneId: string, blockType?: string) => BlockConstraint | null
  isBlockAllowed: (zoneId: string, blockType: string) => boolean
  canAddMoreBlocks: (zoneId: string, currentBlocks?: number) => boolean
  getMaxBlocks: (zoneId: string) => number | null
  getMinBlocks: (zoneId: string) => number
  isZoneRequired: (zoneId: string) => boolean
  getAllowedBlockTypes: (zoneId: string) => string[]
  checkBlockInstanceLimit: (blockType: string, currentContent: ZoneBasedContent) => boolean
  validationResult?: ZoneValidationResult
}

export const useZoneConstraints = (
  zoneConfig?: ZoneConfig,
  currentContent?: ZoneBasedContent
): UseZoneConstraintsReturn => {
  
  // Memoized validation result
  const validationResult = useMemo(() => {
    if (!currentContent) return undefined
    return validateZoneConstraints(currentContent)
  }, [currentContent, zoneConfig])

  // Validate zone constraints
  const validateZoneConstraints = useCallback((content: ZoneBasedContent): ZoneValidationResult => {
    if (!zoneConfig) {
      return { valid: true }
    }

    const errors: ZoneValidationError[] = []
    const warnings: ZoneValidationWarning[] = []

    // Check each zone
    for (const [zoneId, zone] of Object.entries(content.zones)) {
      const zoneDefaults = zoneConfig.zones[zoneId]
      if (!zoneDefaults) continue

      const constraints = zone.constraints || zoneDefaults.constraints

      // Check required zones
      if (constraints.required && zone.blocks.length === 0) {
        errors.push({
          zoneId,
          type: 'constraint',
          message: `Zone "${zone.name}" is required but has no blocks`
        })
      }

      // Check minimum blocks
      if (constraints.minBlocks > 0 && zone.blocks.length < constraints.minBlocks) {
        errors.push({
          zoneId,
          type: 'constraint',
          message: `Zone "${zone.name}" requires at least ${constraints.minBlocks} blocks (currently has ${zone.blocks.length})`
        })
      }

      // Check maximum blocks
      if (constraints.maxBlocks !== null && zone.blocks.length > constraints.maxBlocks) {
        errors.push({
          zoneId,
          type: 'constraint',
          message: `Zone "${zone.name}" allows maximum ${constraints.maxBlocks} blocks (currently has ${zone.blocks.length})`
        })
      }

      // Check allowed block types
      if (constraints.allowedBlocks.length > 0) {
        zone.blocks.forEach(block => {
          if (!constraints.allowedBlocks.includes(block.type)) {
            errors.push({
              zoneId,
              blockId: block.id,
              type: 'constraint',
              message: `Block type "${block.type}" is not allowed in zone "${zone.name}"`
            })
          }
        })
      }

      // Check nesting constraints
      if (!constraints.allowNesting) {
        zone.blocks.forEach(block => {
          if (block.innerBlocks && block.innerBlocks.length > 0) {
            errors.push({
              zoneId,
              blockId: block.id,
              type: 'structure',
              message: `Block nesting is not allowed in zone "${zone.name}"`
            })
          }
        })
      } else if (constraints.maxNestingLevel > 0) {
        zone.blocks.forEach(block => {
          const nestingLevel = getBlockNestingLevel(block)
          if (nestingLevel > constraints.maxNestingLevel) {
            errors.push({
              zoneId,
              blockId: block.id,
              type: 'structure',
              message: `Block nesting exceeds maximum level of ${constraints.maxNestingLevel} in zone "${zone.name}"`
            })
          }
        })
      }

      // Check singleton constraints
      if (constraints.singleton && zone.blocks.length > 1) {
        warnings.push({
          zoneId,
          type: 'best-practice',
          message: `Zone "${zone.name}" is marked as singleton but has multiple blocks`
        })
      }

      // Performance warnings
      if (zone.blocks.length > 50) {
        warnings.push({
          zoneId,
          type: 'performance',
          message: `Zone "${zone.name}" has many blocks (${zone.blocks.length}) which may affect performance`
        })
      }
    }

    // Check global block constraints
    if (zoneConfig.blockConstraintRules) {
      for (const [blockType, rules] of Object.entries(zoneConfig.blockConstraintRules)) {
        if (rules.maxInstances) {
          const instances = countBlockInstances(content, blockType)
          if (instances > rules.maxInstances) {
            errors.push({
              zoneId: 'global',
              type: 'constraint',
              message: `Block type "${blockType}" exceeds maximum instances (${instances}/${rules.maxInstances})`
            })
          }
        }

        if (rules.allowedZones) {
          for (const [zoneId, zone] of Object.entries(content.zones)) {
            const hasBlockType = zone.blocks.some(block => block.type === blockType)
            if (hasBlockType && !rules.allowedZones.includes(zoneId)) {
              errors.push({
                zoneId,
                type: 'constraint',
                message: `Block type "${blockType}" is not allowed in zone "${zoneId}"`
              })
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }, [zoneConfig])

  // Get block constraints for a specific zone
  const getBlockConstraints = useCallback((
    zoneId: string, 
    blockType?: string
  ): BlockConstraint | null => {
    if (!zoneConfig) return null

    const zoneDefaults = zoneConfig.zones[zoneId]
    if (!zoneDefaults) return null

    return zoneDefaults.constraints
  }, [zoneConfig])

  // Check if block type is allowed in zone
  const isBlockAllowed = useCallback((zoneId: string, blockType: string): boolean => {
    if (!zoneConfig) return true

    const constraints = getBlockConstraints(zoneId)
    if (!constraints) return true

    // If no allowed blocks specified, allow all
    if (constraints.allowedBlocks.length === 0) return true

    // Check allowed blocks list
    const isInAllowedList = constraints.allowedBlocks.includes(blockType)
    if (!isInAllowedList) return false

    // Check global constraints
    if (zoneConfig.blockConstraintRules?.[blockType]?.allowedZones) {
      return zoneConfig.blockConstraintRules[blockType].allowedZones!.includes(zoneId)
    }

    return true
  }, [zoneConfig, getBlockConstraints])

  // Check if more blocks can be added to zone
  const canAddMoreBlocks = useCallback((
    zoneId: string, 
    currentBlocks?: number
  ): boolean => {
    if (!zoneConfig) return true

    const constraints = getBlockConstraints(zoneId)
    if (!constraints) return true

    if (constraints.maxBlocks === null) return true

    const blockCount = currentBlocks ?? currentContent?.zones[zoneId]?.blocks.length ?? 0
    return blockCount < constraints.maxBlocks
  }, [zoneConfig, getBlockConstraints, currentContent])

  // Get maximum blocks allowed in zone
  const getMaxBlocks = useCallback((zoneId: string): number | null => {
    const constraints = getBlockConstraints(zoneId)
    return constraints?.maxBlocks ?? null
  }, [getBlockConstraints])

  // Get minimum blocks required in zone
  const getMinBlocks = useCallback((zoneId: string): number => {
    const constraints = getBlockConstraints(zoneId)
    return constraints?.minBlocks ?? 0
  }, [getBlockConstraints])

  // Check if zone is required
  const isZoneRequired = useCallback((zoneId: string): boolean => {
    const constraints = getBlockConstraints(zoneId)
    return constraints?.required ?? false
  }, [getBlockConstraints])

  // Get allowed block types for zone
  const getAllowedBlockTypes = useCallback((zoneId: string): string[] => {
    const constraints = getBlockConstraints(zoneId)
    return constraints?.allowedBlocks ?? []
  }, [getBlockConstraints])

  // Check block instance limit across all zones
  const checkBlockInstanceLimit = useCallback((
    blockType: string, 
    content: ZoneBasedContent
  ): boolean => {
    if (!zoneConfig?.blockConstraintRules?.[blockType]?.maxInstances) return true

    const maxInstances = zoneConfig.blockConstraintRules[blockType].maxInstances!
    const currentInstances = countBlockInstances(content, blockType)
    
    return currentInstances < maxInstances
  }, [zoneConfig])

  return {
    validateZoneConstraints,
    getBlockConstraints,
    isBlockAllowed,
    canAddMoreBlocks,
    getMaxBlocks,
    getMinBlocks,
    isZoneRequired,
    getAllowedBlockTypes,
    checkBlockInstanceLimit,
    validationResult
  }
}

// Helper function to count block instances
function countBlockInstances(content: ZoneBasedContent, blockType: string): number {
  let count = 0
  
  for (const zone of Object.values(content.zones)) {
    count += countBlocksInZone(zone.blocks, blockType)
  }
  
  return count
}

function countBlocksInZone(blocks: any[], blockType: string): number {
  let count = 0
  
  for (const block of blocks) {
    if (block.type === blockType) {
      count++
    }
    
    if (block.innerBlocks) {
      count += countBlocksInZone(block.innerBlocks, blockType)
    }
  }
  
  return count
}

// Helper function to get block nesting level
function getBlockNestingLevel(block: any, currentLevel = 0): number {
  if (!block.innerBlocks || block.innerBlocks.length === 0) {
    return currentLevel
  }

  const childLevels = block.innerBlocks.map((child: any) => 
    getBlockNestingLevel(child, currentLevel + 1)
  )

  return Math.max(...childLevels)
}