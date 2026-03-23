/**
 * Graceful Degradation — Policy (evaluation, config, helpers)
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Extracted from GracefulDegradationService.ts
 */

import type { Repository } from 'typeorm';
import type { DataSource } from 'typeorm';
import { SystemMetrics } from '../../entities/SystemMetrics.js';
import { cacheService } from '../CacheService.js';
import {
  DegradationLevel,
  type DegradationRule,
  type DegradationTrigger,
  type FeatureDegradation,
} from './degradation.types.js';
import type { DegradationParameters } from '../../types/index.js';

// ── Trigger evaluation ──────────────────────────

export async function evaluateRule(
  rule: DegradationRule,
  dataSource: DataSource,
  systemMetricsRepo: Repository<SystemMetrics>
): Promise<boolean> {
  const triggerResults = await Promise.all(
    rule.conditions.triggers.map((trigger: any) => evaluateTrigger(trigger, dataSource, systemMetricsRepo))
  );

  if (rule.conditions.aggregation === 'all') {
    return triggerResults.every((result: any) => result);
  } else {
    return triggerResults.some((result: any) => result);
  }
}

export async function evaluateTrigger(
  trigger: DegradationTrigger,
  dataSource: DataSource,
  systemMetricsRepo: Repository<SystemMetrics>
): Promise<boolean> {
  switch (trigger.type) {
    case 'metric_threshold':
      return await evaluateMetricThreshold(trigger, systemMetricsRepo);

    case 'service_unavailable':
      return await evaluateServiceAvailability(trigger, dataSource);

    case 'error_rate':
      return await evaluateErrorRate(trigger, systemMetricsRepo);

    case 'response_time':
      return await evaluateResponseTime(trigger, systemMetricsRepo);

    case 'manual':
      return trigger.metadata?.activated === true;

    default:
      return false;
  }
}

export async function evaluateMetricThreshold(
  trigger: DegradationTrigger,
  systemMetricsRepo: Repository<SystemMetrics>
): Promise<boolean> {
  if (!trigger.metric || !trigger.operator || trigger.threshold === undefined) {
    return false;
  }

  const value = await getLatestMetricValue(systemMetricsRepo, trigger.metric);

  switch (trigger.operator) {
    case '>': return value > trigger.threshold;
    case '<': return value < trigger.threshold;
    case '>=': return value >= trigger.threshold;
    case '<=': return value <= trigger.threshold;
    case '=': return value === trigger.threshold;
    case '!=': return value !== trigger.threshold;
    default: return false;
  }
}

export async function evaluateServiceAvailability(
  trigger: DegradationTrigger,
  dataSource: DataSource
): Promise<boolean> {
  if (!trigger.service) return false;

  try {
    switch (trigger.service) {
      case 'database':
        await dataSource.query('SELECT 1');
        return false;

      case 'cache':
        await cacheService.get('health-check');
        return false;

      case 'signage':
        return false;

      default:
        if (trigger.metadata && 'healthCheckUrl' in trigger.metadata && typeof trigger.metadata.healthCheckUrl === 'string') {
          const response = await fetch(trigger.metadata.healthCheckUrl);
          return !response.ok;
        }
        return false;
    }
  } catch (error) {
    return true;
  }
}

export async function evaluateErrorRate(
  trigger: DegradationTrigger,
  systemMetricsRepo: Repository<SystemMetrics>
): Promise<boolean> {
  const errorMetrics = await getRecentMetrics(systemMetricsRepo, 'error_rate', 5);

  if (errorMetrics.length === 0) return false;

  const averageErrorRate = errorMetrics.reduce((sum, metric) =>
    sum + parseFloat(metric.value.toString()), 0) / errorMetrics.length;

  return averageErrorRate > (trigger.threshold || 10);
}

export async function evaluateResponseTime(
  trigger: DegradationTrigger,
  systemMetricsRepo: Repository<SystemMetrics>
): Promise<boolean> {
  const responseTimeMetrics = await getRecentMetrics(systemMetricsRepo, 'response_time', 5);

  if (responseTimeMetrics.length === 0) return false;

  const averageResponseTime = responseTimeMetrics.reduce((sum, metric) =>
    sum + parseFloat(metric.value.toString()), 0) / responseTimeMetrics.length;

  return averageResponseTime > (trigger.threshold || 5000);
}

// ── Revert evaluation ──────────────────────────

