import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum IncidentStatus {
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  MONITORING = 'monitoring',
  RESOLVED = 'resolved'
}

export enum IncidentImpact {
  NONE = 'none',
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical'
}

export enum ServiceStatus {
  OPERATIONAL = 'operational',
  DEGRADED_PERFORMANCE = 'degraded_performance',
  PARTIAL_OUTAGE = 'partial_outage',
  MAJOR_OUTAGE = 'major_outage',
  MAINTENANCE = 'maintenance'
}

export enum ComponentType {
  SERVICE = 'service',
  API = 'api',
  DATABASE = 'database',
  CDN = 'cdn',
  INFRASTRUCTURE = 'infrastructure'
}

@Entity('status_page_incidents')
@Index(['status', 'impact', 'createdAt'])
@Index(['createdAt'])
export class StatusPageIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: IncidentStatus })
  status!: IncidentStatus;

  @Column({ type: 'enum', enum: IncidentImpact })
  impact!: IncidentImpact;

  @Column({ type: 'simple-array', nullable: true })
  affectedComponents?: string[];

  @Column({ type: 'json', nullable: true })
  updates?: IncidentUpdate[];

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'boolean', default: true })
  isPublic!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Instance methods
  addUpdate(status: IncidentStatus, message: string, userId?: string): void {
    if (!this.updates) this.updates = [];
    
    this.updates.push({
      id: `update-${Date.now()}`,
      status,
      message,
      timestamp: new Date(),
      updatedBy: userId
    });
    
    this.status = status;
    
    if (status === IncidentStatus.RESOLVED) {
      this.resolvedAt = new Date();
    }
  }

  getLatestUpdate(): IncidentUpdate | undefined {
    if (!this.updates || this.updates.length === 0) return undefined;
    return this.updates[this.updates.length - 1];
  }

  getDurationMinutes(): number {
    const endTime = this.resolvedAt || new Date();
    return Math.floor((endTime.getTime() - this.createdAt.getTime()) / (1000 * 60));
  }

  isActive(): boolean {
    return this.status !== IncidentStatus.RESOLVED;
  }

  getImpactColor(): string {
    const colorMap: Record<IncidentImpact, string> = {
      [IncidentImpact.NONE]: '#22c55e',
      [IncidentImpact.MINOR]: '#eab308',
      [IncidentImpact.MAJOR]: '#f97316',
      [IncidentImpact.CRITICAL]: '#dc2626'
    };
    return colorMap[this.impact];
  }

  getStatusColor(): string {
    const colorMap: Record<IncidentStatus, string> = {
      [IncidentStatus.INVESTIGATING]: '#dc2626',
      [IncidentStatus.IDENTIFIED]: '#f97316',
      [IncidentStatus.MONITORING]: '#eab308',
      [IncidentStatus.RESOLVED]: '#22c55e'
    };
    return colorMap[this.status];
  }
}

