import { DegradationMetadata, DegradationParameters, FeatureState, IsolationParameters } from '../types';
export declare enum DegradationLevel {
    NONE = "none",
    MINIMAL = "minimal",
    MODERATE = "moderate",
    SEVERE = "severe",
    EMERGENCY = "emergency"
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
export declare class GracefulDegradationService {
    private systemMetricsRepo;
    private alertRepo;
    private degradationRules;
    private activeDegradations;
    private featureStates;
    private monitoringInterval?;
    private isEnabled;
    constructor();
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    evaluateDegradationNeeds(): Promise<void>;
    private evaluateRule;
    private evaluateTrigger;
    private evaluateMetricThreshold;
    private evaluateServiceAvailability;
    private evaluateErrorRate;
    private evaluateResponseTime;
    private activateDegradation;
    private applyDegradationAction;
    private disableFeature;
    private reduceFunctionality;
    private enableCacheFallback;
    private enableStaticContent;
    private enableSimplifiedUI;
    private enableRateLimit;
    private enableRequestQueuing;
    private redirectTraffic;
    private checkRevertConditions;
    private evaluateRevertTrigger;
    private getOppositeOperator;
    private revertDegradation;
    revertAllDegradations(): Promise<void>;
    isolateComponent(componentId: string, parameters?: IsolationParameters): Promise<{
        output: string;
    }>;
    private startMonitoring;
    private recordDegradationMetrics;
    private checkDegradationHealth;
    private recordDegradationEvent;
    private createDegradationAlert;
    private initializeDegradationRules;
    private initializeFeatureStates;
    private getUserImpactSeverity;
    private getLatestMetricValue;
    private getRecentMetrics;
    getStatus(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        activeDegradations: number;
        degradedFeatures: number;
        degradationLevel: DegradationLevel;
        issues: string[];
    }>;
    getActiveDegradations(): Promise<ActiveDegradation[]>;
    getFeatureStates(): Promise<FeatureDegradation[]>;
    manualActivation(ruleId: string): Promise<boolean>;
    manualReversion(ruleId: string): Promise<boolean>;
    enable(): Promise<void>;
    disable(): Promise<void>;
}
export declare const gracefulDegradationService: GracefulDegradationService;
//# sourceMappingURL=GracefulDegradationService.d.ts.map