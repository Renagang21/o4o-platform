import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Inventory } from '../../entities/inventory/Inventory';
import { StockMovement } from '../../entities/inventory/StockMovement';
import { ReorderRule } from '../../entities/inventory/ReorderRule';
import { InventoryAlert } from '../../entities/inventory/InventoryAlert';
import { VendorInfo } from '../../entities/VendorInfo';
import { AuthRequest } from '../../types/auth';
import { Between, LessThan, MoreThan, In, IsNull, Not } from 'typeorm';
import logger from '../../utils/logger';

export class InventoryController {
  private inventoryRepository = AppDataSource.getRepository(Inventory);
  private stockMovementRepository = AppDataSource.getRepository(StockMovement);
  private reorderRuleRepository = AppDataSource.getRepository(ReorderRule);
  private alertRepository = AppDataSource.getRepository(InventoryAlert);
  private vendorRepository = AppDataSource.getRepository(VendorInfo);

  // GET /api/inventory - Get inventory list with filtering
  getInventoryList = async (req: AuthRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        vendorId,
        status,
        warehouse,
        lowStock,
        expiringSoon,
        search,
        sortBy = 'productName',
        sortOrder = 'ASC',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const currentUser = req.user;

      const query = this.inventoryRepository.createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.vendor', 'vendor');

      // Apply vendor filter based on role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (vendor) {
          query.andWhere('inventory.vendorId = :vendorId', { vendorId: vendor.id });
        }
      } else if (vendorId) {
        query.andWhere('inventory.vendorId = :vendorId', { vendorId });
      }

      if (status) {
        query.andWhere('inventory.status = :status', { status });
      }

      if (warehouse) {
        query.andWhere('inventory.warehouse = :warehouse', { warehouse });
      }

      if (lowStock === 'true') {
        query.andWhere('inventory.quantity <= inventory.minQuantity');
      }

      if (expiringSoon === 'true') {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query.andWhere('inventory.expiryDate <= :date', { date: thirtyDaysFromNow });
      }

      if (search) {
        query.andWhere(
          '(inventory.productName LIKE :search OR inventory.sku LIKE :search)',
          { search: `%${search}%` }
        );
      }

      const total = await query.getCount();

      query
        .orderBy(`inventory.${sortBy}`, sortOrder as 'ASC' | 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const inventory = await query.getMany();

      // Calculate available quantity for each item
      inventory.forEach(item => {
        item.availableQuantity = item.quantity - item.reservedQuantity;
      });

      res.json({
        success: true,
        data: inventory,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory',
      });
    }
  };

  // POST /api/inventory/adjust - Adjust inventory quantity
  adjustInventory = async (req: AuthRequest, res: Response) => {
    try {
      const {
        inventoryId,
        adjustmentType,
        quantity,
        reason,
        notes,
        batchNumber,
        expiryDate,
      } = req.body;

      const currentUser = req.user;

      // Validate inventory exists and user has permission
      const inventory = await this.inventoryRepository.findOne({
        where: { id: inventoryId },
        relations: ['vendor'],
      });

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (!vendor || vendor.id !== inventory.vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only adjust your own inventory',
          });
        }
      }

      const quantityBefore = inventory.quantity;
      let quantityAfter = quantityBefore;

      // Apply adjustment based on type
      switch (adjustmentType) {
        case 'add':
          quantityAfter = quantityBefore + quantity;
          break;
        case 'subtract':
          quantityAfter = quantityBefore - quantity;
          break;
        case 'set':
          quantityAfter = quantity;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid adjustment type',
          });
      }

      if (quantityAfter < 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity cannot be negative',
        });
      }

      // Update inventory
      inventory.quantity = quantityAfter;
      inventory.lastAdjustedAt = new Date();
      
      if (batchNumber) inventory.batchNumber = batchNumber;
      if (expiryDate) inventory.expiryDate = expiryDate;

      // Update status based on quantity
      if (quantityAfter === 0) {
        inventory.status = 'out_of_stock';
      } else if (inventory.minQuantity && quantityAfter <= inventory.minQuantity) {
        inventory.status = 'low_stock';
      } else {
        inventory.status = 'in_stock';
      }

      // Calculate total value
      inventory.totalValue = inventory.unitCost * quantityAfter;
      inventory.availableQuantity = quantityAfter - inventory.reservedQuantity;

      await this.inventoryRepository.save(inventory);

      // Create stock movement record
      const movement = this.stockMovementRepository.create({
        inventoryId,
        movementType: 'adjustment',
        quantity: quantityAfter - quantityBefore,
        quantityBefore,
        quantityAfter,
        unitCost: inventory.unitCost,
        totalValue: Math.abs(quantityAfter - quantityBefore) * inventory.unitCost,
        reason,
        notes,
        batchNumber,
        expiryDate,
        userId: currentUser?.id,
        userName: currentUser?.name,
        status: 'completed',
      });

      await this.stockMovementRepository.save(movement);

      // Create alert if necessary
      if (inventory.status === 'out_of_stock') {
        await this.createInventoryAlert(inventory, 'out_of_stock', 'critical');
      } else if (inventory.status === 'low_stock') {
        await this.createInventoryAlert(inventory, 'low_stock', 'high');
      }

      res.json({
        success: true,
        data: inventory,
        movement,
        message: 'Inventory adjusted successfully',
      });
    } catch (error) {
      logger.error('Error adjusting inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to adjust inventory',
      });
    }
  };

  // GET /api/inventory/alerts - Get inventory alerts
  getInventoryAlerts = async (req: AuthRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'active',
        severity,
        alertType,
        vendorId,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const currentUser = req.user;

      const query = this.alertRepository.createQueryBuilder('alert')
        .leftJoinAndSelect('alert.inventory', 'inventory')
        .leftJoinAndSelect('inventory.vendor', 'vendor');

      // Apply vendor filter based on role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (vendor) {
          query.andWhere('inventory.vendorId = :vendorId', { vendorId: vendor.id });
        }
      } else if (vendorId) {
        query.andWhere('inventory.vendorId = :vendorId', { vendorId });
      }

      if (status) {
        query.andWhere('alert.status = :status', { status });
      }

      if (severity) {
        query.andWhere('alert.severity = :severity', { severity });
      }

      if (alertType) {
        query.andWhere('alert.alertType = :alertType', { alertType });
      }

      const total = await query.getCount();

      query
        .orderBy('alert.createdAt', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const alerts = await query.getMany();

      res.json({
        success: true,
        data: alerts,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching inventory alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory alerts',
      });
    }
  };

  // POST /api/inventory/alerts/:id/acknowledge - Acknowledge an alert
  acknowledgeAlert = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const currentUser = req.user;

      const alert = await this.alertRepository.findOne({
        where: { id },
        relations: ['inventory', 'inventory.vendor'],
      });

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Alert not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (!vendor || vendor.id !== alert.inventory.vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only acknowledge alerts for your own inventory',
          });
        }
      }

      alert.status = 'acknowledged';
      alert.isRead = true;
      alert.acknowledgedBy = currentUser?.name || 'System';
      alert.acknowledgedAt = new Date();
      alert.acknowledgmentNotes = notes;

      await this.alertRepository.save(alert);

      res.json({
        success: true,
        data: alert,
        message: 'Alert acknowledged successfully',
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alert',
      });
    }
  };

  // GET /api/inventory/:id/movements - Get stock movement history
  getStockMovements = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        movementType,
        startDate,
        endDate,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const currentUser = req.user;

      // Validate inventory exists and user has permission
      const inventory = await this.inventoryRepository.findOne({
        where: { id },
        relations: ['vendor'],
      });

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (!vendor || vendor.id !== inventory.vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only view movements for your own inventory',
          });
        }
      }

      const query = this.stockMovementRepository.createQueryBuilder('movement')
        .where('movement.inventoryId = :inventoryId', { inventoryId: id });

      if (movementType) {
        query.andWhere('movement.movementType = :movementType', { movementType });
      }

      if (startDate && endDate) {
        query.andWhere('movement.createdAt BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        });
      }

      const total = await query.getCount();

      query
        .orderBy('movement.createdAt', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const movements = await query.getMany();

      res.json({
        success: true,
        data: movements,
        inventory,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching stock movements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock movements',
      });
    }
  };

  // GET /api/inventory/:id/forecast - Get inventory forecast
  getInventoryForecast = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;
      const forecastDays = parseInt(days as string);
      const currentUser = req.user;

      // Validate inventory exists and user has permission
      const inventory = await this.inventoryRepository.findOne({
        where: { id },
        relations: ['vendor'],
      });

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory item not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (!vendor || vendor.id !== inventory.vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only view forecast for your own inventory',
          });
        }
      }

      // Get historical sales data (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const salesMovements = await this.stockMovementRepository.find({
        where: {
          inventoryId: id,
          movementType: 'sale',
          createdAt: MoreThan(thirtyDaysAgo),
        },
        order: { createdAt: 'DESC' },
      });

      // Calculate average daily sales
      const totalSales = salesMovements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
      const avgDailySales = totalSales / 30;

      // Simple forecast calculation
      const forecast = {
        currentStock: inventory.quantity,
        availableStock: inventory.availableQuantity,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        avgWeeklySales: Math.round(avgDailySales * 7 * 100) / 100,
        avgMonthlySales: Math.round(avgDailySales * 30 * 100) / 100,
        daysOfStockRemaining: avgDailySales > 0 
          ? Math.floor(inventory.availableQuantity / avgDailySales)
          : 999,
        projectedStockout: avgDailySales > 0
          ? new Date(Date.now() + (inventory.availableQuantity / avgDailySales) * 24 * 60 * 60 * 1000)
          : null,
        recommendedReorderQuantity: Math.max(
          (avgDailySales * forecastDays * 1.2) - inventory.availableQuantity,
          0
        ),
        recommendedReorderDate: avgDailySales > 0 && inventory.reorderPoint
          ? new Date(Date.now() + ((inventory.availableQuantity - inventory.reorderPoint) / avgDailySales) * 24 * 60 * 60 * 1000)
          : null,
        forecastPeriod: forecastDays,
        projectedDemand: Math.round(avgDailySales * forecastDays),
        safetyStock: Math.round(avgDailySales * 7), // 1 week safety stock
        historicalData: {
          period: '30 days',
          totalSales,
          transactionCount: salesMovements.length,
          maxDailySales: Math.max(...salesMovements.map(m => Math.abs(m.quantity))),
          minDailySales: Math.min(...salesMovements.map(m => Math.abs(m.quantity))),
        },
      };

      res.json({
        success: true,
        data: forecast,
        inventory,
      });
    } catch (error) {
      logger.error('Error generating inventory forecast:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate inventory forecast',
      });
    }
  };

  // GET /api/inventory/reorder/settings - Get reorder settings
  getReorderSettings = async (req: AuthRequest, res: Response) => {
    try {
      const { vendorId } = req.query;
      const currentUser = req.user;

      const query = this.reorderRuleRepository.createQueryBuilder('rule')
        .leftJoinAndSelect('rule.inventory', 'inventory')
        .leftJoinAndSelect('inventory.vendor', 'vendor');

      // Apply vendor filter based on role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (vendor) {
          query.andWhere('inventory.vendorId = :vendorId', { vendorId: vendor.id });
        }
      } else if (vendorId) {
        query.andWhere('inventory.vendorId = :vendorId', { vendorId });
      }

      const rules = await query.getMany();

      // Group by settings type
      const settings = {
        automaticReordering: rules.filter(r => r.autoCreatePurchaseOrder).length > 0,
        defaultLeadTime: Math.round(
          rules.reduce((sum, r) => sum + (r.leadTimeDays || 0), 0) / (rules.length || 1)
        ),
        defaultSafetyStock: Math.round(
          rules.reduce((sum, r) => sum + (r.safetyStockDays || 0), 0) / (rules.length || 1)
        ),
        notificationSettings: {
          onTrigger: rules.filter(r => r.notifyOnTrigger).length > 0,
          onOrder: rules.filter(r => r.notifyOnOrder).length > 0,
          onDelivery: rules.filter(r => r.notifyOnDelivery).length > 0,
        },
        totalRules: rules.length,
        activeRules: rules.filter(r => r.isActive).length,
        rules: rules.map(r => ({
          id: r.id,
          inventoryId: r.inventoryId,
          productName: r.inventory?.productName,
          sku: r.inventory?.sku,
          isActive: r.isActive,
          triggerType: r.triggerType,
          reorderPoint: r.reorderPoint,
          reorderQuantity: r.reorderQuantity,
          leadTimeDays: r.leadTimeDays,
        })),
      };

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error('Error fetching reorder settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reorder settings',
      });
    }
  };

  // PUT /api/inventory/reorder/settings - Update reorder settings
  updateReorderSettings = async (req: AuthRequest, res: Response) => {
    try {
      const {
        automaticReordering,
        defaultLeadTime,
        defaultSafetyStock,
        notificationSettings,
      } = req.body;
      const currentUser = req.user;

      // This would update global settings - for now, return success
      // In production, you'd store these in a settings table

      res.json({
        success: true,
        message: 'Reorder settings updated successfully',
        data: {
          automaticReordering,
          defaultLeadTime,
          defaultSafetyStock,
          notificationSettings,
        },
      });
    } catch (error) {
      logger.error('Error updating reorder settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reorder settings',
      });
    }
  };

  // GET /api/inventory/reorder/rules - Get reorder rules
  getReorderRules = async (req: AuthRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        isActive,
        triggerType,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const currentUser = req.user;

      const query = this.reorderRuleRepository.createQueryBuilder('rule')
        .leftJoinAndSelect('rule.inventory', 'inventory')
        .leftJoinAndSelect('inventory.vendor', 'vendor');

      // Apply vendor filter based on role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (vendor) {
          query.andWhere('inventory.vendorId = :vendorId', { vendorId: vendor.id });
        }
      }

      if (isActive !== undefined) {
        query.andWhere('rule.isActive = :isActive', { isActive: isActive === 'true' });
      }

      if (triggerType) {
        query.andWhere('rule.triggerType = :triggerType', { triggerType });
      }

      const total = await query.getCount();

      query
        .orderBy('rule.createdAt', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const rules = await query.getMany();

      res.json({
        success: true,
        data: rules,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching reorder rules:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reorder rules',
      });
    }
  };

  // PUT /api/inventory/reorder/rules/:id - Update reorder rule
  updateReorderRule = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const currentUser = req.user;

      const rule = await this.reorderRuleRepository.findOne({
        where: { id },
        relations: ['inventory', 'inventory.vendor'],
      });

      if (!rule) {
        return res.status(404).json({
          success: false,
          message: 'Reorder rule not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (!vendor || vendor.id !== rule.inventory.vendorId) {
          return res.status(403).json({
            success: false,
            message: 'You can only update reorder rules for your own inventory',
          });
        }
      }

      Object.assign(rule, updateData);
      await this.reorderRuleRepository.save(rule);

      res.json({
        success: true,
        data: rule,
        message: 'Reorder rule updated successfully',
      });
    } catch (error) {
      logger.error('Error updating reorder rule:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reorder rule',
      });
    }
  };

  // GET /api/inventory/dead-stock - Get dead stock items
  getDeadStock = async (req: AuthRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        daysThreshold = 90, // Items not sold in X days
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const threshold = parseInt(daysThreshold as string);
      const currentUser = req.user;

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - threshold);

      const query = this.inventoryRepository.createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.vendor', 'vendor')
        .where('inventory.quantity > 0')
        .andWhere('(inventory.lastSoldAt IS NULL OR inventory.lastSoldAt < :thresholdDate)', {
          thresholdDate,
        });

      // Apply vendor filter based on role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (vendor) {
          query.andWhere('inventory.vendorId = :vendorId', { vendorId: vendor.id });
        }
      }

      const total = await query.getCount();

      query
        .orderBy('inventory.totalValue', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const deadStock = await query.getMany();

      // Calculate metrics
      const totalValue = deadStock.reduce((sum, item) => sum + parseFloat(item.totalValue.toString()), 0);
      const totalItems = deadStock.reduce((sum, item) => sum + item.quantity, 0);

      res.json({
        success: true,
        data: deadStock,
        metrics: {
          totalValue,
          totalItems,
          averageAge: threshold,
          itemCount: deadStock.length,
        },
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching dead stock:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch dead stock',
      });
    }
  };

  // GET /api/inventory/value - Get total inventory value
  getInventoryValue = async (req: AuthRequest, res: Response) => {
    try {
      const { vendorId, warehouse, category } = req.query;
      const currentUser = req.user;

      const query = this.inventoryRepository.createQueryBuilder('inventory')
        .leftJoinAndSelect('inventory.vendor', 'vendor');

      // Apply vendor filter based on role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (vendor) {
          query.andWhere('inventory.vendorId = :vendorId', { vendorId: vendor.id });
        }
      } else if (vendorId) {
        query.andWhere('inventory.vendorId = :vendorId', { vendorId });
      }

      if (warehouse) {
        query.andWhere('inventory.warehouse = :warehouse', { warehouse });
      }

      if (category) {
        query.andWhere('inventory.productCategory = :category', { category });
      }

      const inventory = await query.getMany();

      // Calculate value metrics
      const totalValue = inventory.reduce((sum, item) => sum + parseFloat(item.totalValue.toString()), 0);
      const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
      const totalSKUs = inventory.length;
      
      // Group by status
      const byStatus = {
        in_stock: inventory.filter(i => i.status === 'in_stock').reduce((sum, i) => sum + parseFloat(i.totalValue.toString()), 0),
        low_stock: inventory.filter(i => i.status === 'low_stock').reduce((sum, i) => sum + parseFloat(i.totalValue.toString()), 0),
        out_of_stock: inventory.filter(i => i.status === 'out_of_stock').reduce((sum, i) => sum + parseFloat(i.totalValue.toString()), 0),
      };

      // Group by category
      const byCategory: Record<string, number> = {};
      inventory.forEach(item => {
        const cat = item.productCategory || 'Uncategorized';
        byCategory[cat] = (byCategory[cat] || 0) + parseFloat(item.totalValue.toString());
      });

      // Top valuable items
      const topItems = [...inventory]
        .sort((a, b) => parseFloat(b.totalValue.toString()) - parseFloat(a.totalValue.toString()))
        .slice(0, 10)
        .map(i => ({
          id: i.id,
          sku: i.sku,
          productName: i.productName,
          quantity: i.quantity,
          unitCost: i.unitCost,
          totalValue: i.totalValue,
        }));

      res.json({
        success: true,
        data: {
          totalValue,
          totalItems,
          totalSKUs,
          averageValue: totalSKUs > 0 ? totalValue / totalSKUs : 0,
          byStatus,
          byCategory,
          topItems,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error calculating inventory value:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate inventory value',
      });
    }
  };

  // Helper method to create inventory alerts
  private async createInventoryAlert(
    inventory: Inventory,
    alertType: string,
    severity: string
  ) {
    try {
      const existingAlert = await this.alertRepository.findOne({
        where: {
          inventoryId: inventory.id,
          alertType,
          status: 'active',
        },
      });

      if (existingAlert) {
        // Update existing alert
        existingAlert.occurrenceCount++;
        existingAlert.lastOccurredAt = new Date();
        await this.alertRepository.save(existingAlert);
        return existingAlert;
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
        context: {
          vendorId: inventory.vendorId,
          productId: inventory.productId,
          productName: inventory.productName,
          sku: inventory.sku,
          warehouse: inventory.warehouse,
          location: inventory.location,
        },
      });

      await this.alertRepository.save(alert);
      return alert;
    } catch (error) {
      logger.error('Error creating inventory alert:', error);
    }
  }

  private getAlertTitle(alertType: string, inventory: Inventory): string {
    const titles: Record<string, string> = {
      out_of_stock: `Out of Stock: ${inventory.productName}`,
      low_stock: `Low Stock Alert: ${inventory.productName}`,
      expiry_warning: `Expiry Warning: ${inventory.productName}`,
      reorder_point: `Reorder Point Reached: ${inventory.productName}`,
      overstock: `Overstock Alert: ${inventory.productName}`,
    };
    return titles[alertType] || `Inventory Alert: ${inventory.productName}`;
  }

  private getAlertMessage(alertType: string, inventory: Inventory): string {
    const messages: Record<string, string> = {
      out_of_stock: `Product ${inventory.sku} is completely out of stock. Immediate reorder required.`,
      low_stock: `Product ${inventory.sku} has only ${inventory.quantity} units remaining, below minimum of ${inventory.minQuantity}.`,
      expiry_warning: `Product ${inventory.sku} will expire soon. Take action to prevent waste.`,
      reorder_point: `Product ${inventory.sku} has reached its reorder point of ${inventory.reorderPoint} units.`,
      overstock: `Product ${inventory.sku} is overstocked with ${inventory.quantity} units, above maximum of ${inventory.maxQuantity}.`,
    };
    return messages[alertType] || `Inventory alert for product ${inventory.sku}.`;
  }

  private getRecommendedAction(alertType: string, inventory: Inventory): string {
    const actions: Record<string, string> = {
      out_of_stock: `Create urgent purchase order for ${inventory.reorderQuantity || 100} units.`,
      low_stock: `Consider reordering ${inventory.reorderQuantity || 50} units to maintain stock levels.`,
      expiry_warning: 'Promote product with discounts or transfer to high-turnover location.',
      reorder_point: `Place standard order for ${inventory.reorderQuantity || 50} units.`,
      overstock: 'Consider promotions, bundle deals, or inventory transfer to reduce excess stock.',
    };
    return actions[alertType] || 'Review inventory levels and take appropriate action.';
  }
}