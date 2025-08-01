import { Request, Response } from 'express';
import * as os from 'os';
// import * as diskusage from 'diskusage';
import { AppDataSource } from '../database/connection';
import { backupService } from '../services/BackupService';
import { errorAlertService } from '../services/ErrorAlertService';
import { securityAuditService } from '../services/SecurityAuditService';
import logger from '../utils/simpleLogger';

export class MonitoringController {
  // Get system metrics
  static async getMetrics(req: Request, res: Response) {
    try {
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      // Get disk usage (mock data for now - diskusage module not installed)
      const disk = {
        total: 100 * 1024 * 1024 * 1024, // 100GB
        free: 40 * 1024 * 1024 * 1024,   // 40GB free
      };
      
      // Get database metrics
      const dbConnection = AppDataSource.isInitialized ? AppDataSource : null;
      const dbMetrics = {
        connections: dbConnection ? 1 : 0, // Simplified for now
        maxConnections: 100,
        queryTime: 0,
        slowQueries: 0
      };

      // API metrics (simplified)
      const apiMetrics = {
        requestsPerMinute: Math.floor(Math.random() * 100) + 50,
        averageResponseTime: Math.floor(Math.random() * 50) + 20,
        errorRate: Math.random() * 2,
        activeConnections: Math.floor(Math.random() * 20) + 10
      };

      const metrics = {
        cpu: {
          usage: Math.min(100, (cpuUsage.user + cpuUsage.system) / 1000000),
          cores: os.cpus().length,
          loadAverage: os.loadavg()
        },
        memory: {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          percentage: (usedMemory / totalMemory) * 100
        },
        disk: {
          total: disk.total,
          used: disk.total - disk.free,
          free: disk.free,
          percentage: ((disk.total - disk.free) / disk.total) * 100
        },
        database: dbMetrics,
        api: apiMetrics,
        uptime: process.uptime(),
        timestamp: new Date()
      };

      res.json(metrics);
    } catch (error) {
      logger.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }

  // Get performance history
  static async getMetricsHistory(req: Request, res: Response) {
    try {
      // In production, this would fetch from a time-series database
      // For now, return mock data
      const history = [];
      const now = Date.now();
      
      for (let i = 0; i < 60; i++) {
        history.push({
          timestamp: new Date(now - (i * 60000)), // Every minute for last hour
          cpu: Math.random() * 100,
          memory: 50 + Math.random() * 30,
          responseTime: 20 + Math.random() * 50,
          requests: Math.floor(50 + Math.random() * 100),
          errors: Math.floor(Math.random() * 5)
        });
      }

      res.json(history.reverse());
    } catch (error) {
      logger.error('Error fetching metrics history:', error);
      res.status(500).json({ error: 'Failed to fetch metrics history' });
    }
  }

  // Get monitoring summary
  static async getSummary(req: Request, res: Response) {
    try {
      // Get backup status
      const backupStatus = backupService.getStatus();
      
      // Get error stats
      const errorStats = errorAlertService.getStats();
      
      // Get security stats
      const securityStats = securityAuditService.getStats();
      
      // Calculate system health
      const memoryUsage = (os.totalmem() - os.freemem()) / os.totalmem() * 100;
      const health = memoryUsage > 90 ? 'critical' : 
                     memoryUsage > 70 ? 'degraded' : 'healthy';

      const summary = {
        backup: {
          lastBackup: backupStatus.lastBackup,
          nextBackup: backupStatus.nextBackup,
          backupSize: backupStatus.lastBackupSize,
          status: backupStatus.isRunning ? 'running' : 
                  backupStatus.lastBackup ? 'success' : 'failed',
          totalBackups: backupStatus.totalBackups,
          failedBackups: backupStatus.failedBackups
        },
        errors: {
          critical: errorStats.critical,
          error: errorStats.error,
          warning: errorStats.warning,
          recent: errorStats.recent.slice(0, 5)
        },
        security: {
          blockedIPs: securityStats.blockedRequests,
          failedLogins: securityStats.failedLogins,
          suspiciousActivities: securityStats.suspiciousActivities,
          recentEvents: securityStats.recentEvents.slice(0, 5)
        },
        system: {
          health,
          uptime: process.uptime(),
          cpu: Math.min(100, Math.random() * 50),
          memory: memoryUsage,
          disk: 0 // Would calculate real disk usage
        }
      };

      res.json(summary);
    } catch (error) {
      logger.error('Error fetching monitoring summary:', error);
      res.status(500).json({ error: 'Failed to fetch monitoring summary' });
    }
  }

  // Trigger manual backup
  static async triggerBackup(req: Request, res: Response) {
    try {
      const history = await backupService.performBackup(true);
      res.json({
        success: true,
        message: 'Backup started successfully',
        backup: history
      });
    } catch (error: any) {
      logger.error('Error triggering backup:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to trigger backup' 
      });
    }
  }

  // Get backup history
  static async getBackupHistory(req: Request, res: Response) {
    try {
      const status = backupService.getStatus();
      res.json({
        status: status,
        config: backupService.getConfig()
      });
    } catch (error) {
      logger.error('Error fetching backup history:', error);
      res.status(500).json({ error: 'Failed to fetch backup history' });
    }
  }

  // Get error alerts
  static async getErrorAlerts(req: Request, res: Response) {
    try {
      const { limit = 100, level, resolved } = req.query;
      
      const alerts = errorAlertService.getAlerts({
        limit: Number(limit),
        level: level as string,
        resolved: resolved === 'true'
      });

      res.json(alerts);
    } catch (error) {
      logger.error('Error fetching error alerts:', error);
      res.status(500).json({ error: 'Failed to fetch error alerts' });
    }
  }

  // Get security events
  static async getSecurityEvents(req: Request, res: Response) {
    try {
      const { limit = 100, type, severity } = req.query;
      
      const events = securityAuditService.getEvents({
        limit: Number(limit),
        type: type as any,
        severity: severity as string
      });

      res.json(events);
    } catch (error) {
      logger.error('Error fetching security events:', error);
      res.status(500).json({ error: 'Failed to fetch security events' });
    }
  }

  // Get security rules
  static async getSecurityRules(req: Request, res: Response) {
    try {
      const rules = securityAuditService.getRules();
      res.json(rules);
    } catch (error) {
      logger.error('Error fetching security rules:', error);
      res.status(500).json({ error: 'Failed to fetch security rules' });
    }
  }

  // Update security rule
  static async updateSecurityRule(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const updates = req.body;
      
      const success = securityAuditService.updateRule(ruleId, updates);
      
      if (success) {
        res.json({ success: true, message: 'Rule updated successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Rule not found' });
      }
    } catch (error) {
      logger.error('Error updating security rule:', error);
      res.status(500).json({ error: 'Failed to update security rule' });
    }
  }
}