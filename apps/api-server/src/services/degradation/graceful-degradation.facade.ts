/**
 * Graceful Degradation — Facade (orchestration + state management)
 *
 * WO-O4O-INCIDENT-DEGRADATION-SERVICE-SPLIT-V1
 * Preserves original GracefulDegradationService public API.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { SystemMetrics } from '../../entities/SystemMetrics.js';
import { Alert } from '../../entities/Alert.js';
import type { IsolationParameters, DegradationParameters } from '../../types/index.js';
import {
  DegradationLevel,
  type DegradationRule,
  type ActiveDegradation,
  type FeatureDegradation,
} from './degradation.types.js';
import {
  evaluateRule,
  evaluateRevertTrigger,
  getUserImpactSeverity,
  getDefaultDegradationRules,
  getDefaultFeatureStates,
} from './degradation-policy.js';
import {
  applyDegradationAction,
  revertDegradation,
  recordDegradationEvent,
  recordDegradationMetrics,
  checkDegradationHealth,
  createDegradationAlert,
} from './degradation-execution.js';

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
    const rules = getDefaultDegradationRules();
    rules.forEach((rule: any) => this.degradationRules.set(rule.id, rule));

    const features = getDefaultFeatureStates();
    features.forEach((feature: any) => this.featureStates.set(feature.featureId, feature));

    await this.startMonitoring();
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    await this.revertAllDegradations();
  }

  // Main degradation logic
  async evaluateDegradationNeeds(): Promise<void> {
    if (!this.isEnabled) return;

    for (const rule of this.degradationRules.values()) {
      const shouldActivate = await evaluateRule(rule, AppDataSource, this.systemMetricsRepo);
      const isActive = this.activeDegradations.has(rule.id);

      if (shouldActivate && !isActive) {
        await this.activateDegradation(rule);
      } else if (!shouldActivate && isActive && rule.autoRevert) {
        await this.checkRevertConditions(rule);
      }
    }
  }

  private async activateDegradation(rule: DegradationRule): Promise<void> {
    const degradation: ActiveDegradation = {
      id: `degradation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      level: rule.level,
      startTime: new Date(),
      trigger: `Rule: ${rule.name}`,
      actionsApplied: [],
      affectedFeatures: [],
      userImpact: {
        severity: getUserImpactSeverity(rule.level),
        description: rule.description
      }
    };

    for (const action of rule.actions) {
      try {
        await applyDegradationAction(action, degradation, this.featureStates);
        degradation.actionsApplied.push(action.type);
      } catch (error) {
        // Error log removed
      }
    }

    this.activeDegradations.set(rule.id, degradation);

    await recordDegradationEvent(this.systemMetricsRepo, 'activated', degradation);

    if (rule.level === DegradationLevel.SEVERE || rule.level === DegradationLevel.EMERGENCY) {
      await createDegradationAlert(this.alertRepo, degradation);
    }
  }

  private async checkRevertConditions(rule: DegradationRule): Promise<void> {
    if (!rule.revertConditions) return;

    const revertResults = await Promise.all(
      rule.revertConditions.triggers.map((trigger: any) =>
        evaluateRevertTrigger(trigger, AppDataSource, this.systemMetricsRepo)
      )
    );

    const shouldRevert = revertResults.every((result: any) => result);

    if (shouldRevert) {
      const degradation = this.activeDegradations.get(rule.id);
      if (degradation) {
        const durationSinceActivation = Date.now() - degradation.startTime.getTime();
        const requiredDuration = (rule.revertConditions.duration || 5) * 60 * 1000;

        if (durationSinceActivation >= requiredDuration) {
          await revertDegradation(rule.id, this.activeDegradations, this.featureStates, this.systemMetricsRepo);
        }
      }
    }
  }

  async revertAllDegradations(): Promise<void> {
    const activeRuleIds = Array.from(this.activeDegradations.keys());

    for (const ruleId of activeRuleIds) {
      await revertDegradation(ruleId, this.activeDegradations, this.featureStates, this.systemMetricsRepo);
    }
  }

  // Component isolation
  async isolateComponent(componentId: string, parameters?: IsolationParameters): Promise<{ output: string }> {
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

  // Monitoring
  private async startMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.evaluateDegradationNeeds();
        await recordDegradationMetrics(this.systemMetricsRepo, this.activeDegradations, this.featureStates);
        checkDegradationHealth(this.activeDegradations);
      } catch (error) {
        // Error log removed
      }
    }, 30000);
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
      await revertDegradation(ruleId, this.activeDegradations, this.featureStates, this.systemMetricsRepo);
      return true;
    }
    return false;
  }

  async enable(): Promise<void> {
    this.isEnabled = true;
  }

  async disable(): Promise<void> {
    this.isEnabled = false;
    await this.revertAllDegradations();
  }
}

export const gracefulDegradationService = new GracefulDegradationService();
