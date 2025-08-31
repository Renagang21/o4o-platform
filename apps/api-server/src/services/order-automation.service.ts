import { AppDataSource } from '../database/connection';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { AutomationRule } from '../entities/AutomationRule';
import { AutomationLog } from '../entities/AutomationLog';
import { WorkflowService } from './workflow.service';
import { NotificationService } from './notification.service';
import { inventoryService } from './inventoryService';
import { paymentSystemIntegration } from './payment-system-integration.service';
import { analyticsCacheService } from './analytics-cache.service';
import logger from '../utils/logger';

export interface AutomationCondition {
  type: 'order_status' | 'payment_status' | 'inventory_level' | 'time_elapsed';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  field?: string;
}

export interface AutomationAction {
  type: 'update_status' | 'send_notification' | 'create_purchase_order' | 'adjust_inventory' | 'process_commission';
  parameters: Record<string, any>;
  delay?: number;
}

export interface AutomationRuleConfig {
  name: string;
  description: string;
  triggerEvent: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  priority: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
}

export class OrderAutomationService {
  private orderRepository = AppDataSource.getRepository(Order);
  private ruleRepository = AppDataSource.getRepository(AutomationRule);
  private logRepository = AppDataSource.getRepository(AutomationLog);
  private workflowService: WorkflowService;
  private notificationService: NotificationService;

  constructor() {
    this.workflowService = new WorkflowService();
    this.notificationService = new NotificationService();
  }

  async createAutomationRule(ruleConfig: AutomationRuleConfig): Promise<AutomationRule> {
    try {
      const rule = this.ruleRepository.create({
        name: ruleConfig.name,
        description: ruleConfig.description,
        triggerEvent: ruleConfig.triggerEvent,
        conditions: ruleConfig.conditions,
        actions: ruleConfig.actions,
        isActive: ruleConfig.isActive,
        priority: ruleConfig.priority,
        retryPolicy: ruleConfig.retryPolicy || { maxRetries: 3, backoffMs: 5000 },
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        createdAt: new Date(),
      });

      const savedRule = await this.ruleRepository.save(rule);

      logger.info('Automation rule created', {
        ruleId: savedRule.id,
        name: savedRule.name,
        triggerEvent: savedRule.triggerEvent
      });

      return savedRule;
    } catch (error) {
      logger.error('Error creating automation rule:', error);
      throw error;
    }
  }

  async getAutomationRules(filters: {
    isActive?: boolean;
    triggerEvent?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ rules: AutomationRule[]; total: number }> {
    try {
      const queryBuilder = this.ruleRepository.createQueryBuilder('rule');

      if (filters.isActive !== undefined) {
        queryBuilder.andWhere('rule.isActive = :isActive', { isActive: filters.isActive });
      }

      if (filters.triggerEvent) {
        queryBuilder.andWhere('rule.triggerEvent = :triggerEvent', { triggerEvent: filters.triggerEvent });
      }

      queryBuilder.orderBy('rule.priority', 'DESC').addOrderBy('rule.createdAt', 'DESC');

      if (filters.limit) {
        queryBuilder.limit(filters.limit);
      }

      if (filters.offset) {
        queryBuilder.offset(filters.offset);
      }

      const [rules, total] = await queryBuilder.getManyAndCount();

      return { rules, total };
    } catch (error) {
      logger.error('Error getting automation rules:', error);
      throw error;
    }
  }

  async updateAutomationRule(ruleId: string, updates: Partial<AutomationRuleConfig>): Promise<AutomationRule> {
    try {
      const rule = await this.ruleRepository.findOne({ where: { id: ruleId } });
      
      if (!rule) {
        throw new Error('Automation rule not found');
      }

      Object.assign(rule, updates, { updatedAt: new Date() });
      
      const savedRule = await this.ruleRepository.save(rule);

      logger.info('Automation rule updated', {
        ruleId: savedRule.id,
        name: savedRule.name
      });

      return savedRule;
    } catch (error) {
      logger.error('Error updating automation rule:', error);
      throw error;
    }
  }

  async triggerAutomation(eventType: string, entityData: any): Promise<void> {
    try {
      const applicableRules = await this.ruleRepository.find({
        where: {
          triggerEvent: eventType,
          isActive: true
        },
        order: { priority: 'DESC' }
      });

      logger.info('Processing automation trigger', {
        eventType,
        entityId: entityData.id,
        rulesCount: applicableRules.length
      });

      for (const rule of applicableRules) {
        try {
          await this.executeAutomationRule(rule, entityData);
        } catch (error) {
          logger.error(`Error executing automation rule ${rule.id}:`, error);
          await this.logAutomationFailure(rule.id, entityData, error.message);
        }
      }
    } catch (error) {
      logger.error('Error triggering automation:', error);
    }
  }

  async executeAutomationRule(rule: AutomationRule, entityData: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Executing automation rule', {
        ruleId: rule.id,
        ruleName: rule.name,
        entityId: entityData.id
      });

