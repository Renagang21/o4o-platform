/**
 * Graceful Degradation — Type Definitions
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Extracted from GracefulDegradationService.ts
 */

import type { FeatureState, DegradationMetadata, DegradationParameters } from '../../types/index.js';

export type { FeatureState, DegradationMetadata, DegradationParameters };

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
    duration: number;
  };
}

export interface DegradationTrigger {
  type: 'metric_threshold' | 'service_unavailable' | 'error_rate' | 'response_time' | 'manual';
  metric?: string;
  operator?: '>' | '<' | '>=' | '<=' | '=' | '!=';
  threshold?: number;
  duration?: number;
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
