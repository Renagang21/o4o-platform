import { AppDataSource } from '../database/connection';
import { Order, OrderStatus } from '../entities/Order';
import { WorkflowTransition } from '../entities/WorkflowTransition';
import { WorkflowState } from '../entities/WorkflowState';
import { analyticsCacheService } from './analytics-cache.service';
import logger from '../utils/logger';

export interface WorkflowDefinition {
  name: string;
  states: WorkflowStateDefinition[];
  transitions: WorkflowTransitionDefinition[];
  initialState: string;
}

export interface WorkflowStateDefinition {
  id: string;
  name: string;
  type: 'initial' | 'intermediate' | 'final' | 'error';
  actions?: WorkflowAction[];
  timeouts?: WorkflowTimeout[];
}

export interface WorkflowTransitionDefinition {
  from: string;
  to: string;
  trigger: string;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
}

export interface WorkflowAction {
  type: string;
  parameters: Record<string, any>;
}

export interface WorkflowCondition {
  field: string;
  operator: string;
  value: any;
}

export interface WorkflowTimeout {
  duration: number;
  action: WorkflowAction;
}

export class WorkflowService {
  private orderRepository = AppDataSource.getRepository(Order);
  private transitionRepository = AppDataSource.getRepository(WorkflowTransition);
  private stateRepository = AppDataSource.getRepository(WorkflowState);

  private readonly orderWorkflow: WorkflowDefinition = {
    name: 'Order Processing Workflow',
    initialState: 'pending',
    states: [
      {
        id: 'pending',
        name: 'Order Pending',
        type: 'initial',
        timeouts: [{
          duration: 900000, // 15 minutes
          action: { type: 'cancel_order', parameters: { reason: 'payment_timeout' } }
        }]
      },
      {
        id: 'paid',
        name: 'Payment Completed',
        type: 'intermediate',
        actions: [{
          type: 'reserve_inventory',
          parameters: { reservationMinutes: 60 }
        }]
      },
      {
        id: 'confirmed',
        name: 'Order Confirmed',
        type: 'intermediate',
        actions: [{
          type: 'send_confirmation_email',
          parameters: { template: 'order_confirmed' }
        }]
      },
      {
        id: 'processing',
        name: 'Order Processing',
        type: 'intermediate',
        timeouts: [{
          duration: 172800000, // 48 hours
          action: { type: 'escalate_delay', parameters: { level: 'high' } }
        }]
      },
      {
        id: 'shipped',
        name: 'Order Shipped',
        type: 'intermediate',
        actions: [{
          type: 'send_tracking_info',
          parameters: { template: 'order_shipped' }
        }]
      },
      {
        id: 'delivered',
        name: 'Order Delivered',
        type: 'intermediate',
        timeouts: [{
          duration: 604800000, // 7 days
          action: { type: 'auto_confirm_receipt', parameters: {} }
        }]
      },
      {
        id: 'completed',
        name: 'Order Completed',
        type: 'final',
        actions: [{
          type: 'release_escrow',
          parameters: {}
        }, {
          type: 'process_final_commission',
          parameters: {}
        }]
      },
      {
        id: 'cancelled',
        name: 'Order Cancelled',
        type: 'final',
        actions: [{
          type: 'restore_inventory',
          parameters: {}
        }, {
          type: 'process_refund',
          parameters: {}
        }]
      },
      {
        id: 'refunded',
        name: 'Order Refunded',
        type: 'final',
        actions: [{
          type: 'adjust_commission',
          parameters: {}
        }]
      }
    ],
    transitions: [
      { from: 'pending', to: 'paid', trigger: 'payment_completed' },
      { from: 'paid', to: 'confirmed', trigger: 'inventory_reserved' },
      { from: 'confirmed', to: 'processing', trigger: 'start_processing' },
      { from: 'processing', to: 'shipped', trigger: 'package_shipped' },
      { from: 'shipped', to: 'delivered', trigger: 'delivery_confirmed' },
      { from: 'delivered', to: 'completed', trigger: 'receipt_confirmed' },
      { from: 'pending', to: 'cancelled', trigger: 'payment_failed' },
      { from: 'paid', to: 'cancelled', trigger: 'order_cancelled' },
      { from: 'confirmed', to: 'cancelled', trigger: 'order_cancelled' },
      { from: 'processing', to: 'cancelled', trigger: 'order_cancelled' },
      { from: 'completed', to: 'refunded', trigger: 'refund_requested' }
    ]
  };

