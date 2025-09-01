import { Repository, Between, IsNull, Not, In, LessThanOrEqual } from 'typeorm';
import { VendorCommission } from '../entities/VendorCommission';
import { CommissionSettlement } from '../entities/CommissionSettlement';
import { VendorInfo } from '../entities/VendorInfo';
import { Supplier } from '../entities/Supplier';
import { Order } from '../entities/Order';
import { SupplierProduct } from '../entities/SupplierProduct';
import { EmailService } from './email.service';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isBetween from 'dayjs/plugin/isBetween';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import duration from 'dayjs/plugin/duration';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);
dayjs.extend(weekOfYear);
dayjs.extend(duration);

export class CommissionService {
  constructor(
    private vendorCommissionRepository: Repository<VendorCommission>,
    private settlementRepository: Repository<CommissionSettlement>,
    private vendorRepository: Repository<VendorInfo>,
    private supplierRepository: Repository<Supplier>,
    private orderRepository: Repository<Order>,
    private supplierProductRepository: Repository<SupplierProduct>,
    private emailService: EmailService,
  ) {}

  // Monthly settlement - should be called from cron scheduler
  async processMonthlySettlements() {
    // Starting monthly settlement processing...
    
    const previousMonth = dayjs().subtract(1, 'month');
    const period = previousMonth.format('YYYY-MM');
    const startDate = previousMonth.startOf('month').toDate();
    const endDate = previousMonth.endOf('month').toDate();

    try {
      // Process vendor commissions
      await this.processAllVendorCommissions(period, startDate, endDate);
      
      // Process supplier settlements
      await this.processAllSupplierSettlements(period, startDate, endDate);
      
      // Monthly settlement completed for period
    } catch (error) {
      console.error('Error processing monthly settlements:', error);
      // Send alert to admin
      // Send alert to admin
      if (this.emailService) {
        // TODO: Implement admin alert
        console.error(`Monthly settlement failed for period ${period}: ${error.message}`);
      }
    }
  }

  async processAllVendorCommissions(period: string, startDate: Date, endDate: Date) {
    const activeVendors = await this.vendorRepository.find({
      where: { status: 'active' },
    });

    for (const vendor of activeVendors) {
      try {
        await this.calculateVendorCommission(vendor.id, period, startDate, endDate);
      } catch (error) {
        console.error(`Failed to process commission for vendor ${vendor.id}:`, error);
      }
    }
  }

  async processAllSupplierSettlements(period: string, startDate: Date, endDate: Date) {
    const activeSuppliers = await this.supplierRepository.find({
      where: { status: 'active' },
    });

    for (const supplier of activeSuppliers) {
      try {
        await this.calculateSupplierSettlement(supplier.id, period, startDate, endDate);
      } catch (error) {
        console.error(`Failed to process settlement for supplier ${supplier.id}:`, error);
      }
    }
  }

