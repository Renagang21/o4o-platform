import { Repository, Not, MoreThanOrEqual, In, IsNull } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { 
  StatusPageIncident, 
  StatusPageComponent, 
  StatusPageMetric, 
  StatusPageMaintenance,
  StatusPageSubscriber,
  IncidentStatus, 
  IncidentImpact, 
  ServiceStatus, 
  ComponentType 
} from '../entities/StatusPage';
import { OperationsMonitoringService } from './OperationsMonitoringService';
import { WebhookService } from './webhookService';
import * as crypto from 'crypto';

export interface StatusPageData {
  overall: {
    status: ServiceStatus;
    message: string;
  };
  components: {
    id: string;
    name: string;
    status: ServiceStatus;
    uptime: number;
    responseTime?: number;
  }[];
  incidents: {
    active: StatusPageIncident[];
    recent: StatusPageIncident[];
  };
  maintenance: {
    upcoming: StatusPageMaintenance[];
    active: StatusPageMaintenance[];
  };
  metrics: {
    uptime: {
      overall: number;
      components: { [componentId: string]: number };
    };
    responseTime: {
      average: number;
      components: { [componentId: string]: number };
    };
  };
  lastUpdated: Date;
}

export interface UptimeData {
  componentId: string;
  data: {
    date: string;
    uptime: number;
    incidents: number;
    responseTime: number;
  }[];
  summary: {
    uptimePercentage: number;
    averageResponseTime: number;
    totalIncidents: number;
    mttr: number; // Mean Time To Recovery
  };
}

export class StatusPageService {
  private incidentRepo: Repository<StatusPageIncident>;
  private componentRepo: Repository<StatusPageComponent>;
  private metricRepo: Repository<StatusPageMetric>;
  private maintenanceRepo: Repository<StatusPageMaintenance>;
  private subscriberRepo: Repository<StatusPageSubscriber>;
  private operationsService: OperationsMonitoringService;
  private webhookService: WebhookService;

  constructor() {
    this.incidentRepo = AppDataSource.getRepository(StatusPageIncident);
    this.componentRepo = AppDataSource.getRepository(StatusPageComponent);
    this.metricRepo = AppDataSource.getRepository(StatusPageMetric);
    this.maintenanceRepo = AppDataSource.getRepository(StatusPageMaintenance);
    this.subscriberRepo = AppDataSource.getRepository(StatusPageSubscriber);
    this.operationsService = new OperationsMonitoringService();
    this.webhookService = new WebhookService();
  }

