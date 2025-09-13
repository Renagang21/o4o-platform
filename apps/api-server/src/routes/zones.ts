/**
 * Zone-based Content Management API Routes
 */

import { Router, Request, Response } from 'express'
import { body, param, query } from 'express-validator'
import AppDataSource from '../database/connection'
import { Post } from '../entities/Post'
import { User } from '../entities/User'
import { authenticateToken } from '../middleware/auth'
import { validateDto } from '../middleware/validateDto'
import { ZoneContentAdapter } from '../utils/zone-adapter'
// import { 
//   ZoneBasedContent, 
//   ThemeCustomization,
//   ZoneTemplate,
//   PageZone 
// } from '@o4o/types'

// Temporary type definitions
type ZoneBasedContent = any
type ThemeCustomization = any
type ZoneTemplate = any
type PageZone = any
import fs from 'fs/promises'
import path from 'path'

const router: Router = Router()

// Apply authentication to all routes
router.use(authenticateToken)

// Helper to get repositories
const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized')
  }
  return {
    postRepository: AppDataSource.getRepository(Post),
    userRepository: AppDataSource.getRepository(User)
  }
}

/**
 * GET /api/zones/:pageId
 * Get zone content for a specific page/post
 */
router.get('/:pageId', 
  param('pageId').isUUID().withMessage('Invalid page ID'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { postRepository } = getRepositories()
      const { pageId } = req.params

      const post = await postRepository.findOne({
        where: { id: pageId },
        relations: ['author']
      })

      if (!post) {
        return res.status(404).json({ error: 'Page not found' })
      }

      // Check if post uses zone-based content
      if (post.useZones && post.zones) {
        return res.json({
          zones: post.zones,
          customization: post.themeCustomizations || null,
          layout: post.layoutType || 'single-column'
        })
      }

      // Convert legacy content to zone format if needed
      if (post.content && post.content.blocks) {
        const zoneContent = ZoneContentAdapter.toZoneFormat(
          post.content as any, 
          post.layoutType as any || 'single-column'
        )

        return res.json({
          zones: zoneContent,
          customization: post.themeCustomizations || null,
          layout: post.layoutType || 'single-column',
          converted: true // Indicate this was converted
        })
      }

      // Return empty zone structure
      const emptyZones = ZoneContentAdapter.toZoneFormat(
        { blocks: [] },
        'single-column'
      )

      res.json({
        zones: emptyZones,
        customization: null,
        layout: 'single-column'
      })

    } catch (error) {
      console.error('Error fetching zone content:', error)
      res.status(500).json({ error: 'Failed to fetch zone content' })
    }
  }
)

/**
 * PUT /api/zones/:pageId
 * Save zone content for a specific page/post
 */
router.put('/:pageId',
  param('pageId').isUUID().withMessage('Invalid page ID'),
  body('zones').isObject().withMessage('Zones data is required'),
  body('layout').isString().withMessage('Layout type is required'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { postRepository } = getRepositories()
      const { pageId } = req.params
      const { zones, layout, customization } = req.body

      const post = await postRepository.findOne({
        where: { id: pageId }
      })

      if (!post) {
        return res.status(404).json({ error: 'Page not found' })
      }

      // Update post with zone data
      await postRepository.update(pageId, {
        zones: zones as any,
        layoutType: layout,
        themeCustomizations: customization || null,
        useZones: true,
        updatedAt: new Date()
      })

      res.json({ success: true })

    } catch (error) {
      console.error('Error saving zone content:', error)
      res.status(500).json({ error: 'Failed to save zone content' })
    }
  }
)

/**
 * PUT /api/zones/:pageId/:zoneId
 * Update specific zone within a page
 */
router.put('/:pageId/:zoneId',
  param('pageId').isUUID().withMessage('Invalid page ID'),
  param('zoneId').isString().withMessage('Invalid zone ID'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { postRepository } = getRepositories()
      const { pageId, zoneId } = req.params
      const zoneData = req.body

      const post = await postRepository.findOne({
        where: { id: pageId }
      })

      if (!post) {
        return res.status(404).json({ error: 'Page not found' })
      }

      // Update specific zone
      const currentZones = post.zones as any || {}
      currentZones[zoneId] = {
        ...currentZones[zoneId],
        ...zoneData,
        id: zoneId
      }

      await postRepository.update(pageId, {
        zones: currentZones,
        updatedAt: new Date()
      })

      res.json({ success: true })

    } catch (error) {
      console.error('Error updating zone:', error)
      res.status(500).json({ error: 'Failed to update zone' })
    }
  }
)

/**
 * POST /api/zones/:pageId/reorder
 * Reorder zones within a page
 */
