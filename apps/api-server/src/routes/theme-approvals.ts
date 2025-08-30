/**
 * Theme Approval API Routes - Handle theme customization approval workflow
 */

import { Router, Request, Response } from 'express'
import { body, param, query } from 'express-validator'
import { validateDto } from '../middleware/validateDto'
import { authenticateToken } from '../middleware/auth'
import { authorize } from '../middleware/authorize'
import AppDataSource from '../database/connection'
import { User } from '../entities/User'
import { Post } from '../entities/Post'
import simpleLogger from '../utils/simpleLogger'

const router: any = Router()

// Apply authentication to all routes
router.use(authenticateToken)

interface ThemeApprovalRequest {
  id: string
  userId: string
  customizationId: string
  customization: any
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewNote?: string
  changes: {
    branding: boolean
    colors: boolean
    navigation: boolean
    businessInfo: boolean
  }
}

// Helper to get repositories
const getRepositories = () => {
  if (!AppDataSource.isInitialized) {
    throw new Error('Database not initialized')
  }
  return {
    userRepository: AppDataSource.getRepository(User),
    postRepository: AppDataSource.getRepository(Post)
  }
}

/**
 * GET /api/theme-approvals
 * Get all theme approval requests (admin only)
 */
router.get('/',
  authorize(['admin']),
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Invalid offset'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { status, userId, limit = 50, offset = 0 } = req.query as Record<string, string>
      const { userRepository } = getRepositories()

      // Build query conditions
      const queryBuilder = userRepository.createQueryBuilder('user')
        .leftJoinAndSelect('user.themeCustomizations', 'customization')
        .where('customization.id IS NOT NULL')

      // Apply filters
      if (status) {
        queryBuilder.andWhere('customization.isApproved = :isApproved', {
          isApproved: status === 'approved'
        })
        
        if (status === 'pending') {
          queryBuilder.andWhere('customization.isApproved IS NULL OR customization.isApproved = false')
        }
      }

      if (userId) {
        queryBuilder.andWhere('user.id = :userId', { userId })
      }

      // Apply pagination
      queryBuilder.skip(parseInt(String(offset))).take(parseInt(String(limit)))
      queryBuilder.orderBy('customization.updatedAt', 'DESC')

      const users = await queryBuilder.getMany()

      // Transform to approval request format
      const requests: any[] = []
      for (const user of users) {
        if (user.themeCustomizations) {
          for (const customization of user.themeCustomizations) {
            // Determine status
            let requestStatus: 'pending' | 'approved' | 'rejected'
            if (customization.isApproved === true) {
              requestStatus = 'approved'
            } else if (customization.isApproved === false && customization.reviewedAt) {
              requestStatus = 'rejected'
            } else {
              requestStatus = 'pending'
            }

            // Detect changes (simplified - in production, you'd compare with defaults)
            const changes = {
              branding: !!(customization.branding?.siteName || customization.branding?.tagline || customization.branding?.logo),
              colors: !!customization.colors && Object.keys(customization.colors).length > 0,
              navigation: !!customization.navigation && customization.navigation.items?.length > 0,
              businessInfo: !!(customization.businessInfo?.name || customization.businessInfo?.phone || customization.businessInfo?.email)
            }

            requests.push({
              id: customization.id,
              userId: user.id,
              userName: user.name || user.email,
              userEmail: user.email,
              customizationId: customization.id,
              customization,
              status: requestStatus,
              submittedAt: customization.createdAt,
              reviewedAt: customization.reviewedAt,
              reviewedBy: customization.reviewedBy,
              reviewNote: customization.reviewNote,
              changes
            })
          }
        }
      }

      res.json({
        requests,
        total: requests.length,
        limit: parseInt(String(limit)),
        offset: parseInt(String(offset))
      })

    } catch (error) {
      simpleLogger.error('Error fetching approval requests:', error)
      res.status(500).json({ error: 'Failed to fetch approval requests' })
    }
  }
)

/**
 * GET /api/theme-approvals/:requestId
 * Get specific theme approval request (admin only)
 */
