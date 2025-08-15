import { StatusPageIncident, StatusPageComponent, StatusPageMaintenance, StatusPageSubscriber, IncidentStatus, IncidentImpact, ServiceStatus, ComponentType } from '../entities/StatusPage';
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
            components: {
                [componentId: string]: number;
            };
        };
        responseTime: {
            average: number;
            components: {
                [componentId: string]: number;
            };
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
        mttr: number;
    };
}
export declare class StatusPageService {
    private incidentRepo;
    private componentRepo;
    private metricRepo;
    private maintenanceRepo;
    private subscriberRepo;
    private operationsService;
    private webhookService;
    constructor();
    getStatusPageData(): Promise<StatusPageData>;
    getUptimeData(componentId: string, days?: number): Promise<UptimeData>;
    createComponent(data: {
        name: string;
        description?: string;
        componentType: ComponentType;
        healthCheckUrl?: string;
        sortOrder?: number;
    }): Promise<StatusPageComponent>;
    updateComponentStatus(componentId: string, status: ServiceStatus): Promise<void>;
    getComponents(): Promise<StatusPageComponent[]>;
    createIncident(data: {
        title: string;
        description: string;
        impact: IncidentImpact;
        affectedComponents: string[];
        createdBy?: string;
    }): Promise<StatusPageIncident>;
    updateIncident(incidentId: string, data: {
        status?: IncidentStatus;
        message?: string;
        updatedBy?: string;
    }): Promise<StatusPageIncident>;
    getIncidents(limit?: number): Promise<StatusPageIncident[]>;
    getActiveIncidents(): Promise<StatusPageIncident[]>;
    scheduleMaintenance(data: {
        title: string;
        description: string;
        affectedComponents: string[];
        scheduledStart: Date;
        scheduledEnd: Date;
        createdBy?: string;
    }): Promise<StatusPageMaintenance>;
    startMaintenance(maintenanceId: string): Promise<void>;
    completeMaintenance(maintenanceId: string): Promise<void>;
    getUpcomingMaintenance(): Promise<StatusPageMaintenance[]>;
    getActiveMaintenance(): Promise<StatusPageMaintenance[]>;
    recordMetric(componentId: string, metricName: string, value: number, unit: string, metadata?: Record<string, unknown>): Promise<void>;
    recordUptimeCheck(componentId: string, isUp: boolean, responseTime?: number): Promise<void>;
    performHealthChecks(): Promise<void>;
    subscribe(email: string, componentIds?: string[], notificationTypes?: string[]): Promise<StatusPageSubscriber>;
    confirmSubscription(token: string): Promise<boolean>;
    unsubscribe(token: string): Promise<boolean>;
    private calculateOverallStatus;
    private getComponentMetrics;
    private groupMetricsByDay;
    private calculateUptimeSummary;
    private updateComponentsForIncident;
    private restoreComponentsAfterIncident;
    private recordStatusChange;
    private notifyStatusChange;
    private notifyIncidentCreated;
    private notifyIncidentUpdated;
    private notifyMaintenanceScheduled;
    private notifyMaintenanceStarted;
    private notifyMaintenanceCompleted;
    private sendConfirmationEmail;
}
//# sourceMappingURL=StatusPageService.d.ts.map