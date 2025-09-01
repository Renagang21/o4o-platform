import { OperationsMonitoringService } from './OperationsMonitoringService';
import { StatusPageService } from './StatusPageService';
import { autoRecoveryService } from './AutoRecoveryService';
import { ComponentType, IncidentImpact, IncidentStatus } from '../entities/StatusPage';

export class MonitoringInitializer {
  private operationsService: OperationsMonitoringService;
  private statusPageService: StatusPageService;

  constructor() {
    this.operationsService = new OperationsMonitoringService();
    this.statusPageService = new StatusPageService();
  }

  async initialize(): Promise<void> {

    try {
      // Initialize default status page components
      await this.initializeStatusPageComponents();

      // Start monitoring services
      await this.operationsService.startMonitoring();

      // Initialize auto-recovery system
      await this.initializeAutoRecoverySystem();

      // Set up health check intervals
      await this.setupHealthCheckSchedules();

    } catch (error) {
      // Error log removed
      throw error;
    }
  }

  async shutdown(): Promise<void> {

    try {
      await this.operationsService.stopMonitoring();
      await autoRecoveryService.stopAutoRecovery();
    } catch (error) {
      // Error log removed
      throw error;
    }
  }

  private async initializeStatusPageComponents(): Promise<void> {

    const defaultComponents = [
      {
        name: 'API Server',
        description: 'Core API backend service',
        componentType: ComponentType.API,
        healthCheckUrl: `${process.env.API_URL || 'http://localhost:4000'}/health`,
        sortOrder: 1
      },
      {
        name: 'Web Application',
        description: 'Main website frontend',
        componentType: ComponentType.SERVICE,
        healthCheckUrl: `${process.env.WEB_URL || 'http://localhost:3000'}`,
        sortOrder: 2
      },
      {
        name: 'Admin Dashboard',
        description: 'Administrative interface',
        componentType: ComponentType.SERVICE,
        healthCheckUrl: `${process.env.ADMIN_URL || 'http://localhost:3001'}`,
        sortOrder: 3
      },
      {
        name: 'Database',
        description: 'PostgreSQL database server',
        componentType: ComponentType.DATABASE,
        sortOrder: 4
      },
      {
        name: 'File Storage',
        description: 'Static file storage and CDN',
        componentType: ComponentType.CDN,
        sortOrder: 5
      }
    ];

    // Check if components already exist
    const existingComponents = await this.statusPageService.getComponents();
    const existingNames = existingComponents.map((c: any) => c.name);

    for (const componentData of defaultComponents) {
      if (!existingNames.includes(componentData.name)) {
        try {
          await this.statusPageService.createComponent(componentData);
        } catch (error) {
          // Error log removed
        }
      }
    }
  }

  private async initializeAutoRecoverySystem(): Promise<void> {
    
    try {
      await autoRecoveryService.startAutoRecovery();
    } catch (error) {
      // Error log removed
      // Don't throw error - allow system to continue without auto-recovery
    }
  }

  private async setupHealthCheckSchedules(): Promise<void> {

    // Schedule regular health checks for status page
    setInterval(async () => {
      try {
        await this.statusPageService.performHealthChecks();
      } catch (error) {
        // Error log removed
      }
    }, 60000); // Every minute

    // Schedule less frequent comprehensive health checks
    setInterval(async () => {
      try {
        const systemStatus = await this.operationsService.getSystemStatus();
      } catch (error) {
        // Error log removed
      }
    }, 300000); // Every 5 minutes

  }

  // Utility method to check if monitoring is running
  async getMonitoringStatus(): Promise<{
    isRunning: boolean;
    services: {
      operations: boolean;
      statusPage: boolean;
      healthChecks: boolean;
    };
    uptime: number;
  }> {
    try {
      // Check if we can get system status (indicates operations monitoring is working)
      const systemStatus = await this.operationsService.getSystemStatus();
      
      // Check if we can get status page data (indicates status page service is working)
      const statusPageData = await this.statusPageService.getStatusPageData();
      
      return {
        isRunning: true,
        services: {
          operations: true,
          statusPage: true,
          healthChecks: true
        },
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        isRunning: false,
        services: {
          operations: false,
          statusPage: false,
          healthChecks: false
        },
        uptime: process.uptime()
      };
    }
  }

  // Method to create sample incidents for testing
  async createSampleIncident(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Warning log removed
      return;
    }

    const components = await this.statusPageService.getComponents();
    if (components.length === 0) {
      // Warning log removed
      return;
    }

    const sampleIncident = {
      title: 'Sample Performance Degradation',
      description: 'This is a sample incident created for testing purposes. API response times are higher than normal.',
      impact: IncidentImpact.MINOR,
      affectedComponents: [components[0].id],
      createdBy: 'system'
    };

    try {
      const incident = await this.statusPageService.createIncident(sampleIncident);
      
      // Auto-resolve after 5 minutes for demonstration
      setTimeout(async () => {
        try {
          await this.statusPageService.updateIncident(incident.id, {
            status: IncidentStatus.RESOLVED,
            message: 'Performance has returned to normal levels. Monitoring continues.',
            updatedBy: 'system'
          });
        } catch (error) {
          // Error log removed
        }
      }, 5 * 60 * 1000); // 5 minutes
    } catch (error) {
      // Error log removed
    }
  }

  // Method to create sample maintenance for testing
  async createSampleMaintenance(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Warning log removed
      return;
    }

    const components = await this.statusPageService.getComponents();
    if (components.length === 0) {
      // Warning log removed
      return;
    }

    const now = new Date();
    const scheduledStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const sampleMaintenance = {
      title: 'Scheduled Database Maintenance',
      description: 'Regular database maintenance including index optimization and backup verification.',
      affectedComponents: [components.find((c: any) => c.name === 'Database')?.id || components[0].id],
      scheduledStart,
      scheduledEnd,
      createdBy: 'system'
    };

    try {
      const maintenance = await this.statusPageService.scheduleMaintenance(sampleMaintenance);
    } catch (error) {
      // Error log removed
    }
  }

  // Method to populate sample metrics
  async populateSampleMetrics(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Warning log removed
      return;
    }

    const components = await this.statusPageService.getComponents();
    if (components.length === 0) {
      // Warning log removed
      return;
    }


    // Generate sample uptime and response time data for the last 24 hours
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const component of components) {
      // Generate hourly metrics for the last 24 hours
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(oneDayAgo.getTime() + i * 60 * 60 * 1000);
        
        // Generate realistic uptime (99% uptime with occasional downtime)
        const isUp = Math.random() > 0.01;
        
        // Generate realistic response times (100-500ms with occasional spikes)
        const responseTime = Math.random() > 0.1 
          ? 100 + Math.random() * 400 
          : 1000 + Math.random() * 2000;

        try {
          await this.statusPageService.recordUptimeCheck(component.id, isUp, Math.round(responseTime));
        } catch (error) {
          // Error log removed
        }
      }
    }

  }

  // Development helper methods
  async setupDevelopmentEnvironment(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Warning log removed
      return;
    }


    try {
      await this.populateSampleMetrics();
      await this.createSampleMaintenance();
      
      // Wait a bit before creating incident to see normal state first
      setTimeout(async () => {
        await this.createSampleIncident();
      }, 5000);

    } catch (error) {
      // Error log removed
    }
  }
}

// Export singleton instance
export const monitoringInitializer = new MonitoringInitializer();