/**
 * Graceful Degradation — Execution (action application, reversion, metrics)
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Extracted from GracefulDegradationService.ts
 */

import type { Repository } from 'typeorm';
import { Alert, AlertSeverity } from '../../entities/Alert.js';
import { SystemMetrics, MetricCategory } from '../../entities/SystemMetrics.js';
import { cacheService } from '../CacheService.js';
import {
  DegradationLevel,
  type DegradationAction,
  type ActiveDegradation,
  type FeatureDegradation,
} from './degradation.types.js';
import type {
  DisableFeatureParams,
  ReduceFunctionalityParams,
  CacheFallbackParams,
  StaticContentParams,
  SimplifiedUIParams,
  RateLimitParams,
  RequestQueuingParams,
  RedirectTrafficParams,
} from '../../types/index.js';
import {
  convertToDisableFeatureParams,
  convertToReduceFunctionalityParams,
  convertToCacheFallbackParams,
  convertToStaticContentParams,
  convertToSimplifiedUIParams,
  convertToRateLimitParams,
  convertToRequestQueuingParams,
  convertToRedirectTrafficParams,
} from '../../types/index.js';

// ── Action dispatch ──────────────────────────

export async function applyDegradationAction(
  action: DegradationAction,
  degradation: ActiveDegradation,
  featureStates: Map<string, FeatureDegradation>
): Promise<void> {
  switch (action.type) {
    case 'disable_feature':
      await disableFeature(action.target, convertToDisableFeatureParams(action.parameters), degradation, featureStates);
      break;

    case 'reduce_functionality':
      await reduceFunctionality(action.target, convertToReduceFunctionalityParams(action.parameters), degradation, featureStates);
      break;

    case 'cache_fallback':
      await enableCacheFallback(action.target, convertToCacheFallbackParams(action.parameters), degradation);
      break;

    case 'static_content':
      await enableStaticContent(action.target, convertToStaticContentParams(action.parameters), degradation);
      break;

    case 'simplified_ui':
      await enableSimplifiedUI(action.target, convertToSimplifiedUIParams(action.parameters), degradation);
      break;

    case 'rate_limit':
      await enableRateLimit(action.target, convertToRateLimitParams(action.parameters), degradation);
      break;

    case 'queue_requests':
      await enableRequestQueuing(action.target, convertToRequestQueuingParams(action.parameters), degradation);
      break;

    case 'redirect_traffic':
      await redirectTraffic(action.target, convertToRedirectTrafficParams(action.parameters), degradation);
      break;

    default:
      // Warning log removed
  }
}

// ── Specific degradation actions ──────────────────────────

async function disableFeature(featureId: string, parameters: DisableFeatureParams, degradation: ActiveDegradation, featureStates: Map<string, FeatureDegradation>): Promise<void> {
  const feature = featureStates.get(featureId);
  if (feature) {
    feature.isDegraded = true;
    feature.degradationLevel = degradation.level;
    feature.currentState = { ...feature.currentState, enabled: false };
    degradation.affectedFeatures.push(featureId);
  }
}

async function reduceFunctionality(featureId: string, parameters: ReduceFunctionalityParams, degradation: ActiveDegradation, featureStates: Map<string, FeatureDegradation>): Promise<void> {
  const feature = featureStates.get(featureId);
  if (feature) {
    feature.isDegraded = true;
    feature.degradationLevel = degradation.level;
    feature.currentState = { ...feature.currentState, functionality: parameters.features?.reduce((acc: Record<string, boolean>, feat: string) => ({ ...acc, [feat]: false }), feature.currentState.functionality || {}) };
    degradation.affectedFeatures.push(featureId);
  }
}

async function enableCacheFallback(target: string, parameters: CacheFallbackParams, degradation: ActiveDegradation): Promise<void> {
  const cacheKey = `degradation_fallback_${target}`;
  const cacheData = {
    enabled: true,
    degradationLevel: degradation.level,
    fallbackData: parameters.fallbackData || {}
  };
  await cacheService.set(cacheKey, cacheData, undefined, { ttl: parameters.ttl || 3600 });
}

async function enableStaticContent(target: string, parameters: StaticContentParams, degradation: ActiveDegradation): Promise<void> {
  const staticKey = `static_content_${target}`;
  const staticData = {
    enabled: true,
    staticContent: parameters.contentPath || 'Service temporarily unavailable',
    degradationLevel: degradation.level
  };
  await cacheService.set(staticKey, staticData, undefined, { ttl: parameters.expiryTime || 7200 });
}

