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
    // console.log('🚀 Initializing 24/7 Operations Monitoring System...');

    try {
      // Initialize default status page components
      await this.initializeStatusPageComponents();

      // Start monitoring services
      await this.operationsService.startMonitoring();

      // Initialize auto-recovery system
      await this.initializeAutoRecoverySystem();

      // Set up health check intervals
      await this.setupHealthCheckSchedules();

      // console.log('✅ 24/7 Operations Monitoring System initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring system:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    // console.log('🛑 Shutting down 24/7 Operations Monitoring System...');

    try {
      await this.operationsService.stopMonitoring();
      await autoRecoveryService.stopAutoRecovery();
      // console.log('✅ 24/7 Operations Monitoring System shutdown complete');
    } catch (error) {
      console.error('❌ Error during monitoring system shutdown:', error);
      throw error;
    }
  }

  private async initializeStatusPageComponents(): Promise<void> {
    // console.log('📊 Setting up status page components...');

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
    const existingNames = existingComponents.map(c => c.name);

    for (const componentData of defaultComponents) {
      if (!existingNames.includes(componentData.name)) {
        try {
          await this.statusPageService.createComponent(componentData);
          // console.log(`✅ Created status page component: ${componentData.name}`);
        } catch (error) {
          console.error(`❌ Failed to create component ${componentData.name}:`, error);
        }
      } else {
        // console.log(`⏭️  Component already exists: ${componentData.name}`);
      }
    }
  }

  private async initializeAutoRecoverySystem(): Promise<void> {
    // console.log('🔄 Initializing Auto-Recovery and Incident Response System...');
    
    try {
      await autoRecoveryService.startAutoRecovery();
      // console.log('✅ Auto-Recovery System initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Auto-Recovery System:', error);
      // Don't throw error - allow system to continue without auto-recovery
    }
  }

  private async setupHealthCheckSchedules(): Promise<void> {
    // console.log('🔍 Setting up health check schedules...');

    // Schedule regular health checks for status page
    setInterval(async () => {
      try {
        await this.statusPageService.performHealthChecks();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 60000); // Every minute

    // Schedule less frequent comprehensive health checks
    setInterval(async () => {
      try {
        const systemStatus = await this.operationsService.getSystemStatus();
        // console.log(`System Status: ${systemStatus.overallStatus} - ${systemStatus.services.length} services monitored`);
      } catch (error) {
        console.error('System status check failed:', error);
      }
    }, 300000); // Every 5 minutes

    // console.log('✅ Health check schedules configured');
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
      console.warn('Skipping sample incident creation in production');
      return;
    }

    const components = await this.statusPageService.getComponents();
    if (components.length === 0) {
      console.warn('No components available for sample incident');
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
      // console.log(`📝 Created sample incident: ${incident.id}`);
      
      // Auto-resolve after 5 minutes for demonstration
      setTimeout(async () => {
        try {
          await this.statusPageService.updateIncident(incident.id, {
            status: IncidentStatus.RESOLVED,
            message: 'Performance has returned to normal levels. Monitoring continues.',
            updatedBy: 'system'
          });
          // console.log(`✅ Auto-resolved sample incident: ${incident.id}`);
        } catch (error) {
          console.error('Failed to auto-resolve sample incident:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
    } catch (error) {
      console.error('Failed to create sample incident:', error);
    }
  }

  // Method to create sample maintenance for testing
  async createSampleMaintenance(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Skipping sample maintenance creation in production');
      return;
    }

    const components = await this.statusPageService.getComponents();
    if (components.length === 0) {
      console.warn('No components available for sample maintenance');
      return;
    }

    const now = new Date();
    const scheduledStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const scheduledEnd = new Date(scheduledStart.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const sampleMaintenance = {
      title: 'Scheduled Database Maintenance',
      description: 'Regular database maintenance including index optimization and backup verification.',
      affectedComponents: [components.find(c => c.name === 'Database')?.id || components[0].id],
      scheduledStart,
      scheduledEnd,
      createdBy: 'system'
    };

    try {
      const maintenance = await this.statusPageService.scheduleMaintenance(sampleMaintenance);
      // console.log(`🔧 Created sample maintenance: ${maintenance.id}`);
    } catch (error) {
      console.error('Failed to create sample maintenance:', error);
    }
  }

  // Method to populate sample metrics
  async populateSampleMetrics(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Skipping sample metrics population in production');
      return;
    }

    const components = await this.statusPageService.getComponents();
    if (components.length === 0) {
      console.warn('No components available for sample metrics');
      return;
    }

    // console.log('📈 Populating sample metrics...');

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
          console.error(`Failed to record sample metric for ${component.name}:`, error);
        }
      }
    }

    // console.log('✅ Sample metrics populated');
  }

  // Development helper methods
  async setupDevelopmentEnvironment(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Skipping development environment setup in production');
      return;
    }

    // console.log('🛠️  Setting up development environment...');

    try {
      await this.populateSampleMetrics();
      await this.createSampleMaintenance();
      
      // Wait a bit before creating incident to see normal state first
      setTimeout(async () => {
        await this.createSampleIncident();
      }, 5000);

      // console.log('✅ Development environment setup complete');
    } catch (error) {
      console.error('❌ Failed to setup development environment:', error);
    }
  }
}

// Export singleton instance
export const monitoringInitializer = new MonitoringInitializer();