import { WorkflowTransition } from './WorkflowTransition';
export declare enum WorkflowStateType {
    START = "start",
    INTERMEDIATE = "intermediate",
    END = "end",
    DECISION = "decision"
}
export declare class WorkflowState {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    type: WorkflowStateType;
    workflowName: string;
    metadata?: any;
    conditions?: any;
    actions?: any;
    isActive: boolean;
    sortOrder: number;
    outgoingTransitions: WorkflowTransition[];
    incomingTransitions: WorkflowTransition[];
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=WorkflowState.d.ts.map