  async transitionOrderStatus(
    orderId: string,
    fromStatus: string,
    toStatus: string,
    triggeredBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Validate transition
      const transition = this.orderWorkflow.transitions.find(t => 
        t.from === fromStatus && t.to === toStatus
      );

      if (!transition) {
        return { 
          success: false, 
          error: `Invalid transition from ${fromStatus} to ${toStatus}` 
        };
      }

      // Log transition
      await this.logWorkflowTransition(orderId, fromStatus, toStatus, triggeredBy, reason);

      // Update order status
      order.status = toStatus as OrderStatus;
      order.updatedAt = new Date();
      await this.orderRepository.save(order);

      // Execute state actions
      const targetState = this.orderWorkflow.states.find(s => s.id === toStatus);
      if (targetState?.actions) {
        for (const action of targetState.actions) {
          await this.executeWorkflowAction(action, order);
        }
      }

      // Execute transition actions
      if (transition.actions) {
        for (const action of transition.actions) {
          await this.executeWorkflowAction(action, order);
        }
      }

      // Invalidate caches
      await analyticsCacheService.invalidateForDataChange('order', orderId);

      logger.info('Order status transition completed', {
        orderId,
        fromStatus,
        toStatus,
        triggeredBy
      });

      return { success: true };
    } catch (error) {
      logger.error('Error transitioning order status:', error);
      return { success: false, error: error.message };
    }
  }

  async getOrderWorkflowStatus(orderId: string): Promise<{
    currentState: string;
    availableTransitions: string[];
    stateHistory: WorkflowTransition[];
    nextActions: WorkflowAction[];
  }> {
    try {
      const order = await this.orderRepository.findOne({ where: { id: orderId } });
      
      if (!order) {
        throw new Error('Order not found');
      }

      const currentState = order.status;
      
      // Get available transitions
      const availableTransitions = this.orderWorkflow.transitions
        .filter(t => t.from === currentState)
        .map(t => t.to);

      // Get state history
      const stateHistory = await this.transitionRepository.find({
        where: { entityId: orderId, entityType: 'order' },
        order: { createdAt: 'DESC' }
      });

      // Get next actions for current state
      const currentStateDefinition = this.orderWorkflow.states.find(s => s.id === currentState);
      const nextActions = currentStateDefinition?.actions || [];

      return {
        currentState,
        availableTransitions,
        stateHistory,
        nextActions
      };
    } catch (error) {
      logger.error('Error getting order workflow status:', error);
      throw error;
    }
  }

  async getInventoryWorkflowAlerts(): Promise<{
    lowStockAlerts: Array<{ productId: string; currentStock: number; threshold: number; action: string }>;
    reorderAlerts: Array<{ productId: string; reorderPoint: number; recommendedQuantity: number }>;
    expiryAlerts: Array<{ productId: string; expiryDate: Date; daysRemaining: number }>;
  }> {
    try {
      const lowStockProducts = await inventoryService.getLowStockProducts(10);
      const outOfStockProducts = await inventoryService.getOutOfStockProducts();

      const lowStockAlerts = lowStockProducts.map(product => ({
        productId: product.id,
        currentStock: product.stockQuantity || 0,
        threshold: 10,
        action: 'reorder_recommended'
      }));

      const reorderAlerts = outOfStockProducts.map(product => ({
        productId: product.id,
        reorderPoint: 0,
        recommendedQuantity: 50 // Default recommended quantity
      }));

      // Mock expiry alerts for now
      const expiryAlerts: Array<{ productId: string; expiryDate: Date; daysRemaining: number }> = [];

      return {
        lowStockAlerts,
        reorderAlerts,
        expiryAlerts
      };
    } catch (error) {
      logger.error('Error getting inventory workflow alerts:', error);
      throw error;
    }
  }

  async getCommissionProcessWorkflow(): Promise<{
    pendingCommissions: number;
    pendingSettlements: number;
    autoApprovalQueue: number;
    manualReviewQueue: number;
    nextProcessingDate: Date;
  }> {
    try {
      // This would integrate with commission service
      const { AppDataSource } = await import('../database/connection');
      const paymentCommissionRepository = AppDataSource.getRepository('PaymentCommission');
      const escrowSettlementRepository = AppDataSource.getRepository('EscrowSettlement');

      const [
        pendingCommissions,
        pendingSettlements,
        autoApprovalCommissions,
        manualReviewCommissions
      ] = await Promise.all([
        paymentCommissionRepository.count({ where: { status: 'pending' } }),
        escrowSettlementRepository.count({ where: { status: 'pending' } }),
        paymentCommissionRepository.count({ 
          where: { 
            status: 'pending',
            amount: { $lt: 1000 } // Auto-approval threshold
          } 
        }),
        paymentCommissionRepository.count({ 
          where: { 
            status: 'pending',
            amount: { $gte: 1000 } // Manual review threshold
          } 
        })
      ]);

      // Next processing date (next first of month)
      const nextProcessingDate = new Date();
      nextProcessingDate.setMonth(nextProcessingDate.getMonth() + 1);
      nextProcessingDate.setDate(1);
      nextProcessingDate.setHours(2, 0, 0, 0);

      return {
        pendingCommissions,
        pendingSettlements,
        autoApprovalQueue: autoApprovalCommissions,
        manualReviewQueue: manualReviewCommissions,
        nextProcessingDate
      };
    } catch (error) {
      logger.error('Error getting commission process workflow:', error);
      throw error;
    }
  }

  async updateInventoryStatus(inventoryId: string, newStatus: string): Promise<void> {
    try {
      const { AppDataSource } = await import('../database/connection');
      const inventoryRepository = AppDataSource.getRepository('Inventory');
      
      await inventoryRepository.update(inventoryId, {
        status: newStatus,
        updatedAt: new Date()
      });

      await analyticsCacheService.invalidateForDataChange('inventory', inventoryId);
      
      logger.info('Inventory status updated', { inventoryId, newStatus });
    } catch (error) {
      logger.error('Error updating inventory status:', error);
      throw error;
    }
  }

  private async executeWorkflowAction(action: WorkflowAction, entity: any): Promise<void> {
    try {
      switch (action.type) {
        case 'reserve_inventory':
          await this.executeReserveInventoryAction(action, entity);
          break;
        case 'send_confirmation_email':
          await this.executeSendEmailAction(action, entity);
          break;
        case 'send_tracking_info':
          await this.executeSendTrackingAction(action, entity);
          break;
        case 'release_escrow':
          await this.executeReleaseEscrowAction(action, entity);
          break;
        case 'process_final_commission':
          await this.executeProcessCommissionAction(action, entity);
          break;
        case 'restore_inventory':
          await this.executeRestoreInventoryAction(action, entity);
          break;
        case 'process_refund':
          await this.executeProcessRefundAction(action, entity);
          break;
        case 'adjust_commission':
          await this.executeAdjustCommissionAction(action, entity);
          break;
        default:
          logger.warn('Unknown workflow action type', { actionType: action.type });
      }
    } catch (error) {
      logger.error(`Error executing workflow action ${action.type}:`, error);
    }
  }

  private async executeReserveInventoryAction(action: WorkflowAction, order: Order): Promise<void> {
    if (order.items) {
      const items = order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      const reservationMinutes = action.parameters.reservationMinutes || 60;
      
      await inventoryService.reserveInventory(
        items,
        order.id,
        order.customerId,
        reservationMinutes
      );
    }
  }

  private async executeSendEmailAction(action: WorkflowAction, order: Order): Promise<void> {
    const { NotificationService } = await import('./notification.service');
    const notificationService = new NotificationService();

    await notificationService.sendNotification({
      type: 'email',
      recipients: [`customer:${order.customerId}`],
      template: action.parameters.template,
      data: order,
      priority: 'high',
      source: 'workflow'
    });
  }

  private async executeSendTrackingAction(action: WorkflowAction, order: Order): Promise<void> {
    const { NotificationService } = await import('./notification.service');
    const notificationService = new NotificationService();

    await notificationService.sendNotification({
      type: 'tracking',
      recipients: [`customer:${order.customerId}`],
      template: action.parameters.template,
      data: {
        ...order,
        trackingNumber: order.trackingNumber,
        carrierName: order.carrierName
      },
      priority: 'medium',
      source: 'workflow'
    });
  }

  private async executeReleaseEscrowAction(action: WorkflowAction, order: Order): Promise<void> {
    if (order.paymentKey) {
      await paymentSystemIntegration.processVendorSettlement(order.paymentKey, {
        totalAmount: order.totalAmount,
        confirmedAt: new Date()
      });
    }
  }

  private async executeProcessCommissionAction(action: WorkflowAction, order: Order): Promise<void> {
    if (order.paymentKey) {
      await paymentSystemIntegration.processCommissionForPayment(order.paymentKey, order);
    }
  }

  private async executeRestoreInventoryAction(action: WorkflowAction, order: Order): Promise<void> {
    if (order.items) {
      const items = order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      await inventoryService.restoreInventory(items);
    }
  }

  private async executeProcessRefundAction(action: WorkflowAction, order: Order): Promise<void> {
    // This would integrate with payment service for refund processing
    logger.info('Processing refund for order', { orderId: order.id, amount: order.totalAmount });
  }

  private async executeAdjustCommissionAction(action: WorkflowAction, order: Order): Promise<void> {
    if (order.paymentKey) {
      await paymentSystemIntegration.adjustCommissionForCancel(
        order.paymentKey,
        order.totalAmount
      );
    }
  }

  private async logWorkflowTransition(
    entityId: string,
    fromState: string,
    toState: string,
    triggeredBy: string,
    reason?: string
  ): Promise<void> {
    try {
      const transition = this.transitionRepository.create({
        entityType: 'order',
        entityId,
        fromState,
        toState,
        triggeredBy,
        reason,
        transitionedAt: new Date()
      });

      await this.transitionRepository.save(transition);
    } catch (error) {
      logger.error('Error logging workflow transition:', error);
    }
  }

  async getWorkflowStats(): Promise<{
    orderWorkflow: {
      totalTransitions: number;
      averageCompletionTime: number;
      stateDistribution: Record<string, number>;
      bottlenecks: Array<{ state: string; avgTimeInState: number }>;
    };
    inventoryWorkflow: {
      activeAlerts: number;
      autoResolvedAlerts: number;
      escalatedAlerts: number;
    };
    commissionWorkflow: {
      autoApprovedCount: number;
      manualReviewCount: number;
      averageProcessingTime: number;
    };
  }> {
    try {
      // Get order workflow stats
      const recentTransitions = await this.transitionRepository.find({
        where: {
          entityType: 'order',
          transitionedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        order: { transitionedAt: 'DESC' }
      });

      const stateDistribution: Record<string, number> = {};
      const orders = await this.orderRepository.find();
      
      orders.forEach(order => {
        stateDistribution[order.status] = (stateDistribution[order.status] || 0) + 1;
      });

      // Calculate average completion time
      const completedOrders = orders.filter(o => o.status === 'completed');
      const avgCompletionTime = completedOrders.length > 0
        ? completedOrders.reduce((sum, order) => {
            const startTime = order.createdAt.getTime();
            const endTime = order.updatedAt.getTime();
            return sum + (endTime - startTime);
          }, 0) / completedOrders.length
        : 0;

      // Identify bottlenecks (states with long average duration)
      const bottlenecks = this.orderWorkflow.states.map(state => {
        const stateTransitions = recentTransitions.filter(t => t.fromState === state.id);
        const avgTimeInState = stateTransitions.length > 0
          ? stateTransitions.reduce((sum, t) => sum + (t.transitionedAt.getTime() - t.createdAt.getTime()), 0) / stateTransitions.length
          : 0;
        
        return {
          state: state.id,
          avgTimeInState: Math.round(avgTimeInState / (1000 * 60 * 60)) // Convert to hours
        };
      }).filter(b => b.avgTimeInState > 24); // Only show states taking more than 24 hours

      return {
        orderWorkflow: {
          totalTransitions: recentTransitions.length,
          averageCompletionTime: Math.round(avgCompletionTime / (1000 * 60 * 60)), // Convert to hours
          stateDistribution,
          bottlenecks
        },
        inventoryWorkflow: {
          activeAlerts: 0, // Would be calculated from actual alert data
          autoResolvedAlerts: 0,
          escalatedAlerts: 0
        },
        commissionWorkflow: {
          autoApprovedCount: 0, // Would be calculated from commission data
          manualReviewCount: 0,
          averageProcessingTime: 0
        }
      };
    } catch (error) {
      logger.error('Error getting workflow stats:', error);
      throw error;
    }
  }

  async validateWorkflowTransition(
    entityType: string,
    fromState: string,
    toState: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      let workflow: WorkflowDefinition;
      
      switch (entityType) {
        case 'order':
          workflow = this.orderWorkflow;
          break;
        default:
          return { valid: false, reason: `Unsupported entity type: ${entityType}` };
      }

      const transition = workflow.transitions.find(t => 
        t.from === fromState && t.to === toState
      );

      if (!transition) {
        return { 
          valid: false, 
          reason: `No valid transition from ${fromState} to ${toState}` 
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating workflow transition:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  async getWorkflowDefinition(workflowName: string): Promise<WorkflowDefinition | null> {
    switch (workflowName) {
      case 'order':
        return this.orderWorkflow;
      default:
        return null;
    }
  }
}

export const workflowService = new WorkflowService();