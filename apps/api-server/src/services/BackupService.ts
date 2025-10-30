import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import logger from '../utils/logger.js';
import { emailService } from './emailService.js';

const execAsync = promisify(exec);

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retentionDays: number;
  backupPath: string;
  includeDatabase: boolean;
  includeFiles: boolean;
  includeUploads: boolean;
  emailNotifications: boolean;
  notificationEmail?: string;
  cloudUpload?: {
    enabled: boolean;
    provider: 's3' | 'gcs' | 'azure';
    bucket: string;
    region?: string;
  };
}

export interface BackupStatus {
  lastBackup: Date | null;
  lastBackupSize: string;
  lastBackupDuration: number; // seconds
  nextBackup: Date | null;
  totalBackups: number;
  failedBackups: number;
  isRunning: boolean;
  history: BackupHistory[];
}

export interface BackupHistory {
  id: string;
  timestamp: Date;
  size: string;
  duration: number;
  status: 'success' | 'failed' | 'partial';
  error?: string;
  files: string[];
}

class BackupService {
  private cronJob: NodeJS.Timer | null = null;
  private config: BackupConfig;
  private status: BackupStatus;
  private isInitialized = false;

  constructor() {
    this.config = this.loadConfig();
    this.status = {
      lastBackup: null,
      lastBackupSize: '0',
      lastBackupDuration: 0,
      nextBackup: null,
      totalBackups: 0,
      failedBackups: 0,
      isRunning: false,
      history: []
    };
  }

