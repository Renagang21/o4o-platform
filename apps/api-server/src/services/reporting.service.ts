import { AppDataSource } from '../database/connection';
import { Between, In, MoreThan, LessThan } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { cacheService } from './cache.service';
import logger from '../utils/logger';
import moment from 'moment';
import * as XLSX from 'xlsx';
import * as PDFKit from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import fs from 'fs';
import path from 'path';

export interface ReportOptions {
  format: 'json' | 'csv' | 'excel' | 'pdf';
  startDate: Date;
  endDate: Date;
  filters?: {
    vendorIds?: string[];
    supplierIds?: string[];
    categories?: string[];
    productIds?: string[];
    warehouseIds?: string[];
    stockLevels?: string[];
    includeInactive?: boolean;
    status?: string[];
  };
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeImages?: boolean;
  includeDetails?: boolean;
  reportType?: string;
  customConfig?: any;
}

export interface ReportData {
  id: string;
  title: string;
  description: string;
  generatedAt: Date;
  format: string;
  filePath?: string;
  downloadUrl?: string;
  status: 'generating' | 'completed' | 'failed';
  data?: any;
  metadata: {
    period: string;
    recordCount: number;
    fileSize?: number;
    filters?: any;
    totalRecords?: number;
  };
}

export interface InventoryReportData {
  sku: string;
  productName: string;
  category: string;
  supplier: string;
  currentStock: number;
  reorderPoint: number;
  averageCost: number;
  totalValue: number;
  turnoverRate: number;
  lastMovement: Date;
  status: string;
  alertLevel: string;
}

export interface SalesReportData {
  period: string;
  orderId: string;
  vendorName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  commission: number;
  status: string;
  orderDate: Date;
}

export interface CommissionReportData {
  vendorName: string;
  period: string;
  totalOrders: number;
  grossSales: number;
  commissionRate: number;
  grossCommission: number;
  deductions: number;
  netCommission: number;
  status: string;
  paidDate?: Date;
}

export class ReportingService {
  private analyticsService: AnalyticsService;
  private reportsDir: string;

  constructor() {
    this.analyticsService = new AnalyticsService();
    this.reportsDir = path.join(process.cwd(), 'generated-reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generate inventory report
  async generateInventoryReport(options: ReportOptions): Promise<ReportData> {
    const reportId = this.generateReportId('inventory');
    
    try {
      // Update report status to generating
      const report: ReportData = {
        id: reportId,
        title: 'Inventory Report',
        description: `Inventory report for ${moment(options.startDate).format('YYYY-MM-DD')} to ${moment(options.endDate).format('YYYY-MM-DD')}`,
        generatedAt: new Date(),
        format: options.format,
        status: 'generating',
        metadata: {
          period: `${moment(options.startDate).format('YYYY-MM-DD')} to ${moment(options.endDate).format('YYYY-MM-DD')}`,
          recordCount: 0,
          filters: options.filters,
        },
      };

      // Generate inventory data
      const inventoryData = await this.getInventoryReportData(options);
      
      report.metadata.recordCount = inventoryData.length;
      report.data = inventoryData;

      // Generate file based on format
      if (options.format !== 'json') {
        const filePath = await this.generateReportFile(report, inventoryData, options);
        report.filePath = filePath;
        report.downloadUrl = `/api/reports/${reportId}/download`;
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          report.metadata.fileSize = stats.size;
        }
      }

      report.status = 'completed';
      
      // Cache report metadata
      await cacheService.set(`report:${reportId}`, report, { ttl: 3600, tags: ['reports'] });

      logger.info('Inventory report generated successfully', {
        reportId,
        recordCount: inventoryData.length,
        format: options.format,
      });

      return report;
    } catch (error) {
      logger.error('Error generating inventory report:', { reportId, error });
      
      const failedReport: ReportData = {
        id: reportId,
        title: 'Inventory Report',
        description: 'Failed to generate inventory report',
        generatedAt: new Date(),
        format: options.format,
        status: 'failed',
        metadata: {
          period: `${moment(options.startDate).format('YYYY-MM-DD')} to ${moment(options.endDate).format('YYYY-MM-DD')}`,
          recordCount: 0,
        },
      };
      
      await cacheService.set(`report:${reportId}`, failedReport, { ttl: 3600, tags: ['reports'] });
      return failedReport;
    }
  }

  // Generate sales report
  async generateSalesReport(options: ReportOptions & { period: string }): Promise<ReportData> {
    const reportId = this.generateReportId('sales');
    
    try {
      const report: ReportData = {
        id: reportId,
        title: `Sales Report - ${options.period}`,
        description: `Sales report for ${options.period}`,
        generatedAt: new Date(),
        format: options.format,
        status: 'generating',
        metadata: {
          period: options.period,
          recordCount: 0,
          filters: options.filters,
        },
      };

      // Generate sales data based on period
      const salesData = await this.getSalesReportData(options);
      const summary = await this.generateSalesSummary(salesData, options);
      
      report.metadata.recordCount = salesData.length;
      report.data = {
        sales: salesData,
        summary,
        trends: await this.generateSalesTrends(options),
      };

      // Generate file based on format
      if (options.format !== 'json') {
        const filePath = await this.generateReportFile(report, report.data, options);
        report.filePath = filePath;
        report.downloadUrl = `/api/reports/${reportId}/download`;
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          report.metadata.fileSize = stats.size;
        }
      }

      report.status = 'completed';
      await cacheService.set(`report:${reportId}`, report, { ttl: 3600, tags: ['reports'] });

      logger.info('Sales report generated successfully', {
        reportId,
        period: options.period,
        recordCount: salesData.length,
        format: options.format,
      });

      return report;
    } catch (error) {
      logger.error('Error generating sales report:', { reportId, error });
      throw error;
    }
  }