  // Public Status Page Data
  async getStatusPageData(): Promise<StatusPageData> {
    const [
      components,
      activeIncidents,
      recentIncidents,
      upcomingMaintenance,
      activeMaintenance
    ] = await Promise.all([
      this.componentRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } }),
      this.incidentRepo.find({ 
        where: { isPublic: true, status: Not(IncidentStatus.RESOLVED) },
        order: { createdAt: 'DESC' }
      }),
      this.incidentRepo.find({
        where: { 
          isPublic: true,
          createdAt: MoreThanOrEqual(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        },
        order: { createdAt: 'DESC' },
        take: 10
      }),
      this.getUpcomingMaintenance(),
      this.getActiveMaintenance()
    ]);

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(components, activeIncidents, activeMaintenance);

    // Get component metrics
    const componentMetrics = await this.getComponentMetrics(components);

    return {
      overall: overallStatus,
      components: components.map((component: any) => ({
        id: component.id,
        name: component.name,
        status: component.status,
        uptime: componentMetrics.uptime.components[component.id] || 0,
        responseTime: componentMetrics.responseTime.components[component.id]
      })),
      incidents: {
        active: activeIncidents,
        recent: recentIncidents
      },
      maintenance: {
        upcoming: upcomingMaintenance,
        active: activeMaintenance
      },
      metrics: componentMetrics,
      lastUpdated: new Date()
    };
  }

  async getUptimeData(componentId: string, days: number = 90): Promise<UptimeData> {
    const component = await this.componentRepo.findOne({ where: { id: componentId } });
    if (!component) {
      throw new Error('Component not found');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const metrics = await this.metricRepo.find({
      where: {
        componentId,
        metricName: 'uptime',
        timestamp: MoreThanOrEqual(startDate)
      },
      order: { timestamp: 'ASC' }
    });

    const responseTimeMetrics = await this.metricRepo.find({
      where: {
        componentId,
        metricName: 'response_time',
        timestamp: MoreThanOrEqual(startDate)
      },
      order: { timestamp: 'ASC' }
    });

    const incidents = await this.incidentRepo.find({
      where: {
        createdAt: MoreThanOrEqual(startDate)
      }
    });

    // Group data by day
    const dailyData = this.groupMetricsByDay(metrics, responseTimeMetrics, incidents, days);

    // Calculate summary statistics
    const summary = this.calculateUptimeSummary(dailyData, incidents);

    return {
      componentId,
      data: dailyData,
      summary
    };
  }

  // Component Management
  async createComponent(data: {
    name: string;
    description?: string;
    componentType: ComponentType;
    healthCheckUrl?: string;
    sortOrder?: number;
  }): Promise<StatusPageComponent> {
    const component = new StatusPageComponent();
    component.name = data.name;
    component.description = data.description;
    component.componentType = data.componentType;
    component.healthCheckUrl = data.healthCheckUrl;
    component.sortOrder = data.sortOrder || 0;
    component.status = ServiceStatus.OPERATIONAL;

    return await this.componentRepo.save(component);
  }

  async updateComponentStatus(componentId: string, status: ServiceStatus): Promise<void> {
    const component = await this.componentRepo.findOne({ where: { id: componentId } });
    if (!component) {
      throw new Error('Component not found');
    }

    const oldStatus = component.status;
    component.updateStatus(status);
    await this.componentRepo.save(component);

    // Record status change event
    await this.recordStatusChange(component, oldStatus, status);

    // Send notifications if status changed
    if (oldStatus !== status) {
      await this.notifyStatusChange(component, oldStatus, status);
    }
  }

  async getComponents(): Promise<StatusPageComponent[]> {
    return await this.componentRepo.find({ 
      where: { isActive: true }, 
      order: { sortOrder: 'ASC' } 
    });
  }

  // Incident Management
  async createIncident(data: {
    title: string;
    description: string;
    impact: IncidentImpact;
    affectedComponents: string[];
    createdBy?: string;
  }): Promise<StatusPageIncident> {
    const incident = new StatusPageIncident();
    incident.title = data.title;
    incident.description = data.description;
    incident.impact = data.impact;
    incident.status = IncidentStatus.INVESTIGATING;
    incident.affectedComponents = data.affectedComponents;
    incident.createdBy = data.createdBy;

    const savedIncident = await this.incidentRepo.save(incident);

    // Update affected component statuses
    await this.updateComponentsForIncident(data.affectedComponents, data.impact);

    // Send notifications
    await this.notifyIncidentCreated(savedIncident);

    return savedIncident;
  }

  async updateIncident(incidentId: string, data: {
    status?: IncidentStatus;
    message?: string;
    updatedBy?: string;
  }): Promise<StatusPageIncident> {
    const incident = await this.incidentRepo.findOne({ where: { id: incidentId } });
    if (!incident) {
      throw new Error('Incident not found');
    }

    if (data.status && data.message) {
      incident.addUpdate(data.status, data.message, data.updatedBy);
    }

    const savedIncident = await this.incidentRepo.save(incident);

    // If incident is resolved, restore component statuses
    if (data.status === IncidentStatus.RESOLVED) {
      await this.restoreComponentsAfterIncident(incident.affectedComponents || []);
    }

    // Send notifications
    await this.notifyIncidentUpdated(savedIncident);

    return savedIncident;
  }

  async getIncidents(limit: number = 50): Promise<StatusPageIncident[]> {
    return await this.incidentRepo.find({
      where: { isPublic: true },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async getActiveIncidents(): Promise<StatusPageIncident[]> {
    return await this.incidentRepo.find({
      where: { 
        isPublic: true,
        status: Not(IncidentStatus.RESOLVED)
      },
      order: { createdAt: 'DESC' }
    });
  }

  // Maintenance Management
  async scheduleMaintenance(data: {
    title: string;
    description: string;
    affectedComponents: string[];
    scheduledStart: Date;
    scheduledEnd: Date;
    createdBy?: string;
  }): Promise<StatusPageMaintenance> {
    const maintenance = new StatusPageMaintenance();
    maintenance.title = data.title;
    maintenance.description = data.description;
    maintenance.affectedComponents = data.affectedComponents;
    maintenance.scheduledStart = data.scheduledStart;
    maintenance.scheduledEnd = data.scheduledEnd;
    maintenance.createdBy = data.createdBy;

    const savedMaintenance = await this.maintenanceRepo.save(maintenance);

    // Send notifications
    await this.notifyMaintenanceScheduled(savedMaintenance);

    return savedMaintenance;
  }

  async startMaintenance(maintenanceId: string): Promise<void> {
    const maintenance = await this.maintenanceRepo.findOne({ where: { id: maintenanceId } });
    if (!maintenance) {
      throw new Error('Maintenance not found');
    }

    maintenance.start();
    await this.maintenanceRepo.save(maintenance);

    // Update affected component statuses
    if (maintenance.affectedComponents) {
      for (const componentId of maintenance.affectedComponents) {
        await this.updateComponentStatus(componentId, ServiceStatus.MAINTENANCE);
      }
    }

    // Send notifications
    await this.notifyMaintenanceStarted(maintenance);
  }

  async completeMaintenance(maintenanceId: string): Promise<void> {
    const maintenance = await this.maintenanceRepo.findOne({ where: { id: maintenanceId } });
    if (!maintenance) {
      throw new Error('Maintenance not found');
    }

    maintenance.complete();
    await this.maintenanceRepo.save(maintenance);

    // Restore affected component statuses
    if (maintenance.affectedComponents) {
      for (const componentId of maintenance.affectedComponents) {
        await this.updateComponentStatus(componentId, ServiceStatus.OPERATIONAL);
      }
    }

    // Send notifications
    await this.notifyMaintenanceCompleted(maintenance);
  }

  async getUpcomingMaintenance(): Promise<StatusPageMaintenance[]> {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return await this.maintenanceRepo.find({
      where: [
        { status: 'scheduled', scheduledStart: MoreThanOrEqual(now) },
        { status: 'scheduled', scheduledEnd: MoreThanOrEqual(now) }
      ],
      order: { scheduledStart: 'ASC' }
    });
  }

  async getActiveMaintenance(): Promise<StatusPageMaintenance[]> {
    return await this.maintenanceRepo.find({
      where: { status: 'in_progress' },
      order: { actualStart: 'ASC' }
    });
  }

  // Metrics and Monitoring
  async recordMetric(componentId: string, metricName: string, value: number, unit: string, metadata?: Record<string, unknown>): Promise<void> {
    const metric = new StatusPageMetric();
    metric.componentId = componentId;
    metric.metricName = metricName;
    metric.value = value;
    metric.unit = unit;
    metric.timestamp = new Date();
    metric.metadata = metadata;

    await this.metricRepo.save(metric);
  }

  async recordUptimeCheck(componentId: string, isUp: boolean, responseTime?: number): Promise<void> {
    await this.recordMetric(componentId, 'uptime', isUp ? 1 : 0, 'boolean', { responseTime });
    
    if (responseTime) {
      await this.recordMetric(componentId, 'response_time', responseTime, 'ms');
    }

    // Update component status if needed
    const component = await this.componentRepo.findOne({ where: { id: componentId } });
    if (component) {
      let newStatus = component.status;
      
      if (!isUp && component.status === ServiceStatus.OPERATIONAL) {
        newStatus = ServiceStatus.MAJOR_OUTAGE;
      } else if (isUp && component.status === ServiceStatus.MAJOR_OUTAGE) {
        newStatus = ServiceStatus.OPERATIONAL;
      } else if (responseTime && responseTime > 5000 && component.status === ServiceStatus.OPERATIONAL) {
        newStatus = ServiceStatus.DEGRADED_PERFORMANCE;
      } else if (responseTime && responseTime < 2000 && component.status === ServiceStatus.DEGRADED_PERFORMANCE) {
        newStatus = ServiceStatus.OPERATIONAL;
      }

      if (newStatus !== component.status) {
        await this.updateComponentStatus(componentId, newStatus);
      }
    }
  }

  async performHealthChecks(): Promise<void> {
    const components = await this.componentRepo.find({ 
      where: { isActive: true, healthCheckUrl: Not(IsNull()) } 
    });

    const healthCheckPromises = components.map(async (component) => {
      if (!component.healthCheckUrl) return;

      try {
        const start = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(component.healthCheckUrl, { 
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - start;
        const isUp = response.ok;

        await this.recordUptimeCheck(component.id, isUp, responseTime);
      } catch (error) {
        console.error(`Health check failed for ${component.name}:`, error);
        await this.recordUptimeCheck(component.id, false);
      }
    });

    await Promise.all(healthCheckPromises);
  }

  // Subscription Management
  async subscribe(email: string, componentIds?: string[], notificationTypes?: string[]): Promise<StatusPageSubscriber> {
    // Check if subscriber already exists
    let subscriber = await this.subscriberRepo.findOne({ where: { email } });

    if (subscriber) {
      // Update existing subscriber
      if (componentIds) subscriber.subscribedComponents = componentIds;
      if (notificationTypes) subscriber.notificationTypes = notificationTypes as ('incident' | 'maintenance' | 'status_change')[];
    } else {
      // Create new subscriber
      subscriber = new StatusPageSubscriber();
      subscriber.email = email;
      subscriber.subscribedComponents = componentIds;
      subscriber.notificationTypes = notificationTypes as ('incident' | 'maintenance' | 'status_change')[];
      subscriber.confirmationToken = crypto.randomUUID();
      subscriber.unsubscribeToken = crypto.randomUUID();
    }

    const savedSubscriber = await this.subscriberRepo.save(subscriber);

    // Send confirmation email if new subscriber
    if (!subscriber.isConfirmed()) {
      await this.sendConfirmationEmail(savedSubscriber);
    }

    return savedSubscriber;
  }

  async confirmSubscription(token: string): Promise<boolean> {
    const subscriber = await this.subscriberRepo.findOne({ 
      where: { confirmationToken: token } 
    });

    if (!subscriber) return false;

    subscriber.confirm();
    await this.subscriberRepo.save(subscriber);

    return true;
  }

  async unsubscribe(token: string): Promise<boolean> {
    const subscriber = await this.subscriberRepo.findOne({ 
      where: { unsubscribeToken: token } 
    });

    if (!subscriber) return false;

    subscriber.isActive = false;
    await this.subscriberRepo.save(subscriber);

    return true;
  }

  // Helper Methods
  private calculateOverallStatus(
    components: StatusPageComponent[], 
    incidents: StatusPageIncident[], 
    maintenance: StatusPageMaintenance[]
  ): { status: ServiceStatus; message: string } {
    // Check for active critical incidents
    const criticalIncidents = incidents.filter((i: any) => i.impact === IncidentImpact.CRITICAL);
    if (criticalIncidents.length > 0) {
      return {
        status: ServiceStatus.MAJOR_OUTAGE,
        message: `Major outage affecting ${criticalIncidents.length} service${criticalIncidents.length > 1 ? 's' : ''}`
      };
    }

    // Check for active major incidents
    const majorIncidents = incidents.filter((i: any) => i.impact === IncidentImpact.MAJOR);
    if (majorIncidents.length > 0) {
      return {
        status: ServiceStatus.PARTIAL_OUTAGE,
        message: `Service disruption affecting ${majorIncidents.length} service${majorIncidents.length > 1 ? 's' : ''}`
      };
    }

    // Check for active maintenance
    if (maintenance.length > 0) {
      return {
        status: ServiceStatus.MAINTENANCE,
        message: `Scheduled maintenance in progress`
      };
    }

    // Check component statuses
    const degradedComponents = components.filter((c: any) => 
      c.status === ServiceStatus.DEGRADED_PERFORMANCE || 
      c.status === ServiceStatus.PARTIAL_OUTAGE
    );

    if (degradedComponents.length > 0) {
      return {
        status: ServiceStatus.DEGRADED_PERFORMANCE,
        message: `Performance issues detected in ${degradedComponents.length} service${degradedComponents.length > 1 ? 's' : ''}`
      };
    }

    const outageComponents = components.filter((c: any) => c.status === ServiceStatus.MAJOR_OUTAGE);
    if (outageComponents.length > 0) {
      return {
        status: ServiceStatus.PARTIAL_OUTAGE,
        message: `Service outage affecting ${outageComponents.length} service${outageComponents.length > 1 ? 's' : ''}`
      };
    }

    return {
      status: ServiceStatus.OPERATIONAL,
      message: 'All systems operational'
    };
  }

  private async getComponentMetrics(components: StatusPageComponent[]): Promise<{
    uptime: { overall: number; components: { [componentId: string]: number } };
    responseTime: { average: number; components: { [componentId: string]: number } };
  }> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const uptimeMetrics = await this.metricRepo.find({
      where: {
        metricName: 'uptime',
        timestamp: MoreThanOrEqual(last24Hours)
      }
    });

    const responseTimeMetrics = await this.metricRepo.find({
      where: {
        metricName: 'response_time',
        timestamp: MoreThanOrEqual(last24Hours)
      }
    });

    // Calculate uptime percentages
    const componentUptimes: { [componentId: string]: number } = {};
    for (const component of components) {
      const componentMetrics = uptimeMetrics.filter((m: any) => m.componentId === component.id);
      if (componentMetrics.length > 0) {
        const upCount = componentMetrics.filter((m: any) => m.value === 1).length;
        componentUptimes[component.id] = (upCount / componentMetrics.length) * 100;
      } else {
        componentUptimes[component.id] = 100; // Assume operational if no metrics
      }
    }

    // Calculate response times
    const componentResponseTimes: { [componentId: string]: number } = {};
    for (const component of components) {
      const componentMetrics = responseTimeMetrics.filter((m: any) => m.componentId === component.id);
      if (componentMetrics.length > 0) {
        const avgResponseTime = componentMetrics.reduce((sum, m) => sum + parseFloat(m.value.toString()), 0) / componentMetrics.length;
        componentResponseTimes[component.id] = Math.round(avgResponseTime);
      }
    }

    // Calculate overall metrics
    const overallUptime = Object.values(componentUptimes).reduce((sum, uptime) => sum + uptime, 0) / components.length;
    const overallResponseTime = Object.values(componentResponseTimes).reduce((sum, rt) => sum + rt, 0) / Object.keys(componentResponseTimes).length;

    return {
      uptime: {
        overall: Math.round(overallUptime * 100) / 100,
        components: componentUptimes
      },
      responseTime: {
        average: Math.round(overallResponseTime),
        components: componentResponseTimes
      }
    };
  }

  private groupMetricsByDay(
    uptimeMetrics: StatusPageMetric[], 
    responseTimeMetrics: StatusPageMetric[], 
    incidents: StatusPageIncident[], 
    days: number
  ): UptimeData['data'] {
    const dailyData: UptimeData['data'] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayUptimeMetrics = uptimeMetrics.filter((m: any) => 
        m.timestamp >= dayStart && m.timestamp <= dayEnd
      );
      
      const dayResponseTimeMetrics = responseTimeMetrics.filter((m: any) => 
        m.timestamp >= dayStart && m.timestamp <= dayEnd
      );
      
      const dayIncidents = incidents.filter((i: any) => 
        i.createdAt >= dayStart && i.createdAt <= dayEnd
      );
      
      const uptime = dayUptimeMetrics.length > 0 
        ? (dayUptimeMetrics.filter((m: any) => m.value === 1).length / dayUptimeMetrics.length) * 100
        : 100;
      
      const responseTime = dayResponseTimeMetrics.length > 0
        ? dayResponseTimeMetrics.reduce((sum, m) => sum + parseFloat(m.value.toString()), 0) / dayResponseTimeMetrics.length
        : 0;
      
      dailyData.push({
        date: dateStr,
        uptime: Math.round(uptime * 100) / 100,
        incidents: dayIncidents.length,
        responseTime: Math.round(responseTime)
      });
    }
    
    return dailyData;
  }

  private calculateUptimeSummary(dailyData: UptimeData['data'], incidents: StatusPageIncident[]): UptimeData['summary'] {
    const uptimePercentage = dailyData.reduce((sum, day) => sum + day.uptime, 0) / dailyData.length;
    const averageResponseTime = dailyData.reduce((sum, day) => sum + day.responseTime, 0) / dailyData.length;
    const totalIncidents = incidents.length;
    
    // Calculate MTTR (Mean Time To Recovery) in minutes
    const resolvedIncidents = incidents.filter((i: any) => i.resolvedAt);
    const mttr = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + i.getDurationMinutes(), 0) / resolvedIncidents.length
      : 0;

    return {
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime),
      totalIncidents,
      mttr: Math.round(mttr)
    };
  }

  private async updateComponentsForIncident(componentIds: string[], impact: IncidentImpact): Promise<void> {
    const statusMap: Record<IncidentImpact, ServiceStatus> = {
      [IncidentImpact.NONE]: ServiceStatus.OPERATIONAL,
      [IncidentImpact.MINOR]: ServiceStatus.DEGRADED_PERFORMANCE,
      [IncidentImpact.MAJOR]: ServiceStatus.PARTIAL_OUTAGE,
      [IncidentImpact.CRITICAL]: ServiceStatus.MAJOR_OUTAGE
    };

    const targetStatus = statusMap[impact];
    
    for (const componentId of componentIds) {
      await this.updateComponentStatus(componentId, targetStatus);
    }
  }

  private async restoreComponentsAfterIncident(componentIds: string[]): Promise<void> {
    // Check if components have other active incidents
    for (const componentId of componentIds) {
      const activeIncidents = await this.incidentRepo.find({
        where: {
          status: Not(IncidentStatus.RESOLVED)
        }
      });

      // Only restore to operational if no other incidents
      if (activeIncidents.length === 0) {
        await this.updateComponentStatus(componentId, ServiceStatus.OPERATIONAL);
      }
    }
  }

  private async recordStatusChange(component: StatusPageComponent, oldStatus: ServiceStatus, newStatus: ServiceStatus): Promise<void> {
    // Could record status change events in a separate table for audit trail
  }

  // Notification methods (stubs - implement based on your notification preferences)
  private async notifyStatusChange(component: StatusPageComponent, oldStatus: ServiceStatus, newStatus: ServiceStatus): Promise<void> {
    // Implementation depends on notification system
  }

  private async notifyIncidentCreated(incident: StatusPageIncident): Promise<void> {
  }

  private async notifyIncidentUpdated(incident: StatusPageIncident): Promise<void> {
  }

  private async notifyMaintenanceScheduled(maintenance: StatusPageMaintenance): Promise<void> {
  }

  private async notifyMaintenanceStarted(maintenance: StatusPageMaintenance): Promise<void> {
  }

  private async notifyMaintenanceCompleted(maintenance: StatusPageMaintenance): Promise<void> {
  }

  private async sendConfirmationEmail(subscriber: StatusPageSubscriber): Promise<void> {
  }
}