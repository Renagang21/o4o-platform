// Conditional Helpers

export const conditionalHelpers = {
  // If condition
  if: function(condition: any, trueValue: any, falseValue?: any, options?: any) {
    // Handle Handlebars options object
    if (typeof falseValue === 'object' && falseValue.hash !== undefined) {
      options = falseValue;
      falseValue = '';
    }

    // Block helper
    if (options && options.fn) {
      return condition ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    // Inline helper
    return condition ? trueValue : (falseValue || '');
  },

  // Unless condition
  unless: function(condition: any, options?: any) {
    // Block helper
    if (options && options.fn) {
      return !condition ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return !condition;
  },

  // Switch statement
  switch: function(value: any, cases: Record<string, any>, defaultValue?: any, options?: any) {
    // Handle Handlebars options object
    if (typeof defaultValue === 'object' && defaultValue.hash !== undefined) {
      options = defaultValue;
      defaultValue = '';
    }

    if (typeof cases !== 'object') return defaultValue || '';

    return cases[value] !== undefined ? cases[value] : (defaultValue || '');
  },

  // Default value
  default: function(value: any, fallback: any) {
    return value !== undefined && value !== null && value !== '' ? value : fallback;
  },

  // Check equality
  eq: function(a: any, b: any, options?: any) {
    const isEqual = a == b;

    // Block helper
    if (options && options.fn) {
      return isEqual ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isEqual;
  },

  // Check inequality
  ne: function(a: any, b: any, options?: any) {
    const isNotEqual = a != b;

    // Block helper
    if (options && options.fn) {
      return isNotEqual ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isNotEqual;
  },

  // Greater than
  gt: function(a: any, b: any, options?: any) {
    const isGreater = a > b;

    // Block helper
    if (options && options.fn) {
      return isGreater ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isGreater;
  },

  // Greater than or equal
  gte: function(a: any, b: any, options?: any) {
    const isGreaterOrEqual = a >= b;

    // Block helper
    if (options && options.fn) {
      return isGreaterOrEqual ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isGreaterOrEqual;
  },

  // Less than
  lt: function(a: any, b: any, options?: any) {
    const isLess = a < b;

    // Block helper
    if (options && options.fn) {
      return isLess ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isLess;
  },

  // Less than or equal
  lte: function(a: any, b: any, options?: any) {
    const isLessOrEqual = a <= b;

    // Block helper
    if (options && options.fn) {
      return isLessOrEqual ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isLessOrEqual;
  },

  // Check if value is in array
  in: function(value: any, array: any[], options?: any) {
    const isIn = Array.isArray(array) && array.includes(value);

    // Block helper
    if (options && options.fn) {
      return isIn ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isIn;
  },

  // Check if value is not in array
  notIn: function(value: any, array: any[], options?: any) {
    const isNotIn = !Array.isArray(array) || !array.includes(value);

    // Block helper
    if (options && options.fn) {
      return isNotIn ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isNotIn;
  },

  // Logical AND
  and: function(...args: any[]) {
    // Remove Handlebars options object
    const values = args.slice(0, -1);
    const options = args[args.length - 1];

    const result = values.every(v => !!v);

    // Block helper
    if (options && options.fn) {
      return result ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return result;
  },

  // Logical OR
  or: function(...args: any[]) {
    // Remove Handlebars options object
    const values = args.slice(0, -1);
    const options = args[args.length - 1];

    const result = values.some(v => !!v);

    // Block helper
    if (options && options.fn) {
      return result ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return result;
  },

  // Logical NOT
  not: function(value: any, options?: any) {
    const result = !value;

    // Block helper
    if (options && options.fn) {
      return result ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return result;
  },

  // Check if empty
  empty: function(value: any, options?: any) {
    const isEmpty = value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && Object.keys(value).length === 0);

    // Block helper
    if (options && options.fn) {
      return isEmpty ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isEmpty;
  },

  // Check if not empty
  notEmpty: function(value: any, options?: any) {
    const isNotEmpty = !(value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && Object.keys(value).length === 0));

    // Block helper
    if (options && options.fn) {
      return isNotEmpty ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isNotEmpty;
  },

  // Check type
  typeof: function(value: any, type: string, options?: any) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    const isType = actualType === type;

    // Block helper
    if (options && options.fn) {
      return isType ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isType;
  },

  // Check if defined
  defined: function(value: any, options?: any) {
    const isDefined = value !== undefined;

    // Block helper
    if (options && options.fn) {
      return isDefined ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isDefined;
  },

  // Check if undefined
  undefined: function(value: any, options?: any) {
    const isUndefined = value === undefined;

    // Block helper
    if (options && options.fn) {
      return isUndefined ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isUndefined;
  },

  // Check if null
  null: function(value: any, options?: any) {
    const isNull = value === null;

    // Block helper
    if (options && options.fn) {
      return isNull ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isNull;
  },

  // Check if truthy
  truthy: function(value: any, options?: any) {
    const isTruthy = !!value;

    // Block helper
    if (options && options.fn) {
      return isTruthy ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isTruthy;
  },

  // Check if falsy
  falsy: function(value: any, options?: any) {
    const isFalsy = !value;

    // Block helper
    if (options && options.fn) {
      return isFalsy ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isFalsy;
  },

  // Check if even
  even: function(value: number, options?: any) {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    const isEven = !isNaN(num) && num % 2 === 0;

    // Block helper
    if (options && options.fn) {
      return isEven ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isEven;
  },

  // Check if odd
  odd: function(value: number, options?: any) {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    const isOdd = !isNaN(num) && num % 2 === 1;

    // Block helper
    if (options && options.fn) {
      return isOdd ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return isOdd;
  }
};