@Entity('status_page_components')
@Index(['componentType', 'isActive'])
@Index(['status'])
export class StatusPageComponent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ComponentType })
  componentType!: ComponentType;

  @Column({ type: 'enum', enum: ServiceStatus, default: ServiceStatus.OPERATIONAL })
  status!: ServiceStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  healthCheckUrl?: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: true })
  showUptime!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    version?: string;
    region?: string;
    provider?: string;
    dependencies?: string[];
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Instance methods
  updateStatus(status: ServiceStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  isOperational(): boolean {
    return this.status === ServiceStatus.OPERATIONAL;
  }

  hasIssues(): boolean {
    return this.status !== ServiceStatus.OPERATIONAL && this.status !== ServiceStatus.MAINTENANCE;
  }

  getStatusColor(): string {
    const colorMap: Record<ServiceStatus, string> = {
      [ServiceStatus.OPERATIONAL]: '#22c55e',
      [ServiceStatus.DEGRADED_PERFORMANCE]: '#eab308',
      [ServiceStatus.PARTIAL_OUTAGE]: '#f97316',
      [ServiceStatus.MAJOR_OUTAGE]: '#dc2626',
      [ServiceStatus.MAINTENANCE]: '#6b7280'
    };
    return colorMap[this.status];
  }

  getStatusDisplayName(): string {
    return this.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

@Entity('status_page_metrics')
@Index(['componentId', 'timestamp'])
@Index(['timestamp'])
export class StatusPageMetric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  componentId!: string;

  @Column({ type: 'varchar', length: 100 })
  metricName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  value!: number;

  @Column({ type: 'varchar', length: 20 })
  unit!: string;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    region?: string;
    endpoint?: string;
    statusCode?: number;
    [key: string]: any;
  };

  // Static factory methods
  static createUptimeMetric(componentId: string, isUp: boolean, responseTime?: number): Partial<StatusPageMetric> {
    return {
      componentId,
      metricName: 'uptime',
      value: isUp ? 1 : 0,
      unit: 'boolean',
      timestamp: new Date(),
      metadata: {
        responseTime
      }
    };
  }

  static createResponseTimeMetric(componentId: string, responseTime: number, endpoint?: string): Partial<StatusPageMetric> {
    return {
      componentId,
      metricName: 'response_time',
      value: responseTime,
      unit: 'ms',
      timestamp: new Date(),
      metadata: {
        endpoint
      }
    };
  }
}

@Entity('status_page_maintenance')
@Index(['scheduledStart', 'scheduledEnd'])
@Index(['status'])
export class StatusPageMaintenance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'simple-array', nullable: true })
  affectedComponents?: string[];

  @Column({ type: 'timestamp' })
  scheduledStart!: Date;

  @Column({ type: 'timestamp' })
  scheduledEnd!: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEnd?: Date;

  @Column({ type: 'enum', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'], default: 'scheduled' })
  status!: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

  @Column({ type: 'json', nullable: true })
  updates?: MaintenanceUpdate[];

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Instance methods
  start(): void {
    this.status = 'in_progress';
    this.actualStart = new Date();
  }

  complete(): void {
    this.status = 'completed';
    this.actualEnd = new Date();
  }

  cancel(): void {
    this.status = 'cancelled';
  }

  addUpdate(message: string, userId?: string): void {
    if (!this.updates) this.updates = [];
    
    this.updates.push({
      id: `update-${Date.now()}`,
      message,
      timestamp: new Date(),
      updatedBy: userId
    });
  }

  isActive(): boolean {
    const now = new Date();
    return this.status === 'in_progress' || 
           (this.status === 'scheduled' && this.scheduledStart <= now && this.scheduledEnd >= now);
  }

  isUpcoming(): boolean {
    const now = new Date();
    return this.status === 'scheduled' && this.scheduledStart > now;
  }

  getDurationMinutes(): number {
    const start = this.actualStart || this.scheduledStart;
    const end = this.actualEnd || this.scheduledEnd;
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  }
}

@Entity('status_page_subscribers')
@Index(['email'])
export class StatusPageSubscriber {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'simple-array', nullable: true })
  subscribedComponents?: string[];

  @Column({ type: 'simple-array', nullable: true })
  notificationTypes?: ('incident' | 'maintenance' | 'status_change')[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  confirmationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  unsubscribeToken?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Instance methods
  confirm(): void {
    this.confirmedAt = new Date();
    this.confirmationToken = undefined;
  }

  isConfirmed(): boolean {
    return this.confirmedAt !== null && this.confirmedAt !== undefined;
  }

  generateUnsubscribeUrl(): string {
    const baseUrl = process.env.PUBLIC_URL || 'https://your-domain.com';
    return `${baseUrl}/status/unsubscribe/${this.unsubscribeToken}`;
  }
}

// Support interfaces
export interface IncidentUpdate {
  id: string;
  status: IncidentStatus;
  message: string;
  timestamp: Date;
  updatedBy?: string;
}

export interface MaintenanceUpdate {
  id: string;
  message: string;
  timestamp: Date;
  updatedBy?: string;
}