  async calculateVendorCommission(
    vendorId: string, 
    period: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<VendorCommission> {
    // Check if commission already exists for this period
    const existingCommission = await this.vendorCommissionRepository.findOne({
      where: { vendorId, period },
    });

    if (existingCommission && existingCommission.status !== 'draft') {
      // Commission already processed for vendor in period
      return existingCommission;
    }

    // Get vendor details
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorId}`);
    }

    // Get all orders for the vendor in the period
    const orders = await this.orderRepository.find({
      where: {
        vendorId,
        createdAt: Between(startDate, endDate),
      },
      relations: ['items', 'items.product'],
    });

    // Calculate order statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const refundedOrders = orders.filter(o => o.status === 'refunded').length;

    // Calculate sales amounts
    let grossSales = 0;
    let refundAmount = 0;
    const productsSold = new Map<string, any>();
    const categoryBreakdown = new Map<string, any>();

    for (const order of orders) {
      if (order.status === 'completed') {
        grossSales += Number(order.totalAmount);
        
        // Track products sold
        for (const item of order.items) {
          const productId = item.product.id;
          if (!productsSold.has(productId)) {
            productsSold.set(productId, {
              productId,
              productName: item.product.name,
              quantity: 0,
              revenue: 0,
              commission: 0,
            });
          }
          const product = productsSold.get(productId);
          product.quantity += item.quantity;
          product.revenue += Number(item.price) * item.quantity;
        }
      } else if (order.status === 'refunded') {
        refundAmount += Number(order.totalAmount);
      }
    }

    const netSales = grossSales - refundAmount;

    // Calculate commission
    const commissionRate = (vendor as any).commissionRate || 10; // Default 10%
    const baseCommission = (netSales * commissionRate) / 100;

    // Calculate bonus commission (example: 2% bonus if sales > 100000)
    let bonusCommission = 0;
    if (netSales > 100000) {
      bonusCommission = (netSales * 2) / 100;
    }

    const totalCommission = baseCommission + bonusCommission;

    // Calculate deductions
    const platformFee = (netSales * 2) / 100; // 2% platform fee
    const transactionFee = completedOrders * 0.5; // $0.50 per transaction
    const refundDeduction = (refundAmount * commissionRate) / 100;
    const totalDeductions = platformFee + transactionFee + refundDeduction;

    // Calculate net commission
    const netCommission = totalCommission - totalDeductions;

    // Get previous balance if any
    const previousCommission = await this.vendorCommissionRepository.findOne({
      where: {
        vendorId,
        period: dayjs(period, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM'),
      },
    });
    const previousBalance = previousCommission?.totalPayable || 0;

    // Calculate total payable
    const totalPayable = netCommission + Number(previousBalance);

    // Create or update commission record
    const commission = existingCommission || new VendorCommission();
    
    Object.assign(commission, {
      vendorId,
      period,
      startDate,
      endDate,
      totalOrders,
      completedOrders,
      cancelledOrders,
      refundedOrders,
      grossSales,
      netSales,
      refundAmount,
      commissionRate,
      baseCommission,
      bonusCommission,
      totalCommission,
      platformFee,
      transactionFee,
      refundDeduction,
      otherDeductions: 0,
      totalDeductions,
      netCommission,
      previousBalance,
      totalPayable,
      totalProductsSold: productsSold.size,
      uniqueProductsSold: productsSold.size,
      topProducts: Array.from(productsSold.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      categoryBreakdown: Array.from(categoryBreakdown.values()),
      status: 'pending',
      invoiceNumber: `INV-${vendorId.slice(0, 8)}-${period}`,
    });

    const savedCommission = await this.vendorCommissionRepository.save(commission);

    // Send notification to vendor
    // Send notification to vendor
    if (this.emailService) {
      // TODO: Implement email notification
      // Commission calculated for vendor
    }

    return savedCommission;
  }

  async calculateSupplierSettlement(
    supplierId: string,
    period: string,
    startDate: Date,
    endDate: Date
  ): Promise<CommissionSettlement> {
    // Check if settlement already exists for this period
    const existingSettlement = await this.settlementRepository.findOne({
      where: { supplierId, period },
    });

    if (existingSettlement && existingSettlement.status !== 'draft') {
      // Settlement already processed for supplier in period
      return existingSettlement;
    }

    // Get supplier details
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`);
    }

    // Get all supplier products and their sales
    const supplierProducts = await this.supplierProductRepository.find({
      where: { supplierId },
    });

    // Get all orders containing supplier products
    const orders = await this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('product.supplierId = :supplierId', { supplierId })
      .getMany();

    // Calculate order statistics
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const returnedOrders = orders.filter(o => o.status === 'refunded').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

    // Calculate financial metrics
    let grossRevenue = 0;
    let returns = 0;
    let supplierCost = 0;
    const productBreakdown = [];
    const categoryBreakdown = new Map<string, any>();
    let totalProductsSold = 0;
    const uniqueProducts = new Set<string>();

    for (const order of orders) {
      for (const item of order.items) {
        const supplierProduct = supplierProducts.find(sp => sp.mappedProductId === item.product.id);
        
        if (supplierProduct) {
          uniqueProducts.add(supplierProduct.id);
          
          if (order.status === 'completed') {
            const itemRevenue = Number(item.price) * item.quantity;
            const itemCost = Number(supplierProduct.supplierPrice) * item.quantity;
            
            grossRevenue += itemRevenue;
            supplierCost += itemCost;
            totalProductsSold += item.quantity;

            productBreakdown.push({
              productId: supplierProduct.id,
              sku: supplierProduct.sku,
              name: supplierProduct.name,
              quantity: item.quantity,
              unitPrice: Number(item.price),
              totalAmount: itemRevenue,
              margin: itemRevenue - itemCost,
            });

            // Update category breakdown
            const category = supplierProduct.category || 'Uncategorized';
            if (!categoryBreakdown.has(category)) {
              categoryBreakdown.set(category, {
                category,
                orders: 0,
                products: 0,
                revenue: 0,
                margin: 0,
              });
            }
            const cat = categoryBreakdown.get(category);
            cat.orders += 1;
            cat.products += item.quantity;
            cat.revenue += itemRevenue;
            cat.margin += (itemRevenue - itemCost);
          } else if (order.status === 'refunded') {
            returns += Number(item.price) * item.quantity;
          }
        }
      }
    }

    const netRevenue = grossRevenue - returns;
    const grossMargin = netRevenue - supplierCost;
    const marginRate = netRevenue > 0 ? (grossMargin / netRevenue) * 100 : 0;

    // Calculate platform fees and commissions
    const platformCommissionRate = supplier.defaultMarginRate || 15; // Default 15%
    const platformCommission = (grossMargin * platformCommissionRate) / 100;
    const transactionFees = completedOrders * 1.0; // $1.00 per transaction
    const processingFees = (netRevenue * 2.9) / 100; // 2.9% processing fee
    const shippingCosts = completedOrders * 5.0; // Estimated $5 per order
    const totalFees = platformCommission + transactionFees + processingFees + shippingCosts;

    // Calculate supplier earnings
    const supplierEarnings = netRevenue - totalFees;

    // Get previous balance
    const previousSettlement = await this.settlementRepository.findOne({
      where: {
        supplierId,
        period: dayjs(period, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM'),
      },
    });
    const previousBalance = previousSettlement?.totalPayable || 0;

    // Calculate total payable
    const totalPayable = supplierEarnings + Number(previousBalance);

    // Calculate performance metrics
    const averageOrderValue = completedOrders > 0 ? grossRevenue / completedOrders : 0;
    const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    const fulfillmentRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Create or update settlement record
    const settlement = existingSettlement || new CommissionSettlement();
    
    Object.assign(settlement, {
      supplierId,
      period,
      startDate,
      endDate,
      settlementDate: new Date(),
      totalOrders,
      completedOrders,
      returnedOrders,
      cancelledOrders,
      totalProductsSold,
      uniqueProductsSold: uniqueProducts.size,
      productBreakdown: productBreakdown.slice(0, 100), // Limit to top 100 products
      grossRevenue,
      returns,
      netRevenue,
      supplierCost,
      grossMargin,
      marginRate,
      platformCommissionRate,
      platformCommission,
      transactionFees,
      processingFees,
      shippingCosts,
      totalFees,
      supplierEarnings,
      previousBalance,
      totalPayable,
      averageOrderValue,
      returnRate,
      cancellationRate,
      fulfillmentRate,
      categoryBreakdown: Array.from(categoryBreakdown.values()),
      status: 'pending',
      statementNumber: `STMT-${supplierId.slice(0, 8)}-${period}`,
      currency: 'USD',
    });

    const savedSettlement = await this.settlementRepository.save(settlement);

    // Send notification to supplier
    // Send notification to supplier
    if (this.emailService) {
      // TODO: Implement email notification  
      // Settlement calculated for supplier
    }

    return savedSettlement;
  }

  // Get vendor commission history
  async getVendorCommissionHistory(vendorId: string, limit = 12) {
    return await this.vendorCommissionRepository.find({
      where: { vendorId },
      order: { period: 'DESC' },
      take: limit,
    });
  }

  // Get supplier settlement history
  async getSupplierSettlementHistory(supplierId: string, limit = 12) {
    return await this.settlementRepository.find({
      where: { supplierId },
      order: { period: 'DESC' },
      take: limit,
    });
  }

  // Get current month's vendor commission
  async getCurrentVendorCommission(vendorId: string): Promise<VendorCommission | null> {
    const currentPeriod = dayjs().format('YYYY-MM');
    return await this.vendorCommissionRepository.findOne({
      where: { vendorId, period: currentPeriod },
    });
  }

  // Get current month's supplier settlement
  async getCurrentSupplierSettlement(supplierId: string): Promise<CommissionSettlement | null> {
    const currentPeriod = dayjs().format('YYYY-MM');
    return await this.settlementRepository.findOne({
      where: { supplierId, period: currentPeriod },
    });
  }

  // Approve vendor commission
  async approveVendorCommission(commissionId: string, approvedBy: string): Promise<VendorCommission> {
    const commission = await this.vendorCommissionRepository.findOne({
      where: { id: commissionId },
      relations: ['vendor'],
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    commission.status = 'approved';
    commission.approvedBy = approvedBy;
    commission.approvedAt = new Date();

    const savedCommission = await this.vendorCommissionRepository.save(commission);

    // Send approval notification
    // Send approval notification
    if (this.emailService && commission.vendor) {
      // TODO: Implement email notification
      // Commission approved for vendor
    }

    return savedCommission;
  }

  // Approve supplier settlement
  async approveSupplierSettlement(settlementId: string, approvedBy: string): Promise<CommissionSettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
      relations: ['supplier'],
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    settlement.status = 'approved';
    settlement.approvedBy = approvedBy;
    settlement.approvedAt = new Date();

    const savedSettlement = await this.settlementRepository.save(settlement);

    // Send approval notification
    // Send approval notification
    if (this.emailService && settlement.supplier) {
      // TODO: Implement email notification
      // Settlement approved for supplier
    }

    return savedSettlement;
  }

  // Mark vendor commission as paid
  async markVendorCommissionPaid(
    commissionId: string,
    paymentDetails: {
      paymentMethod: string;
      paymentReference: string;
      paidAmount: number;
    }
  ): Promise<VendorCommission> {
    const commission = await this.vendorCommissionRepository.findOne({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    commission.status = 'paid';
    commission.paymentMethod = paymentDetails.paymentMethod;
    commission.paymentReference = paymentDetails.paymentReference;
    commission.paidAmount = paymentDetails.paidAmount;
    commission.paidAt = new Date();

    return await this.vendorCommissionRepository.save(commission);
  }

  // Mark supplier settlement as paid
  async markSupplierSettlementPaid(
    settlementId: string,
    paymentDetails: {
      paymentMethod: string;
      paymentReference: string;
      paidAmount: number;
    }
  ): Promise<CommissionSettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    settlement.status = 'paid';
    settlement.paymentMethod = paymentDetails.paymentMethod;
    settlement.paymentReference = paymentDetails.paymentReference;
    settlement.paidAmount = paymentDetails.paidAmount;
    settlement.paymentDate = new Date();

    return await this.settlementRepository.save(settlement);
  }

  // Get pending vendor commissions
  async getPendingVendorCommissions() {
    return await this.vendorCommissionRepository.find({
      where: { status: 'pending' },
      relations: ['vendor'],
      order: { period: 'DESC' },
    });
  }

  // Get pending supplier settlements
  async getPendingSupplierSettlements() {
    return await this.settlementRepository.find({
      where: { status: 'pending' },
      relations: ['supplier'],
      order: { period: 'DESC' },
    });
  }

  // Handle vendor commission dispute
  async raiseVendorCommissionDispute(
    commissionId: string,
    disputeReason: string
  ): Promise<VendorCommission> {
    const commission = await this.vendorCommissionRepository.findOne({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    commission.status = 'disputed';
    commission.isDisputed = true;
    commission.disputeReason = disputeReason;
    commission.disputedAt = new Date();

    return await this.vendorCommissionRepository.save(commission);
  }

  // Handle supplier settlement dispute
  async raiseSupplierSettlementDispute(
    settlementId: string,
    disputeReason: string
  ): Promise<CommissionSettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    settlement.status = 'disputed';
    settlement.hasDispute = true;
    settlement.disputeReason = disputeReason;
    settlement.disputeRaisedAt = new Date();

    return await this.settlementRepository.save(settlement);
  }

  // Resolve vendor commission dispute
  async resolveVendorCommissionDispute(
    commissionId: string,
    resolution: string,
    adjustedAmount?: number
  ): Promise<VendorCommission> {
    const commission = await this.vendorCommissionRepository.findOne({
      where: { id: commissionId },
    });

    if (!commission) {
      throw new Error('Commission not found');
    }

    commission.status = 'approved';
    commission.disputeResolution = resolution;
    commission.disputeResolvedAt = new Date();
    
    if (adjustedAmount !== undefined) {
      const adjustment = adjustedAmount - commission.totalPayable;
      commission.totalAdjustments = (commission.totalAdjustments || 0) + adjustment;
      commission.totalPayable = adjustedAmount;
      
      // Add adjustment record
      commission.adjustments = commission.adjustments || [];
      commission.adjustments.push({
        date: new Date(),
        type: adjustment > 0 ? 'credit' : 'debit',
        amount: Math.abs(adjustment),
        reason: `Dispute resolution: ${resolution}`,
        createdBy: 'system',
      });
    }

    return await this.vendorCommissionRepository.save(commission);
  }

  // Resolve supplier settlement dispute
  async resolveSupplierSettlementDispute(
    settlementId: string,
    resolution: string,
    adjustedAmount?: number
  ): Promise<CommissionSettlement> {
    const settlement = await this.settlementRepository.findOne({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error('Settlement not found');
    }

    settlement.status = 'approved';
    settlement.disputeResolution = resolution;
    settlement.disputeResolvedAt = new Date();
    
    if (adjustedAmount !== undefined) {
      const adjustment = adjustedAmount - settlement.totalPayable;
      settlement.totalAdjustments = (settlement.totalAdjustments || 0) + adjustment;
      settlement.totalPayable = adjustedAmount;
      
      // Add adjustment record
      settlement.adjustments = settlement.adjustments || [];
      settlement.adjustments.push({
        date: new Date(),
        type: adjustment > 0 ? 'credit' : 'debit',
        amount: Math.abs(adjustment),
        reason: `Dispute resolution: ${resolution}`,
        approvedBy: 'system',
      });
    }

    return await this.settlementRepository.save(settlement);
  }

  // Get commission statistics
  async getCommissionStatistics() {
    const currentMonth = dayjs().format('YYYY-MM');
    const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');

    const [
      currentVendorCommissions,
      lastVendorCommissions,
      currentSupplierSettlements,
      lastSupplierSettlements,
      pendingVendorPayments,
      pendingSupplierPayments,
    ] = await Promise.all([
      this.vendorCommissionRepository.find({ where: { period: currentMonth } }),
      this.vendorCommissionRepository.find({ where: { period: lastMonth } }),
      this.settlementRepository.find({ where: { period: currentMonth } }),
      this.settlementRepository.find({ where: { period: lastMonth } }),
      this.vendorCommissionRepository.find({ where: { status: 'approved' } }),
      this.settlementRepository.find({ where: { status: 'approved' } }),
    ]);

    const currentVendorTotal = currentVendorCommissions.reduce((sum, c) => sum + Number(c.totalPayable), 0);
    const lastVendorTotal = lastVendorCommissions.reduce((sum, c) => sum + Number(c.totalPayable), 0);
    const currentSupplierTotal = currentSupplierSettlements.reduce((sum, s) => sum + Number(s.totalPayable), 0);
    const lastSupplierTotal = lastSupplierSettlements.reduce((sum, s) => sum + Number(s.totalPayable), 0);
    const pendingVendorTotal = pendingVendorPayments.reduce((sum, c) => sum + Number(c.totalPayable), 0);
    const pendingSupplierTotal = pendingSupplierPayments.reduce((sum, s) => sum + Number(s.totalPayable), 0);

    return {
      vendorCommissions: {
        current: currentVendorTotal,
        previous: lastVendorTotal,
        change: lastVendorTotal > 0 ? ((currentVendorTotal - lastVendorTotal) / lastVendorTotal) * 100 : 0,
        pending: pendingVendorTotal,
      },
      supplierSettlements: {
        current: currentSupplierTotal,
        previous: lastSupplierTotal,
        change: lastSupplierTotal > 0 ? ((currentSupplierTotal - lastSupplierTotal) / lastSupplierTotal) * 100 : 0,
        pending: pendingSupplierTotal,
      },
      totalPending: pendingVendorTotal + pendingSupplierTotal,
    };
  }

}