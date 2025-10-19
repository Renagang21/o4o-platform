export interface BackupConfig {
    enabled: boolean;
    schedule: string;
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
    lastBackupDuration: number;
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
declare class BackupService {
    private cronJob;
    private config;
    private status;
    private isInitialized;
    constructor();
    private loadConfig;
    initialize(): Promise<void>;
    private scheduleBackups;
    performBackup(manual?: boolean): Promise<BackupHistory>;
    private backupDatabase;
    private backupFiles;
    private backupUploads;
    private createArchive;
    private uploadToCloud;
    private cleanupOldBackups;
    private sendNotification;
    private loadHistory;
    private saveHistory;
    private fileExists;
    private formatSize;
    getStatus(): BackupStatus;
    getConfig(): BackupConfig;
    updateConfig(newConfig: Partial<BackupConfig>): Promise<void>;
    testBackup(): Promise<{
        success: boolean;
        error?: string;
    }>;
}
export declare const backupService: BackupService;
export {};
//# sourceMappingURL=BackupService.d.ts.map