// @ts-nocheck
import * as cron from 'node-cron';
import { AppDataSource } from '../database/connection';
import { Inventory } from '../entities/inventory/Inventory';
import { InventoryAlert } from '../entities/inventory/InventoryAlert';
import { ReorderRule } from '../entities/inventory/ReorderRule';
import { StockMovement } from '../entities/inventory/StockMovement';
import { LessThan, IsNull, Not, MoreThan } from 'typeorm';
import logger from '../utils/logger';
import { emailService } from '../services/email.service';

class InventoryScheduler {
  private inventoryRepository = AppDataSource.getRepository(Inventory);
  private alertRepository = AppDataSource.getRepository(InventoryAlert);
  private reorderRuleRepository = AppDataSource.getRepository(ReorderRule);
  private stockMovementRepository = AppDataSource.getRepository(StockMovement);

  // Check inventory levels every hour
  async checkInventoryLevels() {
    try {
      logger.info('Starting inventory level check...');

      const inventoryItems = await this.inventoryRepository.find({
        relations: ['vendor'],
      });

      for (const item of inventoryItems) {
        // Check for out of stock
        if (item.quantity === 0 && item.status !== 'out_of_stock') {
          item.status = 'out_of_stock';
          await this.inventoryRepository.save(item);
          await this.createAlert(item, 'out_of_stock', 'critical');
        }

        // Check for low stock
        if (item.minQuantity && item.quantity <= item.minQuantity && item.quantity > 0) {
          if (item.status !== 'low_stock') {
            item.status = 'low_stock';
            await this.inventoryRepository.save(item);
            await this.createAlert(item, 'low_stock', 'high');
          }
        }

        // Check for overstock
        if (item.maxQuantity && item.quantity > item.maxQuantity) {
          await this.createAlert(item, 'overstock', 'medium');
        }

        // Check for expiry
        if (item.expiryDate) {
          const daysUntilExpiry = Math.floor(
            (item.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry <= 0) {
            await this.createAlert(item, 'expired', 'critical');
          } else if (daysUntilExpiry <= 30) {
            await this.createAlert(item, 'expiry_warning', 'high');
          }
        }

        // Update availability
        item.availableQuantity = item.quantity - item.reservedQuantity;
        await this.inventoryRepository.save(item);
      }

      logger.info(`Inventory level check completed. Checked ${inventoryItems.length} items.`);
    } catch (error) {
      logger.error('Error checking inventory levels:', error);
    }
  }

  // Check reorder rules every 2 hours
  async checkReorderRules() {
    try {
      logger.info('Starting reorder rules check...');

      const activeRules = await this.reorderRuleRepository.find({
        where: { isActive: true },
        relations: ['inventory'],
      });

      for (const rule of activeRules) {
        const inventory = rule.inventory;
        
        if (!inventory) continue;

        let shouldTrigger = false;
        let triggerReason = '';

        switch (rule.triggerType) {
          case 'min_quantity':
            if (rule.reorderPoint && inventory.quantity <= rule.reorderPoint) {
              shouldTrigger = true;
              triggerReason = `Quantity (${inventory.quantity}) reached reorder point (${rule.reorderPoint})`;
            }
            break;

          case 'forecast':
            // Simple forecast-based triggering
            const avgDailySales = inventory.dailyAvgSales || 0;
            const daysOfStock = avgDailySales > 0 
              ? inventory.availableQuantity / avgDailySales
              : 999;
            
            if (rule.forecastDays && daysOfStock <= rule.forecastDays) {
              shouldTrigger = true;
              triggerReason = `Forecast shows only ${Math.floor(daysOfStock)} days of stock remaining`;
            }
            break;

          case 'fixed_schedule':
            // Check if it's time for scheduled reorder
            if (rule.nextScheduledReorder && new Date() >= rule.nextScheduledReorder) {
              shouldTrigger = true;
              triggerReason = 'Scheduled reorder time reached';
              
              // Calculate next schedule
              rule.nextScheduledReorder = this.calculateNextScheduledDate(rule);
              await this.reorderRuleRepository.save(rule);
            }
            break;
        }

        if (shouldTrigger) {
          await this.triggerReorder(rule, inventory, triggerReason);
        }
      }

      logger.info(`Reorder rules check completed. Checked ${activeRules.length} rules.`);
    } catch (error) {
      logger.error('Error checking reorder rules:', error);
    }
  }

  // Calculate inventory analytics daily
  async calculateInventoryAnalytics() {
    try {
      logger.info('Starting inventory analytics calculation...');

      const inventoryItems = await this.inventoryRepository.find();

      for (const item of inventoryItems) {
        // Get sales data for different periods
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Daily sales
        const dailySales = await this.stockMovementRepository
          .createQueryBuilder('movement')
          .where('movement.inventoryId = :id', { id: item.id })
          .andWhere('movement.movementType = :type', { type: 'sale' })
          .andWhere('movement.createdAt >= :date', { date: oneDayAgo })
          .select('SUM(ABS(movement.quantity))', 'total')
          .getRawOne();

        item.dailyAvgSales = parseFloat(dailySales?.total || 0);

        // Weekly sales
        const weeklySales = await this.stockMovementRepository
          .createQueryBuilder('movement')
          .where('movement.inventoryId = :id', { id: item.id })
          .andWhere('movement.movementType = :type', { type: 'sale' })
          .andWhere('movement.createdAt >= :date', { date: oneWeekAgo })
          .select('SUM(ABS(movement.quantity))', 'total')
          .getRawOne();

        item.weeklyAvgSales = parseFloat(weeklySales?.total || 0) / 7;

        // Monthly sales
        const monthlySales = await this.stockMovementRepository
          .createQueryBuilder('movement')
          .where('movement.inventoryId = :id', { id: item.id })
          .andWhere('movement.movementType = :type', { type: 'sale' })
          .andWhere('movement.createdAt >= :date', { date: oneMonthAgo })
          .select('SUM(ABS(movement.quantity))', 'total')
          .getRawOne();

        item.monthlyAvgSales = parseFloat(monthlySales?.total || 0) / 30;

        // Calculate turnover rate (annual)
        if (item.quantity > 0 && item.monthlyAvgSales > 0) {
          item.turnoverRate = (item.monthlyAvgSales * 12) / item.quantity;
        } else {
          item.turnoverRate = 0;
        }

        // Calculate days of stock
        if (item.dailyAvgSales > 0) {
          item.daysOfStock = Math.floor(item.availableQuantity / item.dailyAvgSales);
        } else {
          item.daysOfStock = 999;
        }

        await this.inventoryRepository.save(item);
      }

      logger.info(`Inventory analytics calculation completed for ${inventoryItems.length} items.`);
    } catch (error) {
      logger.error('Error calculating inventory analytics:', error);
    }
  }

  // Identify dead stock weekly
  async identifyDeadStock() {
    try {
      logger.info('Starting dead stock identification...');

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const deadStockItems = await this.inventoryRepository.find({
        where: [
          { lastSoldAt: LessThan(ninetyDaysAgo), quantity: MoreThan(0) },
          { lastSoldAt: IsNull(), quantity: MoreThan(0) },
        ],
      });

      for (const item of deadStockItems) {
        await this.createAlert(item, 'dead_stock', 'medium');
      }

      logger.info(`Dead stock identification completed. Found ${deadStockItems.length} items.`);
    } catch (error) {
      logger.error('Error identifying dead stock:', error);
    }
  }

  // Auto-resolve old alerts
  async autoResolveAlerts() {
    try {
      logger.info('Starting auto-resolve alerts check...');

      const alerts = await this.alertRepository.find({
        where: {
          status: 'active',
          autoResolve: true,
          scheduledResolveAt: LessThan(new Date()),
        },
      });

      for (const alert of alerts) {
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        alert.resolutionNotes = 'Auto-resolved after scheduled time';
        await this.alertRepository.save(alert);
      }

      logger.info(`Auto-resolved ${alerts.length} alerts.`);
    } catch (error) {
      logger.error('Error auto-resolving alerts:', error);
    }
  }

  // Helper: Create inventory alert
  private async createAlert(
    inventory: Inventory,
    alertType: string,
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  ) {
    try {
      // Check if similar active alert exists
      const existingAlert = await this.alertRepository.findOne({
        where: {
          inventoryId: inventory.id,
          alertType,
          status: 'active',
        },
      });

      if (existingAlert) {
        // Update occurrence count
        existingAlert.occurrenceCount++;
        existingAlert.lastOccurredAt = new Date();
        await this.alertRepository.save(existingAlert);
        return;
      }

      // Create new alert
      const alert = this.alertRepository.create({
        inventoryId: inventory.id,
        alertType,
        severity,
        title: this.getAlertTitle(alertType, inventory),
        message: this.getAlertMessage(alertType, inventory),
        currentQuantity: inventory.quantity,
        thresholdQuantity: inventory.minQuantity,
        recommendedAction: this.getRecommendedAction(alertType, inventory),
        status: 'active',
        daysUntilExpiry: inventory.expiryDate
          ? Math.floor((inventory.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        context: {
          vendorId: inventory.vendorId,
          productName: inventory.productName,
          sku: inventory.sku,
          warehouse: inventory.warehouse,
        },
      });

      await this.alertRepository.save(alert);

      // Send email notification for critical alerts
      if (severity === 'critical' || severity === 'high') {
        await this.sendAlertNotification(alert, inventory);
      }
    } catch (error) {
      logger.error('Error creating alert:', error);
    }
  }

  // Helper: Trigger reorder
  private async triggerReorder(rule: ReorderRule, inventory: Inventory, reason: string) {
    try {
      // Update rule statistics
      rule.timesTriggered++;
      rule.lastTriggeredAt = new Date();
      await this.reorderRuleRepository.save(rule);

      // Create reorder alert
      await this.createAlert(inventory, 'reorder_point', 'high');

      // Log the trigger
      logger.info(`Reorder triggered for ${inventory.sku}: ${reason}`);

      // Send notification if enabled
      if (rule.notifyOnTrigger && rule.notificationEmails) {
        const emails = Array.isArray(rule.notificationEmails) 
          ? rule.notificationEmails 
          : rule.notificationEmails.split(',').map(e => e.trim());
        for (const email of emails) {
          await emailService.sendEmail({
            to: email,
            subject: `Reorder Alert: ${inventory.productName}`,
            html: `
              <h2>Reorder Alert</h2>
              <p>Product: ${inventory.productName} (${inventory.sku})</p>
              <p>Current Quantity: ${inventory.quantity}</p>
              <p>Reorder Point: ${rule.reorderPoint}</p>
              <p>Recommended Order Quantity: ${rule.reorderQuantity}</p>
              <p>Reason: ${reason}</p>
            `,
          });
        }
      }

      // Auto-create purchase order if enabled
      if (rule.autoCreatePurchaseOrder) {
        // This would integrate with purchase order system
        logger.info(`Auto-creating purchase order for ${inventory.sku}`);
      }
    } catch (error) {
      logger.error('Error triggering reorder:', error);
    }
  }

  // Helper: Send alert notification
  private async sendAlertNotification(alert: InventoryAlert, inventory: Inventory) {
    try {
      // Get vendor email
      const vendor = await this.inventoryRepository
        .createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.vendor', 'vendor')
        .leftJoinAndSelect('vendor.user', 'user')
        .where('inventory.id = :id', { id: inventory.id })
        .getOne();

      if (vendor?.vendor?.user?.email) {
        await emailService.sendEmail({
          to: vendor.vendor.user.email,
          subject: `Inventory Alert: ${alert.title}`,
          html: `
            <h2>${alert.title}</h2>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Product:</strong> ${inventory.productName} (${inventory.sku})</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Current Quantity:</strong> ${inventory.quantity}</p>
            <p><strong>Recommended Action:</strong> ${alert.recommendedAction}</p>
            <hr>
            <p>Please log in to your dashboard to manage this alert.</p>
          `,
        });

        alert.isNotified = true;
        alert.notifiedAt = new Date();
        alert.notifiedEmails = [vendor.vendor.user.email];
        await this.alertRepository.save(alert);
      }
    } catch (error) {
      logger.error('Error sending alert notification:', error);
    }
  }

  // Helper: Calculate next scheduled date
  private calculateNextScheduledDate(rule: ReorderRule): Date {
    const now = new Date();
    let next = new Date(now);

    switch (rule.scheduleFrequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
    }

    // Set specific time if provided
    if (rule.scheduleTime) {
      const [hours, minutes] = rule.scheduleTime.split(':');
      next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    }

    return next;
  }

  // Helper methods for alert messages
  private getAlertTitle(alertType: string, inventory: Inventory): string {
    const titles: Record<string, string> = {
      out_of_stock: `Out of Stock: ${inventory.productName}`,
      low_stock: `Low Stock Alert: ${inventory.productName}`,
      expiry_warning: `Expiry Warning: ${inventory.productName}`,
      expired: `Product Expired: ${inventory.productName}`,
      reorder_point: `Reorder Point Reached: ${inventory.productName}`,
      overstock: `Overstock Alert: ${inventory.productName}`,
      dead_stock: `Dead Stock Identified: ${inventory.productName}`,
    };
    return titles[alertType] || `Inventory Alert: ${inventory.productName}`;
  }

  private getAlertMessage(alertType: string, inventory: Inventory): string {
    const messages: Record<string, string> = {
      out_of_stock: `Product ${inventory.sku} is completely out of stock.`,
      low_stock: `Product ${inventory.sku} has only ${inventory.quantity} units remaining.`,
      expiry_warning: `Product ${inventory.sku} will expire soon.`,
      expired: `Product ${inventory.sku} has expired and should be removed.`,
      reorder_point: `Product ${inventory.sku} has reached its reorder point.`,
      overstock: `Product ${inventory.sku} is overstocked with ${inventory.quantity} units.`,
      dead_stock: `Product ${inventory.sku} has not sold in over 90 days.`,
    };
    return messages[alertType] || `Inventory alert for product ${inventory.sku}.`;
  }

  private getRecommendedAction(alertType: string, inventory: Inventory): string {
    const actions: Record<string, string> = {
      out_of_stock: 'Create urgent purchase order immediately.',
      low_stock: 'Consider reordering to maintain stock levels.',
      expiry_warning: 'Promote product or transfer to high-turnover location.',
      expired: 'Remove from inventory and dispose properly.',
      reorder_point: 'Place standard reorder with supplier.',
      overstock: 'Consider promotions or inventory transfer.',
      dead_stock: 'Review pricing or consider liquidation.',
    };
    return actions[alertType] || 'Review inventory and take appropriate action.';
  }
}

export function startInventorySchedules() {
  const scheduler = new InventoryScheduler();

  // Check inventory levels every hour
  cron.schedule('0 * * * *', async () => {
    await scheduler.checkInventoryLevels();
  });

  // Check reorder rules every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    await scheduler.checkReorderRules();
  });

  // Calculate analytics daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    await scheduler.calculateInventoryAnalytics();
  });

  // Identify dead stock weekly on Sundays at 3 AM
  cron.schedule('0 3 * * 0', async () => {
    await scheduler.identifyDeadStock();
  });

  // Auto-resolve alerts every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    await scheduler.autoResolveAlerts();
  });

  logger.info('Inventory schedules started successfully');
}