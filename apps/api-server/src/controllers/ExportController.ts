/**
 * Export Controller
 * 정산 및 분석용 데이터 추출 기능
 */

import { Request, Response } from 'express';
import { AppDataSource } from '../database/connection';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { VendorOrderItem } from '../entities/VendorOrderItem';
import * as ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

export class ExportController {
  private orderRepository = AppDataSource.getRepository(Order);
  private orderItemRepository = AppDataSource.getRepository(OrderItem);
  private productRepository = AppDataSource.getRepository(Product);
  private userRepository = AppDataSource.getRepository(User);
  private vendorOrderItemRepository = AppDataSource.getRepository(VendorOrderItem);

  /**
   * Export transactions to CSV
   * GET /api/export/transactions?startDate=2024-01-01&endDate=2024-12-31&format=csv
   */
  async exportTransactions(req: Request, res: Response) {
    try {
      const { startDate, endDate, format = 'csv' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999); // End of day

      // Fetch orders
      const orders = await this.orderRepository.find({
        where: {
          createdAt: Between(start, end)
        },
        relations: ['user'],
        order: {
          createdAt: 'DESC'
        }
      });

      // Transform data for export
      const exportData = [];
      for (const order of orders) {
        // Fetch order items for this order
        const orderItems = await this.orderItemRepository.find({
          where: { orderId: order.id },
          relations: ['product']
        });
        
        for (const item of orderItems) {
          exportData.push({
            '주문번호': order.id,
            '주문일시': order.createdAt.toISOString(),
            '고객명': order.user?.name || order.customerName || '',
            '고객이메일': order.user?.email || order.customerEmail || '',
            '상품SKU': item.product?.sku || '',
            '상품명': item.product?.name || '',
            '판매자ID': item.product?.vendorId || '',
            '수량': item.quantity,
            '단가': item.price,
            '소계': item.price * item.quantity,
            '원가': item.product?.cost || 0,
            '수수료율': '8%', // 플랫폼 3% + 제휴 5%
            '예상수수료': (item.price * item.quantity * 0.08),
            '주문상태': order.status,
            '결제방법': order.paymentMethod,
            '배송주소': `${order.shippingAddress?.address} ${order.shippingAddress?.addressDetail || ''}`,
            '배송우편번호': order.shippingAddress?.zipCode
          });
        }
      }

      if (format === 'excel') {
        return this.exportToExcel(exportData, res, 'transactions');
      } else {
        return this.exportToCSV(exportData, res, 'transactions');
      }
    } catch (error) {
      // Error log removed
      return res.status(500).json({
        success: false,
        message: 'Failed to export transactions'
      });
    }
  }

  /**
   * Export sales summary
   * GET /api/export/sales-summary?startDate=2024-01-01&endDate=2024-12-31
   */
  async exportSalesSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      // Get aggregated sales data
      const salesData = await this.orderRepository
        .createQueryBuilder('order')
        .select('DATE(order.createdAt)', 'date')
        .addSelect('COUNT(DISTINCT order.id)', 'orderCount')
        .addSelect('COUNT(DISTINCT order.customerId)', 'customerCount')
        .addSelect('SUM(order.totalAmount)', 'totalSales')
        .addSelect('AVG(order.totalAmount)', 'avgOrderValue')
        .where('order.createdAt BETWEEN :start AND :end', { start, end })
        .andWhere('order.status != :status', { status: 'cancelled' })
        .groupBy('DATE(order.createdAt)')
        .orderBy('date', 'ASC')
        .getRawMany();

      const exportData = salesData.map(row => ({
        '날짜': row.date,
        '주문수': row.orderCount,
        '고객수': row.customerCount,
        '총매출': row.totalSales,
        '평균주문금액': row.avgOrderValue,
        '예상수수료': row.totalSales * 0.08
      }));

