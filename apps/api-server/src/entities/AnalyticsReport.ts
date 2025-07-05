import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

export enum ReportCategory {
  USER_ACTIVITY = 'user_activity',
  SYSTEM_PERFORMANCE = 'system_performance',
  CONTENT_USAGE = 'content_usage',
  FEEDBACK_ANALYSIS = 'feedback_analysis',
  ERROR_ANALYSIS = 'error_analysis',
  BUSINESS_METRICS = 'business_metrics',
  COMPREHENSIVE = 'comprehensive'
}

export enum ReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('analytics_reports')
@Index(['reportType', 'reportCategory', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['reportPeriodStart', 'reportPeriodEnd'])
export class AnalyticsReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: ReportType })
  reportType!: ReportType;

  @Column({ type: 'enum', enum: ReportCategory })
  reportCategory!: ReportCategory;

  @Column({ type: 'varchar', length: 255 })
  reportName!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status!: ReportStatus;

  // Report period
  @Column({ type: 'timestamp' })
  reportPeriodStart!: Date;

  @Column({ type: 'timestamp' })
  reportPeriodEnd!: Date;

  // Generation details
  @Column({ type: 'uuid', nullable: true })
  generatedBy?: string; // User ID who requested the report

  @Column({ type: 'timestamp', nullable: true })
  generatedAt?: Date;

  @Column({ type: 'int', nullable: true })
  generationTimeMs?: number;

  @Column({ type: 'text', nullable: true })
  generationError?: string;

  // Report data
  @Column({ type: 'json', nullable: true })
  summary?: {
    totalUsers?: number;
    activeUsers?: number;
    newUsers?: number;
    totalSessions?: number;
    avgSessionDuration?: number;
    totalPageViews?: number;
    totalActions?: number;
    totalFeedback?: number;
    totalErrors?: number;
    systemUptime?: number;
    avgResponseTime?: number;
    [key: string]: any;
  };

  @Column({ type: 'json', nullable: true })
  userMetrics?: {
    demographics?: {
      userTypes?: Record<string, number>;
      interestAreas?: Record<string, number>;
      countries?: Record<string, number>;
      devices?: Record<string, number>;
    };
    engagement?: {
      dailyActiveUsers?: number[];
      sessionDurations?: number[];
      pageViewsPerSession?: number[];
      actionsPerSession?: number[];
      returnUsers?: number;
      churnRate?: number;
    };
    behavior?: {
      topPages?: Array<{ page: string; views: number }>;
      topFeatures?: Array<{ feature: string; usage: number }>;
      userJourney?: Array<{ step: string; count: number; dropoffRate?: number }>;
    };
  };

  @Column({ type: 'json', nullable: true })
  systemMetrics?: {
    performance?: {
      avgResponseTime?: number;
      avgLoadTime?: number;
      errorRate?: number;
      uptime?: number;
      throughput?: number;
    };
    resources?: {
      cpuUsage?: number[];
      memoryUsage?: number[];
      storageUsage?: number;
      networkLatency?: number;
    };
    errors?: {
      errorsByType?: Record<string, number>;
      errorsByEndpoint?: Record<string, number>;
      errorTrends?: number[];
      criticalErrors?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  contentMetrics?: {
    usage?: {
      totalContentViews?: number;
      topContent?: Array<{ title: string; views: number; duration: number }>;
      contentByType?: Record<string, number>;
      engagementRate?: number;
    };
    signage?: {
      signageCreated?: number;
      playlistsCreated?: number;
      templatesUsed?: Record<string, number>;
      schedulesCreated?: number;
    };
    performance?: {
      avgLoadTime?: number;
      playbackSuccess?: number;
      errorRate?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  feedbackMetrics?: {
    overview?: {
      totalFeedback?: number;
      avgRating?: number;
      responseRate?: number;
      sentimentScore?: number;
    };
    categories?: {
      bugReports?: number;
      featureRequests?: number;
      generalFeedback?: number;
      complaints?: number;
    };
    trends?: {
      feedbackOverTime?: number[];
      ratingTrends?: number[];
      categoryTrends?: Record<string, number[]>;
    };
    insights?: {
      commonIssues?: Array<{ issue: string; count: number }>;
      requestedFeatures?: Array<{ feature: string; count: number }>;
      userSatisfaction?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  businessMetrics?: {
    conversion?: {
      signupRate?: number;
      activationRate?: number;
      retentionRate?: number;
      churnRate?: number;
    };
    growth?: {
      userGrowth?: number[];
      usageGrowth?: number[];
      engagementGrowth?: number[];
    };
    roi?: {
      userAcquisitionCost?: number;
      lifetimeValue?: number;
      returnOnInvestment?: number;
    };
  };

  // File storage
  @Column({ type: 'varchar', length: 500, nullable: true })
  reportFilePath?: string; // Path to generated report file (PDF, CSV, etc.)

  @Column({ type: 'varchar', length: 100, nullable: true })
  reportFileType?: string; // pdf, csv, xlsx, json

  @Column({ type: 'int', nullable: true })
  reportFileSize?: number; // in bytes

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Static factory methods
  static createDailyReport(
    category: ReportCategory,
    date: Date,
    name?: string
  ): Partial<AnalyticsReport> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      reportType: ReportType.DAILY,
      reportCategory: category,
      reportName: name || `Daily ${category.replace('_', ' ')} Report - ${date.toDateString()}`,
      reportPeriodStart: startOfDay,
      reportPeriodEnd: endOfDay,
      status: ReportStatus.PENDING
    };
  }

  static createWeeklyReport(
    category: ReportCategory,
    weekStart: Date,
    name?: string
  ): Partial<AnalyticsReport> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      reportType: ReportType.WEEKLY,
      reportCategory: category,
      reportName: name || `Weekly ${category.replace('_', ' ')} Report - ${weekStart.toDateString()}`,
      reportPeriodStart: weekStart,
      reportPeriodEnd: weekEnd,
      status: ReportStatus.PENDING
    };
  }

  static createMonthlyReport(
    category: ReportCategory,
    month: Date,
    name?: string
  ): Partial<AnalyticsReport> {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      reportType: ReportType.MONTHLY,
      reportCategory: category,
      reportName: name || `Monthly ${category.replace('_', ' ')} Report - ${monthStart.toDateString()}`,
      reportPeriodStart: monthStart,
      reportPeriodEnd: monthEnd,
      status: ReportStatus.PENDING
    };
  }

  static createCustomReport(
    category: ReportCategory,
    startDate: Date,
    endDate: Date,
    name: string
  ): Partial<AnalyticsReport> {
    return {
      reportType: ReportType.CUSTOM,
      reportCategory: category,
      reportName: name,
      reportPeriodStart: startDate,
      reportPeriodEnd: endDate,
      status: ReportStatus.PENDING
    };
  }

  // Instance methods
  markAsGenerating(): void {
    this.status = ReportStatus.GENERATING;
    this.generatedAt = new Date();
  }

  markAsCompleted(generationTimeMs: number, filePath?: string, fileType?: string, fileSize?: number): void {
    this.status = ReportStatus.COMPLETED;
    this.generationTimeMs = generationTimeMs;
    this.reportFilePath = filePath;
    this.reportFileType = fileType;
    this.reportFileSize = fileSize;
  }

  markAsFailed(error: string): void {
    this.status = ReportStatus.FAILED;
    this.generationError = error;
  }

  isCompleted(): boolean {
    return this.status === ReportStatus.COMPLETED;
  }

  isFailed(): boolean {
    return this.status === ReportStatus.FAILED;
  }

  isPending(): boolean {
    return this.status === ReportStatus.PENDING;
  }

  isGenerating(): boolean {
    return this.status === ReportStatus.GENERATING;
  }

  getDurationDays(): number {
    return Math.ceil((this.reportPeriodEnd.getTime() - this.reportPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
  }

  getFormattedPeriod(): string {
    const start = this.reportPeriodStart.toLocaleDateString();
    const end = this.reportPeriodEnd.toLocaleDateString();
    
    if (start === end) {
      return start;
    }
    
    return `${start} - ${end}`;
  }

  getCategoryDisplayName(): string {
    const categoryNames: Record<ReportCategory, string> = {
      [ReportCategory.USER_ACTIVITY]: 'User Activity',
      [ReportCategory.SYSTEM_PERFORMANCE]: 'System Performance',
      [ReportCategory.CONTENT_USAGE]: 'Content Usage',
      [ReportCategory.FEEDBACK_ANALYSIS]: 'Feedback Analysis',
      [ReportCategory.ERROR_ANALYSIS]: 'Error Analysis',
      [ReportCategory.BUSINESS_METRICS]: 'Business Metrics',
      [ReportCategory.COMPREHENSIVE]: 'Comprehensive'
    };
    return categoryNames[this.reportCategory] || 'Unknown';
  }

  getTypeDisplayName(): string {
    const typeNames: Record<ReportType, string> = {
      [ReportType.DAILY]: 'Daily',
      [ReportType.WEEKLY]: 'Weekly',
      [ReportType.MONTHLY]: 'Monthly',
      [ReportType.CUSTOM]: 'Custom'
    };
    return typeNames[this.reportType] || 'Unknown';
  }

  hasData(): boolean {
    return !!(this.summary || this.userMetrics || this.systemMetrics || this.contentMetrics || this.feedbackMetrics || this.businessMetrics);
  }

  getDataSize(): number {
    if (!this.hasData()) return 0;
    
    const dataString = JSON.stringify({
      summary: this.summary,
      userMetrics: this.userMetrics,
      systemMetrics: this.systemMetrics,
      contentMetrics: this.contentMetrics,
      feedbackMetrics: this.feedbackMetrics,
      businessMetrics: this.businessMetrics
    });
    
    return Buffer.byteLength(dataString, 'utf8');
  }
}