import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { SystemMetrics, MetricCategory } from '../entities/SystemMetrics';
import { Alert, AlertSeverity } from '../entities/Alert';
import { PricingResult } from '../types/auth';
import { signageService } from './signageService';
import { cacheService } from './CacheService';
import {
  DegradationMetadata,
  DegradationParameters,
  DisableFeatureParams,
  ReduceFunctionalityParams,
  CacheFallbackParams,
  StaticContentParams,
  SimplifiedUIParams,
  RateLimitParams,
  RequestQueuingParams,
  RedirectTrafficParams,
  FeatureState,
  IsolationParameters,
  convertToDisableFeatureParams,
  convertToReduceFunctionalityParams,
  convertToCacheFallbackParams,
  convertToStaticContentParams,
  convertToSimplifiedUIParams,
  convertToRateLimitParams,
  convertToRequestQueuingParams,
  convertToRedirectTrafficParams,
  convertToIsolationParameters
} from '../types';

export enum DegradationLevel {
  NONE = 'none',
  MINIMAL = 'minimal',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  EMERGENCY = 'emergency'
}

export interface DegradationRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    triggers: DegradationTrigger[];
    aggregation: 'any' | 'all';
  };
  actions: DegradationAction[];
  level: DegradationLevel;
  priority: number;
  autoRevert: boolean;
  revertConditions?: {
    triggers: DegradationTrigger[];
    duration: number; // minutes
  };
}

export interface DegradationTrigger {
  type: 'metric_threshold' | 'service_unavailable' | 'error_rate' | 'response_time' | 'manual';
  metric?: string;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
  threshold?: number;
  duration?: number; // minutes
  service?: string;
  metadata?: DegradationMetadata;
}

export interface DegradationAction {
  type: 'disable_feature' | 'reduce_functionality' | 'cache_fallback' | 'static_content' | 'simplified_ui' | 'rate_limit' | 'queue_requests' | 'redirect_traffic';
  target: string;
  parameters: DegradationParameters;
  description: string;
}

export interface ActiveDegradation {
  id: string;
  ruleId: string;
  level: DegradationLevel;
  startTime: Date;
  endTime?: Date;
  trigger: string;
  actionsApplied: string[];
  affectedFeatures: string[];
  userImpact: {
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedUserCount?: number;
  };
  metadata?: DegradationMetadata;
}

export interface FeatureDegradation {
  featureId: string;
  featureName: string;
  normalState: FeatureState;
  degradedState: FeatureState;
  currentState: FeatureState;
  isDegraded: boolean;
  degradationLevel: DegradationLevel;
  fallbackMethods: string[];
}

export class GracefulDegradationService {
  private systemMetricsRepo: Repository<SystemMetrics>;
  private alertRepo: Repository<Alert>;
  
  private degradationRules: Map<string, DegradationRule> = new Map();
  private activeDegradations: Map<string, ActiveDegradation> = new Map();
  private featureStates: Map<string, FeatureDegradation> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  
  private isEnabled: boolean = true;

  constructor() {
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.alertRepo = AppDataSource.getRepository(Alert);
  }

  async initialize(): Promise<void> {
    // console.log('🛡️ Initializing Graceful Degradation Service...');
    
    await this.initializeDegradationRules();
    await this.initializeFeatureStates();
    await this.startMonitoring();
    
    // console.log('✅ Graceful Degradation Service initialized');
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Revert all active degradations
    await this.revertAllDegradations();
    
    // console.log('🛡️ Graceful Degradation Service shut down');
  }

  // Main degradation logic
  async evaluateDegradationNeeds(): Promise<void> {
    if (!this.isEnabled) return;

    for (const rule of this.degradationRules.values()) {
      const shouldActivate = await this.evaluateRule(rule);
      const isActive = this.activeDegradations.has(rule.id);

      if (shouldActivate && !isActive) {
        await this.activateDegradation(rule);
      } else if (!shouldActivate && isActive && rule.autoRevert) {
        await this.checkRevertConditions(rule);
      }
    }
  }

  private async evaluateRule(rule: DegradationRule): Promise<boolean> {
    const triggerResults = await Promise.all(
      rule.conditions.triggers.map((trigger: any) => this.evaluateTrigger(trigger))
    );

    if (rule.conditions.aggregation === 'all') {
      return triggerResults.every((result: any) => result);
    } else {
      return triggerResults.some((result: any) => result);
    }
  }