  // Generate commission report
  async generateCommissionReport(options: ReportOptions): Promise<ReportData> {
    const reportId = this.generateReportId('commission');
    
    try {
      const report: ReportData = {
        id: reportId,
        title: 'Commission Report',
        description: `Commission report for ${moment(options.startDate).format('YYYY-MM-DD')} to ${moment(options.endDate).format('YYYY-MM-DD')}`,
        generatedAt: new Date(),
        format: options.format,
        status: 'generating',
        metadata: {
          period: `${moment(options.startDate).format('YYYY-MM-DD')} to ${moment(options.endDate).format('YYYY-MM-DD')}`,
          recordCount: 0,
          filters: options.filters,
        },
      };

      const commissionData = await this.getCommissionReportData(options);
      const summary = await this.generateCommissionSummary(commissionData);
      
      report.metadata.recordCount = commissionData.length;
      report.data = {
        commissions: commissionData,
        summary,
        vendorRankings: await this.analyticsService.getVendorRankings({
          startDate: options.startDate,
          endDate: options.endDate,
          vendorIds: options.filters?.vendorIds,
        }, 20),
      };

      // Generate file based on format
      if (options.format !== 'json') {
        const filePath = await this.generateReportFile(report, report.data, options);
        report.filePath = filePath;
        report.downloadUrl = `/api/reports/${reportId}/download`;
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          report.metadata.fileSize = stats.size;
        }
      }

      report.status = 'completed';
      await cacheService.set(`report:${reportId}`, report, { ttl: 3600, tags: ['reports'] });

      return report;
    } catch (error) {
      logger.error('Error generating commission report:', { reportId, error });
      throw error;
    }
  }

  // Generate custom report
  async generateCustomReport(
    reportType: string,
    options: ReportOptions,
    customQuery?: {
      tables: string[];
      fields: string[];
      conditions: any;
    }
  ): Promise<ReportData> {
    const reportId = this.generateReportId(reportType);
    
    try {
      const report: ReportData = {
        id: reportId,
        title: `Custom ${reportType} Report`,
        description: `Custom report generated on ${new Date().toISOString()}`,
        generatedAt: new Date(),
        format: options.format,
        status: 'generating',
        metadata: {
          period: `${moment(options.startDate).format('YYYY-MM-DD')} to ${moment(options.endDate).format('YYYY-MM-DD')}`,
          recordCount: 0,
          filters: options.filters,
        },
      };

      let data: any;
      
      if (customQuery) {
        data = await this.executeCustomQuery(customQuery, options);
      } else {
        // Default to analytics dashboard data
        data = await this.analyticsService.getDashboardAnalytics({
          startDate: options.startDate,
          endDate: options.endDate,
          ...options.filters,
        });
      }

      report.metadata.recordCount = Array.isArray(data) ? data.length : Object.keys(data).length;
      report.data = data;

      // Generate file based on format
      if (options.format !== 'json') {
        const filePath = await this.generateReportFile(report, data, options);
        report.filePath = filePath;
        report.downloadUrl = `/api/reports/${reportId}/download`;
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          report.metadata.fileSize = stats.size;
        }
      }

      report.status = 'completed';
      await cacheService.set(`report:${reportId}`, report, { ttl: 3600, tags: ['reports'] });

      return report;
    } catch (error) {
      logger.error('Error generating custom report:', { reportId, reportType, error });
      throw error;
    }
  }

  // Get report by ID
  async getReport(reportId: string): Promise<ReportData | null> {
    try {
      return await cacheService.get(`report:${reportId}`);
    } catch (error) {
      logger.error('Error retrieving report:', { reportId, error });
      return null;
    }
  }

  // Export report file
  async exportReport(reportId: string): Promise<{ filePath: string; contentType: string } | null> {
    try {
      const report = await this.getReport(reportId);
      
      if (!report || report.status !== 'completed' || !report.filePath) {
        return null;
      }

      if (!fs.existsSync(report.filePath)) {
        logger.warn('Report file not found:', { reportId, filePath: report.filePath });
        return null;
      }

      const contentType = this.getContentType(report.format);
      
      return {
        filePath: report.filePath,
        contentType,
      };
    } catch (error) {
      logger.error('Error exporting report:', { reportId, error });
      return null;
    }
  }

  // Clean up old reports (utility method)
  async cleanupOldReports(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = moment().subtract(olderThanDays, 'days').toDate();
      const files = fs.readdirSync(this.reportsDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.reportsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      logger.info('Old reports cleaned up', { deletedCount, cutoffDate });
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up old reports:', error);
      return 0;
    }
  }

  // Private helper methods
  private async getInventoryReportData(options: ReportOptions): Promise<InventoryReportData[]> {
    const inventoryRepository = AppDataSource.getRepository('Inventory');
    const stockMovementRepository = AppDataSource.getRepository('StockMovement');
    
    let query = inventoryRepository.createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.supplier', 'supplier')
      .leftJoinAndSelect('inventory.alerts', 'alerts', 'alerts.status = :alertStatus', { alertStatus: 'active' })
      .select([
        'inventory.sku',
        'inventory.productName',
        'inventory.category',
        'inventory.quantity',
        'inventory.reorderPoint',
        'inventory.averageCost',
        'inventory.status',
        'supplier.companyName',
      ])
      .addSelect('MIN(alerts.alertLevel)', 'alertLevel')
      .where('inventory.status = :status', { status: 'active' });

    if (options.filters?.categories) {
      query = query.andWhere('inventory.category IN (:...categories)', { categories: options.filters.categories });
    }

    if (options.filters?.supplierIds) {
      query = query.andWhere('supplier.id IN (:...supplierIds)', { supplierIds: options.filters.supplierIds });
    }

    const inventoryData = await query
      .groupBy('inventory.id, supplier.companyName')
      .getRawMany();

    return inventoryData.map(item => ({
      sku: item.inventory_sku,
      productName: item.inventory_productName,
      category: item.inventory_category || 'Uncategorized',
      supplier: item.supplier_companyName || 'Direct',
      currentStock: parseInt(item.inventory_quantity),
      reorderPoint: parseInt(item.inventory_reorderPoint || '0'),
      averageCost: parseFloat(item.inventory_averageCost || '0'),
      totalValue: parseInt(item.inventory_quantity) * parseFloat(item.inventory_averageCost || '0'),
      turnoverRate: 0, // Would need calculation from stock movements
      lastMovement: new Date(), // Would need from stock movements
      status: item.inventory_status,
      alertLevel: item.alertLevel || 'none',
    }));
  }

  private async getSalesReportData(options: ReportOptions & { period: string }): Promise<SalesReportData[]> {
    // Mock implementation - would query actual orders and calculate sales data
    return [
      {
        period: options.period,
        orderId: 'ORD-001',
        vendorName: 'Tech Vendor A',
        productName: 'Laptop Pro',
        quantity: 2,
        unitPrice: 1299.99,
        totalAmount: 2599.98,
        commission: 325.00,
        status: 'completed',
        orderDate: new Date(),
      },
      // ... more sales data
    ];
  }

  private async getCommissionReportData(options: ReportOptions): Promise<CommissionReportData[]> {
    const commissionRepository = AppDataSource.getRepository('VendorCommission');
    
    let query = commissionRepository.createQueryBuilder('commission')
      .leftJoinAndSelect('commission.vendor', 'vendor')
      .select([
        'vendor.vendorName',
        'commission.period',
        'commission.totalOrders',
        'commission.grossSales',
        'commission.commissionRate',
        'commission.totalCommission',
        'commission.totalDeductions',
        'commission.netCommission',
        'commission.status',
        'commission.paidAt',
      ])
      .where('commission.createdAt BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });

    if (options.filters?.vendorIds) {
      query = query.andWhere('vendor.id IN (:...vendorIds)', { vendorIds: options.filters.vendorIds });
    }

    const commissions = await query.getMany();
    
    return commissions.map(comm => ({
      vendorName: comm.vendor?.vendorName || 'Unknown',
      period: comm.period,
      totalOrders: comm.totalOrders,
      grossSales: parseFloat(comm.grossSales?.toString() || '0'),
      commissionRate: parseFloat(comm.commissionRate?.toString() || '0'),
      grossCommission: parseFloat(comm.totalCommission?.toString() || '0'),
      deductions: parseFloat(comm.totalDeductions?.toString() || '0'),
      netCommission: parseFloat(comm.netCommission?.toString() || '0'),
      status: comm.status,
      paidDate: comm.paidAt,
    }));
  }

  private async executeCustomQuery(customQuery: any, options: ReportOptions): Promise<any> {
    // Implement custom query execution
    // This would need proper query building and security validation
    return [];
  }

  private async generateSalesSummary(salesData: SalesReportData[], options: ReportOptions) {
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalOrders = salesData.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      period: options.groupBy || 'day',
    };
  }

  private async generateCommissionSummary(commissionData: CommissionReportData[]) {
    const totalGrossCommission = commissionData.reduce((sum, comm) => sum + comm.grossCommission, 0);
    const totalDeductions = commissionData.reduce((sum, comm) => sum + comm.deductions, 0);
    const totalNetCommission = commissionData.reduce((sum, comm) => sum + comm.netCommission, 0);
    const paidCommissions = commissionData.filter(c => c.status === 'paid').length;

    return {
      totalGrossCommission,
      totalDeductions,
      totalNetCommission,
      totalVendors: commissionData.length,
      paidCommissions,
      pendingCommissions: commissionData.length - paidCommissions,
    };
  }

  private async generateSalesTrends(options: ReportOptions) {
    // Use existing analytics service to get trends
    const groupBy = options.groupBy === 'quarter' ? 'month' : (options.groupBy || 'day');
    return await this.analyticsService.getSalesTrends(
      options.startDate,
      options.endDate,
      groupBy as 'day' | 'week' | 'month'
    );
  }

  private async generateReportFile(
    report: ReportData, 
    data: any, 
    options: ReportOptions
  ): Promise<string> {
    const fileName = `${report.id}.${this.getFileExtension(options.format)}`;
    const filePath = path.join(this.reportsDir, fileName);

    switch (options.format) {
      case 'csv':
        await this.generateCSVFile(filePath, data);
        break;
      case 'excel':
        await this.generateExcelFile(filePath, data);
        break;
      case 'pdf':
        await this.generatePDFFile(filePath, report, data);
        break;
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }

    return filePath;
  }

  private async generateCSVFile(filePath: string, data: any): Promise<void> {
    // Handle different data structures
    let records: any[] = [];
    
    if (Array.isArray(data)) {
      records = data;
    } else if (data.sales) {
      records = data.sales;
    } else if (data.commissions) {
      records = data.commissions;
    } else {
      // Convert object to array of key-value pairs
      records = Object.entries(data).map(([key, value]) => ({ key, value }));
    }

    if (records.length === 0) {
      fs.writeFileSync(filePath, 'No data available\n');
      return;
    }

    const headers = Object.keys(records[0]).map(key => ({ id: key, title: key }));
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers,
    });

    await csvWriter.writeRecords(records);
  }

  private async generateExcelFile(filePath: string, data: any): Promise<void> {
    const workbook = XLSX.utils.book_new();
    
    if (Array.isArray(data)) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    } else {
      // Create multiple sheets for different data sections
      Object.entries(data).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          const worksheet = XLSX.utils.json_to_sheet(value);
          XLSX.utils.book_append_sheet(workbook, worksheet, key);
        }
      });
    }

    XLSX.writeFile(workbook, filePath);
  }

  private async generatePDFFile(filePath: string, report: ReportData, data: any): Promise<void> {
    const PDFDocument = (PDFKit as any).default || PDFKit;
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(report.title, { align: 'center' });
    doc.fontSize(12).text(report.description, { align: 'center' });
    doc.moveDown();

    // Report info
    doc.text(`Generated: ${report.generatedAt.toISOString()}`);
    doc.text(`Period: ${report.metadata.period}`);
    doc.text(`Records: ${report.metadata.recordCount}`);
    doc.moveDown();

    // Data summary
    if (data.summary) {
      doc.fontSize(16).text('Summary', { underline: true });
      Object.entries(data.summary).forEach(([key, value]) => {
        doc.fontSize(12).text(`${key}: ${value}`);
      });
      doc.moveDown();
    }

    // Simple table for first few records
    if (Array.isArray(data) || data.sales || data.commissions) {
      const records = Array.isArray(data) ? data : (data.sales || data.commissions);
      
      if (records && records.length > 0) {
        doc.fontSize(16).text('Data', { underline: true });
        
        // Show first 10 records in a simple format
        const sampleRecords = records.slice(0, 10);
        sampleRecords.forEach((record: any, index: number) => {
          doc.fontSize(12).text(`Record ${index + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            doc.text(`  ${key}: ${value}`);
          });
          doc.moveDown();
        });
        
        if (records.length > 10) {
          doc.text(`... and ${records.length - 10} more records`);
        }
      }
    }

    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  private generateReportId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getFileExtension(format: string): string {
    switch (format) {
      case 'csv': return 'csv';
      case 'excel': return 'xlsx';
      case 'pdf': return 'pdf';
      default: return 'json';
    }
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'csv': return 'text/csv';
      case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf': return 'application/pdf';
      default: return 'application/json';
    }
  }
}