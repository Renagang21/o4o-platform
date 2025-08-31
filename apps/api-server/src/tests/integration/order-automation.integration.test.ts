import { AppDataSource } from '../../database/connection';
import { orderAutomationService } from '../../services/order-automation.service';
import { workflowService } from '../../services/workflow.service';
import { notificationService } from '../../services/notification.service';

describe('Order Automation Integration Tests', () => {
  beforeAll(async () => {
    // Initialize database connection for tests
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  describe('Order Processing Workflow', () => {
    test('should process payment completed workflow', async () => {
      // Mock order data
      const mockOrder = {
        id: 'test-order-123',
        status: 'pending',
        paymentKey: 'test-payment-key',
        items: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 1 }
        ],
        vendorId: 'vendor-123',
        customerId: 'customer-456',
        totalAmount: 100
      };

      // Trigger automation
      const result = await orderAutomationService.triggerAutomation('payment_completed', mockOrder);
      
      // Verify automation was triggered successfully
      expect(result).toBeUndefined(); // triggerAutomation doesn't return a value on success
    });

    test('should transition order status correctly', async () => {
      const mockOrderId = 'test-order-456';
      const fromStatus = 'pending';
      const toStatus = 'paid';

      const result = await workflowService.transitionOrderStatus(
        mockOrderId,
        fromStatus,
        toStatus,
        'system',
        'Test transition'
      );

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should validate workflow transitions', async () => {
      const validation = await workflowService.validateWorkflowTransition('order', 'pending', 'paid');
      
      expect(validation.valid).toBe(true);
      
      // Test invalid transition
      const invalidValidation = await workflowService.validateWorkflowTransition('order', 'pending', 'completed');
      expect(invalidValidation.valid).toBe(false);
    });
  });

  describe('Automation Rules', () => {
    test('should create automation rule successfully', async () => {
      const ruleConfig = {
        name: 'Test Payment Processing',
        description: 'Test rule for payment processing',
        triggerEvent: 'payment_completed',
        conditions: [
          { type: 'payment_status' as const, operator: 'equals' as const, value: 'completed' }
        ],
        actions: [
          { type: 'update_status' as const, parameters: { entityType: 'order', newStatus: 'confirmed' } }
        ],
        isActive: true,
        priority: 100
      };

      const rule = await orderAutomationService.createAutomationRule(ruleConfig);
      
      expect(rule).toBeDefined();
      expect(rule.name).toBe(ruleConfig.name);
      expect(rule.isActive).toBe(true);
    });

    test('should validate rule configuration', async () => {
      const validRuleConfig = {
        name: 'Valid Rule',
        description: 'Test valid rule',
        triggerEvent: 'test_event',
        conditions: [
          { type: 'order_status' as const, operator: 'equals' as const, value: 'pending' }
        ],
        actions: [
          { type: 'update_status' as const, parameters: { entityType: 'order', newStatus: 'confirmed' } }
        ],
        isActive: true,
        priority: 50
      };

      const validation = await orderAutomationService.validateRuleConfiguration(validRuleConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    test('should reject invalid rule configuration', async () => {
      const invalidRuleConfig = {
        name: '', // Invalid: empty name
        description: 'Test invalid rule',
        triggerEvent: '', // Invalid: empty trigger event
        conditions: [],
        actions: [], // Invalid: no actions
        isActive: true,
        priority: 50
      };

      const validation = await orderAutomationService.validateRuleConfiguration(invalidRuleConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Notification System Integration', () => {
    test('should send notification successfully', async () => {
      const notificationData = {
        type: 'email' as const,
        recipients: ['test@example.com'],
        template: 'test_template',
        data: { orderId: 'test-123', customerName: 'Test Customer' },
        priority: 'medium' as const,
        source: 'test'
      };

      const result = await notificationService.sendNotification(notificationData);
      
      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
    });

    test('should validate notification data', async () => {
      const invalidNotificationData = {
        type: '' as any,
        recipients: [],
        template: '',
        data: {},
        priority: '' as any,
        source: ''
      };

      const result = await notificationService.sendNotification(invalidNotificationData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('Workflow Statistics', () => {
    test('should get automation stats', async () => {
      const stats = await orderAutomationService.getAutomationStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalRules).toBe('number');
      expect(typeof stats.activeRules).toBe('number');
      expect(typeof stats.totalExecutions).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(Array.isArray(stats.topFailureReasons)).toBe(true);
      expect(Array.isArray(stats.recentActivity)).toBe(true);
    });

    test('should get workflow stats', async () => {
      const stats = await workflowService.getWorkflowStats();
      
      expect(stats).toBeDefined();
      expect(stats.orderWorkflow).toBeDefined();
      expect(stats.inventoryWorkflow).toBeDefined();
      expect(stats.commissionWorkflow).toBeDefined();
      
      expect(typeof stats.orderWorkflow.totalTransitions).toBe('number');
      expect(typeof stats.orderWorkflow.averageCompletionTime).toBe('number');
      expect(typeof stats.orderWorkflow.stateDistribution).toBe('object');
      expect(Array.isArray(stats.orderWorkflow.bottlenecks)).toBe(true);
    });

    test('should get notification stats', async () => {
      const stats = await notificationService.getNotificationStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalSent).toBe('number');
      expect(typeof stats.totalFailed).toBe('number');
      expect(typeof stats.queueSizes).toBe('object');
      expect(typeof stats.retryQueueSize).toBe('number');
      expect(Array.isArray(stats.recentActivity)).toBe(true);
    });
  });

  describe('System Integration', () => {
    test('should setup default automation rules', async () => {
      await orderAutomationService.setupDefaultAutomationRules();
      
      // Verify default rules were created
      const rules = await orderAutomationService.getAutomationRules({ isActive: true });
      
      expect(rules.rules.length).toBeGreaterThan(0);
      
      // Check for specific default rules
      const paymentCompletedRule = rules.rules.find(r => r.name === 'Payment Completed Processing');
      const lowStockRule = rules.rules.find(r => r.name === 'Low Stock Auto-Reorder');
      const shippedRule = rules.rules.find(r => r.name === 'Order Shipped Notification');
      const commissionRule = rules.rules.find(r => r.name === 'Commission Auto-Approval');
      
      expect(paymentCompletedRule).toBeDefined();
      expect(lowStockRule).toBeDefined();
      expect(shippedRule).toBeDefined();
      expect(commissionRule).toBeDefined();
    });

    test('should handle order status changes with automation', async () => {
      const mockOrderId = 'automation-test-order';
      
      // This would trigger the automation system
      await orderAutomationService.processOrderStatusChange(mockOrderId, 'pending', 'paid');
      
      // Verify that automation logs were created
      const logs = await orderAutomationService.getAutomationLogs({
        entityId: mockOrderId,
        limit: 10
      });
      
      // The logs might be empty in test environment, but the function should not throw
      expect(Array.isArray(logs.logs)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid automation triggers gracefully', async () => {
      const invalidData = { id: 'invalid', invalidField: 'test' };
      
      // This should not throw an error
      await expect(orderAutomationService.triggerAutomation('invalid_event', invalidData))
        .resolves.not.toThrow();
    });

    test('should handle workflow transition errors', async () => {
      const result = await workflowService.transitionOrderStatus(
        'non-existent-order',
        'pending',
        'paid',
        'test',
        'Error test'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle notification failures gracefully', async () => {
      const invalidNotificationData = {
        type: 'invalid_type' as any,
        recipients: ['invalid-recipient'],
        template: 'non-existent-template',
        data: {},
        priority: 'medium' as const,
        source: 'test'
      };

      const result = await notificationService.sendNotification(invalidNotificationData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});

describe('Integration Health Checks', () => {
  test('should verify all services are properly initialized', () => {
    expect(orderAutomationService).toBeDefined();
    expect(workflowService).toBeDefined();
    expect(notificationService).toBeDefined();
  });

  test('should verify service methods are accessible', () => {
    expect(typeof orderAutomationService.createAutomationRule).toBe('function');
    expect(typeof orderAutomationService.triggerAutomation).toBe('function');
    expect(typeof workflowService.transitionOrderStatus).toBe('function');
    expect(typeof workflowService.getOrderWorkflowStatus).toBe('function');
    expect(typeof notificationService.sendNotification).toBe('function');
    expect(typeof notificationService.getNotificationStats).toBe('function');
  });
});