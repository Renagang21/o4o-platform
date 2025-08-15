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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusPageService = void 0;
const typeorm_1 = require("typeorm");
const connection_1 = require("../database/connection");
const StatusPage_1 = require("../entities/StatusPage");
const OperationsMonitoringService_1 = require("./OperationsMonitoringService");
const webhookService_1 = require("./webhookService");
const crypto = __importStar(require("crypto"));
class StatusPageService {
    constructor() {
        this.incidentRepo = connection_1.AppDataSource.getRepository(StatusPage_1.StatusPageIncident);
        this.componentRepo = connection_1.AppDataSource.getRepository(StatusPage_1.StatusPageComponent);
        this.metricRepo = connection_1.AppDataSource.getRepository(StatusPage_1.StatusPageMetric);
        this.maintenanceRepo = connection_1.AppDataSource.getRepository(StatusPage_1.StatusPageMaintenance);
        this.subscriberRepo = connection_1.AppDataSource.getRepository(StatusPage_1.StatusPageSubscriber);
        this.operationsService = new OperationsMonitoringService_1.OperationsMonitoringService();
        this.webhookService = new webhookService_1.WebhookService();
    }
    // Public Status Page Data
    async getStatusPageData() {
        const [components, activeIncidents, recentIncidents, upcomingMaintenance, activeMaintenance] = await Promise.all([
            this.componentRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } }),
            this.incidentRepo.find({
                where: { isPublic: true, status: (0, typeorm_1.Not)(StatusPage_1.IncidentStatus.RESOLVED) },
                order: { createdAt: 'DESC' }
            }),
            this.incidentRepo.find({
                where: {
                    isPublic: true,
                    createdAt: (0, typeorm_1.MoreThanOrEqual)(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
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
            components: components.map((component) => ({
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
    async getUptimeData(componentId, days = 90) {
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
                timestamp: (0, typeorm_1.MoreThanOrEqual)(startDate)
            },
            order: { timestamp: 'ASC' }
        });
        const responseTimeMetrics = await this.metricRepo.find({
            where: {
                componentId,
                metricName: 'response_time',
                timestamp: (0, typeorm_1.MoreThanOrEqual)(startDate)
            },
            order: { timestamp: 'ASC' }
        });
        const incidents = await this.incidentRepo.find({
            where: {
                createdAt: (0, typeorm_1.MoreThanOrEqual)(startDate)
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
    async createComponent(data) {
        const component = new StatusPage_1.StatusPageComponent();
        component.name = data.name;
        component.description = data.description;
        component.componentType = data.componentType;
        component.healthCheckUrl = data.healthCheckUrl;
        component.sortOrder = data.sortOrder || 0;
        component.status = StatusPage_1.ServiceStatus.OPERATIONAL;
        return await this.componentRepo.save(component);
    }
    async updateComponentStatus(componentId, status) {
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
    async getComponents() {
        return await this.componentRepo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC' }
        });
    }
    // Incident Management
    async createIncident(data) {
        const incident = new StatusPage_1.StatusPageIncident();
        incident.title = data.title;
        incident.description = data.description;
        incident.impact = data.impact;
        incident.status = StatusPage_1.IncidentStatus.INVESTIGATING;
        incident.affectedComponents = data.affectedComponents;
        incident.createdBy = data.createdBy;
        const savedIncident = await this.incidentRepo.save(incident);
        // Update affected component statuses
        await this.updateComponentsForIncident(data.affectedComponents, data.impact);
        // Send notifications
        await this.notifyIncidentCreated(savedIncident);
        return savedIncident;
    }
    async updateIncident(incidentId, data) {
        const incident = await this.incidentRepo.findOne({ where: { id: incidentId } });
        if (!incident) {
            throw new Error('Incident not found');
        }
        if (data.status && data.message) {
            incident.addUpdate(data.status, data.message, data.updatedBy);
        }
        const savedIncident = await this.incidentRepo.save(incident);
        // If incident is resolved, restore component statuses
        if (data.status === StatusPage_1.IncidentStatus.RESOLVED) {
            await this.restoreComponentsAfterIncident(incident.affectedComponents || []);
        }
        // Send notifications
        await this.notifyIncidentUpdated(savedIncident);
        return savedIncident;
    }
    async getIncidents(limit = 50) {
        return await this.incidentRepo.find({
            where: { isPublic: true },
            order: { createdAt: 'DESC' },
            take: limit
        });
    }
    async getActiveIncidents() {
        return await this.incidentRepo.find({
            where: {
                isPublic: true,
                status: (0, typeorm_1.Not)(StatusPage_1.IncidentStatus.RESOLVED)
            },
            order: { createdAt: 'DESC' }
        });
    }
    // Maintenance Management
    async scheduleMaintenance(data) {
        const maintenance = new StatusPage_1.StatusPageMaintenance();
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
    async startMaintenance(maintenanceId) {
        const maintenance = await this.maintenanceRepo.findOne({ where: { id: maintenanceId } });
        if (!maintenance) {
            throw new Error('Maintenance not found');
        }
        maintenance.start();
        await this.maintenanceRepo.save(maintenance);
        // Update affected component statuses
        if (maintenance.affectedComponents) {
            for (const componentId of maintenance.affectedComponents) {
                await this.updateComponentStatus(componentId, StatusPage_1.ServiceStatus.MAINTENANCE);
            }
        }
        // Send notifications
        await this.notifyMaintenanceStarted(maintenance);
    }
    async completeMaintenance(maintenanceId) {
        const maintenance = await this.maintenanceRepo.findOne({ where: { id: maintenanceId } });
        if (!maintenance) {
            throw new Error('Maintenance not found');
        }
        maintenance.complete();
        await this.maintenanceRepo.save(maintenance);
        // Restore affected component statuses
        if (maintenance.affectedComponents) {
            for (const componentId of maintenance.affectedComponents) {
                await this.updateComponentStatus(componentId, StatusPage_1.ServiceStatus.OPERATIONAL);
            }
        }
        // Send notifications
        await this.notifyMaintenanceCompleted(maintenance);
    }
    async getUpcomingMaintenance() {
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return await this.maintenanceRepo.find({
            where: [
                { status: 'scheduled', scheduledStart: (0, typeorm_1.MoreThanOrEqual)(now) },
                { status: 'scheduled', scheduledEnd: (0, typeorm_1.MoreThanOrEqual)(now) }
            ],
            order: { scheduledStart: 'ASC' }
        });
    }
    async getActiveMaintenance() {
        return await this.maintenanceRepo.find({
            where: { status: 'in_progress' },
            order: { actualStart: 'ASC' }
        });
    }
    // Metrics and Monitoring
    async recordMetric(componentId, metricName, value, unit, metadata) {
        const metric = new StatusPage_1.StatusPageMetric();
        metric.componentId = componentId;
        metric.metricName = metricName;
        metric.value = value;
        metric.unit = unit;
        metric.timestamp = new Date();
        metric.metadata = metadata;
        await this.metricRepo.save(metric);
    }
    async recordUptimeCheck(componentId, isUp, responseTime) {
        await this.recordMetric(componentId, 'uptime', isUp ? 1 : 0, 'boolean', { responseTime });
        if (responseTime) {
            await this.recordMetric(componentId, 'response_time', responseTime, 'ms');
        }
        // Update component status if needed
        const component = await this.componentRepo.findOne({ where: { id: componentId } });
        if (component) {
            let newStatus = component.status;
            if (!isUp && component.status === StatusPage_1.ServiceStatus.OPERATIONAL) {
                newStatus = StatusPage_1.ServiceStatus.MAJOR_OUTAGE;
            }
            else if (isUp && component.status === StatusPage_1.ServiceStatus.MAJOR_OUTAGE) {
                newStatus = StatusPage_1.ServiceStatus.OPERATIONAL;
            }
            else if (responseTime && responseTime > 5000 && component.status === StatusPage_1.ServiceStatus.OPERATIONAL) {
                newStatus = StatusPage_1.ServiceStatus.DEGRADED_PERFORMANCE;
            }
            else if (responseTime && responseTime < 2000 && component.status === StatusPage_1.ServiceStatus.DEGRADED_PERFORMANCE) {
                newStatus = StatusPage_1.ServiceStatus.OPERATIONAL;
            }
            if (newStatus !== component.status) {
                await this.updateComponentStatus(componentId, newStatus);
            }
        }
    }
    async performHealthChecks() {
        const components = await this.componentRepo.find({
            where: { isActive: true, healthCheckUrl: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()) }
        });
        const healthCheckPromises = components.map(async (component) => {
            if (!component.healthCheckUrl)
                return;
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
            }
            catch (error) {
                console.error(`Health check failed for ${component.name}:`, error);
                await this.recordUptimeCheck(component.id, false);
            }
        });
        await Promise.all(healthCheckPromises);
    }
    // Subscription Management
    async subscribe(email, componentIds, notificationTypes) {
        // Check if subscriber already exists
        let subscriber = await this.subscriberRepo.findOne({ where: { email } });
        if (subscriber) {
            // Update existing subscriber
            if (componentIds)
                subscriber.subscribedComponents = componentIds;
            if (notificationTypes)
                subscriber.notificationTypes = notificationTypes;
        }
        else {
            // Create new subscriber
            subscriber = new StatusPage_1.StatusPageSubscriber();
            subscriber.email = email;
            subscriber.subscribedComponents = componentIds;
            subscriber.notificationTypes = notificationTypes;
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
    async confirmSubscription(token) {
        const subscriber = await this.subscriberRepo.findOne({
            where: { confirmationToken: token }
        });
        if (!subscriber)
            return false;
        subscriber.confirm();
        await this.subscriberRepo.save(subscriber);
        return true;
    }
    async unsubscribe(token) {
        const subscriber = await this.subscriberRepo.findOne({
            where: { unsubscribeToken: token }
        });
        if (!subscriber)
            return false;
        subscriber.isActive = false;
        await this.subscriberRepo.save(subscriber);
        return true;
    }
    // Helper Methods
    calculateOverallStatus(components, incidents, maintenance) {
        // Check for active critical incidents
        const criticalIncidents = incidents.filter((i) => i.impact === StatusPage_1.IncidentImpact.CRITICAL);
        if (criticalIncidents.length > 0) {
            return {
                status: StatusPage_1.ServiceStatus.MAJOR_OUTAGE,
                message: `Major outage affecting ${criticalIncidents.length} service${criticalIncidents.length > 1 ? 's' : ''}`
            };
        }
        // Check for active major incidents
        const majorIncidents = incidents.filter((i) => i.impact === StatusPage_1.IncidentImpact.MAJOR);
        if (majorIncidents.length > 0) {
            return {
                status: StatusPage_1.ServiceStatus.PARTIAL_OUTAGE,
                message: `Service disruption affecting ${majorIncidents.length} service${majorIncidents.length > 1 ? 's' : ''}`
            };
        }
        // Check for active maintenance
        if (maintenance.length > 0) {
            return {
                status: StatusPage_1.ServiceStatus.MAINTENANCE,
                message: `Scheduled maintenance in progress`
            };
        }
        // Check component statuses
        const degradedComponents = components.filter((c) => c.status === StatusPage_1.ServiceStatus.DEGRADED_PERFORMANCE ||
            c.status === StatusPage_1.ServiceStatus.PARTIAL_OUTAGE);
        if (degradedComponents.length > 0) {
            return {
                status: StatusPage_1.ServiceStatus.DEGRADED_PERFORMANCE,
                message: `Performance issues detected in ${degradedComponents.length} service${degradedComponents.length > 1 ? 's' : ''}`
            };
        }
        const outageComponents = components.filter((c) => c.status === StatusPage_1.ServiceStatus.MAJOR_OUTAGE);
        if (outageComponents.length > 0) {
            return {
                status: StatusPage_1.ServiceStatus.PARTIAL_OUTAGE,
                message: `Service outage affecting ${outageComponents.length} service${outageComponents.length > 1 ? 's' : ''}`
            };
        }
        return {
            status: StatusPage_1.ServiceStatus.OPERATIONAL,
            message: 'All systems operational'
        };
    }
    async getComponentMetrics(components) {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const uptimeMetrics = await this.metricRepo.find({
            where: {
                metricName: 'uptime',
                timestamp: (0, typeorm_1.MoreThanOrEqual)(last24Hours)
            }
        });
        const responseTimeMetrics = await this.metricRepo.find({
            where: {
                metricName: 'response_time',
                timestamp: (0, typeorm_1.MoreThanOrEqual)(last24Hours)
            }
        });
        // Calculate uptime percentages
        const componentUptimes = {};
        for (const component of components) {
            const componentMetrics = uptimeMetrics.filter((m) => m.componentId === component.id);
            if (componentMetrics.length > 0) {
                const upCount = componentMetrics.filter((m) => m.value === 1).length;
                componentUptimes[component.id] = (upCount / componentMetrics.length) * 100;
            }
            else {
                componentUptimes[component.id] = 100; // Assume operational if no metrics
            }
        }
        // Calculate response times
        const componentResponseTimes = {};
        for (const component of components) {
            const componentMetrics = responseTimeMetrics.filter((m) => m.componentId === component.id);
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
    groupMetricsByDay(uptimeMetrics, responseTimeMetrics, incidents, days) {
        const dailyData = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            const dayUptimeMetrics = uptimeMetrics.filter((m) => m.timestamp >= dayStart && m.timestamp <= dayEnd);
            const dayResponseTimeMetrics = responseTimeMetrics.filter((m) => m.timestamp >= dayStart && m.timestamp <= dayEnd);
            const dayIncidents = incidents.filter((i) => i.createdAt >= dayStart && i.createdAt <= dayEnd);
            const uptime = dayUptimeMetrics.length > 0
                ? (dayUptimeMetrics.filter((m) => m.value === 1).length / dayUptimeMetrics.length) * 100
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
    calculateUptimeSummary(dailyData, incidents) {
        const uptimePercentage = dailyData.reduce((sum, day) => sum + day.uptime, 0) / dailyData.length;
        const averageResponseTime = dailyData.reduce((sum, day) => sum + day.responseTime, 0) / dailyData.length;
        const totalIncidents = incidents.length;
        // Calculate MTTR (Mean Time To Recovery) in minutes
        const resolvedIncidents = incidents.filter((i) => i.resolvedAt);
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
    async updateComponentsForIncident(componentIds, impact) {
        const statusMap = {
            [StatusPage_1.IncidentImpact.NONE]: StatusPage_1.ServiceStatus.OPERATIONAL,
            [StatusPage_1.IncidentImpact.MINOR]: StatusPage_1.ServiceStatus.DEGRADED_PERFORMANCE,
            [StatusPage_1.IncidentImpact.MAJOR]: StatusPage_1.ServiceStatus.PARTIAL_OUTAGE,
            [StatusPage_1.IncidentImpact.CRITICAL]: StatusPage_1.ServiceStatus.MAJOR_OUTAGE
        };
        const targetStatus = statusMap[impact];
        for (const componentId of componentIds) {
            await this.updateComponentStatus(componentId, targetStatus);
        }
    }
    async restoreComponentsAfterIncident(componentIds) {
        // Check if components have other active incidents
        for (const componentId of componentIds) {
            const activeIncidents = await this.incidentRepo.find({
                where: {
                    status: (0, typeorm_1.Not)(StatusPage_1.IncidentStatus.RESOLVED)
                }
            });
            // Only restore to operational if no other incidents
            if (activeIncidents.length === 0) {
                await this.updateComponentStatus(componentId, StatusPage_1.ServiceStatus.OPERATIONAL);
            }
        }
    }
    async recordStatusChange(component, oldStatus, newStatus) {
        // Could record status change events in a separate table for audit trail
        // console.log(`Component ${component.name} status changed from ${oldStatus} to ${newStatus}`);
    }
    // Notification methods (stubs - implement based on your notification preferences)
    async notifyStatusChange(component, oldStatus, newStatus) {
        // Implementation depends on notification system
        // console.log(`Status change notification: ${component.name} ${oldStatus} -> ${newStatus}`);
    }
    async notifyIncidentCreated(incident) {
        // console.log(`Incident created notification: ${incident.title}`);
    }
    async notifyIncidentUpdated(incident) {
        // console.log(`Incident updated notification: ${incident.title} - ${incident.status}`);
    }
    async notifyMaintenanceScheduled(maintenance) {
        // console.log(`Maintenance scheduled notification: ${maintenance.title}`);
    }
    async notifyMaintenanceStarted(maintenance) {
        // console.log(`Maintenance started notification: ${maintenance.title}`);
    }
    async notifyMaintenanceCompleted(maintenance) {
        // console.log(`Maintenance completed notification: ${maintenance.title}`);
    }
    async sendConfirmationEmail(subscriber) {
        // console.log(`Confirmation email sent to: ${subscriber.email}`);
    }
}
exports.StatusPageService = StatusPageService;
//# sourceMappingURL=StatusPageService.js.map