router.post('/:pageId/reorder',
  param('pageId').isUUID().withMessage('Invalid page ID'),
  body('zoneOrder').isArray().withMessage('Zone order array is required'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { postRepository } = getRepositories()
      const { pageId } = req.params
      const { zoneOrder } = req.body

      const post = await postRepository.findOne({
        where: { id: pageId }
      })

      if (!post) {
        return res.status(404).json({ error: 'Page not found' })
      }

      // Reorder zones based on provided order
      const currentZones = post.zones as any || {}
      const reorderedZones: any = {}

      zoneOrder.forEach((zoneId: string, index: number) => {
        if (currentZones[zoneId]) {
          reorderedZones[zoneId] = {
            ...currentZones[zoneId],
            order: index
          }
        }
      })

      await postRepository.update(pageId, {
        zones: reorderedZones,
        updatedAt: new Date()
      })

      res.json({ success: true })

    } catch (error) {
      console.error('Error reordering zones:', error)
      res.status(500).json({ error: 'Failed to reorder zones' })
    }
  }
)

/**
 * POST /api/zones/validate
 * Validate zone content against constraints
 */
router.post('/validate',
  body('zones').isObject().withMessage('Zones data is required'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { zones } = req.body as { zones: ZoneBasedContent }

      // Load zone configuration
      const configPath = path.join(process.cwd(), 'apps/admin-dashboard/public/themes/default/zones.json')
      const configContent = await fs.readFile(configPath, 'utf8')
      const zoneConfig = JSON.parse(configContent)

      const validationResult = ZoneContentAdapter.validateZoneContent(zones, zoneConfig)
      
      res.json(validationResult)

    } catch (error) {
      console.error('Error validating zone content:', error)
      res.status(500).json({ error: 'Failed to validate zone content' })
    }
  }
)

/**
 * POST /api/zones/convert
 * Convert legacy content to zone format
 */
router.post('/convert',
  body('content').isObject().withMessage('Content data is required'),
  body('layoutType').isString().withMessage('Layout type is required'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { content, layoutType } = req.body

      const zoneContent = ZoneContentAdapter.toZoneFormat(content, layoutType)
      
      res.json(zoneContent)

    } catch (error) {
      console.error('Error converting content:', error)
      res.status(500).json({ error: 'Failed to convert content' })
    }
  }
)

/**
 * GET /api/zones/:pageId/export
 * Export zone content
 */
router.get('/:pageId/export',
  param('pageId').isUUID().withMessage('Invalid page ID'),
  query('format').optional().isIn(['json', 'html']).withMessage('Invalid export format'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { postRepository } = getRepositories()
      const { pageId } = req.params
      const format = req.query.format as string || 'json'

      const post = await postRepository.findOne({
        where: { id: pageId }
      })

      if (!post) {
        return res.status(404).json({ error: 'Page not found' })
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="zones-${pageId}.json"`)
        res.json({
          zones: post.zones,
          layout: post.layoutType,
          customizations: post.themeCustomizations,
          exportedAt: new Date().toISOString()
        })
      } else if (format === 'html') {
        // TODO: Implement HTML export
        res.status(501).json({ error: 'HTML export not implemented yet' })
      }

    } catch (error) {
      console.error('Error exporting zone content:', error)
      res.status(500).json({ error: 'Failed to export zone content' })
    }
  }
)

/**
 * GET /api/zones/:pageId/analytics
 * Get zone analytics/usage stats
 */
router.get('/:pageId/analytics',
  param('pageId').isUUID().withMessage('Invalid page ID'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { postRepository } = getRepositories()
      const { pageId } = req.params

      const post = await postRepository.findOne({
        where: { id: pageId }
      })

      if (!post) {
        return res.status(404).json({ error: 'Page not found' })
      }

      const zones = post.zones as any || {}
      let totalBlocks = 0
      const blocksByZone: Record<string, number> = {}
      const blocksByType: Record<string, number> = {}

      // Calculate analytics
      Object.entries(zones).forEach(([zoneId, zone]: [string, any]) => {
        const blockCount = zone.blocks?.length || 0
        blocksByZone[zoneId] = blockCount
        totalBlocks += blockCount

        zone.blocks?.forEach((block: any) => {
          const blockType = block.type
          blocksByType[blockType] = (blocksByType[blockType] || 0) + 1
        })
      })

      res.json({
        totalBlocks,
        blocksByZone,
        blocksByType,
        lastModified: post.updated_at?.toISOString() || new Date().toISOString()
      })

    } catch (error) {
      console.error('Error fetching zone analytics:', error)
      res.status(500).json({ error: 'Failed to fetch zone analytics' })
    }
  }
)

export default router