router.get('/:requestId',
  authorize(['admin']),
  param('requestId').isUUID().withMessage('Invalid request ID'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params
      const { userRepository } = getRepositories()

      // Find user with the specific customization
      const user = await userRepository.createQueryBuilder('user')
        .leftJoinAndSelect('user.themeCustomizations', 'customization')
        .where('customization.id = :requestId', { requestId })
        .getOne()

      if (!user || !user.themeCustomizations || user.themeCustomizations.length === 0) {
        return res.status(404).json({ error: 'Approval request not found' })
      }

      const customization = user.themeCustomizations[0]
      
      // Determine status
      let status: 'pending' | 'approved' | 'rejected'
      if (customization.isApproved === true) {
        status = 'approved'
      } else if (customization.isApproved === false && customization.reviewedAt) {
        status = 'rejected'
      } else {
        status = 'pending'
      }

      // Detect changes
      const changes = {
        branding: !!(customization.branding?.siteName || customization.branding?.tagline || customization.branding?.logo),
        colors: !!customization.colors && Object.keys(customization.colors).length > 0,
        navigation: !!customization.navigation && customization.navigation.items?.length > 0,
        businessInfo: !!(customization.businessInfo?.name || customization.businessInfo?.phone || customization.businessInfo?.email)
      }

      const request = {
        id: customization.id,
        userId: user.id,
        userName: user.name || user.email,
        userEmail: user.email,
        customizationId: customization.id,
        customization,
        status,
        submittedAt: customization.createdAt,
        reviewedAt: customization.reviewedAt,
        reviewedBy: customization.reviewedBy,
        reviewNote: customization.reviewNote,
        changes
      }

      res.json(request)

    } catch (error) {
      simpleLogger.error('Error fetching approval request:', error)
      res.status(500).json({ error: 'Failed to fetch approval request' })
    }
  }
)

/**
 * POST /api/theme-approvals/:requestId/approve
 * Approve a theme customization request (admin only)
 */
router.post('/:requestId/approve',
  authorize(['admin']),
  param('requestId').isUUID().withMessage('Invalid request ID'),
  body('note').optional().isString().withMessage('Invalid note'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params
      const { note } = req.body
      const adminUserId = req.user?.id
      const adminUserName = req.user?.name || req.user?.email

      const { userRepository } = getRepositories()

      // Find user with the customization
      const user = await userRepository.createQueryBuilder('user')
        .leftJoinAndSelect('user.themeCustomizations', 'customization')
        .where('customization.id = :requestId', { requestId })
        .getOne()

      if (!user || !user.themeCustomizations || user.themeCustomizations.length === 0) {
        return res.status(404).json({ error: 'Approval request not found' })
      }

      const customization = user.themeCustomizations[0]

      // Update customization status
      await AppDataSource.query(`
        UPDATE theme_customizations 
        SET 
          "isApproved" = true,
          "isActive" = true,
          "reviewedAt" = NOW(),
          "reviewedBy" = $1,
          "reviewNote" = $2,
          "updatedAt" = NOW()
        WHERE id = $3
      `, [adminUserName, note || null, requestId])

      // Log the approval
      simpleLogger.info(`Theme customization approved: ${requestId} by ${adminUserName}`)

      // Send notification (in production, you would send email/notification)
      // await sendNotification(user.email, 'theme-approved', { customization, note })

      res.json({ 
        success: true,
        message: 'Theme customization approved successfully'
      })

    } catch (error) {
      simpleLogger.error('Error approving request:', error)
      res.status(500).json({ error: 'Failed to approve request' })
    }
  }
)

/**
 * POST /api/theme-approvals/:requestId/reject
 * Reject a theme customization request (admin only)
 */
router.post('/:requestId/reject',
  authorize(['admin']),
  param('requestId').isUUID().withMessage('Invalid request ID'),
  body('note').isString().isLength({ min: 1 }).withMessage('Rejection note is required'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params
      const { note } = req.body
      const adminUserId = req.user?.id
      const adminUserName = req.user?.name || req.user?.email

      const { userRepository } = getRepositories()

      // Find user with the customization
      const user = await userRepository.createQueryBuilder('user')
        .leftJoinAndSelect('user.themeCustomizations', 'customization')
        .where('customization.id = :requestId', { requestId })
        .getOne()

      if (!user || !user.themeCustomizations || user.themeCustomizations.length === 0) {
        return res.status(404).json({ error: 'Approval request not found' })
      }

      const customization = user.themeCustomizations[0]

      // Update customization status
      await AppDataSource.query(`
        UPDATE theme_customizations 
        SET 
          "isApproved" = false,
          "isActive" = false,
          "reviewedAt" = NOW(),
          "reviewedBy" = $1,
          "reviewNote" = $2,
          "updatedAt" = NOW()
        WHERE id = $3
      `, [adminUserName, note, requestId])

      // Log the rejection
      simpleLogger.info(`Theme customization rejected: ${requestId} by ${adminUserName}`)

      // Send notification (in production, you would send email/notification)
      // await sendNotification(user.email, 'theme-rejected', { customization, note })

      res.json({ 
        success: true,
        message: 'Theme customization rejected'
      })

    } catch (error) {
      simpleLogger.error('Error rejecting request:', error)
      res.status(500).json({ error: 'Failed to reject request' })
    }
  }
)