export async function evaluateRevertTrigger(
  trigger: DegradationTrigger,
  dataSource: DataSource,
  systemMetricsRepo: Repository<SystemMetrics>
): Promise<boolean> {
  switch (trigger.type) {
    case 'metric_threshold':
      return await evaluateMetricThreshold({
        ...trigger,
        operator: getOppositeOperator(trigger.operator!)
      }, systemMetricsRepo);

    case 'service_unavailable':
      return !(await evaluateServiceAvailability(trigger, dataSource));

    default:
      return !(await evaluateTrigger(trigger, dataSource, systemMetricsRepo));
  }
}

export function getOppositeOperator(operator: string): '>' | '<' | '>=' | '<=' | '=' | '!=' {
  const opposites: { [key: string]: '>' | '<' | '>=' | '<=' | '=' | '!=' } = {
    '>': '<=',
    '<': '>=',
    '>=': '<',
    '<=': '>',
    '=': '!=',
    '!=': '='
  };
  return opposites[operator] || operator as '>' | '<' | '>=' | '<=' | '=' | '!=';
}

// ── Helpers ──────────────────────────

export function getUserImpactSeverity(level: DegradationLevel): 'low' | 'medium' | 'high' {
  switch (level) {
    case DegradationLevel.MINIMAL: return 'low';
    case DegradationLevel.MODERATE: return 'medium';
    case DegradationLevel.SEVERE:
    case DegradationLevel.EMERGENCY: return 'high';
    default: return 'low';
  }
}

export async function getLatestMetricValue(
  systemMetricsRepo: Repository<SystemMetrics>,
  metricName: string
): Promise<number> {
  const metric = await systemMetricsRepo.findOne({
    where: { metricName: metricName },
    order: { createdAt: 'DESC' }
  });

  return metric ? parseFloat(metric.value.toString()) : 0;
}

export async function getRecentMetrics(
  systemMetricsRepo: Repository<SystemMetrics>,
  metricName: string,
  minutes: number
): Promise<SystemMetrics[]> {
  const since = new Date();
  since.setMinutes(since.getMinutes() - minutes);

  return await systemMetricsRepo.find({
    where: {
      metricName: metricName,
      createdAt: { $gte: since } as unknown as Date
    },
    order: { createdAt: 'DESC' }
  });
}

// ── Default config data ──────────────────────────

