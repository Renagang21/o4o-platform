import { AutomationRule } from './AutomationRule';
export declare class AutomationLog {
    id: string;
    ruleId: string;
    status: string;
    executionDetails?: string;
    errorMessage?: string;
    inputData?: any;
    outputData?: any;
    executionTimeMs?: number;
    createdAt: Date;
    rule: AutomationRule;
}
//# sourceMappingURL=AutomationLog.d.ts.map