/**
 * GET /api/theme-approvals/stats
 * Get approval statistics (admin only)
 */
router.get('/stats',
  authorize(['admin']),
  async (req: Request, res: Response) => {
    try {
      // Get statistics from database
      const stats = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN "isApproved" IS NULL OR "isApproved" = false THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN "isApproved" = true THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN "isApproved" = false AND "reviewedAt" IS NOT NULL THEN 1 ELSE 0 END) as rejected
        FROM theme_customizations
      `)

      const result = stats[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }

      res.json({
        total: parseInt(result.total),
        pending: parseInt(result.pending),
        approved: parseInt(result.approved),
        rejected: parseInt(result.rejected)
      })

    } catch (error) {
      simpleLogger.error('Error fetching approval stats:', error)
      res.status(500).json({ error: 'Failed to fetch statistics' })
    }
  }
)

/**
 * POST /api/theme-approvals/request
 * Submit a new theme customization request (user)
 */
router.post('/request',
  body('customization').isObject().withMessage('Customization data is required'),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { customization } = req.body
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const { userRepository } = getRepositories()

      // Check if user exists
      const user = await userRepository.findOne({ where: { id: userId } })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Create customization request
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      await AppDataSource.query(`
        INSERT INTO theme_customizations 
        (id, "userId", name, branding, colors, "businessInfo", navigation, "isActive", "isApproved", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, false, NULL, NOW(), NOW())
      `, [
        requestId,
        userId,
        customization.name || 'Theme Request',
        JSON.stringify(customization.branding || {}),
        JSON.stringify(customization.colors || {}),
        JSON.stringify(customization.businessInfo || {}),
        JSON.stringify(customization.navigation || {})
      ])

      // Log the request
      simpleLogger.info(`New theme customization request: ${requestId} by ${userId}`)

      // Send notification to admins (in production)
      // await notifyAdmins('new-theme-request', { user, customization })

      res.json({
        success: true,
        requestId,
        message: 'Theme customization request submitted successfully'
      })

    } catch (error) {
      simpleLogger.error('Error submitting request:', error)
      res.status(500).json({ error: 'Failed to submit request' })
    }
  }
)

/**
 * GET /api/theme-approvals/my-requests
 * Get current user's theme requests
 */
router.get('/my-requests',
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Get user's customizations
      const customizations = await AppDataSource.query(`
        SELECT 
          id,
          name,
          branding,
          colors,
          "businessInfo",
          navigation,
          "isActive",
          "isApproved",
          "createdAt",
          "updatedAt",
          "reviewedAt",
          "reviewedBy",
          "reviewNote"
        FROM theme_customizations
        WHERE "userId" = $1
        ORDER BY "updatedAt" DESC
      `, [userId])

      const requests = customizations.map((customization: any) => {
        let status: 'pending' | 'approved' | 'rejected'
        if (customization.isApproved === true) {
          status = 'approved'
        } else if (customization.isApproved === false && customization.reviewedAt) {
          status = 'rejected'
        } else {
          status = 'pending'
        }

        return {
          id: customization.id,
          name: customization.name,
          status,
          submittedAt: customization.createdAt,
          reviewedAt: customization.reviewedAt,
          reviewedBy: customization.reviewedBy,
          reviewNote: customization.reviewNote,
          isActive: customization.isActive
        }
      })

      res.json({ requests })

    } catch (error) {
      simpleLogger.error('Error fetching user requests:', error)
      res.status(500).json({ error: 'Failed to fetch requests' })
    }
  }
)

export default router