      // Check conditions
      const conditionsMet = await this.evaluateConditions(rule.conditions, entityData);
      
      if (!conditionsMet) {
        logger.debug('Automation rule conditions not met', {
          ruleId: rule.id,
          entityId: entityData.id
        });
        return;
      }

      // Execute actions
      for (const action of rule.actions) {
        await this.executeAction(action, entityData, rule);
      }

      // Update rule statistics
      rule.executionCount = (rule.executionCount || 0) + 1;
      rule.successCount = (rule.successCount || 0) + 1;
      rule.lastExecutedAt = new Date();
      await this.ruleRepository.save(rule);

      // Log successful execution
      await this.logAutomationSuccess(rule.id, entityData, Date.now() - startTime);

      logger.info('Automation rule executed successfully', {
        ruleId: rule.id,
        entityId: entityData.id,
        executionTimeMs: Date.now() - startTime
      });

    } catch (error) {
      // Update failure statistics
      rule.executionCount = (rule.executionCount || 0) + 1;
      rule.failureCount = (rule.failureCount || 0) + 1;
      rule.lastFailedAt = new Date();
      await this.ruleRepository.save(rule);

      await this.logAutomationFailure(rule.id, entityData, error.message);
      throw error;
    }
  }

  private async evaluateConditions(conditions: AutomationCondition[], entityData: any): Promise<boolean> {
    for (const condition of conditions) {
      const value = this.getValueFromEntity(entityData, condition.field || condition.type);
      
      const result = this.evaluateCondition(condition, value);
      
      if (!result) {
        return false;
      }
    }
    
    return true;
  }

  private evaluateCondition(condition: AutomationCondition, actualValue: any): boolean {
    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value;
      case 'not_equals':
        return actualValue !== condition.value;
      case 'greater_than':
        return Number(actualValue) > Number(condition.value);
      case 'less_than':
        return Number(actualValue) < Number(condition.value);
      case 'contains':
        return String(actualValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  private getValueFromEntity(entity: any, field: string): any {
    const parts = field.split('.');
    let value = entity;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private async executeAction(action: AutomationAction, entityData: any, rule: AutomationRule): Promise<void> {
    if (action.delay && action.delay > 0) {
      await this.scheduleDelayedAction(action, entityData, rule);
      return;
    }

    switch (action.type) {
      case 'update_status':
        await this.executeUpdateStatusAction(action, entityData);
        break;
      case 'send_notification':
        await this.executeSendNotificationAction(action, entityData);
        break;
      case 'create_purchase_order':
        await this.executeCreatePurchaseOrderAction(action, entityData);
        break;
      case 'adjust_inventory':
        await this.executeAdjustInventoryAction(action, entityData);
        break;
      case 'process_commission':
        await this.executeProcessCommissionAction(action, entityData);
        break;
      default:
        logger.warn('Unknown automation action type', { actionType: action.type });
    }
  }

  private async executeUpdateStatusAction(action: AutomationAction, entityData: any): Promise<void> {
    const { entityType, newStatus } = action.parameters;
    
    switch (entityType) {
      case 'order':
        await this.workflowService.transitionOrderStatus(
          entityData.id,
          entityData.status,
          newStatus,
          'automation',
          `Automated status update by rule`
        );
        break;
      case 'inventory':
        await this.workflowService.updateInventoryStatus(entityData.id, newStatus);
        break;
      default:
        throw new Error(`Unsupported entity type for status update: ${entityType}`);
    }
  }

  private async executeSendNotificationAction(action: AutomationAction, entityData: any): Promise<void> {
    const { notificationType, recipients, template, priority } = action.parameters;
    
    await this.notificationService.sendNotification({
      type: notificationType,
      recipients: recipients || this.determineRecipients(entityData),
      template,
      data: entityData,
      priority: priority || 'medium',
      source: 'automation'
    });
  }

  private async executeCreatePurchaseOrderAction(action: AutomationAction, entityData: any): Promise<void> {
    const { supplierId, products, priority } = action.parameters;
    
    // This would integrate with purchase order system
    logger.info('Creating automated purchase order', {
      supplierId,
      products,
      priority,
      triggeredBy: entityData.id
    });
  }

  private async executeAdjustInventoryAction(action: AutomationAction, entityData: any): Promise<void> {
    const { adjustments } = action.parameters;
    
    await inventoryService.performInventoryAdjustment(adjustments);
    
    logger.info('Automated inventory adjustment completed', {
      adjustments,
      triggeredBy: entityData.id
    });
  }

  private async executeProcessCommissionAction(action: AutomationAction, entityData: any): Promise<void> {
    const { commissionType, parameters } = action.parameters;
    
    switch (commissionType) {
      case 'create':
        await paymentSystemIntegration.processCommissionForPayment(
          entityData.paymentKey,
          entityData
        );
        break;
      case 'approve':
        // Auto-approve based on criteria
        logger.info('Processing commission approval', { entityId: entityData.id });
        break;
      default:
        throw new Error(`Unknown commission action: ${commissionType}`);
    }
  }

  private async scheduleDelayedAction(action: AutomationAction, entityData: any, rule: AutomationRule): Promise<void> {
    setTimeout(async () => {
      try {
        await this.executeAction({ ...action, delay: undefined }, entityData, rule);
      } catch (error) {
        logger.error('Error executing delayed automation action:', error);
      }
    }, action.delay);
  }

  private determineRecipients(entityData: any): string[] {
    const recipients = [];
    
    if (entityData.vendorId) {
      recipients.push(`vendor:${entityData.vendorId}`);
    }
    
    if (entityData.supplierId) {
      recipients.push(`supplier:${entityData.supplierId}`);
    }
    
    if (entityData.customerId) {
      recipients.push(`customer:${entityData.customerId}`);
    }
    
    // Always notify admin for critical events
    recipients.push('admin');
    
    return recipients;
  }

  async getAutomationLogs(filters: {
    ruleId?: string;
    entityType?: string;
    entityId?: string;
    status?: 'success' | 'failure';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: AutomationLog[]; total: number }> {
    try {
      const queryBuilder = this.logRepository.createQueryBuilder('log');

      if (filters.ruleId) {
        queryBuilder.andWhere('log.ruleId = :ruleId', { ruleId: filters.ruleId });
      }

      if (filters.entityType) {
        queryBuilder.andWhere('log.entityType = :entityType', { entityType: filters.entityType });
      }

      if (filters.entityId) {
        queryBuilder.andWhere('log.entityId = :entityId', { entityId: filters.entityId });
      }

      if (filters.status) {
        queryBuilder.andWhere('log.status = :status', { status: filters.status });
      }

      if (filters.startDate) {
        queryBuilder.andWhere('log.executedAt >= :startDate', { startDate: filters.startDate });
      }

      if (filters.endDate) {
        queryBuilder.andWhere('log.executedAt <= :endDate', { endDate: filters.endDate });
      }

      queryBuilder.orderBy('log.executedAt', 'DESC');

      if (filters.limit) {
        queryBuilder.limit(filters.limit);
      }

      if (filters.offset) {
        queryBuilder.offset(filters.offset);
      }

      const [logs, total] = await queryBuilder.getManyAndCount();

      return { logs, total };
    } catch (error) {
      logger.error('Error getting automation logs:', error);
      throw error;
    }
  }

  async getAutomationStats(): Promise<{
    totalRules: number;
    activeRules: number;
    totalExecutions: number;
    successRate: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
    recentActivity: Array<{ date: string; executions: number; failures: number }>;
  }> {
    try {
      const [
        totalRules,
        activeRules,
        recentLogs
      ] = await Promise.all([
        this.ruleRepository.count(),
        this.ruleRepository.count({ where: { isActive: true } }),
        this.logRepository.find({
          where: {
            executedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          order: { executedAt: 'DESC' }
        })
      ]);

      const totalExecutions = recentLogs.length;
      const successfulExecutions = recentLogs.filter(log => log.status === 'success').length;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      // Analyze failure reasons
      const failureReasons = new Map<string, number>();
      recentLogs
        .filter(log => log.status === 'failure')
        .forEach(log => {
          const reason = log.errorMessage || 'Unknown error';
          failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
        });

      const topFailureReasons = Array.from(failureReasons.entries())
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily activity for the last 7 days
      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayLogs = recentLogs.filter(log => 
          log.executedAt.toISOString().split('T')[0] === dateStr
        );
        
        recentActivity.push({
          date: dateStr,
          executions: dayLogs.length,
          failures: dayLogs.filter(log => log.status === 'failure').length
        });
      }

      return {
        totalRules,
        activeRules,
        totalExecutions,
        successRate,
        topFailureReasons,
        recentActivity
      };
    } catch (error) {
      logger.error('Error getting automation stats:', error);
      throw error;
    }
  }

  async processOrderAutomation(orderId: string, eventType: string): Promise<void> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'items.product', 'vendor', 'customer']
      });

      if (!order) {
        logger.warn('Order not found for automation processing', { orderId });
        return;
      }

      await this.triggerAutomation(eventType, order);
    } catch (error) {
      logger.error('Error processing order automation:', error);
      throw error;
    }
  }

  async setupDefaultAutomationRules(): Promise<void> {
    try {
      const defaultRules: AutomationRuleConfig[] = [
        {
          name: 'Payment Completed Processing',
          description: 'Process inventory and commission when payment is completed',
          triggerEvent: 'payment_completed',
          conditions: [
            { type: 'payment_status', operator: 'equals', value: 'completed' }
          ],
          actions: [
            { type: 'update_status', parameters: { entityType: 'order', newStatus: 'confirmed' } },
            { type: 'process_commission', parameters: { commissionType: 'create' } },
            { type: 'send_notification', parameters: { notificationType: 'order_confirmed', recipients: ['customer', 'vendor'] } }
          ],
          isActive: true,
          priority: 100
        },
        {
          name: 'Low Stock Auto-Reorder',
          description: 'Automatically create purchase orders for low stock items',
          triggerEvent: 'inventory_low_stock',
          conditions: [
            { type: 'inventory_level', operator: 'less_than', value: 10 }
          ],
          actions: [
            { type: 'create_purchase_order', parameters: { priority: 'high' } },
            { type: 'send_notification', parameters: { notificationType: 'reorder_created', recipients: ['admin', 'supplier'] } }
          ],
          isActive: true,
          priority: 90
        },
        {
          name: 'Order Shipped Notification',
          description: 'Send tracking information when order is shipped',
          triggerEvent: 'order_shipped',
          conditions: [
            { type: 'order_status', operator: 'equals', value: 'shipped' }
          ],
          actions: [
            { type: 'send_notification', parameters: { notificationType: 'order_shipped', recipients: ['customer'] } }
          ],
          isActive: true,
          priority: 80
        },
        {
          name: 'Commission Auto-Approval',
          description: 'Automatically approve commissions under threshold',
          triggerEvent: 'commission_created',
          conditions: [
            { type: 'order_status', operator: 'equals', value: 'completed', field: 'amount' },
            { type: 'order_status', operator: 'less_than', value: 1000, field: 'amount' }
          ],
          actions: [
            { type: 'process_commission', parameters: { commissionType: 'approve' } },
            { type: 'send_notification', parameters: { notificationType: 'commission_approved', recipients: ['vendor'] } }
          ],
          isActive: true,
          priority: 70
        }
      ];

      for (const ruleConfig of defaultRules) {
        const existingRule = await this.ruleRepository.findOne({
          where: { name: ruleConfig.name }
        });

        if (!existingRule) {
          await this.createAutomationRule(ruleConfig);
        }
      }

      logger.info('Default automation rules setup completed');
    } catch (error) {
      logger.error('Error setting up default automation rules:', error);
      throw error;
    }
  }

  private async logAutomationSuccess(ruleId: string, entityData: any, executionTimeMs: number): Promise<void> {
    try {
      const log = this.logRepository.create({
        ruleId,
        entityType: entityData.constructor.name.toLowerCase(),
        entityId: entityData.id,
        status: 'success',
        executedAt: new Date(),
        executionTimeMs,
        inputData: entityData,
        result: { success: true }
      });

      await this.logRepository.save(log);
    } catch (error) {
      logger.error('Error logging automation success:', error);
    }
  }

  private async logAutomationFailure(ruleId: string, entityData: any, errorMessage: string): Promise<void> {
    try {
      const log = this.logRepository.create({
        ruleId,
        entityType: entityData.constructor?.name?.toLowerCase() || 'unknown',
        entityId: entityData.id,
        status: 'failure',
        executedAt: new Date(),
        errorMessage,
        inputData: entityData
      });

      await this.logRepository.save(log);
    } catch (error) {
      logger.error('Error logging automation failure:', error);
    }
  }

  async processOrderStatusChange(orderId: string, fromStatus: string, toStatus: string): Promise<void> {
    try {
      const eventMap: Record<string, string> = {
        'pending->paid': 'payment_completed',
        'paid->confirmed': 'order_confirmed',
        'confirmed->shipped': 'order_shipped',
        'shipped->delivered': 'order_delivered',
        'delivered->completed': 'order_completed'
      };

      const eventType = eventMap[`${fromStatus}->${toStatus}`];
      
      if (eventType) {
        await this.processOrderAutomation(orderId, eventType);
      }

      await analyticsCacheService.invalidateForDataChange('order', orderId);
    } catch (error) {
      logger.error('Error processing order status change automation:', error);
    }
  }

  async validateRuleConfiguration(ruleConfig: AutomationRuleConfig): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!ruleConfig.name || ruleConfig.name.trim().length === 0) {
      errors.push('Rule name is required');
    }

    if (!ruleConfig.triggerEvent) {
      errors.push('Trigger event is required');
    }

    if (!ruleConfig.actions || ruleConfig.actions.length === 0) {
      errors.push('At least one action is required');
    }

    for (const action of ruleConfig.actions || []) {
      if (!action.type) {
        errors.push('Action type is required');
      }

      if (!action.parameters) {
        errors.push('Action parameters are required');
      }
    }

    for (const condition of ruleConfig.conditions || []) {
      if (!condition.type || !condition.operator) {
        errors.push('Condition type and operator are required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const orderAutomationService = new OrderAutomationService();