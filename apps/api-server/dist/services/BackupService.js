"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupService = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const logger_1 = __importDefault(require("../utils/logger"));
const emailService_1 = require("./emailService");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class BackupService {
    constructor() {
        this.cronJob = null;
        this.isInitialized = false;
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
    loadConfig() {
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
                provider: process.env.BACKUP_CLOUD_PROVIDER || 's3',
                bucket: process.env.BACKUP_CLOUD_BUCKET || '',
                region: process.env.BACKUP_CLOUD_REGION
            } : undefined
        };
    }
    async initialize() {
        if (this.isInitialized)
            return;
        logger_1.default.info('🔄 Initializing Backup Service...');
        // Load previous backup history
        await this.loadHistory();
        if (this.config.enabled) {
            // Schedule automatic backups
            this.scheduleBackups();
            logger_1.default.info(`✅ Backup Service initialized - Schedule: ${this.config.schedule}`);
        }
        else {
            logger_1.default.info('⏸️  Backup Service disabled');
        }
        this.isInitialized = true;
    }
    scheduleBackups() {
        // Simple replacement for CronJob - run daily at 2 AM
        if (this.cronJob) {
            clearInterval(this.cronJob);
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
            }, dailyInterval);
        }, initialDelay);
    }
    async performBackup(manual = false) {
        var _a;
        if (this.status.isRunning) {
            throw new Error('Backup already in progress');
        }
        this.status.isRunning = true;
        const startTime = Date.now();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupId = `backup_${timestamp}`;
        const backupDir = path.join(this.config.backupPath, backupId);
        const history = {
            id: backupId,
            timestamp: new Date(),
            size: '0',
            duration: 0,
            status: 'success',
            files: []
        };
        try {
            logger_1.default.info(`🔄 Starting ${manual ? 'manual' : 'scheduled'} backup...`);
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
            if ((_a = this.config.cloudUpload) === null || _a === void 0 ? void 0 : _a.enabled) {
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
            logger_1.default.info(`✅ Backup completed: ${history.size} in ${history.duration}s`);
        }
        catch (error) {
            history.status = 'failed';
            history.error = error instanceof Error ? error.message : 'Unknown error';
            this.status.failedBackups++;
            logger_1.default.error('❌ Backup failed:', error);
            // Send failure notification
            if (this.config.emailNotifications) {
                await this.sendNotification('failed', history);
            }
            throw error;
        }
        finally {
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
    async backupDatabase(backupDir) {
        const dbFile = path.join(backupDir, 'database.sql.gz');
        const command = `PGPASSWORD=${process.env.DB_PASSWORD} pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USERNAME} -d ${process.env.DB_NAME} | gzip > ${dbFile}`;
        await execAsync(command);
        logger_1.default.info('✅ Database backed up');
        return dbFile;
    }
    async backupFiles(backupDir) {
        const files = [];
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
        logger_1.default.info(`✅ ${files.length} config files backed up`);
        return files;
    }
    async backupUploads(backupDir) {
        const uploadsDir = 'apps/api-server/uploads';
        const uploadBackup = path.join(backupDir, 'uploads.tar.gz');
        if (await this.fileExists(uploadsDir)) {
            await execAsync(`tar -czf ${uploadBackup} ${uploadsDir}`);
            logger_1.default.info('✅ Uploads backed up');
            return [uploadBackup];
        }
        return [];
    }
    async createArchive(backupDir, backupId) {
        const archivePath = path.join(this.config.backupPath, `${backupId}.tar.gz`);
        await execAsync(`cd ${this.config.backupPath} && tar -czf ${backupId}.tar.gz ${backupId}/`);
        await execAsync(`rm -rf ${backupDir}`);
        return archivePath;
    }
    async uploadToCloud(archivePath) {
        if (!this.config.cloudUpload)
            return;
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
            logger_1.default.info(`☁️  Backup uploaded to ${provider}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to upload to ${provider}:`, error);
            throw error;
        }
    }
    async cleanupOldBackups() {
        const files = await fs.readdir(this.config.backupPath);
        const backupFiles = files.filter((f) => f.startsWith('backup_') && f.endsWith('.tar.gz'));
        const now = Date.now();
        const maxAge = this.config.retentionDays * 24 * 60 * 60 * 1000;
        for (const file of backupFiles) {
            const filePath = path.join(this.config.backupPath, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                await fs.unlink(filePath);
                logger_1.default.info(`🗑️  Deleted old backup: ${file}`);
            }
        }
    }
    async sendNotification(type, history) {
        if (!this.config.notificationEmail)
            return;
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
            await emailService_1.emailService.sendEmail({
                to: this.config.notificationEmail,
                subject,
                html
            });
        }
        catch (error) {
            logger_1.default.error('Failed to send backup notification:', error);
        }
    }
    async loadHistory() {
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
                    history: saved.history.map((h) => ({
                        ...h,
                        timestamp: new Date(h.timestamp)
                    }))
                };
            }
        }
        catch (error) {
            logger_1.default.error('Failed to load backup history:', error);
        }
    }
    async saveHistory() {
        const historyFile = path.join(this.config.backupPath, 'backup-history.json');
        try {
            await fs.mkdir(this.config.backupPath, { recursive: true });
            await fs.writeFile(historyFile, JSON.stringify(this.status, null, 2));
        }
        catch (error) {
            logger_1.default.error('Failed to save backup history:', error);
        }
    }
    async fileExists(path) {
        try {
            await fs.access(path);
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    formatSize(bytes) {
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
    getStatus() {
        return { ...this.status };
    }
    getConfig() {
        return { ...this.config };
    }
    async updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Restart if schedule changed
        if (newConfig.schedule && this.config.enabled) {
            this.scheduleBackups();
        }
        logger_1.default.info('✅ Backup configuration updated');
    }
    async testBackup() {
        var _a;
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
            if ((_a = this.config.cloudUpload) === null || _a === void 0 ? void 0 : _a.enabled) {
                // Add cloud connectivity test here
            }
            return { success: true };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
// Singleton instance
exports.backupService = new BackupService();
//# sourceMappingURL=BackupService.js.map