export function getDefaultDegradationRules(): DegradationRule[] {
  return [
    {
      id: 'high-memory-degradation',
      name: 'High Memory Usage Degradation',
      description: 'Reduce functionality when memory usage is high',
      conditions: {
        triggers: [
          {
            type: 'metric_threshold',
            metric: 'memory_usage',
            operator: '>',
            threshold: 90,
            duration: 5
          }
        ],
        aggregation: 'any'
      },
      actions: [
        {
          type: 'cache_fallback',
          target: 'api-responses',
          parameters: { threshold: 70, duration: 300, severity: 'medium', actions: ['cache_fallback'], enableStaleCache: true, maxStaleAge: 7200, cacheOnly: false, cacheKey: 'api-responses', ttl: 7200, staleWhileRevalidate: true } as DegradationParameters,
          description: 'Use extended cache for API responses'
        },
        {
          type: 'reduce_functionality',
          target: 'signage-analytics',
          parameters: { threshold: 50, duration: 300, severity: 'low', actions: ['reduce_functionality'], service: 'signage-analytics', reductionLevel: 50, preserveCore: true, features: ['realtime', 'polling'], level: 'minimal' } as DegradationParameters,
          description: 'Reduce signage analytics frequency'
        }
      ],
      level: DegradationLevel.MINIMAL,
      priority: 100,
      autoRevert: true,
      revertConditions: {
        triggers: [
          {
            type: 'metric_threshold',
            metric: 'memory_usage',
            operator: '<',
            threshold: 75
          }
        ],
        duration: 5
      }
    },
    {
      id: 'database-unavailable',
      name: 'Database Unavailable Degradation',
      description: 'Switch to cached content when database is unavailable',
      conditions: {
        triggers: [
          {
            type: 'service_unavailable',
            service: 'database'
          }
        ],
        aggregation: 'any'
      },
      actions: [
        {
          type: 'cache_fallback',
          target: 'all-queries',
          parameters: { threshold: 0, duration: 3600, severity: 'high', actions: ['cache_fallback'], enableStaleCache: true, maxStaleAge: 3600, cacheOnly: true, cacheKey: 'all-queries', ttl: 3600, fallbackData: 'cached_responses' } as DegradationParameters,
          description: 'Use cached data for all queries'
        },
        {
          type: 'static_content',
          target: 'dynamic-pages',
          parameters: { threshold: 0, duration: 7200, severity: 'critical', actions: ['static_content'], enableStaticMode: true, staticPages: ['*'], disableDynamic: true, contentPath: 'Database maintenance in progress', expiryTime: 7200 } as DegradationParameters,
          description: 'Show static maintenance message'
        }
      ],
      level: DegradationLevel.SEVERE,
      priority: 1000,
      autoRevert: true,
      revertConditions: {
        triggers: [
          {
            type: 'service_unavailable',
            service: 'database'
          }
        ],
        duration: 2
      }
    },
    {
      id: 'high-error-rate',
      name: 'High Error Rate Degradation',
      description: 'Reduce load when error rate is high',
      conditions: {
        triggers: [
          {
            type: 'error_rate',
            threshold: 25,
            duration: 3
          }
        ],
        aggregation: 'any'
      },
      actions: [
        {
          type: 'rate_limit',
          target: 'api-endpoints',
          parameters: { threshold: 30, duration: 60, severity: 'medium', actions: ['rate_limit'], requestsPerMinute: 30, burstLimit: 50, burstSize: 5, keyBy: 'ip' } as DegradationParameters,
          description: 'Reduce API rate limits'
        },
        {
          type: 'simplified_ui',
          target: 'web-interface',
          parameters: { threshold: 25, duration: 180, severity: 'medium', actions: ['simplified_ui'], removeFeatures: ['animations'], simplifyLayout: true, disableAnimations: true, reducedMedia: true, removeAnimations: true, disableImages: false, minimalCSS: false, essentialOnly: true } as DegradationParameters,
          description: 'Simplify web interface'
        }
      ],
      level: DegradationLevel.MODERATE,
      priority: 200,
      autoRevert: true,
      revertConditions: {
        triggers: [
          {
            type: 'error_rate',
            threshold: 10
          }
        ],
        duration: 10
      }
    }
  ];
}

export function getDefaultFeatureStates(): FeatureDegradation[] {
  return [
    {
      featureId: 'signage-analytics',
      featureName: 'Signage Analytics',
      normalState: { name: 'normal', enabled: true, degraded: false, functionality: { realtime: true, polling: true, fullMetrics: true }, limits: { pollingInterval: 30000 } },
      degradedState: { name: 'degraded', enabled: true, degraded: true, functionality: { realtime: false, polling: true, fullMetrics: false }, limits: { pollingInterval: 300000 } },
      currentState: { name: 'current', enabled: true, degraded: false, functionality: { realtime: true, polling: true, fullMetrics: true }, limits: { pollingInterval: 30000 } },
      isDegraded: false,
      degradationLevel: DegradationLevel.NONE,
      fallbackMethods: ['cached_data', 'simplified_metrics']
    },
    {
      featureId: 'api-responses',
      featureName: 'API Response Caching',
      normalState: { name: 'normal', enabled: true, degraded: false, functionality: { compression: true }, limits: { ttl: 300 } },
      degradedState: { name: 'degraded', enabled: true, degraded: true, functionality: { compression: false }, limits: { ttl: 3600 } },
      currentState: { name: 'current', enabled: true, degraded: false, functionality: { compression: true }, limits: { ttl: 300 } },
      isDegraded: false,
      degradationLevel: DegradationLevel.NONE,
      fallbackMethods: ['extended_cache', 'static_responses']
    },
    {
      featureId: 'web-interface',
      featureName: 'Web User Interface',
      normalState: { name: 'normal', enabled: true, degraded: false, functionality: { fullUI: true, animations: true, realTimeUpdates: true } },
      degradedState: { name: 'degraded', enabled: true, degraded: true, functionality: { fullUI: false, animations: false, realTimeUpdates: false } },
      currentState: { name: 'current', enabled: true, degraded: false, functionality: { fullUI: true, animations: true, realTimeUpdates: true } },
      isDegraded: false,
      degradationLevel: DegradationLevel.NONE,
      fallbackMethods: ['simplified_ui', 'static_pages']
    }
  ];
}
