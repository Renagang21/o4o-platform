export interface RuleCondition {
    field: string;
    operator: string;
    value: any;
}
export interface RuleAction {
    type: string;
    parameters: any;
}
export declare class AutomationRule {
    id: string;
    name: string;
    description?: string;
    triggerEvent: string;
    conditions: RuleCondition[];
    actions: RuleAction[];
    isActive: boolean;
    executionCount: number;
    lastExecutedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=AutomationRule.d.ts.map