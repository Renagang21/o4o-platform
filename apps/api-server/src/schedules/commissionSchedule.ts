import { CronJob } from 'cron';
import { CommissionService } from '../services/commission.service';
import { EmailService } from '../services/email.service';
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
import { AppDataSource } from '../database/connection';

export class CommissionSchedule {
  private commissionService: CommissionService;
  private emailService: EmailService;
  private jobs: CronJob[] = [];

  constructor() {
    // Initialize services
    this.emailService = new EmailService();
    this.commissionService = new CommissionService(
      AppDataSource.getRepository('VendorCommission'),
      AppDataSource.getRepository('CommissionSettlement'),
      AppDataSource.getRepository('VendorInfo'),
      AppDataSource.getRepository('Supplier'),
      AppDataSource.getRepository('Order'),
      AppDataSource.getRepository('SupplierProduct'),
      this.emailService
    );
  }

  start() {
    // Process monthly settlements - runs on the 1st of each month at 2 AM
    const monthlySettlement = new CronJob(
      '0 2 1 * *',
      async () => {
        await this.processMonthlySettlements();
      },
      null,
      true,
      'UTC'
    );
    this.jobs.push(monthlySettlement);

    // Send payment reminders - runs on the 5th of each month at 10 AM
    const paymentReminders = new CronJob(
      '0 10 5 * *',
      async () => {
        await this.sendPaymentReminders();
      },
      null,
      true,
      'UTC'
    );
    this.jobs.push(paymentReminders);

    // Generate interim reports - runs every Monday at 9 AM
    const interimReports = new CronJob(
      '0 9 * * MON',
      async () => {
        await this.generateInterimReports();
      },
      null,
      true,
      'UTC'
    );
    this.jobs.push(interimReports);

    // Check for disputed settlements - runs daily at 11 AM
    const disputeCheck = new CronJob(
      '0 11 * * *',
      async () => {
        await this.checkDisputedSettlements();
      },
      null,
      true,
      'UTC'
    );
    this.jobs.push(disputeCheck);

    // Auto-approve eligible commissions - runs daily at 3 AM
    const autoApprove = new CronJob(
      '0 3 * * *',
      async () => {
        await this.autoApproveCommissions();
      },
      null,
      true,
      'UTC'
    );
    this.jobs.push(autoApprove);

    // Commission schedule started
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    // Commission schedule stopped
  }

  async processMonthlySettlements() {
    // Starting monthly commission processing...
    
    try {
      await this.commissionService.processMonthlySettlements();
      // Monthly commission processing completed successfully
    } catch (error) {
      // Error log removed
    }
  }

  async sendPaymentReminders() {
    // Sending payment reminders...
    
    try {
      const [pendingVendorCommissions, pendingSupplierSettlements] = await Promise.all([
        this.commissionService.getPendingVendorCommissions(),
        this.commissionService.getPendingSupplierSettlements(),
      ]);

      // Send reminders for vendor commissions
      for (const commission of pendingVendorCommissions) {
        // Skip if vendor doesn't have contact info
        if (!commission.vendor) continue;
        
        // Get vendor contact email (would need to be added to VendorInfo entity)
        const vendorEmail = (commission.vendor as any).contactEmail || 'vendor@neture.co.kr';
        
        await this.emailService.sendSettlementRequestEmail(vendorEmail, {
          recipientName: commission.vendor.vendorName,
          requestId: `COMM-${commission.id.substring(0, 8)}`,
          requestDate: dayjs().format('YYYY-MM-DD'),
          settlementPeriod: `${dayjs(commission.createdAt).format('YYYY-MM-DD')} ~ ${dayjs().format('YYYY-MM-DD')}`,
          transactionCount: 1,
          settlementAmount: ((commission as any).totalCommission || 0).toLocaleString('ko-KR'),
          bankName: (commission.vendor as any).bankName || '미등록',
          accountNumber: (commission.vendor as any).bankAccountNumber || '미등록',
          accountHolder: (commission.vendor as any).bankAccountHolder || commission.vendor.vendorName,
          reviewDeadline: dayjs().add(7, 'days').format('YYYY-MM-DD'),
          expectedPaymentDate: dayjs().add(10, 'days').format('YYYY-MM-DD')
        });
      }

      // Send reminders for supplier settlements
      for (const settlement of pendingSupplierSettlements) {
        if (!settlement.supplier) continue;
        
        const supplierEmail = (settlement.supplier as any).contactEmail || 'supplier@neture.co.kr';
        const supplierName = (settlement.supplier as any).name || 'Supplier';
        
        await this.emailService.sendSettlementRequestEmail(supplierEmail, {
          recipientName: supplierName,
          requestId: `SETT-${settlement.id.substring(0, 8)}`,
          requestDate: dayjs().format('YYYY-MM-DD'),
          settlementPeriod: `${dayjs(settlement.startDate).format('YYYY-MM-DD')} ~ ${dayjs(settlement.endDate).format('YYYY-MM-DD')}`,
          transactionCount: (settlement as any).totalOrders || 1,
          settlementAmount: ((settlement as any).totalAmount || 0).toLocaleString('ko-KR'),
          bankName: settlement.supplier.bankName || '미등록',
          accountNumber: settlement.supplier.bankAccountNumber || '미등록',
          accountHolder: settlement.supplier.bankAccountHolder || supplierName,
          reviewDeadline: dayjs().add(7, 'days').format('YYYY-MM-DD'),
          expectedPaymentDate: dayjs().add(10, 'days').format('YYYY-MM-DD')
        });
      }
      
      // Payment reminders sent successfully
    } catch (error) {
      // Error log removed
    }
  }