  private async evaluateTrigger(trigger: DegradationTrigger): Promise<boolean> {
    switch (trigger.type) {
      case 'metric_threshold':
        return await this.evaluateMetricThreshold(trigger);
      
      case 'service_unavailable':
        return await this.evaluateServiceAvailability(trigger);
      
      case 'error_rate':
        return await this.evaluateErrorRate(trigger);
      
      case 'response_time':
        return await this.evaluateResponseTime(trigger);
      
      case 'manual':
        return trigger.metadata?.activated === true;
      
      default:
        return false;
    }
  }

  private async evaluateMetricThreshold(trigger: DegradationTrigger): Promise<boolean> {
    if (!trigger.metric || !trigger.operator || trigger.threshold === undefined) {
      return false;
    }

    const value = await this.getLatestMetricValue(trigger.metric);
    
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

  private async evaluateServiceAvailability(trigger: DegradationTrigger): Promise<boolean> {
    if (!trigger.service) return false;

    try {
      // Check service health based on service type
      switch (trigger.service) {
        case 'database':
          await AppDataSource.query('SELECT 1');
          return false; // Service is available
        
        case 'cache':
          await cacheService.get('health-check');
          return false; // Service is available
        
        case 'signage':
          await signageService.getSignageAnalytics();
          return false; // Service is available
        
        default:
          // Generic HTTP health check
          if (trigger.metadata && 'healthCheckUrl' in trigger.metadata && typeof trigger.metadata.healthCheckUrl === 'string') {
            const response = await fetch(trigger.metadata.healthCheckUrl);
            return !response.ok; // Service unavailable if not OK
          }
          return false;
      }
    } catch (error) {
      console.error(`Service health check failed for ${trigger.service}:`, error);
      return true; // Service unavailable
    }
  }

  private async evaluateErrorRate(trigger: DegradationTrigger): Promise<boolean> {
    const errorMetrics = await this.getRecentMetrics('error_rate', 5); // Last 5 minutes
    
    if (errorMetrics.length === 0) return false;
    
    const averageErrorRate = errorMetrics.reduce((sum, metric) => 
      sum + parseFloat(metric.value.toString()), 0) / errorMetrics.length;
    
    return averageErrorRate > (trigger.threshold || 10);
  }

  private async evaluateResponseTime(trigger: DegradationTrigger): Promise<boolean> {
    const responseTimeMetrics = await this.getRecentMetrics('response_time', 5);
    
    if (responseTimeMetrics.length === 0) return false;
    
    const averageResponseTime = responseTimeMetrics.reduce((sum, metric) => 
      sum + parseFloat(metric.value.toString()), 0) / responseTimeMetrics.length;
    
    return averageResponseTime > (trigger.threshold || 5000);
  }

  // Degradation activation and management
  private async activateDegradation(rule: DegradationRule): Promise<void> {
    // console.log(`🛡️ Activating degradation rule: ${rule.name} (Level: ${rule.level})`);

    const degradation: ActiveDegradation = {
      id: `degradation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      level: rule.level,
      startTime: new Date(),
      trigger: `Rule: ${rule.name}`,
      actionsApplied: [],
      affectedFeatures: [],
      userImpact: {
        severity: this.getUserImpactSeverity(rule.level),
        description: rule.description
      }
    };

    // Apply degradation actions
    for (const action of rule.actions) {
      try {
        await this.applyDegradationAction(action, degradation);
        degradation.actionsApplied.push(action.type);
        // console.log(`✅ Applied degradation action: ${action.type} on ${action.target}`);
      } catch (error) {
        console.error(`❌ Failed to apply degradation action: ${action.type}`, error);
      }
    }

    this.activeDegradations.set(rule.id, degradation);

    // Record degradation event
    await this.recordDegradationEvent('activated', degradation);

    // Create alert if high impact
    if (rule.level === DegradationLevel.SEVERE || rule.level === DegradationLevel.EMERGENCY) {
      await this.createDegradationAlert(degradation);
    }
  }

  private async applyDegradationAction(action: DegradationAction, degradation: ActiveDegradation): Promise<void> {
    switch (action.type) {
      case 'disable_feature':
        await this.disableFeature(action.target, convertToDisableFeatureParams(action.parameters), degradation);
        break;
      
      case 'reduce_functionality':
        await this.reduceFunctionality(action.target, convertToReduceFunctionalityParams(action.parameters), degradation);
        break;
      
      case 'cache_fallback':
        await this.enableCacheFallback(action.target, convertToCacheFallbackParams(action.parameters), degradation);
        break;
      
      case 'static_content':
        await this.enableStaticContent(action.target, convertToStaticContentParams(action.parameters), degradation);
        break;
      
      case 'simplified_ui':
        await this.enableSimplifiedUI(action.target, convertToSimplifiedUIParams(action.parameters), degradation);
        break;
      
      case 'rate_limit':
        await this.enableRateLimit(action.target, convertToRateLimitParams(action.parameters), degradation);
        break;
      
      case 'queue_requests':
        await this.enableRequestQueuing(action.target, convertToRequestQueuingParams(action.parameters), degradation);
        break;
      
      case 'redirect_traffic':
        await this.redirectTraffic(action.target, convertToRedirectTrafficParams(action.parameters), degradation);
        break;
      
      default:
        console.warn(`Unknown degradation action type: ${action.type}`);
    }
  }

  // Specific degradation actions
  private async disableFeature(featureId: string, parameters: DisableFeatureParams, degradation: ActiveDegradation): Promise<void> {
    const feature = this.featureStates.get(featureId);
    if (feature) {
      feature.isDegraded = true;
      feature.degradationLevel = degradation.level;
      feature.currentState = { ...feature.currentState, enabled: false };
      degradation.affectedFeatures.push(featureId);
      
      // console.log(`🚫 Disabled feature: ${featureId}`);
    }
  }

  private async reduceFunctionality(featureId: string, parameters: ReduceFunctionalityParams, degradation: ActiveDegradation): Promise<void> {
    const feature = this.featureStates.get(featureId);
    if (feature) {
      feature.isDegraded = true;
      feature.degradationLevel = degradation.level;
      feature.currentState = { ...feature.currentState, functionality: parameters.features?.reduce((acc: Record<string, boolean>, feat: string) => ({ ...acc, [feat]: false }), feature.currentState.functionality || {}) };
      degradation.affectedFeatures.push(featureId);
      
      // console.log(`⬇️ Reduced functionality for: ${featureId}`);
    }
  }

  private async enableCacheFallback(target: string, parameters: CacheFallbackParams, degradation: ActiveDegradation): Promise<void> {
    // Enable extended cache usage for the target service
    const cacheKey = `degradation_fallback_${target}`;
    // Store degradation state in cache using a generic key-value approach
    const cacheData = {
      enabled: true,
      degradationLevel: degradation.level,
      fallbackData: parameters.fallbackData || {}
    };
    // Use direct redis access through cacheService
    if (true) {
      await cacheService.set(cacheKey, cacheData, undefined, { ttl: parameters.ttl || 3600 });
    }
    
    // console.log(`🗄️ Enabled cache fallback for: ${target}`);
  }

  private async enableStaticContent(target: string, parameters: StaticContentParams, degradation: ActiveDegradation): Promise<void> {
    // Switch to static content delivery for the target
    const staticKey = `static_content_${target}`;
    // Store static content configuration in cache
    const staticData = {
      enabled: true,
      staticContent: parameters.contentPath || 'Service temporarily unavailable',
      degradationLevel: degradation.level
    };
    if (true) {
      await cacheService.set(staticKey, staticData, undefined, { ttl: parameters.expiryTime || 7200 });
    }
    
    // console.log(`📄 Enabled static content for: ${target}`);
  }

  private async enableSimplifiedUI(target: string, parameters: SimplifiedUIParams, degradation: ActiveDegradation): Promise<void> {
    // Enable simplified UI mode
    const uiKey = `simplified_ui_${target}`;
    // Store UI simplification settings in cache
    const uiData = {
      enabled: true,
      removeAnimations: parameters.removeAnimations,
      disableImages: parameters.disableImages || false,
      minimalCSS: parameters.minimalCSS || false,
      essentialOnly: parameters.essentialOnly || false,
      degradationLevel: degradation.level
    };
    if (true) {
      await cacheService.set(uiKey, uiData, undefined, { ttl: 3600 });
    }
    
    // console.log(`🎨 Enabled simplified UI for: ${target}`);
  }

  private async enableRateLimit(target: string, parameters: RateLimitParams, degradation: ActiveDegradation): Promise<void> {
    // Implement rate limiting for the target
    const rateLimitKey = `rate_limit_${target}`;
    // Store rate limit configuration in cache
    const rateLimitData = {
      enabled: true,
      requestsPerMinute: parameters.requestsPerMinute || 60,
      burstSize: parameters.burstSize || 10,
      keyBy: parameters.keyBy || 'ip',
      degradationLevel: degradation.level
    };
    if (true) {
      await cacheService.set(rateLimitKey, rateLimitData, undefined, { ttl: 1800 });
    }
    
    // console.log(`🚦 Enabled rate limiting for: ${target} (${parameters.requestsPerMinute} req/min)`);
  }

  private async enableRequestQueuing(target: string, parameters: RequestQueuingParams, degradation: ActiveDegradation): Promise<void> {
    // Enable request queuing for the target
    const queueKey = `request_queue_${target}`;
    // Store request queuing configuration in cache
    const queueData = {
      enabled: true,
      maxQueueSize: parameters.maxQueueSize || 1000,
      timeoutMs: parameters.timeout * 1000 || 30000,
      priority: parameters.priority || 'fifo',
      degradationLevel: degradation.level
    };
    if (true) {
      await cacheService.set(queueKey, queueData, undefined, { ttl: 1800 });
    }
    
    // console.log(`📥 Enabled request queuing for: ${target} (max: ${parameters.maxQueueSize || 1000})`);
  }

  private async redirectTraffic(target: string, parameters: RedirectTrafficParams, degradation: ActiveDegradation): Promise<void> {
    // Implement traffic redirection
    const redirectKey = `traffic_redirect_${target}`;
    // Store traffic redirection configuration in cache
    const redirectData = {
      enabled: true,
      targetUrl: parameters.targetUrl || parameters.targetServer,
      percentage: parameters.percentage || 100,
      preservePath: parameters.preservePath || false,
      statusCode: parameters.statusCode || 302,
      degradationLevel: degradation.level
    };
    if (true) {
      await cacheService.set(redirectKey, redirectData, undefined, { ttl: 1800 });
    }
    
    // console.log(`🔀 Enabled traffic redirection for: ${target} to ${parameters.targetUrl || parameters.targetServer}`);
  }

  // Degradation reversion
  private async checkRevertConditions(rule: DegradationRule): Promise<void> {
    if (!rule.revertConditions) return;

    const revertResults = await Promise.all(
      rule.revertConditions.triggers.map((trigger: any) => this.evaluateRevertTrigger(trigger))
    );

    const shouldRevert = revertResults.every((result: any) => result);
    
    if (shouldRevert) {
      const degradation = this.activeDegradations.get(rule.id);
      if (degradation) {
        const durationSinceActivation = Date.now() - degradation.startTime.getTime();
        const requiredDuration = (rule.revertConditions.duration || 5) * 60 * 1000;
        
        if (durationSinceActivation >= requiredDuration) {
          await this.revertDegradation(rule.id);
        }
      }
    }
  }

  private async evaluateRevertTrigger(trigger: DegradationTrigger): Promise<boolean> {
    // Revert triggers are typically the opposite of activation triggers
    switch (trigger.type) {
      case 'metric_threshold':
        return await this.evaluateMetricThreshold({
          ...trigger,
          operator: this.getOppositeOperator(trigger.operator!)
        });
      
      case 'service_unavailable':
        return !(await this.evaluateServiceAvailability(trigger));
      
      default:
        return !(await this.evaluateTrigger(trigger));
    }
  }

  private getOppositeOperator(operator: string): '>' | '<' | '>=' | '<=' | '=' | '!=' {
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

  private async revertDegradation(ruleId: string): Promise<void> {
    const degradation = this.activeDegradations.get(ruleId);
    if (!degradation) return;

    // console.log(`🔄 Reverting degradation: ${ruleId}`);

    // Revert affected features
    for (const featureId of degradation.affectedFeatures) {
      const feature = this.featureStates.get(featureId);
      if (feature) {
        feature.isDegraded = false;
        feature.degradationLevel = DegradationLevel.NONE;
        feature.currentState = { ...feature.normalState };
        // console.log(`✅ Restored feature: ${featureId}`);
      }
    }

    // Clear degradation caches
    const cacheKeys = [
      `degradation_fallback_`,
      `static_content_`,
      `simplified_ui_`,
      `rate_limit_`,
      `request_queue_`,
      `traffic_redirect_`
    ];

    for (const prefix of cacheKeys) {
      // Clear related cache entries (simplified - would need actual cache key management)
      // console.log(`🗑️ Cleared degradation cache: ${prefix}`);
    }

    degradation.endTime = new Date();
    this.activeDegradations.delete(ruleId);

    // Record reversion event
    await this.recordDegradationEvent('reverted', degradation);

    // console.log(`✅ Successfully reverted degradation: ${ruleId}`);
  }

  async revertAllDegradations(): Promise<void> {
    // console.log('🔄 Reverting all active degradations...');
    
    const activeRuleIds = Array.from(this.activeDegradations.keys());
    
    for (const ruleId of activeRuleIds) {
      await this.revertDegradation(ruleId);
    }
    
    // console.log(`✅ Reverted ${activeRuleIds.length} degradations`);
  }

  // Component isolation
  async isolateComponent(componentId: string, parameters?: IsolationParameters): Promise<{ output: string }> {
    // console.log(`🔒 Isolating component: ${componentId}`);

    const isolationRule: DegradationRule = {
      id: `isolation_${componentId}_${Date.now()}`,
      name: `Emergency Isolation: ${componentId}`,
      description: `Emergency isolation of component ${componentId}`,
      conditions: {
        triggers: [{ type: 'manual', metadata: { activated: true, level: DegradationLevel.SEVERE, reason: 'Emergency isolation', startTime: new Date(), affectedServices: [componentId] } }],
        aggregation: 'any'
      },
      actions: [
        {
          type: 'disable_feature',
          target: componentId,
          parameters: {
            threshold: 0,
            duration: 0,
            severity: 'critical' as const,
            actions: ['disable_feature'],
            feature: componentId,
            reason: 'Emergency isolation',
            temporary: true,
            fallback: parameters?.fallbackFunction || `${componentId} is temporarily disabled`
          } as DegradationParameters,
          description: `Disable ${componentId} component`
        }
      ],
      level: DegradationLevel.SEVERE,
      priority: 1000,
      autoRevert: false
    };

    await this.activateDegradation(isolationRule);

    return { output: `Component ${componentId} isolated successfully` };
  }

  // Monitoring and metrics
  private async startMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.evaluateDegradationNeeds();
        await this.recordDegradationMetrics();
        await this.checkDegradationHealth();
      } catch (error) {
        console.error('Graceful degradation monitoring failed:', error);
      }
    }, 30000); // Every 30 seconds

    // console.log('📊 Graceful degradation monitoring started');
  }

  private async recordDegradationMetrics(): Promise<void> {
    const activeDegradationCount = this.activeDegradations.size;
    const degradedFeatureCount = Array.from(this.featureStates.values())
      .filter((f: any) => f.isDegraded).length;

    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.DEGRADATION_ACTIVE,
        'Active Degradations',
        activeDegradationCount,
        'count',
        'graceful-degradation',
        { timestamp: new Date().toISOString() }
      )
    );

    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.DEGRADED_FEATURES,
        'Degraded Features',
        degradedFeatureCount,
        'count',
        'graceful-degradation',
        { timestamp: new Date().toISOString() }
      )
    );
  }

  private async checkDegradationHealth(): Promise<void> {
    const longRunningDegradations = Array.from(this.activeDegradations.values())
      .filter((d: any) => {
        const runtime = Date.now() - d.startTime.getTime();
        return runtime > 30 * 60 * 1000; // 30 minutes
      });

    if (longRunningDegradations.length > 0) {
      console.warn(`⚠️ ${longRunningDegradations.length} degradations have been active for over 30 minutes`);
    }
  }

  private async recordDegradationEvent(event: 'activated' | 'reverted', degradation: ActiveDegradation): Promise<void> {
    await this.systemMetricsRepo.save(
      SystemMetrics.createSystemMetric(
        MetricCategory.DEGRADATION_EVENT,
        `Degradation ${event}`,
        event === 'activated' ? 1 : 0,
        'event',
        'graceful-degradation',
        {
          degradationId: degradation.id,
          ruleId: degradation.ruleId,
          level: degradation.level,
          affectedFeatures: degradation.affectedFeatures,
          timestamp: new Date().toISOString()
        }
      )
    );
  }

  private async createDegradationAlert(degradation: ActiveDegradation): Promise<void> {
    const alert = Alert.createSystemAlert(
      `Service Degradation Active: ${degradation.level.toUpperCase()}`,
      `Graceful degradation activated due to system issues. Level: ${degradation.level}, Affected features: ${degradation.affectedFeatures.join(', ')}`,
      AlertSeverity.HIGH,
      'graceful-degradation',
      JSON.stringify({
        degradationId: degradation.id,
        level: degradation.level,
        trigger: degradation.trigger,
        affectedFeatures: degradation.affectedFeatures,
        userImpact: degradation.userImpact
      })
    );

    await this.alertRepo.save(alert);
  }

  // Helper methods
  private async initializeDegradationRules(): Promise<void> {
    const rules: DegradationRule[] = [
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

    rules.forEach((rule: any) => {
      this.degradationRules.set(rule.id, rule);
    });

    // console.log(`📋 Initialized ${rules.length} degradation rules`);
  }

  private async initializeFeatureStates(): Promise<void> {
    const features: FeatureDegradation[] = [
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

    features.forEach((feature: any) => {
      this.featureStates.set(feature.featureId, feature);
    });

    // console.log(`🎛️ Initialized ${features.length} feature states`);
  }

  private getUserImpactSeverity(level: DegradationLevel): 'low' | 'medium' | 'high' {
    switch (level) {
      case DegradationLevel.MINIMAL: return 'low';
      case DegradationLevel.MODERATE: return 'medium';
      case DegradationLevel.SEVERE:
      case DegradationLevel.EMERGENCY: return 'high';
      default: return 'low';
    }
  }

  private async getLatestMetricValue(metricName: string): Promise<number> {
    const metric = await this.systemMetricsRepo.findOne({
      where: { metricName: metricName },
      order: { createdAt: 'DESC' }
    });

    return metric ? parseFloat(metric.value.toString()) : 0;
  }

  private async getRecentMetrics(metricName: string, minutes: number): Promise<SystemMetrics[]> {
    const since = new Date();
    since.setMinutes(since.getMinutes() - minutes);

    return await this.systemMetricsRepo.find({
      where: {
        metricName: metricName,
        createdAt: { $gte: since } as unknown as Date
      },
      order: { createdAt: 'DESC' }
    });
  }

  // Public API methods
  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeDegradations: number;
    degradedFeatures: number;
    degradationLevel: DegradationLevel;
    issues: string[];
  }> {
    const activeDegradations = this.activeDegradations.size;
    const degradedFeatures = Array.from(this.featureStates.values())
      .filter((f: any) => f.isDegraded).length;
    
    const maxLevel = Math.max(
      ...Array.from(this.activeDegradations.values()).map((d: any) => 
        Object.values(DegradationLevel).indexOf(d.level)
      ),
      0
    );
    
    const degradationLevel = Object.values(DegradationLevel)[maxLevel] || DegradationLevel.NONE;
    
    const issues: string[] = [];
    
    if (activeDegradations > 0) {
      issues.push(`${activeDegradations} active degradations`);
    }
    
    if (degradedFeatures > 0) {
      issues.push(`${degradedFeatures} features operating in degraded mode`);
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (degradationLevel === DegradationLevel.EMERGENCY) {
      status = 'unhealthy';
    } else if (activeDegradations > 0) {
      status = 'degraded';
    }

    return {
      status,
      activeDegradations,
      degradedFeatures,
      degradationLevel,
      issues
    };
  }

  async getActiveDegradations(): Promise<ActiveDegradation[]> {
    return Array.from(this.activeDegradations.values());
  }

  async getFeatureStates(): Promise<FeatureDegradation[]> {
    return Array.from(this.featureStates.values());
  }

  async manualActivation(ruleId: string): Promise<boolean> {
    const rule = this.degradationRules.get(ruleId);
    if (rule && !this.activeDegradations.has(ruleId)) {
      await this.activateDegradation(rule);
      return true;
    }
    return false;
  }

  async manualReversion(ruleId: string): Promise<boolean> {
    if (this.activeDegradations.has(ruleId)) {
      await this.revertDegradation(ruleId);
      return true;
    }
    return false;
  }

  async enable(): Promise<void> {
    this.isEnabled = true;
    // console.log('✅ Graceful degradation enabled');
  }

  async disable(): Promise<void> {
    this.isEnabled = false;
    await this.revertAllDegradations();
    // console.log('⏸️ Graceful degradation disabled');
  }
}

export const gracefulDegradationService = new GracefulDegradationService();