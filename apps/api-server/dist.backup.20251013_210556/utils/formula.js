"use strict";
// Simple formula calculator for form calculations
// Supports basic math operations and field references
Object.defineProperty(exports, "__esModule", { value: true });
exports.formulaFunctions = exports.calculateFormula = void 0;
function calculateFormula(formula, data) {
    try {
        // Replace field references with values
        let processedFormula = formula;
        // Match {field_name} pattern
        const fieldMatches = formula.match(/\{([^}]+)\}/g);
        if (fieldMatches) {
            for (const match of fieldMatches) {
                const fieldName = match.slice(1, -1); // Remove { }
                const value = Number(data[fieldName]) || 0;
                processedFormula = processedFormula.replace(match, String(value));
            }
        }
        // Only allow safe math operations
        if (!/^[\d\s+\-*/().,]+$/.test(processedFormula)) {
            // Warning log removed
            return 0;
        }
        // Evaluate the formula
        // Note: In production, use a proper math expression parser like math.js
        try {
            // Create a sandboxed function
            const func = new Function('return ' + processedFormula);
            const result = func();
            return isNaN(result) ? 0 : Number(result);
        }
        catch (error) {
            // Error log removed
            return 0;
        }
    }
    catch (error) {
        // Error log removed
        return 0;
    }
}
exports.calculateFormula = calculateFormula;
// Advanced formula functions
exports.formulaFunctions = {
    // Sum multiple fields
    sum: (...values) => values.reduce((a, b) => a + b, 0),
    // Average of fields
    avg: (...values) => {
        const sum = values.reduce((a, b) => a + b, 0);
        return values.length > 0 ? sum / values.length : 0;
    },
    // Minimum value
    min: (...values) => Math.min(...values),
    // Maximum value
    max: (...values) => Math.max(...values),
    // Round to decimal places
    round: (value, decimals = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    },
    // Conditional calculation
    if: (condition, trueValue, falseValue) => {
        return condition ? trueValue : falseValue;
    }
};
//# sourceMappingURL=formula.js.map