  async generateInterimReports() {
    // Generating interim commission reports...
    
    try {
      const statistics = await this.commissionService.getCommissionStatistics();
      
      // Commission Statistics logged
      const stats = {
        vendorCommissions: statistics.vendorCommissions,
        supplierSettlements: statistics.supplierSettlements,
        totalPending: statistics.totalPending,
      };

      // TODO: Send weekly report to admin
      
      // Interim reports generated successfully
    } catch (error) {
      // Error log removed
    }
  }

  async checkDisputedSettlements() {
    // Checking for disputed settlements...
    
    try {
      // TODO: Implement dispute checking and escalation logic
      
      // Dispute check completed
    } catch (error) {
      // Error log removed
    }
  }

  async autoApproveCommissions() {
    // Auto-approving eligible commissions...
    
    try {
      // Get pending commissions
      const [pendingVendorCommissions, pendingSupplierSettlements] = await Promise.all([
        this.commissionService.getPendingVendorCommissions(),
        this.commissionService.getPendingSupplierSettlements(),
      ]);

      // Auto-approve vendor commissions based on business rules
      for (const commission of pendingVendorCommissions) {
        const commissionAmount = (commission as any).totalCommission || 0;
        const shouldAutoApprove = 
          commissionAmount < 1000000 && // Less than 1M KRW
          commission.vendor && 
          (commission.vendor as any).status === 'active' && 
          dayjs().diff(dayjs(commission.createdAt), 'days') >= 7; // At least 7 days old

        if (shouldAutoApprove) {
          commission.status = 'APPROVED';
          commission.approvedAt = new Date();
          commission.approvedBy = 'SYSTEM_AUTO';
          await AppDataSource.getRepository('VendorCommission').save(commission);

          // Send approval notification
          const vendorEmail = (commission.vendor as any).contactEmail || 'vendor@neture.co.kr';
          
          await this.emailService.sendCommissionCalculatedEmail(vendorEmail, {
            vendorName: commission.vendor.vendorName,
            orderDate: dayjs(commission.createdAt).format('YYYY-MM-DD'),
            orderId: (commission as any).orderId || 'N/A',
            orderAmount: ((commission as any).orderAmount || 0).toLocaleString('ko-KR'),
            commissionRate: commission.commissionRate || 0,
            commissionAmount: ((commission as any).totalCommission || 0).toLocaleString('ko-KR'),
            settlementDate: dayjs().add(30, 'days').format('YYYY-MM-DD'),
            pendingAmount: ((commission as any).totalCommission || 0).toLocaleString('ko-KR'),
            settlementStatus: '정산 예정'
          });
        }
      }

      // Auto-approve supplier settlements based on business rules
      for (const settlement of pendingSupplierSettlements) {
        const settlementAmount = (settlement as any).totalAmount || 0;
        const shouldAutoApprove = 
          settlementAmount < 5000000 && // Less than 5M KRW
          settlement.supplier && 
          settlement.supplier.status === 'active' &&
          (settlement.supplier as any).rating >= 4.5 &&
          !(settlement as any).hasDispute &&
          dayjs().diff(dayjs(settlement.createdAt), 'days') >= 14; // At least 14 days old

        if (shouldAutoApprove) {
          settlement.status = 'APPROVED';
          settlement.approvedAt = new Date();
          settlement.approvedBy = 'SYSTEM_AUTO';
          await AppDataSource.getRepository('CommissionSettlement').save(settlement);

          // Send approval notification  
          const supplierEmail = (settlement.supplier as any).contactEmail || 'supplier@neture.co.kr';
          const supplierName = (settlement.supplier as any).name || 'Supplier';
          
          await this.emailService.sendSettlementRequestEmail(supplierEmail, {
            recipientName: supplierName,
            requestId: `SETT-${settlement.id.substring(0, 8)}`,
            requestDate: dayjs().format('YYYY-MM-DD'),
            settlementPeriod: `${dayjs(settlement.startDate).format('YYYY-MM-DD')} ~ ${dayjs(settlement.endDate).format('YYYY-MM-DD')}`,
            transactionCount: (settlement as any).totalOrders || 1,
            settlementAmount: ((settlement as any).totalAmount || 0).toLocaleString('ko-KR'),
            bankName: settlement.supplier.bankName || '미등록',
            accountNumber: settlement.supplier.bankAccountNumber || '미등록',
            accountHolder: settlement.supplier.bankAccountHolder || supplierName,
            reviewDeadline: dayjs().add(3, 'days').format('YYYY-MM-DD'),
            expectedPaymentDate: dayjs().add(5, 'days').format('YYYY-MM-DD')
          });
        }
      }
      
      // Auto-approval completed
    } catch (error) {
      // Error log removed
    }
  }
}