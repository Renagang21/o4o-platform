import { WorkflowState } from './WorkflowState';
export declare enum TransitionTrigger {
    MANUAL = "manual",
    AUTOMATIC = "automatic",
    CONDITIONAL = "conditional",
    TIMER = "timer",
    EVENT = "event"
}
export declare class WorkflowTransition {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    workflowName: string;
    fromState: WorkflowState;
    fromStateId: string;
    toState: WorkflowState;
    toStateId: string;
    trigger: TransitionTrigger;
    conditions?: any;
    actions?: any;
    metadata?: any;
    isActive: boolean;
    priority: number;
    requiredRole?: string;
    requiredPermission?: string;
    entityType?: string;
    entityId?: string;
    transitionedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=WorkflowTransition.d.ts.map