      return this.exportToCSV(exportData, res, 'sales-summary');
    } catch (error) {
      // Error log removed
      return res.status(500).json({
        success: false,
        message: 'Failed to export sales summary'
      });
    }
  }

  /**
   * Export vendor settlements
   * GET /api/export/vendor-settlements?month=2024-01
   */
  async exportVendorSettlements(req: Request, res: Response) {
    try {
      const { month, vendorId } = req.query;
      
      if (!month) {
        return res.status(400).json({
          success: false,
          message: 'month is required (format: YYYY-MM)'
        });
      }

      const [year, monthNum] = (month as string).split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

      // Build query
      let query = this.vendorOrderItemRepository
        .createQueryBuilder('voi')
        .leftJoinAndSelect('voi.vendor', 'vendor')
        .leftJoinAndSelect('voi.product', 'product')
        .leftJoinAndSelect('voi.order', 'order')
        .where('order.createdAt BETWEEN :start AND :end', { 
          start: startDate, 
          end: endDate 
        })
        .andWhere('order.status = :status', { status: 'delivered' });

      if (vendorId) {
        query = query.andWhere('voi.vendorId = :vendorId', { vendorId });
      }

      const vendorItems = await query.getMany();

      // Group by vendor
      const vendorSettlements = new Map();
      
      for (const item of vendorItems) {
        const vendorKey = item.vendorId;
        
        if (!vendorSettlements.has(vendorKey)) {
          vendorSettlements.set(vendorKey, {
            vendorId: item.vendorId,
            vendorName: '',
            vendorEmail: '',
            businessNumber: '',
            totalSales: 0,
            totalCost: 0,
            totalProfit: 0,
            platformCommission: 0,
            affiliateCommission: 0,
            netAmount: 0,
            itemCount: 0,
            orderCount: new Set()
          });
        }
        
        const settlement = vendorSettlements.get(vendorKey);
        const itemTotal = item.price * item.quantity;
        
        settlement.totalSales += itemTotal;
        settlement.totalCost += item.cost * item.quantity;
        settlement.totalProfit += item.vendorProfit;
        settlement.platformCommission += item.platformCommission;
        settlement.affiliateCommission += item.affiliateCommission;
        settlement.netAmount += item.vendorProfit - item.platformCommission - item.affiliateCommission;
        settlement.itemCount++;
        settlement.orderCount.add(item.orderId);
      }

      // Convert to export format
      const exportData = Array.from(vendorSettlements.values()).map(s => ({
        '벤더ID': s.vendorId,
        '벤더명': s.vendorName,
        '이메일': s.vendorEmail,
        '사업자번호': s.businessNumber,
        '총매출': s.totalSales,
        '총원가': s.totalCost,
        '총이익': s.totalProfit,
        '플랫폼수수료': s.platformCommission,
        '제휴수수료': s.affiliateCommission,
        '정산금액': s.netAmount,
        '판매상품수': s.itemCount,
        '주문건수': s.orderCount.size,
        '정산월': month
      }));

      return this.exportToExcel(exportData, res, 'vendor-settlements');
    } catch (error) {
      // Error log removed
      return res.status(500).json({
        success: false,
        message: 'Failed to export vendor settlements'
      });
    }
  }

  /**
   * Export product inventory
   * GET /api/export/inventory
   */
  async exportInventory(req: Request, res: Response) {
    try {
      const { vendorId, lowStockOnly } = req.query;

      let query = this.productRepository
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.vendor', 'vendor')
        .leftJoinAndSelect('product.category', 'category');

      if (vendorId) {
        query = query.where('product.vendorId = :vendorId', { vendorId });
      }

      if (lowStockOnly === 'true') {
        query = query.andWhere('product.stock <= product.lowStockThreshold');
      }

      const products = await query.getMany();

      const exportData = products.map(p => ({
        'SKU': p.sku,
        '상품명': p.name,
        '카테고리': '',
        '벤더': p.vendor || '',
        '현재재고': p.stock,
        '재고임계값': p.lowStockThreshold || 10,
        '재고상태': p.stock <= (p.lowStockThreshold || 10) ? '부족' : '정상',
        '판매가': p.price,
        '원가': p.cost,
        '마진': p.price - p.cost,
        '마진율': ((p.price - p.cost) / p.price * 100).toFixed(2) + '%',
        '활성상태': p.isActive ? '활성' : '비활성',
        '등록일': p.createdAt.toISOString().split('T')[0]
      }));

      return this.exportToCSV(exportData, res, 'inventory');
    } catch (error) {
      // Error log removed
      return res.status(500).json({
        success: false,
        message: 'Failed to export inventory'
      });
    }
  }

  /**
   * Export affiliate commissions
   * GET /api/export/affiliate-commissions?month=2024-01
   */
  async exportAffiliateCommissions(req: Request, res: Response) {
    try {
      const { month, affiliateId } = req.query;
      
      if (!month) {
        return res.status(400).json({
          success: false,
          message: 'month is required (format: YYYY-MM)'
        });
      }

      const [year, monthNum] = (month as string).split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

      // Get orders with affiliate tracking
      const orders = await this.orderRepository.find({
        where: {
          createdAt: Between(startDate, endDate),
          affiliateId: affiliateId ? affiliateId as string : undefined
        }
      });

      const exportData = [];
      
      for (const order of orders) {
        if (!order.affiliateId) continue;
        
        // Fetch order items for this order
        const orderItems = await this.orderItemRepository.find({
          where: { orderId: order.id }
        });
        
        const totalAmount = orderItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );
        
        exportData.push({
          '제휴사ID': order.affiliateId,
          '제휴사명': '',
          '주문번호': order.id,
          '주문일': order.createdAt.toISOString().split('T')[0],
          '주문금액': totalAmount,
          '수수료율': '5%',
          '수수료': totalAmount * 0.05,
          '상태': order.status === 'delivered' ? '정산가능' : '대기',
          '정산월': month
        });
      }

      return this.exportToCSV(exportData, res, 'affiliate-commissions');
    } catch (error) {
      // Error log removed
      return res.status(500).json({
        success: false,
        message: 'Failed to export affiliate commissions'
      });
    }
  }

  /**
   * Helper: Export to CSV
   */
  private exportToCSV(data: any[], res: Response, filename: string) {
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }

    try {
      const fields = Object.keys(data[0]);
      const json2csvParser = new Parser({ fields, withBOM: true });
      const csv = json2csvParser.parse(data);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.send(csv);
    } catch (error) {
      // Error log removed
      return res.status(500).json({
        success: false,
        message: 'Failed to generate CSV'
      });
    }
  }

  /**
   * Helper: Export to Excel
   */
  private async exportToExcel(data: any[], res: Response, filename: string) {
    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      // Add headers
      const headers = Object.keys(data[0]);
      worksheet.addRow(headers);

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add data
      data.forEach(row => {
        worksheet.addRow(Object.values(row));
      });

      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.xlsx"`);

      // Write to response
      await workbook.xlsx.write(res);
      return res.end();
    } catch (error) {
      // Error log removed
      return res.status(500).json({
        success: false,
        message: 'Failed to generate Excel file'
      });
    }
  }
}