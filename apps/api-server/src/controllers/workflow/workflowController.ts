import { Request, Response, RequestHandler } from 'express';
import { AuthRequest } from '../../types/auth';
import { workflowService } from '../../services/workflow.service';
import { validateRequiredFields, createValidationError, createNotFoundError, createInternalServerError } from '../../utils/errorUtils';
import { asyncHandler } from '../../utils/asyncHandler';
import { roleGuard } from '../../utils/roleGuard';
import logger from '../../utils/logger';

export class WorkflowController {

  getOrderStatusWorkflow: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin', 'vendor_manager', 'customer'])(req, res, async () => {
      const { orderId } = req.query;

      if (orderId) {
        // Get specific order workflow status
        const workflowStatus = await workflowService.getOrderWorkflowStatus(orderId as string);
        
        // Filter data based on user role
        let filteredStatus = workflowStatus;
        if (req.user?.role === 'customer') {
          // Customers should only see their own orders
          // This would need additional validation
        }

        res.json({
          success: true,
          data: {
            orderId,
            workflow: filteredStatus
          }
        });
      } else {
        // Get general workflow definition
        const workflowDefinition = await workflowService.getWorkflowDefinition('order');
        
        res.json({
          success: true,
          data: {
            definition: workflowDefinition,
            stats: await workflowService.getWorkflowStats()
          }
        });
      }
    });
  });

  transitionOrderStatus: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const { orderId, fromStatus, toStatus, reason } = req.body;

      validateRequiredFields({ orderId, fromStatus, toStatus }, ['orderId', 'fromStatus', 'toStatus']);

      // Validate transition is allowed
      const validation = await workflowService.validateWorkflowTransition('order', fromStatus, toStatus);
      if (!validation.valid) {
        throw createValidationError(`Invalid status transition: ${validation.reason || 'Unknown validation error'}`);
      }

      const result = await workflowService.transitionOrderStatus(
        orderId,
        fromStatus,
        toStatus,
        req.user?.id || 'system',
        reason
      );

      if (!result.success) {
        throw createValidationError(`Status transition failed: ${result.error || 'Unknown error'}`);
      }

      logger.info('Order status transition completed', {
        orderId,
        fromStatus,
        toStatus,
        transitionedBy: req.user?.id,
        reason
      });

      res.json({
        success: true,
        message: 'Order status transitioned successfully',
        data: {
          orderId,
          fromStatus,
          toStatus,
          transitionedAt: new Date()
        }
      });
    });
  });

  getInventoryAlerts: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin', 'vendor_manager', 'supplier'])(req, res, async () => {
      const alerts = await workflowService.getInventoryWorkflowAlerts();

      // Filter alerts based on user role
      let filteredAlerts = alerts;
      if (req.user?.role === 'vendor_manager') {
        // Filter to only show alerts for vendor's products
        // This would need additional implementation
      } else if (req.user?.role === 'supplier') {
        // Filter to only show alerts for supplier's products
        // This would need additional implementation
      }

      res.json({
        success: true,
        data: filteredAlerts
      });
    });
  });

  getCommissionProcessWorkflow: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const commissionWorkflow = await workflowService.getCommissionProcessWorkflow();

      // Filter data based on user role
      let filteredWorkflow = commissionWorkflow;
      if (req.user?.role === 'vendor_manager') {
        // Show only vendor-specific commission data
        // This would need additional filtering implementation
      }

      res.json({
        success: true,
        data: filteredWorkflow
      });
    });
  });

  getWorkflowStats: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const { 
        startDate, 
        endDate, 
        workflowType 
      } = req.query;

      const stats = await workflowService.getWorkflowStats();

      // Apply date filtering if provided
      let filteredStats = stats;
      if (startDate || endDate) {
        // This would implement date filtering
        // For now, return all stats
      }

      // Filter by workflow type if specified
      if (workflowType) {
        const type = workflowType as string;
        if (type === 'order') {
          filteredStats = {
            orderWorkflow: stats.orderWorkflow,
            inventoryWorkflow: { activeAlerts: 0, autoResolvedAlerts: 0, escalatedAlerts: 0 },
            commissionWorkflow: { autoApprovedCount: 0, manualReviewCount: 0, averageProcessingTime: 0 }
          };
        }
      }

      res.json({
        success: true,
        data: filteredStats
      });
    });
  });

  validateTransition: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const { entityType, fromStatus, toStatus } = req.body;

      validateRequiredFields({ entityType, fromStatus, toStatus }, ['entityType', 'fromStatus', 'toStatus']);

      const validation = await workflowService.validateWorkflowTransition(entityType, fromStatus, toStatus);

      res.json({
        success: true,
        data: validation
      });
    });
  });

  getWorkflowDefinition: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const { workflowName } = req.params;

      if (!workflowName) {
        throw createValidationError('Workflow name is required');
      }

      const definition = await workflowService.getWorkflowDefinition(workflowName);

      if (!definition) {
        throw createNotFoundError('Workflow definition not found');
      }

      res.json({
        success: true,
        data: definition
      });
    });
  });

  bulkStatusTransition: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin'])(req, res, async () => {
      const { orderIds, fromStatus, toStatus, reason } = req.body;

      validateRequiredFields({ orderIds, fromStatus, toStatus }, ['orderIds', 'fromStatus', 'toStatus']);

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        throw createValidationError('Order IDs must be a non-empty array');
      }

      const results = [];
      const errors = [];

      for (const orderId of orderIds) {
        try {
          const result = await workflowService.transitionOrderStatus(
            orderId,
            fromStatus,
            toStatus,
            req.user?.id || 'system',
            reason
          );

          results.push({
            orderId,
            success: result.success,
            error: result.error
          });

          if (!result.success) {
            errors.push(`Order ${orderId}: ${result.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({
            orderId,
            success: false,
            error: errorMessage
          });
          errors.push(`Order ${orderId}: ${errorMessage}`);
        }
      }

      const successCount = results.filter(r => r.success).length;

      logger.info('Bulk status transition completed', {
        totalOrders: orderIds.length,
        successful: successCount,
        failed: orderIds.length - successCount,
        fromStatus,
        toStatus,
        performedBy: req.user?.id
      });

      res.json({
        success: errors.length === 0,
        data: {
          results,
          summary: {
            total: orderIds.length,
            successful: successCount,
            failed: orderIds.length - successCount
          }
        },
        errors: errors.length > 0 ? errors : undefined
      });
    });
  });

  getWorkflowHealth: RequestHandler = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    roleGuard(['admin'])(req, res, async () => {
      try {
        const stats = await workflowService.getWorkflowStats();
        
        // Calculate health metrics
        const health = {
          status: 'healthy' as 'healthy' | 'warning' | 'critical',
          issues: [] as string[],
          metrics: {
            orderProcessingEfficiency: this.calculateEfficiency(stats.orderWorkflow),
            inventoryAlertResponse: this.calculateAlertResponse(stats.inventoryWorkflow),
            commissionProcessingSpeed: this.calculateProcessingSpeed(stats.commissionWorkflow)
          },
          recommendations: [] as string[]
        };

        // Analyze bottlenecks
        if (stats.orderWorkflow.bottlenecks.length > 0) {
          health.status = 'warning';
          health.issues.push(`${stats.orderWorkflow.bottlenecks.length} workflow bottlenecks detected`);
          health.recommendations.push('Review slow-moving order states');
        }

        // Check average completion time
        if (stats.orderWorkflow.averageCompletionTime > 168) { // More than 7 days
          health.status = 'warning';
          health.issues.push('Average order completion time exceeds 7 days');
          health.recommendations.push('Optimize order processing workflow');
        }

        res.json({
          success: true,
          data: health
        });
      } catch (error) {
        logger.error('Error getting workflow health:', error);
        throw createInternalServerError('Failed to get workflow health status');
      }
    });
  });

  private calculateEfficiency(orderWorkflow: any): number {
    const totalOrders = Object.values(orderWorkflow.stateDistribution).reduce((sum: number, count: unknown) => sum + (typeof count === 'number' ? count : 0), 0) as number;
    const completedOrders = typeof orderWorkflow.stateDistribution.completed === 'number' ? orderWorkflow.stateDistribution.completed : 0;
    
    return (totalOrders as number) > 0 ? ((completedOrders as number) / (totalOrders as number)) * 100 : 0;
  }

  private calculateAlertResponse(inventoryWorkflow: any): number {
    const totalAlerts = (inventoryWorkflow.activeAlerts as number) + (inventoryWorkflow.autoResolvedAlerts as number);
    
    return (totalAlerts as number) > 0 ? ((inventoryWorkflow.autoResolvedAlerts as number) / (totalAlerts as number)) * 100 : 100;
  }

  private calculateProcessingSpeed(commissionWorkflow: any): number {
    const totalCommissions = (commissionWorkflow.autoApprovedCount as number) + (commissionWorkflow.manualReviewCount as number);
    
    return (totalCommissions as number) > 0 ? ((commissionWorkflow.autoApprovedCount as number) / (totalCommissions as number)) * 100 : 0;
  }
}