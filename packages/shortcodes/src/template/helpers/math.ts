// Math Helpers

export const mathHelpers = {
  // Sum values
  sum: function(field: string, items?: any[], options?: any) {
    // Handle different parameter configurations
    if (Array.isArray(field)) {
      items = field;
      field = undefined as any;
    } else if (typeof items === 'object' && items.hash !== undefined) {
      options = items;
      items = options?.data?.root || this;
    }

    if (!Array.isArray(items)) {
      // Try to get items from context
      const context = options?.data?.root || this;
      items = context.items || context.data || [];
    }

    if (!Array.isArray(items)) return 0;

    if (field) {
      // Sum specific field
      return items.reduce((sum, item) => {
        const value = typeof item === 'object' ? item[field] : item;
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }

    // Sum array of numbers
    return items.reduce((sum, value) => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  },

  // Average values
  avg: function(field: string, items?: any[], options?: any) {
    // Handle different parameter configurations
    if (Array.isArray(field)) {
      items = field;
      field = undefined as any;
    } else if (typeof items === 'object' && items.hash !== undefined) {
      options = items;
      items = options?.data?.root || this;
    }

    if (!Array.isArray(items)) {
      // Try to get items from context
      const context = options?.data?.root || this;
      items = context.items || context.data || [];
    }

    if (!Array.isArray(items) || items.length === 0) return 0;

    const sum = mathHelpers.sum(field, items, options);
    return sum / items.length;
  },

  // Minimum value
  min: function(field: string, items?: any[], options?: any) {
    // Handle different parameter configurations
    if (Array.isArray(field)) {
      items = field;
      field = undefined as any;
    } else if (typeof items === 'object' && items.hash !== undefined) {
      options = items;
      items = options?.data?.root || this;
    }

    if (!Array.isArray(items)) {
      // Try to get items from context
      const context = options?.data?.root || this;
      items = context.items || context.data || [];
    }

    if (!Array.isArray(items) || items.length === 0) return null;

    if (field) {
      // Min of specific field
      const values = items.map(item => {
        const value = typeof item === 'object' ? item[field] : item;
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? Infinity : num;
      });
      return Math.min(...values);
    }

    // Min of array
    const values = items.map(value => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) ? Infinity : num;
    });
    return Math.min(...values);
  },

  // Maximum value
  max: function(field: string, items?: any[], options?: any) {
    // Handle different parameter configurations
    if (Array.isArray(field)) {
      items = field;
      field = undefined as any;
    } else if (typeof items === 'object' && items.hash !== undefined) {
      options = items;
      items = options?.data?.root || this;
    }

    if (!Array.isArray(items)) {
      // Try to get items from context
      const context = options?.data?.root || this;
      items = context.items || context.data || [];
    }

    if (!Array.isArray(items) || items.length === 0) return null;

    if (field) {
      // Max of specific field
      const values = items.map(item => {
        const value = typeof item === 'object' ? item[field] : item;
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? -Infinity : num;
      });
      return Math.max(...values);
    }

    // Max of array
    const values = items.map(value => {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(num) ? -Infinity : num;
    });
    return Math.max(...values);
  },

  // Mathematical expression evaluation
  math: function(expression: string, options?: any) {
    if (!expression) return 0;

    try {
      // Simple safe math evaluation (basic operations only)
      // In production, use a proper expression evaluator library
      const context = options?.data?.root || this;

      // Replace variables with values from context
      let expr = String(expression);
      Object.entries(context).forEach(([key, value]) => {
        if (typeof value === 'number' || typeof value === 'string') {
          const num = typeof value === 'string' ? parseFloat(value) : value;
          if (!isNaN(num)) {
            expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), String(num));
          }
        }
      });

      // Only allow safe characters
      if (!/^[0-9+\-*/().\s]+$/.test(expr)) {
        return '[Invalid Expression]';
      }

      // Evaluate using Function constructor (safer than eval)
      const result = new Function('return ' + expr)();
      return isNaN(result) ? 0 : result;
    } catch (error) {
      console.error('Math expression error:', error);
      return 0;
    }
  },

  // Addition
  add: function(a: number | string, b: number | string) {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;

    if (isNaN(numA) || isNaN(numB)) return 0;
    return numA + numB;
  },

  // Subtraction
  subtract: function(a: number | string, b: number | string) {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;

    if (isNaN(numA) || isNaN(numB)) return 0;
    return numA - numB;
  },

  // Multiplication
  multiply: function(a: number | string, b: number | string) {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;

    if (isNaN(numA) || isNaN(numB)) return 0;
    return numA * numB;
  },

  // Division
  divide: function(a: number | string, b: number | string) {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;

    if (isNaN(numA) || isNaN(numB) || numB === 0) return 0;
    return numA / numB;
  },

  // Modulo
  mod: function(a: number | string, b: number | string) {
    const numA = typeof a === 'string' ? parseFloat(a) : a;
    const numB = typeof b === 'string' ? parseFloat(b) : b;

    if (isNaN(numA) || isNaN(numB) || numB === 0) return 0;
    return numA % numB;
  },

  // Power
  pow: function(base: number | string, exponent: number | string) {
    const numBase = typeof base === 'string' ? parseFloat(base) : base;
    const numExp = typeof exponent === 'string' ? parseFloat(exponent) : exponent;

    if (isNaN(numBase) || isNaN(numExp)) return 0;
    return Math.pow(numBase, numExp);
  },

  // Square root
  sqrt: function(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num) || num < 0) return 0;
    return Math.sqrt(num);
  },

  // Absolute value
  abs: function(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;
    return Math.abs(num);
  },

  // Round
  round: function(value: number | string, decimals?: number | string, options?: any) {
    // Handle Handlebars options object
    if (typeof decimals === 'object' && decimals.hash !== undefined) {
      options = decimals;
      decimals = 0;
    }

    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;

    const dec = typeof decimals === 'string' ? parseInt(decimals, 10) : (decimals || 0);
    if (dec === 0) return Math.round(num);

    const factor = Math.pow(10, dec);
    return Math.round(num * factor) / factor;
  },

  // Floor
  floor: function(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;
    return Math.floor(num);
  },

  // Ceiling
  ceil: function(value: number | string) {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 0;
    return Math.ceil(num);
  },

  // Random number
  random: function(min?: number | string, max?: number | string, options?: any) {
    // Handle different parameter configurations
    if (typeof min === 'object' && min.hash !== undefined) {
      options = min;
      min = 0;
      max = 1;
    } else if (typeof max === 'object' && max.hash !== undefined) {
      options = max;
      max = min;
      min = 0;
    }

    const numMin = typeof min === 'string' ? parseFloat(min) : (min || 0);
    const numMax = typeof max === 'string' ? parseFloat(max) : (max || 1);

    if (isNaN(numMin) || isNaN(numMax)) return 0;

    return Math.random() * (numMax - numMin) + numMin;
  },

  // Range
  range: function(start: number | string, end: number | string, step?: number | string, options?: any) {
    // Handle different parameter configurations
    if (typeof step === 'object' && step.hash !== undefined) {
      options = step;
      step = 1;
    }

    const numStart = typeof start === 'string' ? parseFloat(start) : start;
    const numEnd = typeof end === 'string' ? parseFloat(end) : end;
    const numStep = typeof step === 'string' ? parseFloat(step) : (step || 1);

    if (isNaN(numStart) || isNaN(numEnd) || isNaN(numStep) || numStep === 0) return [];

    const range: number[] = [];
    if (numStep > 0) {
      for (let i = numStart; i <= numEnd; i += numStep) {
        range.push(i);
      }
    } else {
      for (let i = numStart; i >= numEnd; i += numStep) {
        range.push(i);
      }
    }

    // Block helper
    if (options && options.fn) {
      return range.map((num, index) => {
        const context = {
          value: num,
          '@index': index,
          '@first': index === 0,
          '@last': index === range.length - 1
        };
        return options.fn(context);
      }).join('');
    }

    return range;
  }
};