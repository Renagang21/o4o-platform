// Simple formula calculator for form calculations
// Supports basic math operations and field references

export function calculateFormula(formula: string, data: Record<string, any>): number {
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
      console.warn('Invalid formula characters:', processedFormula);
      return 0;
    }
    
    // Evaluate the formula
    // Note: In production, use a proper math expression parser like math.js
    try {
      // Create a sandboxed function
      const func = new Function('return ' + processedFormula);
      const result = func();
      return isNaN(result) ? 0 : Number(result);
    } catch (error: any) {
      console.error('Formula evaluation error:', error);
      return 0;
    }
  } catch (error: any) {
    console.error('Formula calculation error:', error);
    return 0;
  }
}

// Advanced formula functions
export const formulaFunctions = {
  // Sum multiple fields
  sum: (...values: number[]) => values.reduce((a, b) => a + b, 0),
  
  // Average of fields
  avg: (...values: number[]) => {
    const sum = values.reduce((a, b) => a + b, 0);
    return values.length > 0 ? sum / values.length : 0;
  },
  
  // Minimum value
  min: (...values: number[]) => Math.min(...values),
  
  // Maximum value
  max: (...values: number[]) => Math.max(...values),
  
  // Round to decimal places
  round: (value: number, decimals: number = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  },
  
  // Conditional calculation
  if: (condition: boolean, trueValue: number, falseValue: number) => {
    return condition ? trueValue : falseValue;
  }
};