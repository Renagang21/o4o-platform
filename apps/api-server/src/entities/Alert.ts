import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

// Type definitions for Alert context and metadata
export interface AlertContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: string;
  environment?: string;
  version?: string;
  [key: string]: unknown;
}

export interface UsageDetails {
  userCount?: number;
  sessionCount?: number;
  requestCount?: number;
  [key: string]: unknown;
}

export interface SystemDetails {
  memoryUsage?: number;
  cpuUsage?: number;
  diskUsage?: number;
  processCount?: number;
  [key: string]: unknown;
}

export interface BusinessDetails {
  revenue?: number;
  orderCount?: number;
  customerCount?: number;
  conversionRate?: number;
  [key: string]: unknown;
}

export enum AlertType {
  PERFORMANCE = 'performance',
  ERROR = 'error',
  USAGE = 'usage',
  SECURITY = 'security',
  SYSTEM = 'system',
  BUSINESS = 'business',
  DATABASE = 'database',
  DEPLOYMENT = 'deployment',
  CIRCUIT_BREAKER = 'circuit_breaker'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export enum AlertChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  DASHBOARD = 'dashboard'
}

@Entity('alerts')
@Index(['alertType', 'severity', 'status', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['source', 'createdAt'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: AlertType })
  alertType!: AlertType;

  @Column({ type: 'enum', enum: AlertSeverity })
  severity!: AlertSeverity;

  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.ACTIVE })
  status!: AlertStatus;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string; // api-server, main-site, admin-dashboard

  @Column({ type: 'varchar', length: 255, nullable: true })
  component?: string; // specific component or service

  @Column({ type: 'varchar', length: 255, nullable: true })
  endpoint?: string; // API endpoint or page URL

  // Threshold and trigger information
  @Column({ type: 'varchar', length: 255, nullable: true })
  metricName?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  currentValue?: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  thresholdValue?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  comparisonOperator?: string; // >, <, >=, <=, ==, !=

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit?: string;

  // Context and metadata
  @Column({ type: 'json', nullable: true })
  context?: AlertContext;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    // Error details
    errorType?: string;
    errorMessage?: string;
    stackTrace?: string;
    errorCode?: string;
    
    // Performance details
    responseTime?: number;
    loadTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
    
    // Usage details
    userCount?: number;
    sessionCount?: number;
    requestCount?: number;
    
    // Security details
    attemptCount?: number;
    sourceIP?: string;
    userAgent?: string;
    
    // Custom properties
    [key: string]: unknown;
  };

  // Alert management
  @Column({ type: 'uuid', nullable: true })
  acknowledgedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  @Column({ type: 'text', nullable: true })
  acknowledgmentNote?: string;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  resolutionNote?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resolutionAction?: string;

  // Notification settings
  @Column({ type: 'simple-array', nullable: true })
  notificationChannels?: AlertChannel[];

  @Column({ type: 'boolean', default: false })
  notificationSent!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  notificationSentAt?: Date;

  @Column({ type: 'int', default: 0 })
  notificationRetries!: number;

  // Escalation
  @Column({ type: 'boolean', default: false })
  isEscalated!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  escalatedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  escalationRule?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  escalationLevel?: string;

  @Column({ type: 'uuid', nullable: true })
  assignedTo?: string;

  // Recurrence tracking
  @Column({ type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({ type: 'int', default: 1 })
  occurrenceCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  firstOccurrence?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastOccurrence?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Static factory methods
  static createPerformanceAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    metricName: string,
    currentValue: number,
    thresholdValue: number,
    operator: string,
    unit: string,
    source?: string,
    endpoint?: string,
    context?: AlertContext
  ): Partial<Alert> {
    return {
      alertType: AlertType.PERFORMANCE,
      severity,
      title,
      message,
      metricName,
      currentValue,
      thresholdValue,
      comparisonOperator: operator,
      unit,
      source,
      endpoint,
      context,
      notificationChannels: severity === AlertSeverity.CRITICAL ? [AlertChannel.EMAIL, AlertChannel.SLACK] : [AlertChannel.DASHBOARD],
      firstOccurrence: new Date(),
      lastOccurrence: new Date()
    };
  }

  static createErrorAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    source?: string,
    endpoint?: string,
    errorDetails?: {
      errorType?: string;
      errorMessage?: string;
      stackTrace?: string;
      errorCode?: string;
    },
    context?: AlertContext
  ): Partial<Alert> {
    return {
      alertType: AlertType.ERROR,
      severity,
      title,
      message,
      source,
      endpoint,
      context,
      metadata: errorDetails,
      notificationChannels: severity === AlertSeverity.CRITICAL ? [AlertChannel.EMAIL, AlertChannel.SLACK] : [AlertChannel.DASHBOARD],
      firstOccurrence: new Date(),
      lastOccurrence: new Date()
    };
  }

  static createUsageAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    metricName: string,
    currentValue: number,
    thresholdValue: number,
    operator: string,
    unit: string,
    usageDetails?: UsageDetails,
    context?: AlertContext
  ): Partial<Alert> {
    return {
      alertType: AlertType.USAGE,
      severity,
      title,
      message,
      metricName,
      currentValue,
      thresholdValue,
      comparisonOperator: operator,
      unit,
      context,
      metadata: usageDetails,
      notificationChannels: [AlertChannel.DASHBOARD],
      firstOccurrence: new Date(),
      lastOccurrence: new Date()
    };
  }

  static createSecurityAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    source?: string,
    securityDetails?: {
      attemptCount?: number;
      sourceIP?: string;
      userAgent?: string;
    },
    context?: AlertContext
  ): Partial<Alert> {
    return {
      alertType: AlertType.SECURITY,
      severity,
      title,
      message,
      source,
      context,
      metadata: securityDetails,
      notificationChannels: [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.DASHBOARD],
      firstOccurrence: new Date(),
      lastOccurrence: new Date()
    };
  }

  static createSystemAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    source?: string,
    component?: string,
    systemDetails?: SystemDetails,
    context?: AlertContext
  ): Partial<Alert> {
    return {
      alertType: AlertType.SYSTEM,
      severity,
      title,
      message,
      source,
      component,
      context,
      metadata: systemDetails,
      notificationChannels: severity === AlertSeverity.CRITICAL ? 
        [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.DASHBOARD] : 
        [AlertChannel.DASHBOARD],
      firstOccurrence: new Date(),
      lastOccurrence: new Date()
    };
  }

  static createBusinessAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    source?: string,
    businessDetails?: BusinessDetails,
    context?: AlertContext
  ): Partial<Alert> {
    return {
      alertType: AlertType.BUSINESS,
      severity,
      title,
      message,
      source,
      context,
      metadata: businessDetails,
      notificationChannels: [AlertChannel.DASHBOARD],
      firstOccurrence: new Date(),
      lastOccurrence: new Date()
    };
  }

  // Instance methods
  acknowledge(userId: string, note?: string): void {
    this.status = AlertStatus.ACKNOWLEDGED;
    this.acknowledgedBy = userId;
    this.acknowledgedAt = new Date();
    this.acknowledgmentNote = note;
  }

  resolve(userId: string, note?: string, action?: string): void {
    this.status = AlertStatus.RESOLVED;
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    this.resolutionNote = note;
    this.resolutionAction = action;
  }

  dismiss(userId: string, note?: string): void {
    this.status = AlertStatus.DISMISSED;
    this.resolvedBy = userId;
    this.resolvedAt = new Date();
    this.resolutionNote = note;
    this.resolutionAction = 'dismissed';
  }

  escalate(rule: string): void {
    this.isEscalated = true;
    this.escalatedAt = new Date();
    this.escalationRule = rule;
    
    // Add email notification for escalated alerts
    if (!this.notificationChannels?.includes(AlertChannel.EMAIL)) {
      this.notificationChannels = [...(this.notificationChannels || []), AlertChannel.EMAIL];
    }
  }

  recordOccurrence(): void {
    this.occurrenceCount++;
    this.lastOccurrence = new Date();
    
    if (this.occurrenceCount > 1) {
      this.isRecurring = true;
    }
  }

  markNotificationSent(): void {
    this.notificationSent = true;
    this.notificationSentAt = new Date();
  }

  incrementNotificationRetries(): void {
    this.notificationRetries++;
  }

  isActive(): boolean {
    return this.status === AlertStatus.ACTIVE;
  }

  isResolved(): boolean {
    return this.status === AlertStatus.RESOLVED;
  }

  isAcknowledged(): boolean {
    return this.status === AlertStatus.ACKNOWLEDGED;
  }

  isDismissed(): boolean {
    return this.status === AlertStatus.DISMISSED;
  }

  isCritical(): boolean {
    return this.severity === AlertSeverity.CRITICAL;
  }

  isHigh(): boolean {
    return this.severity === AlertSeverity.HIGH;
  }

  requiresImmediateAttention(): boolean {
    return this.severity === AlertSeverity.CRITICAL || this.severity === AlertSeverity.HIGH;
  }

  getAgeInMinutes(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60));
  }

  getAgeInHours(): number {
    return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
  }

  shouldEscalate(escalationTimeMinutes: number = 30): boolean {
    return !this.isEscalated && 
           this.isActive() && 
           this.requiresImmediateAttention() && 
           this.getAgeInMinutes() >= escalationTimeMinutes;
  }

  getDisplayTitle(): string {
    const severityIcon = {
      [AlertSeverity.LOW]: '🔵',
      [AlertSeverity.MEDIUM]: '🟡',
      [AlertSeverity.HIGH]: '🟠',
      [AlertSeverity.CRITICAL]: '🔴'
    };
    
    return `${severityIcon[this.severity]} ${this.title}`;
  }

  getSeverityDisplayName(): string {
    return this.severity.charAt(0).toUpperCase() + this.severity.slice(1);
  }

  getTypeDisplayName(): string {
    return this.alertType.charAt(0).toUpperCase() + this.alertType.slice(1);
  }

  getStatusDisplayName(): string {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  getFormattedValue(): string {
    if (this.currentValue === null || this.currentValue === undefined) return 'N/A';
    
    if (this.unit === 'ms') {
      return `${this.currentValue}ms`;
    } else if (this.unit === 'bytes') {
      return this.formatBytes(this.currentValue);
    } else if (this.unit === '%') {
      return `${this.currentValue}%`;
    } else if (this.unit === 'count') {
      return this.currentValue.toString();
    }
    
    return `${this.currentValue} ${this.unit || ''}`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}