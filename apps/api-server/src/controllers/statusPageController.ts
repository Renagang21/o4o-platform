import { Request, Response } from 'express';
import { StatusPageService } from '../services/StatusPageService';
import { IncidentImpact, IncidentStatus, ComponentType, ServiceStatus } from '../entities/StatusPage';
import { AuthRequest } from '../types/auth';

export class StatusPageController {
  private statusPageService: StatusPageService;

  constructor() {
    this.statusPageService = new StatusPageService();
  }

  // Public Status Page Endpoints
  async getPublicStatus(req: Request, res: Response): Promise<void> {
    try {
      const statusData = await this.statusPageService.getStatusPageData();
      
      res.json({
        success: true,
        data: statusData
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve status data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getComponentUptime(req: Request, res: Response): Promise<void> {
    try {
      const { componentId } = req.params;
      const { days = 90 } = req.query;
      
      const uptimeData = await this.statusPageService.getUptimeData(
        componentId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: uptimeData
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve uptime data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getIncidents(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50, status, impact } = req.query;
      
      let incidents = await this.statusPageService.getIncidents(parseInt(limit as string));
      
      // Apply filters
      if (status && status !== 'all') {
        incidents = incidents.filter((incident: any) => incident.status === status);
      }
      
      if (impact && impact !== 'all') {
        incidents = incidents.filter((incident: any) => incident.impact === impact);
      }

      res.json({
        success: true,
        data: {
          incidents,
          pagination: {
            total: incidents.length,
            limit: parseInt(limit as string)
          }
        }
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve incidents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getIncident(req: Request, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      
      // This would need to be implemented in the service
      // For now, get all incidents and find the one
      const incidents = await this.statusPageService.getIncidents(1000);
      const incident = incidents.find((i: any) => i.id === incidentId);
      
      if (!incident) {
        res.status(404).json({
          success: false,
          error: 'Incident not found'
        });
        return;
      }

      res.json({
        success: true,
        data: incident
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve incident',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Subscription Management (Public)
  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const { email, components, notifications } = req.body;
      
      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        res.status(400).json({
          success: false,
          error: 'Valid email address is required'
        });
        return;
      }

      const subscriber = await this.statusPageService.subscribe(
        email,
        components,
        notifications
      );

      res.json({
        success: true,
        data: {
          id: subscriber.id,
          email: subscriber.email,
          confirmed: subscriber.isConfirmed()
        },
        message: 'Subscription created. Please check your email to confirm.'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to create subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async confirmSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      
      const confirmed = await this.statusPageService.confirmSubscription(token);
      
      if (confirmed) {
        res.json({
          success: true,
          message: 'Subscription confirmed successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired confirmation token'
        });
      }
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to confirm subscription',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      
      const unsubscribed = await this.statusPageService.unsubscribe(token);
      
      if (unsubscribed) {
        res.json({
          success: true,
          message: 'Successfully unsubscribed from status updates'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid unsubscribe token'
        });
      }
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to unsubscribe',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Admin Endpoints (Protected)
  async getComponents(req: Request, res: Response): Promise<void> {
    try {
      const components = await this.statusPageService.getComponents();
      
      res.json({
        success: true,
        data: components
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve components',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createComponent(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, componentType, healthCheckUrl, sortOrder } = req.body;
      
      if (!name || !componentType) {
        res.status(400).json({
          success: false,
          error: 'Name and component type are required'
        });
        return;
      }

      const component = await this.statusPageService.createComponent({
        name,
        description,
        componentType: componentType as ComponentType,
        healthCheckUrl,
        sortOrder
      });

      res.status(201).json({
        success: true,
        data: component,
        message: 'Component created successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to create component',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateComponentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { componentId } = req.params;
      const { status } = req.body;
      
      if (!status || !Object.values(ServiceStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Valid status is required'
        });
        return;
      }

      await this.statusPageService.updateComponentStatus(componentId, status as ServiceStatus);

      res.json({
        success: true,
        message: 'Component status updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to update component status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, description, impact, affectedComponents } = req.body;
      const createdBy = req.user?.id;
      
      if (!title || !description || !impact || !affectedComponents) {
        res.status(400).json({
          success: false,
          error: 'Title, description, impact, and affected components are required'
        });
        return;
      }

      if (!Object.values(IncidentImpact).includes(impact)) {
        res.status(400).json({
          success: false,
          error: 'Invalid impact level'
        });
        return;
      }

      const incident = await this.statusPageService.createIncident({
        title,
        description,
        impact: impact as IncidentImpact,
        affectedComponents,
        createdBy
      });

      res.status(201).json({
        success: true,
        data: incident,
        message: 'Incident created successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to create incident',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateIncident(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const { status, message } = req.body;
      const updatedBy = req.user?.id;
      
      if (!status || !message) {
        res.status(400).json({
          success: false,
          error: 'Status and message are required'
        });
        return;
      }

      if (!Object.values(IncidentStatus).includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
        return;
      }

      const incident = await this.statusPageService.updateIncident(incidentId, {
        status: status as IncidentStatus,
        message,
        updatedBy
      });

      res.json({
        success: true,
        data: incident,
        message: 'Incident updated successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to update incident',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async scheduleMaintenance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { title, description, affectedComponents, scheduledStart, scheduledEnd } = req.body;
      const createdBy = req.user?.id;
      
      if (!title || !description || !affectedComponents || !scheduledStart || !scheduledEnd) {
        res.status(400).json({
          success: false,
          error: 'Title, description, affected components, and schedule are required'
        });
        return;
      }

      const maintenance = await this.statusPageService.scheduleMaintenance({
        title,
        description,
        affectedComponents,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        createdBy
      });

      res.status(201).json({
        success: true,
        data: maintenance,
        message: 'Maintenance scheduled successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to schedule maintenance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async startMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const { maintenanceId } = req.params;
      
      await this.statusPageService.startMaintenance(maintenanceId);

      res.json({
        success: true,
        message: 'Maintenance started successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to start maintenance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async completeMaintenance(req: Request, res: Response): Promise<void> {
    try {
      const { maintenanceId } = req.params;
      
      await this.statusPageService.completeMaintenance(maintenanceId);

      res.json({
        success: true,
        message: 'Maintenance completed successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to complete maintenance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async performHealthChecks(req: Request, res: Response): Promise<void> {
    try {
      await this.statusPageService.performHealthChecks();

      res.json({
        success: true,
        message: 'Health checks performed successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to perform health checks',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async recordMetric(req: Request, res: Response): Promise<void> {
    try {
      const { componentId, metricName, value, unit, metadata } = req.body;
      
      if (!componentId || !metricName || value === undefined || !unit) {
        res.status(400).json({
          success: false,
          error: 'Component ID, metric name, value, and unit are required'
        });
        return;
      }

      await this.statusPageService.recordMetric(
        componentId,
        metricName,
        parseFloat(value),
        unit,
        metadata
      );

      res.json({
        success: true,
        message: 'Metric recorded successfully'
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to record metric',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Dashboard and Analytics
  async getStatusAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      const daysNum = parseInt(days as string);
      
      const components = await this.statusPageService.getComponents();
      const incidents = await this.statusPageService.getIncidents(1000);
      
      // Calculate analytics
      const analytics = {
        overview: {
          totalComponents: components.length,
          operationalComponents: components.filter((c: any) => c.status === ServiceStatus.OPERATIONAL).length,
          totalIncidents: incidents.length,
          activeIncidents: incidents.filter((i: any) => i.status !== IncidentStatus.RESOLVED).length
        },
        uptime: {
          overall: 0, // Would calculate from metrics
          byComponent: {} // Would calculate from metrics
        },
        incidentTrends: {
          byDay: [] as Array<{ date: string; count: number }>, // Would calculate from incident data
          byImpact: {
            critical: incidents.filter((i: any) => i.impact === IncidentImpact.CRITICAL).length,
            major: incidents.filter((i: any) => i.impact === IncidentImpact.MAJOR).length,
            minor: incidents.filter((i: any) => i.impact === IncidentImpact.MINOR).length,
            none: incidents.filter((i: any) => i.impact === IncidentImpact.NONE).length
          }
        },
        responseMetrics: {
          averageResolutionTime: 0, // Would calculate from resolved incidents
          mttr: 0, // Mean Time To Recovery
          mtbf: 0  // Mean Time Between Failures
        }
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      // Error log removed
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve status analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const statusPageController = new StatusPageController();