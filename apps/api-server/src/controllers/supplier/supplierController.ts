import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Supplier } from '../../entities/Supplier';
import { SupplierProduct } from '../../entities/SupplierProduct';
import { VendorInfo } from '../../entities/VendorInfo';
import { Inventory } from '../../entities/inventory/Inventory';
import { StockMovement } from '../../entities/inventory/StockMovement';
import { AuthRequest } from '../../types/auth';
import { In, Like, Between, IsNull, Not } from 'typeorm';
import logger from '../../utils/logger';
import { emailService } from '../../services/email.service';

export class SupplierController {
  private supplierRepository = AppDataSource.getRepository(Supplier);
  private supplierProductRepository = AppDataSource.getRepository(SupplierProduct);
  private vendorRepository = AppDataSource.getRepository(VendorInfo);
  private inventoryRepository = AppDataSource.getRepository(Inventory);
  private stockMovementRepository = AppDataSource.getRepository(StockMovement);

  // GET /api/suppliers - Get all suppliers with filtering
  getAllSuppliers = async (req: AuthRequest, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        supplierType,
        search,
        sortBy = 'companyName',
        sortOrder = 'ASC',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const currentUser = req.user;

      const query = this.supplierRepository.createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.vendors', 'vendors');

      // Apply filters based on user role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        if (vendor) {
          query.andWhere('vendors.id = :vendorId', { vendorId: vendor.id });
        }
      }

      if (status) {
        query.andWhere('supplier.status = :status', { status });
      }

      if (supplierType) {
        query.andWhere('supplier.supplierType = :supplierType', { supplierType });
      }

      if (search) {
        query.andWhere(
          '(supplier.companyName LIKE :search OR supplier.contactEmail LIKE :search)',
          { search: `%${search}%` }
        );
      }

      const total = await query.getCount();

      query
        .orderBy(`supplier.${sortBy}`, sortOrder as 'ASC' | 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const suppliers = await query.getMany();

      res.json({
        success: true,
        data: suppliers,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching suppliers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch suppliers',
      });
    }
  };

  // GET /api/suppliers/:id - Get supplier details
  getSupplierById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      const supplier = await this.supplierRepository.findOne({
        where: { id },
        relations: ['vendors', 'products'],
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Check permissions for vendor role
      if (currentUser?.role === 'vendor') {
        const vendor = await this.vendorRepository.findOne({
          where: { userId: currentUser.id }
        });
        const hasAccess = supplier.vendors.some(v => v.id === vendor?.id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: 'You do not have access to this supplier',
          });
        }
      }

      res.json({
        success: true,
        data: supplier,
      });
    } catch (error) {
      logger.error('Error fetching supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier',
      });
    }
  };

  // POST /api/suppliers - Create new supplier
  createSupplier = async (req: AuthRequest, res: Response) => {
    try {
      const supplierData = req.body;
      const currentUser = req.user;

      // Only admin and manager can create suppliers
      if (!['admin', 'manager'].includes(currentUser?.role || '')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create supplier',
        });
      }

      // Check if supplier with same email exists
      const existingSupplier = await this.supplierRepository.findOne({
        where: { contactEmail: supplierData.contactEmail }
      });

      if (existingSupplier) {
        return res.status(409).json({
          success: false,
          message: 'Supplier with this email already exists',
        });
      }

      const supplier = this.supplierRepository.create({
        ...supplierData,
        status: 'pending',
        totalOrders: 0,
        totalOrderValue: 0,
        totalProducts: 0,
        activeProducts: 0,
      });

      const savedSupplier = await this.supplierRepository.save(supplier);

      // Send welcome email to supplier
      await this.sendSupplierWelcomeEmail(savedSupplier);

      res.status(201).json({
        success: true,
        data: savedSupplier,
        message: 'Supplier created successfully',
      });
    } catch (error) {
      logger.error('Error creating supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create supplier',
      });
    }
  };

  // PUT /api/suppliers/:id - Update supplier information
  updateSupplier = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const currentUser = req.user;

      const supplier = await this.supplierRepository.findOne({
        where: { id },
        relations: ['vendors'],
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Check permissions
      if (currentUser?.role === 'supplier') {
        // Suppliers can only update limited fields
        const allowedFields = ['contactName', 'contactEmail', 'contactPhone', 'address', 'notes'];
        Object.keys(updateData).forEach(key => {
          if (!allowedFields.includes(key)) {
            delete updateData[key];
          }
        });
      } else if (!['admin', 'manager'].includes(currentUser?.role || '')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update supplier',
        });
      }

      Object.assign(supplier, updateData);
      const updatedSupplier = await this.supplierRepository.save(supplier);

      res.json({
        success: true,
        data: updatedSupplier,
        message: 'Supplier updated successfully',
      });
    } catch (error) {
      logger.error('Error updating supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update supplier',
      });
    }
  };

  // DELETE /api/suppliers/:id - Delete supplier
  deleteSupplier = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Only admin can delete suppliers
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can delete suppliers',
        });
      }

      const supplier = await this.supplierRepository.findOne({
        where: { id },
        relations: ['products'],
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Check if supplier has active products
      if (supplier.activeProducts > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete supplier with active products',
        });
      }

      await this.supplierRepository.remove(supplier);

      res.json({
        success: true,
        message: 'Supplier deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete supplier',
      });
    }
  };

  // GET /api/suppliers/:id/products - Get supplier products
  getSupplierProducts = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        status,
        category,
        search,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const query = this.supplierProductRepository.createQueryBuilder('product')
        .where('product.supplierId = :supplierId', { supplierId: id });

      if (status) {
        query.andWhere('product.status = :status', { status });
      }

      if (category) {
        query.andWhere('product.category = :category', { category });
      }

      if (search) {
        query.andWhere(
          '(product.name LIKE :search OR product.sku LIKE :search)',
          { search: `%${search}%` }
        );
      }

      const total = await query.getCount();

      query
        .orderBy('product.name', 'ASC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const products = await query.getMany();

      res.json({
        success: true,
        data: products,
        total,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching supplier products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier products',
      });
    }
  };

  // POST /api/suppliers/:id/products/sync - Sync supplier products
  syncSupplierProducts = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { method = 'manual', products = [] } = req.body;
      const currentUser = req.user;

      // Check permissions
      if (!['admin', 'manager'].includes(currentUser?.role || '')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to sync products',
        });
      }

      const supplier = await this.supplierRepository.findOne({
        where: { id }
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      let syncedProducts = [];

      switch (method) {
        case 'api':
          syncedProducts = await this.syncViaAPI(supplier);
          break;
        case 'csv':
          syncedProducts = await this.syncViaCSV(supplier, req.body.csvData);
          break;
        case 'manual':
          syncedProducts = await this.syncManual(supplier, products);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid sync method',
          });
      }

      // Update supplier statistics
      supplier.lastSyncAt = new Date();
      supplier.totalProducts = await this.supplierProductRepository.count({
        where: { supplierId: id }
      });
      supplier.activeProducts = await this.supplierProductRepository.count({
        where: { supplierId: id, status: 'active' }
      });
      await this.supplierRepository.save(supplier);

      // Update inventory for mapped products
      await this.updateInventoryFromSync(syncedProducts);

      res.json({
        success: true,
        data: {
          syncedCount: syncedProducts.length,
          products: syncedProducts,
        },
        message: `Successfully synced ${syncedProducts.length} products`,
      });
    } catch (error) {
      logger.error('Error syncing supplier products:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync supplier products',
      });
    }
  };

  // GET /api/suppliers/:id/inventory - Get supplier inventory status
  getSupplierInventory = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const supplier = await this.supplierRepository.findOne({
        where: { id }
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Get all supplier products with inventory mapping
      const products = await this.supplierProductRepository.find({
        where: { 
          supplierId: id,
          mappedInventoryId: Not(IsNull())
        }
      });

      const inventoryIds = products.map(p => p.mappedInventoryId).filter(Boolean);
      
      const inventoryItems = await this.inventoryRepository.find({
        where: { id: In(inventoryIds) }
      });

      // Create inventory summary
      const inventorySummary = products.map(product => {
        const inventory = inventoryItems.find(i => i.id === product.mappedInventoryId);
        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          supplierQuantity: product.availableQuantity,
          inventoryQuantity: inventory?.quantity || 0,
          reservedQuantity: inventory?.reservedQuantity || 0,
          availableQuantity: inventory?.availableQuantity || 0,
          status: inventory?.status || 'unknown',
          lastRestocked: inventory?.lastRestockedAt,
          syncStatus: product.syncStatus,
          lastSyncAt: product.lastSyncAt,
        };
      });

      res.json({
        success: true,
        data: {
          supplier: {
            id: supplier.id,
            name: supplier.companyName,
            lastSyncAt: supplier.lastSyncAt,
          },
          inventory: inventorySummary,
          statistics: {
            totalProducts: products.length,
            mappedProducts: inventoryItems.length,
            totalSupplierQuantity: products.reduce((sum, p) => sum + p.availableQuantity, 0),
            totalInventoryQuantity: inventoryItems.reduce((sum, i) => sum + i.quantity, 0),
            lowStockItems: inventoryItems.filter(i => i.status === 'low_stock').length,
            outOfStockItems: inventoryItems.filter(i => i.status === 'out_of_stock').length,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching supplier inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier inventory',
      });
    }
  };

  // POST /api/suppliers/:id/orders - Send order to supplier
  sendOrderToSupplier = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        products,
        orderType = 'purchase_order',
        notes,
        expectedDeliveryDate,
      } = req.body;
      const currentUser = req.user;

      // Check permissions
      if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to send orders',
        });
      }

      const supplier = await this.supplierRepository.findOne({
        where: { id }
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Validate products and calculate total
      let totalAmount = 0;
      const orderItems = [];

      for (const item of products) {
        const product = await this.supplierProductRepository.findOne({
          where: { id: item.productId, supplierId: id }
        });

        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product ${item.productId} not found for this supplier`,
          });
        }

        // Check MOQ
        if (product.moq && item.quantity < product.moq) {
          return res.status(400).json({
            success: false,
            message: `Quantity for ${product.name} is below minimum order quantity (${product.moq})`,
          });
        }

        const itemTotal = product.supplierPrice * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product,
          quantity: item.quantity,
          unitPrice: product.supplierPrice,
          total: itemTotal,
        });
      }

      // Check minimum order amount
      if (supplier.minimumOrderAmount && totalAmount < supplier.minimumOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Order total is below minimum order amount (${supplier.minimumOrderAmount})`,
        });
      }

      // Create order (mock - in production, integrate with actual ordering system)
      const order = {
        id: `PO-${Date.now()}`,
        supplierId: id,
        supplierName: supplier.companyName,
        orderDate: new Date(),
        expectedDeliveryDate,
        items: orderItems,
        totalAmount,
        status: 'sent',
        notes,
        createdBy: currentUser?.name || 'System',
      };

      // Send order notification to supplier
      await this.sendOrderNotification(supplier, order);

      // Update supplier statistics
      supplier.totalOrders++;
      supplier.totalOrderValue += totalAmount;
      await this.supplierRepository.save(supplier);

      // Create stock movements for ordered items
      for (const item of orderItems) {
        if (item.product.mappedInventoryId) {
          const movement = this.stockMovementRepository.create({
            inventoryId: item.product.mappedInventoryId,
            movementType: 'purchase',
            quantity: item.quantity,
            unitCost: item.unitPrice,
            totalValue: item.total,
            referenceType: 'purchase_order',
            referenceNumber: order.id,
            status: 'pending',
            userId: currentUser?.id,
            userName: currentUser?.name,
            notes: `Order from supplier: ${supplier.companyName}`,
          });
          await this.stockMovementRepository.save(movement);
        }
      }

      res.json({
        success: true,
        data: order,
        message: 'Order sent to supplier successfully',
      });
    } catch (error) {
      logger.error('Error sending order to supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send order to supplier',
      });
    }
  };

  // GET /api/suppliers/:id/settlement - Get supplier settlement data
  getSupplierSettlement = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        startDate,
        endDate,
        page = 1,
        limit = 10,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const supplier = await this.supplierRepository.findOne({
        where: { id }
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Mock settlement data - replace with actual settlement calculation
      const settlements = [];
      const currentDate = new Date();
      
      for (let i = 0; i < 12; i++) {
        const settlementDate = new Date(currentDate);
        settlementDate.setMonth(settlementDate.getMonth() - i);
        
        settlements.push({
          id: `SETTLE-${i}`,
          period: settlementDate.toISOString().slice(0, 7), // YYYY-MM
          totalOrders: Math.floor(Math.random() * 50),
          totalAmount: Math.random() * 1000000,
          commission: Math.random() * 50000,
          netAmount: Math.random() * 950000,
          status: i === 0 ? 'pending' : 'paid',
          paidAt: i === 0 ? null : new Date(settlementDate.getTime() + 7 * 24 * 60 * 60 * 1000),
          bankTransferRef: i === 0 ? null : `TRF${Date.now() - i * 1000000}`,
        });
      }

      const paginatedSettlements = settlements.slice(
        (pageNum - 1) * limitNum,
        pageNum * limitNum
      );

      res.json({
        success: true,
        data: {
          supplier: {
            id: supplier.id,
            name: supplier.companyName,
            settlementCycle: supplier.settlementCycle,
            settlementDay: supplier.settlementDay,
            bankInfo: {
              bankName: supplier.bankName,
              accountHolder: supplier.bankAccountHolder,
            },
          },
          settlements: paginatedSettlements,
          summary: {
            totalSettled: settlements.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.netAmount, 0),
            pendingAmount: settlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.netAmount, 0),
            lastSettlement: settlements.find(s => s.status === 'paid'),
            nextSettlement: settlements.find(s => s.status === 'pending'),
          },
        },
        total: settlements.length,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(settlements.length / limitNum),
      });
    } catch (error) {
      logger.error('Error fetching supplier settlement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier settlement',
      });
    }
  };

  // PUT /api/suppliers/:id/margin-rate - Update supplier margin rate
  updateMarginRate = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { marginRate, applyToAll = false, productIds = [] } = req.body;
      const currentUser = req.user;

      // Check permissions
      if (!['admin', 'manager'].includes(currentUser?.role || '')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update margin rate',
        });
      }

      const supplier = await this.supplierRepository.findOne({
        where: { id }
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Validate margin rate
      if (marginRate < 0 || marginRate > 100) {
        return res.status(400).json({
          success: false,
          message: 'Margin rate must be between 0 and 100',
        });
      }

      // Update supplier default margin rate
      supplier.defaultMarginRate = marginRate;
      await this.supplierRepository.save(supplier);

      let updatedProducts = 0;

      if (applyToAll) {
        // Update all products
        await this.supplierProductRepository
          .createQueryBuilder()
          .update(SupplierProduct)
          .set({
            marginRate,
            calculatedSellingPrice: () => `"supplierPrice" * (1 + ${marginRate} / 100)`
          })
          .where('supplierId = :supplierId', { supplierId: id })
          .execute();

        updatedProducts = await this.supplierProductRepository.count({
          where: { supplierId: id }
        });
      } else if (productIds.length > 0) {
        // Update specific products
        await this.supplierProductRepository
          .createQueryBuilder()
          .update(SupplierProduct)
          .set({
            marginRate,
            calculatedSellingPrice: () => `"supplierPrice" * (1 + ${marginRate} / 100)`
          })
          .where('id IN (:...ids) AND supplierId = :supplierId', {
            ids: productIds,
            supplierId: id
          })
          .execute();

        updatedProducts = productIds.length;
      }

      res.json({
        success: true,
        data: {
          supplier: {
            id: supplier.id,
            name: supplier.companyName,
            defaultMarginRate: marginRate,
          },
          updatedProducts,
        },
        message: `Margin rate updated successfully. ${updatedProducts} products affected.`,
      });
    } catch (error) {
      logger.error('Error updating margin rate:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update margin rate',
      });
    }
  };

  // PUT /api/suppliers/:id/auto-approval - Update auto-approval settings
  updateAutoApproval = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const {
        autoApproval,
        autoApprovalThreshold,
        autoApprovalCategories,
      } = req.body;
      const currentUser = req.user;

      // Check permissions
      if (!['admin', 'manager'].includes(currentUser?.role || '')) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to update auto-approval settings',
        });
      }

      const supplier = await this.supplierRepository.findOne({
        where: { id }
      });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: 'Supplier not found',
        });
      }

      // Update auto-approval settings
      supplier.autoApproval = autoApproval;
      if (autoApprovalThreshold !== undefined) {
        supplier.autoApprovalThreshold = autoApprovalThreshold;
      }
      if (autoApprovalCategories !== undefined) {
        supplier.autoApprovalCategories = autoApprovalCategories;
      }

      await this.supplierRepository.save(supplier);

      // If auto-approval is enabled, approve pending products that meet criteria
      if (autoApproval) {
        const query = this.supplierProductRepository
          .createQueryBuilder()
          .update(SupplierProduct)
          .set({ status: 'active' })
          .where('supplierId = :supplierId AND status = :status', {
            supplierId: id,
            status: 'pending'
          });

        if (autoApprovalThreshold) {
          query.andWhere('supplierPrice <= :threshold', { threshold: autoApprovalThreshold });
        }

        if (autoApprovalCategories && autoApprovalCategories.length > 0) {
          query.andWhere('category IN (:...categories)', { categories: autoApprovalCategories });
        }

        const result = await query.execute();

        res.json({
          success: true,
          data: {
            supplier: {
              id: supplier.id,
              name: supplier.companyName,
              autoApproval,
              autoApprovalThreshold,
              autoApprovalCategories,
            },
            autoApprovedProducts: result.affected || 0,
          },
          message: `Auto-approval settings updated. ${result.affected || 0} products auto-approved.`,
        });
      } else {
        res.json({
          success: true,
          data: {
            supplier: {
              id: supplier.id,
              name: supplier.companyName,
              autoApproval,
            },
          },
          message: 'Auto-approval disabled for this supplier',
        });
      }
    } catch (error) {
      logger.error('Error updating auto-approval settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update auto-approval settings',
      });
    }
  };

  // Helper: Sync products via API
  private async syncViaAPI(supplier: Supplier): Promise<SupplierProduct[]> {
    // Mock API sync - in production, make actual API call
    logger.info(`Syncing products via API for supplier ${supplier.companyName}`);
    
    // Simulate API response
    const apiProducts = [
      {
        sku: `API-${Date.now()}-1`,
        name: 'API Product 1',
        price: 100,
        quantity: 50,
      },
      {
        sku: `API-${Date.now()}-2`,
        name: 'API Product 2',
        price: 200,
        quantity: 30,
      },
    ];

    const syncedProducts = [];
    for (const apiProduct of apiProducts) {
      const product = await this.upsertSupplierProduct(supplier.id, {
        sku: apiProduct.sku,
        name: apiProduct.name,
        supplierPrice: apiProduct.price,
        availableQuantity: apiProduct.quantity,
        status: supplier.autoApproval ? 'active' : 'pending',
      });
      syncedProducts.push(product);
    }

    return syncedProducts;
  }

  // Helper: Sync products via CSV
  private async syncViaCSV(supplier: Supplier, csvData: string): Promise<SupplierProduct[]> {
    // Mock CSV parsing - in production, use proper CSV parser
    logger.info(`Syncing products via CSV for supplier ${supplier.companyName}`);
    
    const syncedProducts = [];
    // Parse CSV and create/update products
    // ...implementation...
    
    return syncedProducts;
  }

  // Helper: Manual product sync
  private async syncManual(supplier: Supplier, products: any[]): Promise<SupplierProduct[]> {
    const syncedProducts = [];

    for (const productData of products) {
      const product = await this.upsertSupplierProduct(supplier.id, {
        ...productData,
        status: supplier.autoApproval ? 'active' : 'pending',
      });
      syncedProducts.push(product);
    }

    return syncedProducts;
  }

  // Helper: Upsert supplier product
  private async upsertSupplierProduct(
    supplierId: string,
    productData: Partial<SupplierProduct>
  ): Promise<SupplierProduct> {
    let product = await this.supplierProductRepository.findOne({
      where: {
        supplierId,
        sku: productData.sku,
      },
    });

    if (product) {
      // Update existing product
      Object.assign(product, productData);
      product.lastUpdatedAt = new Date();
      product.syncStatus = 'updated';
    } else {
      // Create new product
      product = this.supplierProductRepository.create({
        ...productData,
        supplierId,
        syncStatus: 'created',
      });
    }

    product.lastSyncAt = new Date();
    return await this.supplierProductRepository.save(product);
  }

  // Helper: Update inventory from synced products
  private async updateInventoryFromSync(products: SupplierProduct[]) {
    for (const product of products) {
      if (product.mappedInventoryId) {
        const inventory = await this.inventoryRepository.findOne({
          where: { id: product.mappedInventoryId }
        });

        if (inventory) {
          // Update inventory quantity if auto-update is enabled
          if (product.autoUpdate && !product.quantityOverride) {
            inventory.quantity = product.availableQuantity;
            inventory.availableQuantity = product.availableQuantity - inventory.reservedQuantity;
          }

          // Update price if not overridden
          if (product.autoUpdate && !product.priceOverride && product.calculatedSellingPrice) {
            inventory.unitCost = product.calculatedSellingPrice;
          }

          inventory.lastRestockedAt = new Date();
          await this.inventoryRepository.save(inventory);

          logger.info(`Updated inventory ${inventory.sku} from supplier sync`);
        }
      }
    }
  }

  // Helper: Send welcome email to supplier
  private async sendSupplierWelcomeEmail(supplier: Supplier) {
    try {
      await emailService.sendEmail({
        to: supplier.contactEmail,
        subject: 'Welcome to Our Supplier Network',
        html: `
          <h2>Welcome ${supplier.companyName}!</h2>
          <p>Your supplier account has been created successfully.</p>
          <p><strong>Account Status:</strong> ${supplier.status}</p>
          <p>We will review your application and notify you once approved.</p>
          <hr>
          <p>If you have any questions, please contact our supplier support team.</p>
        `,
      });
    } catch (error) {
      logger.error('Error sending supplier welcome email:', error);
    }
  }

  // Helper: Send order notification to supplier
  private async sendOrderNotification(supplier: Supplier, order: any) {
    try {
      const itemsList = order.items
        .map((item: any) => `
          <tr>
            <td>${item.product.sku}</td>
            <td>${item.product.name}</td>
            <td>${item.quantity}</td>
            <td>$${item.unitPrice.toFixed(2)}</td>
            <td>$${item.total.toFixed(2)}</td>
          </tr>
        `)
        .join('');

      await emailService.sendEmail({
        to: supplier.contactEmail,
        subject: `New Purchase Order: ${order.id}`,
        html: `
          <h2>New Purchase Order</h2>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Order Date:</strong> ${order.orderDate.toLocaleDateString()}</p>
          <p><strong>Expected Delivery:</strong> ${order.expectedDeliveryDate || 'TBD'}</p>
          
          <h3>Order Items</h3>
          <table border="1" cellpadding="5">
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
            ${itemsList}
          </table>
          
          <p><strong>Total Amount:</strong> $${order.totalAmount.toFixed(2)}</p>
          
          ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
          
          <hr>
          <p>Please confirm receipt of this order and provide tracking information once shipped.</p>
        `,
      });
    } catch (error) {
      logger.error('Error sending order notification:', error);
    }
  }
}