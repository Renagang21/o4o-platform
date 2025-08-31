import { CronJob } from 'cron';
import { CommissionService } from '../services/commission.service';
import moment from 'moment';
import { AppDataSource } from '../database/connection';

export class CommissionSchedule {
  private commissionService: CommissionService;
  private jobs: CronJob[] = [];

  constructor() {
    // Initialize commission service
    this.commissionService = new CommissionService(
      AppDataSource.getRepository('VendorCommission'),
      AppDataSource.getRepository('CommissionSettlement'),
      AppDataSource.getRepository('VendorInfo'),
      AppDataSource.getRepository('Supplier'),
      AppDataSource.getRepository('Order'),
      AppDataSource.getRepository('SupplierProduct'),
      null // EmailService will be injected separately
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
      console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Error in monthly commission processing:`, error);
    }
  }

  async sendPaymentReminders() {
    // Sending payment reminders...
    
    try {
      const [pendingVendorCommissions, pendingSupplierSettlements] = await Promise.all([
        this.commissionService.getPendingVendorCommissions(),
        this.commissionService.getPendingSupplierSettlements(),
      ]);

      // Found pending vendor commissions
      // Found pending supplier settlements

      // TODO: Implement email reminders for pending payments
      
      // Payment reminders sent successfully
    } catch (error) {
      console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Error sending payment reminders:`, error);
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
      console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Error generating interim reports:`, error);
    }
  }

  async checkDisputedSettlements() {
    // Checking for disputed settlements...
    
    try {
      // TODO: Implement dispute checking and escalation logic
      
      // Dispute check completed
    } catch (error) {
      console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Error checking disputes:`, error);
    }
  }

  async autoApproveCommissions() {
    // Auto-approving eligible commissions...
    
    try {
      // TODO: Implement auto-approval logic based on business rules
      // Example: Auto-approve if amount < $1000 and vendor/supplier is trusted
      
      // Auto-approval completed
    } catch (error) {
      console.error(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] Error in auto-approval:`, error);
    }
  }
}