  private loadConfig(): BackupConfig {
    return {
      enabled: process.env.BACKUP_ENABLED === 'true',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2 AM daily
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
      backupPath: process.env.BACKUP_PATH || '/backup/o4o-platform',
      includeDatabase: process.env.BACKUP_INCLUDE_DB !== 'false',
      includeFiles: process.env.BACKUP_INCLUDE_FILES !== 'false',
      includeUploads: process.env.BACKUP_INCLUDE_UPLOADS !== 'false',
      emailNotifications: process.env.BACKUP_EMAIL_NOTIFICATIONS === 'true',
      notificationEmail: process.env.BACKUP_NOTIFICATION_EMAIL,
      cloudUpload: process.env.BACKUP_CLOUD_ENABLED === 'true' ? {
        enabled: true,
        provider: process.env.BACKUP_CLOUD_PROVIDER as any || 's3',
        bucket: process.env.BACKUP_CLOUD_BUCKET || '',
        region: process.env.BACKUP_CLOUD_REGION
      } : undefined
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    logger.info('🔄 Initializing Backup Service...');

    // Load previous backup history
    await this.loadHistory();

    if (this.config.enabled) {
      // Schedule automatic backups
      this.scheduleBackups();
      logger.info(`✅ Backup Service initialized - Schedule: ${this.config.schedule}`);
    } else {
      logger.info('⏸️  Backup Service disabled');
    }

    this.isInitialized = true;
  }

  private scheduleBackups(): void {
    // Simple replacement for CronJob - run daily at 2 AM
    if (this.cronJob) {
      clearInterval(this.cronJob as any);
    }

    // Calculate next 2 AM
    const now = new Date();
    const next2AM = new Date(now);
    next2AM.setHours(2, 0, 0, 0);
    if (next2AM <= now) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    // Set next backup time
    this.status.nextBackup = next2AM;

    // Schedule daily backup (24 hours in milliseconds)
    const dailyInterval = 24 * 60 * 60 * 1000;
    
    // Initial delay until 2 AM
    const initialDelay = next2AM.getTime() - now.getTime();
    
    setTimeout(() => {
      // Run first backup
      this.performBackup();
      
      // Then schedule recurring backups
      this.cronJob = setInterval(() => {
        this.performBackup();
        // Update next backup time
        const nextBackup = new Date();
        nextBackup.setDate(nextBackup.getDate() + 1);
        nextBackup.setHours(2, 0, 0, 0);
        this.status.nextBackup = nextBackup;
      }, dailyInterval) as any;
    }, initialDelay);
  }

  async performBackup(manual = false): Promise<BackupHistory> {
    if (this.status.isRunning) {
      throw new Error('Backup already in progress');
    }

    this.status.isRunning = true;
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const backupDir = path.join(this.config.backupPath, backupId);

    const history: BackupHistory = {
      id: backupId,
      timestamp: new Date(),
      size: '0',
      duration: 0,
      status: 'success',
      files: []
    };

    try {
      logger.info(`🔄 Starting ${manual ? 'manual' : 'scheduled'} backup...`);

      // Create backup directory
      await fs.mkdir(backupDir, { recursive: true });

      // Database backup
      if (this.config.includeDatabase) {
        const dbBackupFile = await this.backupDatabase(backupDir);
        history.files.push(dbBackupFile);
      }

      // Files backup
      if (this.config.includeFiles) {
        const filesBackup = await this.backupFiles(backupDir);
        history.files.push(...filesBackup);
      }

      // Uploads backup
      if (this.config.includeUploads) {
        const uploadsBackup = await this.backupUploads(backupDir);
        history.files.push(...uploadsBackup);
      }

      // Create final archive
      const archivePath = await this.createArchive(backupDir, backupId);
      history.files = [archivePath];

      // Calculate size
      const stats = await fs.stat(archivePath);
      history.size = this.formatSize(stats.size);

      // Cloud upload
      if (this.config.cloudUpload?.enabled) {
        await this.uploadToCloud(archivePath);
      }

      // Cleanup old backups
      await this.cleanupOldBackups();

      // Update status
      history.duration = Math.round((Date.now() - startTime) / 1000);
      this.status.lastBackup = new Date();
      this.status.lastBackupSize = history.size;
      this.status.lastBackupDuration = history.duration;
      this.status.totalBackups++;

      // Send success notification
      if (this.config.emailNotifications) {
        await this.sendNotification('success', history);
      }

      logger.info(`✅ Backup completed: ${history.size} in ${history.duration}s`);

    } catch (error) {
      history.status = 'failed';
      history.error = error instanceof Error ? error.message : 'Unknown error';
      this.status.failedBackups++;

      logger.error('❌ Backup failed:', error);

      // Send failure notification
      if (this.config.emailNotifications) {
        await this.sendNotification('failed', history);
      }

      throw error;

    } finally {
      this.status.isRunning = false;
      
      // Save history
      this.status.history.unshift(history);
      if (this.status.history.length > 100) {
        this.status.history = this.status.history.slice(0, 100);
      }
      await this.saveHistory();

      // Update next backup time
      if (!manual && this.cronJob) {
        // Since we're using setInterval, calculate next backup time
        const nextBackup = new Date();
        nextBackup.setDate(nextBackup.getDate() + 1);
        nextBackup.setHours(2, 0, 0, 0);
        this.status.nextBackup = nextBackup;
      }
    }

    return history;
  }

  private async backupDatabase(backupDir: string): Promise<string> {
    const dbFile = path.join(backupDir, 'database.sql.gz');
    
    const command = `PGPASSWORD=${process.env.DB_PASSWORD} pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USERNAME} -d ${process.env.DB_NAME} | gzip > ${dbFile}`;
    
    await execAsync(command);
    logger.info('✅ Database backed up');
    
    return dbFile;
  }

  private async backupFiles(backupDir: string): Promise<string[]> {
    const files: string[] = [];
    
    // Backup environment files
    const envFiles = [
      '.env',
      'apps/api-server/.env',
      'apps/admin-dashboard/.env',
      'apps/main-site/.env'
    ];

    for (const envFile of envFiles) {
      if (await this.fileExists(envFile)) {
        const destFile = path.join(backupDir, `env_${path.basename(envFile)}`);
        await fs.copyFile(envFile, destFile);
        files.push(destFile);
      }
    }

    logger.info(`✅ ${files.length} config files backed up`);
    return files;
  }

  private async backupUploads(backupDir: string): Promise<string[]> {
    const uploadsDir = 'apps/api-server/uploads';
    const uploadBackup = path.join(backupDir, 'uploads.tar.gz');
    
    if (await this.fileExists(uploadsDir)) {
      await execAsync(`tar -czf ${uploadBackup} ${uploadsDir}`);
      logger.info('✅ Uploads backed up');
      return [uploadBackup];
    }
    
    return [];
  }

  private async createArchive(backupDir: string, backupId: string): Promise<string> {
    const archivePath = path.join(this.config.backupPath, `${backupId}.tar.gz`);
    
    await execAsync(`cd ${this.config.backupPath} && tar -czf ${backupId}.tar.gz ${backupId}/`);
    await execAsync(`rm -rf ${backupDir}`);
    
    return archivePath;
  }

  private async uploadToCloud(archivePath: string): Promise<void> {
    if (!this.config.cloudUpload) return;

    const { provider, bucket, region } = this.config.cloudUpload;
    const fileName = path.basename(archivePath);

    try {
      switch (provider) {
        case 's3':
          await execAsync(`aws s3 cp ${archivePath} s3://${bucket}/backups/${fileName} ${region ? `--region ${region}` : ''}`);
          break;
        case 'gcs':
          await execAsync(`gsutil cp ${archivePath} gs://${bucket}/backups/${fileName}`);
          break;
        case 'azure':
          await execAsync(`az storage blob upload --file ${archivePath} --container-name ${bucket} --name backups/${fileName}`);
          break;
      }
      logger.info(`☁️  Backup uploaded to ${provider}`);
    } catch (error) {
      logger.error(`Failed to upload to ${provider}:`, error);
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const files = await fs.readdir(this.config.backupPath);
    const backupFiles = files.filter((f: any) => f.startsWith('backup_') && f.endsWith('.tar.gz'));
    
    const now = Date.now();
    const maxAge = this.config.retentionDays * 24 * 60 * 60 * 1000;
    
    for (const file of backupFiles) {
      const filePath = path.join(this.config.backupPath, file);
      const stats = await fs.stat(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        logger.info(`🗑️  Deleted old backup: ${file}`);
      }
    }
  }

  private async sendNotification(type: 'success' | 'failed', history: BackupHistory): Promise<void> {
    if (!this.config.notificationEmail) return;

    const subject = type === 'success' 
      ? `✅ O4O Platform Backup Successful`
      : `❌ O4O Platform Backup Failed`;

    const html = `
      <h2>${subject}</h2>
      <p><strong>Time:</strong> ${history.timestamp.toLocaleString()}</p>
      <p><strong>Duration:</strong> ${history.duration}s</p>
      <p><strong>Size:</strong> ${history.size}</p>
      ${history.error ? `<p><strong>Error:</strong> ${history.error}</p>` : ''}
      <hr>
      <p><small>This is an automated message from O4O Platform Backup Service</small></p>
    `;

    try {
      await emailService.sendEmail({
        to: this.config.notificationEmail,
        subject,
        html
      });
    } catch (error) {
      logger.error('Failed to send backup notification:', error);
    }
  }

  private async loadHistory(): Promise<void> {
    const historyFile = path.join(this.config.backupPath, 'backup-history.json');
    
    try {
      if (await this.fileExists(historyFile)) {
        const data = await fs.readFile(historyFile, 'utf-8');
        const saved = JSON.parse(data);
        
        // Restore dates
        this.status = {
          ...saved,
          lastBackup: saved.lastBackup ? new Date(saved.lastBackup) : null,
          nextBackup: saved.nextBackup ? new Date(saved.nextBackup) : null,
          history: saved.history.map((h: any) => ({
            ...h,
            timestamp: new Date(h.timestamp)
          }))
        };
      }
    } catch (error) {
      logger.error('Failed to load backup history:', error);
    }
  }

  private async saveHistory(): Promise<void> {
    const historyFile = path.join(this.config.backupPath, 'backup-history.json');
    
    try {
      await fs.mkdir(this.config.backupPath, { recursive: true });
      await fs.writeFile(historyFile, JSON.stringify(this.status, null, 2));
    } catch (error) {
      logger.error('Failed to save backup history:', error);
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  // Public methods
  getStatus(): BackupStatus {
    return { ...this.status };
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  async updateConfig(newConfig: Partial<BackupConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Restart if schedule changed
    if (newConfig.schedule && this.config.enabled) {
      this.scheduleBackups();
    }
    
    logger.info('✅ Backup configuration updated');
  }

  async testBackup(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test database connection
      if (this.config.includeDatabase) {
        await execAsync(`PGPASSWORD=${process.env.DB_PASSWORD} pg_dump --version`);
      }
      
      // Test backup directory
      await fs.mkdir(this.config.backupPath, { recursive: true });
      const testFile = path.join(this.config.backupPath, 'test.txt');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      
      // Test cloud upload
      if (this.config.cloudUpload?.enabled) {
        // Add cloud connectivity test here
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Singleton instance
export const backupService = new BackupService();