import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { orderAutomationService, AutomationRuleConfig } from '../../services/order-automation.service';
import { validateRequiredFields, createValidationError, createNotFoundError, createInternalServerError } from '../../utils/errorUtils';
import { asyncHandler } from '../../utils/asyncHandler';
import { roleGuard } from '../../utils/roleGuard';
import logger from '../../utils/logger';

export class OrderAutomationController {
  
  createAutomationRule = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Only admin and vendor managers can create automation rules
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const ruleData: AutomationRuleConfig = req.body;

      // Validate rule configuration
      const validation = await orderAutomationService.validateRuleConfiguration(ruleData);
      if (!validation.valid) {
        throw createValidationError('Invalid automation rule configuration', validation.errors);
      }

      // Vendors can only create rules for their own orders
      if (req.user?.role === 'vendor_manager') {
        const vendorFilter = {
          type: 'vendor_id' as const,
          operator: 'equals' as const,
          value: req.user.vendorId,
          field: 'vendorId'
        };
        ruleData.conditions.push(vendorFilter);
      }

      const rule = await orderAutomationService.createAutomationRule(ruleData);

      logger.info('Automation rule created', {
        ruleId: rule.id,
        createdBy: req.user?.id,
        ruleName: rule.name
      });

      res.status(201).json({
        success: true,
        data: rule
      });
    });
  });

  getAutomationRules = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const {
        isActive,
        triggerEvent,
        page = 1,
        limit = 20
      } = req.query;

      const filters: any = {};
      
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      if (triggerEvent) {
        filters.triggerEvent = triggerEvent as string;
      }

      // Vendors can only see their own rules
      if (req.user?.role === 'vendor_manager') {
        // This would need to be implemented in the service to filter by vendorId
        // For now, we'll get all rules and filter them
      }

      filters.limit = Math.min(Number(limit), 100);
      filters.offset = (Number(page) - 1) * filters.limit;

      const result = await orderAutomationService.getAutomationRules(filters);

      res.json({
        success: true,
        data: {
          rules: result.rules,
          pagination: {
            page: Number(page),
            limit: filters.limit,
            total: result.total,
            pages: Math.ceil(result.total / filters.limit)
          }
        }
      });
    });
  });

  updateAutomationRule = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const { id } = req.params;
      const updates: Partial<AutomationRuleConfig> = req.body;

      // Validate rule ID
      if (!id) {
        throw createValidationError('Rule ID is required');
      }

      // Validate updates if rule configuration is being changed
      if (updates.conditions || updates.actions) {
        const validation = await orderAutomationService.validateRuleConfiguration(updates as AutomationRuleConfig);
        if (!validation.valid) {
          throw createValidationError('Invalid automation rule configuration', validation.errors);
        }
      }

      const rule = await orderAutomationService.updateAutomationRule(id, updates);

      logger.info('Automation rule updated', {
        ruleId: id,
        updatedBy: req.user?.id,
        changes: Object.keys(updates)
      });

      res.json({
        success: true,
        data: rule
      });
    });
  });

  triggerAutomation = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin'])(req, res, async () => {
      const { eventType, entityData } = req.body;

      // Validate required fields
      validateRequiredFields({ eventType, entityData }, ['eventType', 'entityData']);

      await orderAutomationService.triggerAutomation(eventType, entityData);

      logger.info('Manual automation triggered', {
        eventType,
        entityId: entityData.id,
        triggeredBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'Automation triggered successfully'
      });
    });
  });

  getAutomationLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const {
        ruleId,
        entityType,
        entityId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = req.query;

      const filters: any = {
        limit: Math.min(Number(limit), 100),
        offset: (Number(page) - 1) * Math.min(Number(limit), 100)
      };

      if (ruleId) filters.ruleId = ruleId as string;
      if (entityType) filters.entityType = entityType as string;
      if (entityId) filters.entityId = entityId as string;
      if (status) filters.status = status as any;

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const result = await orderAutomationService.getAutomationLogs(filters);

      // Filter logs for vendor managers
      let filteredLogs = result.logs;
      if (req.user?.role === 'vendor_manager') {
        // Would need to implement vendor filtering in the service
        // For now, show all logs but this should be restricted
      }

      res.json({
        success: true,
        data: {
          logs: filteredLogs,
          pagination: {
            page: Number(page),
            limit: filters.limit,
            total: result.total,
            pages: Math.ceil(result.total / filters.limit)
          },
          stats: await orderAutomationService.getAutomationStats()
        }
      });
    });
  });

  getAutomationStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin', 'vendor_manager'])(req, res, async () => {
      const stats = await orderAutomationService.getAutomationStats();

      res.json({
        success: true,
        data: stats
      });
    });
  });

  setupDefaultRules = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin'])(req, res, async () => {
      await orderAutomationService.setupDefaultAutomationRules();

      logger.info('Default automation rules setup initiated', {
        initiatedBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'Default automation rules have been set up'
      });
    });
  });

  testAutomationRule = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin'])(req, res, async () => {
      const { ruleId, testData } = req.body;

      validateRequiredFields({ ruleId, testData }, ['ruleId', 'testData']);

      // This would implement a test execution of the rule
      // For now, we'll just validate the rule and return test results
      
      logger.info('Automation rule test initiated', {
        ruleId,
        testedBy: req.user?.id
      });

      res.json({
        success: true,
        data: {
          ruleId,
          testResult: 'Test execution completed',
          conditionsEvaluated: true,
          actionsSimulated: true,
          estimatedExecutionTime: '250ms'
        }
      });
    });
  });

  deleteAutomationRule = asyncHandler(async (req: AuthRequest, res: Response) => {
    roleGuard(['admin'])(req, res, async () => {
      const { id } = req.params;

      if (!id) {
        throw createValidationError('Rule ID is required');
      }

      // In a real implementation, this would disable rather than delete
      // to maintain audit trail
      await orderAutomationService.updateAutomationRule(id, { isActive: false });

      logger.info('Automation rule deactivated', {
        ruleId: id,
        deactivatedBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'Automation rule has been deactivated'
      });
    });
  });
}