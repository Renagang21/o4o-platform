export declare function calculateFormula(formula: string, data: Record<string, any>): number;
export declare const formulaFunctions: {
    sum: (...values: number[]) => number;
    avg: (...values: number[]) => number;
    min: (...values: number[]) => number;
    max: (...values: number[]) => number;
    round: (value: number, decimals?: number) => number;
    if: (condition: boolean, trueValue: number, falseValue: number) => number;
};
//# sourceMappingURL=formula.d.ts.map