async function enableSimplifiedUI(target: string, parameters: SimplifiedUIParams, degradation: ActiveDegradation): Promise<void> {
  const uiKey = `simplified_ui_${target}`;
  const uiData = {
    enabled: true,
    removeAnimations: parameters.removeAnimations,
    disableImages: parameters.disableImages || false,
    minimalCSS: parameters.minimalCSS || false,
    essentialOnly: parameters.essentialOnly || false,
    degradationLevel: degradation.level
  };
  await cacheService.set(uiKey, uiData, undefined, { ttl: 3600 });
}

async function enableRateLimit(target: string, parameters: RateLimitParams, degradation: ActiveDegradation): Promise<void> {
  const rateLimitKey = `rate_limit_${target}`;
  const rateLimitData = {
    enabled: true,
    requestsPerMinute: parameters.requestsPerMinute || 60,
    burstSize: parameters.burstSize || 10,
    keyBy: parameters.keyBy || 'ip',
    degradationLevel: degradation.level
  };
  await cacheService.set(rateLimitKey, rateLimitData, undefined, { ttl: 1800 });
}

async function enableRequestQueuing(target: string, parameters: RequestQueuingParams, degradation: ActiveDegradation): Promise<void> {
  const queueKey = `request_queue_${target}`;
  const queueData = {
    enabled: true,
    maxQueueSize: parameters.maxQueueSize || 1000,
    timeoutMs: parameters.timeout * 1000 || 30000,
    priority: parameters.priority || 'fifo',
    degradationLevel: degradation.level
  };
  await cacheService.set(queueKey, queueData, undefined, { ttl: 1800 });
}

async function redirectTraffic(target: string, parameters: RedirectTrafficParams, degradation: ActiveDegradation): Promise<void> {
  const redirectKey = `traffic_redirect_${target}`;
  const redirectData = {
    enabled: true,
    targetUrl: parameters.targetUrl || parameters.targetServer,
    percentage: parameters.percentage || 100,
    preservePath: parameters.preservePath || false,
    statusCode: parameters.statusCode || 302,
    degradationLevel: degradation.level
  };
  await cacheService.set(redirectKey, redirectData, undefined, { ttl: 1800 });
}

// ── Reversion ──────────────────────────

export async function revertDegradation(
  ruleId: string,
  activeDegradations: Map<string, ActiveDegradation>,
  featureStates: Map<string, FeatureDegradation>,
  systemMetricsRepo: Repository<SystemMetrics>
): Promise<void> {
  const degradation = activeDegradations.get(ruleId);
  if (!degradation) return;

  for (const featureId of degradation.affectedFeatures) {
    const feature = featureStates.get(featureId);
    if (feature) {
      feature.isDegraded = false;
      feature.degradationLevel = DegradationLevel.NONE;
      feature.currentState = { ...feature.normalState };
    }
  }

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
  }

  degradation.endTime = new Date();
  activeDegradations.delete(ruleId);

  await recordDegradationEvent(systemMetricsRepo, 'reverted', degradation);
}

// ── Metrics ──────────────────────────

export async function recordDegradationEvent(
  systemMetricsRepo: Repository<SystemMetrics>,
  event: 'activated' | 'reverted',
  degradation: ActiveDegradation
): Promise<void> {
  await systemMetricsRepo.save(
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

export async function recordDegradationMetrics(
  systemMetricsRepo: Repository<SystemMetrics>,
  activeDegradations: Map<string, ActiveDegradation>,
  featureStates: Map<string, FeatureDegradation>
): Promise<void> {
  const activeDegradationCount = activeDegradations.size;
  const degradedFeatureCount = Array.from(featureStates.values())
    .filter((f: any) => f.isDegraded).length;

  await systemMetricsRepo.save(
    SystemMetrics.createSystemMetric(
      MetricCategory.DEGRADATION_ACTIVE,
      'Active Degradations',
      activeDegradationCount,
      'count',
      'graceful-degradation',
      { timestamp: new Date().toISOString() }
    )
  );

  await systemMetricsRepo.save(
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

export function checkDegradationHealth(
  activeDegradations: Map<string, ActiveDegradation>
): void {
  const longRunningDegradations = Array.from(activeDegradations.values())
    .filter((d: any) => {
      const runtime = Date.now() - d.startTime.getTime();
      return runtime > 30 * 60 * 1000;
    });

  if (longRunningDegradations.length > 0) {
    // Warning log removed
  }
}

export async function createDegradationAlert(
  alertRepo: Repository<Alert>,
  degradation: ActiveDegradation
): Promise<void> {
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

  await alertRepo.save(alert);
}
