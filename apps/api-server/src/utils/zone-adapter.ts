// import { 
//   ZoneBasedContent, 
//   LegacyContent, 
//   Zone, 
//   ZoneBlock,
//   LayoutType,
//   ZoneValidationResult,
//   ZoneValidationError,
//   ZoneConfig,
//   BlockConstraint
// } from '@o4o/types'

// Temporary type definitions
type ZoneBasedContent = any
type LegacyContent = any
type Zone = any
type ZoneBlock = any
type LayoutType = any
type ZoneValidationResult = any
type ZoneValidationError = any
type ZoneConfig = any
type BlockConstraint = any

/**
 * Zone Content Adapter
 * Handles conversion between legacy and zone-based content structures
 */
export class ZoneContentAdapter {
  /**
   * Convert legacy flat block structure to zone-based structure
   */
  static toZoneFormat(
    content: LegacyContent, 
    layoutType: LayoutType = 'single-column'
  ): ZoneBasedContent {
    // Convert legacy blocks to zone blocks
    const zoneBlocks: ZoneBlock[] = content.blocks.map((block, index) => ({
      id: block.id || `block-${index}`,
      type: block.type,
      attributes: block.attributes || {},
      content: block.content,
      order: index
    }))

    // Create default zones based on layout type
    const zones: Record<string, Zone> = {
      header: {
        id: 'header',
        name: 'Header',
        type: 'header',
        editable: true,
        blocks: [],
        constraints: {
          allowedBlocks: ['core/site-logo', 'core/navigation', 'core/search'],
          maxBlocks: 10,
          minBlocks: 0,
          required: true,
          singleton: false,
          allowNesting: true,
          maxNestingLevel: 2
        },
        settings: {
          sticky: false,
          height: 'auto',
          backgroundColor: '#ffffff'
        }
      },
      main: {
        id: 'main',
        name: 'Main Content',
        type: 'main',
        editable: true,
        blocks: zoneBlocks, // Place all legacy blocks in main zone
        constraints: {
          allowedBlocks: [],
          maxBlocks: null,
          minBlocks: 1,
          required: true,
          singleton: false,
          allowNesting: true,
          maxNestingLevel: 5
        },
        settings: {
          width: '100%',
          maxWidth: '840px',
          padding: '2rem'
        }
      },
      footer: {
        id: 'footer',
        name: 'Footer',
        type: 'footer',
        editable: true,
        blocks: [],
        constraints: {
          allowedBlocks: ['core/paragraph', 'core/navigation', 'core/social-links'],
          maxBlocks: 20,
          minBlocks: 0,
          required: true,
          singleton: false,
          allowNesting: true,
          maxNestingLevel: 3
        },
        settings: {
          backgroundColor: '#f5f5f5',
          padding: '2rem'
        }
      }
    }

    // Add sidebar for two-column layout
    if (layoutType === 'two-column' || layoutType === 'three-column') {
      zones.sidebar = {
        id: 'sidebar',
        name: 'Sidebar',
        type: 'sidebar',
        editable: true,
        blocks: [],
        constraints: {
          allowedBlocks: ['core/search', 'core/latest-posts', 'core/categories'],
          maxBlocks: 15,
          minBlocks: 0,
          required: false,
          singleton: false,
          allowNesting: true,
          maxNestingLevel: 3
        },
        settings: {
          position: 'relative',
          width: '300px',
          sticky: true
        }
      }
    }

    return {
      zones,
      layout: layoutType,
      version: '1.0.0',
      useZones: true
    }
  }

  /**
   * Convert zone-based structure back to legacy format
   * Used for backward compatibility
   */
  static fromZoneFormat(zoneContent: ZoneBasedContent): LegacyContent {
    const blocks: LegacyContent['blocks'] = []
    
    // Extract blocks from all zones in order
    const zoneOrder = ['header', 'hero', 'main', 'sidebar', 'footer']
    
    for (const zoneId of zoneOrder) {
      const zone = zoneContent.zones[zoneId]
      if (zone && zone.blocks) {
        zone.blocks.forEach(block => {
          blocks.push({
            id: block.id,
            type: block.type,
            content: block.content || '',
            attributes: block.attributes
          })
        })
      }
    }

    return { blocks }
  }

  /**
   * Validate zone content against constraints
   */
  static validateZoneContent(
    zoneContent: ZoneBasedContent, 
    zoneConfig?: ZoneConfig
  ): ZoneValidationResult {
    const errors: ZoneValidationError[] = []
    
    for (const [zoneId, zone] of Object.entries(zoneContent.zones)) {
      const typedZone = zone as any
      // Check required zones
      if (typedZone.constraints?.required && typedZone.blocks?.length === 0) {
        errors.push({
          zoneId,
          type: 'constraint',
          message: `Zone "${zoneId}" is required but has no blocks`
        })
      }

      // Check min/max blocks
      if (typedZone.constraints?.minBlocks && typedZone.blocks?.length < typedZone.constraints.minBlocks) {
        errors.push({
          zoneId,
          type: 'constraint',
          message: `Zone "${zoneId}" requires at least ${typedZone.constraints.minBlocks} blocks`
        })
      }

      if (typedZone.constraints?.maxBlocks && typedZone.blocks?.length > typedZone.constraints.maxBlocks) {
        errors.push({
          zoneId,
          type: 'constraint',
          message: `Zone "${zoneId}" allows maximum ${typedZone.constraints.maxBlocks} blocks`
        })
      }

      // Check allowed block types
      if (typedZone.constraints?.allowedBlocks?.length > 0) {
        typedZone.blocks?.forEach((block: any) => {
          if (!typedZone.constraints.allowedBlocks.includes(block.type)) {
            errors.push({
              zoneId,
              blockId: block.id,
              type: 'constraint',
              message: `Block type "${block.type}" is not allowed in zone "${zoneId}"`
            })
          }
        })
      }

      // Check nesting levels
      if (!typedZone.constraints?.allowNesting) {
        typedZone.blocks?.forEach((block: any) => {
          if (block.innerBlocks && block.innerBlocks.length > 0) {
            errors.push({
              zoneId,
              blockId: block.id,
              type: 'structure',
              message: `Nesting is not allowed in zone "${zoneId}"`
            })
          }
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  /**
   * Merge zone content with default zones
   */
  static mergeWithDefaults(
    zoneContent: Partial<ZoneBasedContent>,
    defaultZones: Record<string, Zone>
  ): ZoneBasedContent {
    const mergedZones: Record<string, Zone> = {}

    // Start with default zones
    for (const [zoneId, defaultZone] of Object.entries(defaultZones)) {
      mergedZones[zoneId] = {
        ...defaultZone,
        blocks: zoneContent.zones?.[zoneId]?.blocks || defaultZone.blocks || []
      }
    }

    // Add any custom zones from content
    if (zoneContent.zones) {
      for (const [zoneId, zone] of Object.entries(zoneContent.zones)) {
        if (!mergedZones[zoneId]) {
          mergedZones[zoneId] = zone
        }
      }
    }

    return {
      zones: mergedZones,
      layout: zoneContent.layout || 'single-column',
      version: zoneContent.version || '1.0.0',
      useZones: true
    }
  }

  /**
   * Check nesting level of blocks
   */
  private static getBlockNestingLevel(block: ZoneBlock, currentLevel = 0): number {
    if (!block.innerBlocks || block.innerBlocks.length === 0) {
      return currentLevel
    }

    const childLevels = block.innerBlocks.map(child => 
      this.getBlockNestingLevel(child, currentLevel + 1)
    )

    return Math.max(...childLevels)
  }
}