// Collection Helpers

export const collectionHelpers = {
  // Join array elements
  join: function(array: any[], separator?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof separator === 'object' && separator.hash !== undefined) {
      options = separator;
      separator = ', ';
    }

    if (!Array.isArray(array)) return '';

    return array.join(separator || ', ');
  },

  // Get array count
  count: function(array: any[], options?: any) {
    if (!Array.isArray(array)) return 0;
    return array.length;
  },

  // Get first element
  first: function(array: any[], count?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof count === 'object' && count.hash !== undefined) {
      options = count;
      count = 1;
    }

    if (!Array.isArray(array) || array.length === 0) return '';

    if (count && count > 1) {
      return array.slice(0, count);
    }

    return array[0];
  },

  // Get last element
  last: function(array: any[], count?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof count === 'object' && count.hash !== undefined) {
      options = count;
      count = 1;
    }

    if (!Array.isArray(array) || array.length === 0) return '';

    if (count && count > 1) {
      return array.slice(-count);
    }

    return array[array.length - 1];
  },

  // Get element at index
  at: function(array: any[], index: number, options?: any) {
    if (!Array.isArray(array)) return '';

    const idx = typeof index === 'string' ? parseInt(index, 10) : index;
    if (isNaN(idx)) return '';

    // Support negative indices
    if (idx < 0) {
      return array[array.length + idx];
    }

    return array[idx];
  },

  // Slice array
  slice: function(array: any[], start: number, end?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof end === 'object' && end.hash !== undefined) {
      options = end;
      end = undefined;
    }

    if (!Array.isArray(array)) return [];

    const startIdx = typeof start === 'string' ? parseInt(start, 10) : start;
    const endIdx = end !== undefined ? (typeof end === 'string' ? parseInt(end, 10) : end) : undefined;

    return array.slice(startIdx, endIdx);
  },

  // Reverse array
  reverse: function(array: any[], options?: any) {
    if (!Array.isArray(array)) return [];
    return [...array].reverse();
  },

  // Sort array
  sort: function(array: any[], field?: string, order?: string, options?: any) {
    // Handle different parameter configurations
    if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
      order = 'asc';
    } else if (typeof order === 'object' && order.hash !== undefined) {
      options = order;
      order = 'asc';
    }

    if (!Array.isArray(array)) return [];

    const sorted = [...array];
    const isDesc = order === 'desc' || order === 'DESC';

    if (field) {
      // Sort by field
      sorted.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal < bVal) return isDesc ? 1 : -1;
        if (aVal > bVal) return isDesc ? -1 : 1;
        return 0;
      });
    } else {
      // Simple sort
      sorted.sort((a, b) => {
        if (a < b) return isDesc ? 1 : -1;
        if (a > b) return isDesc ? -1 : 1;
        return 0;
      });
    }

    return sorted;
  },

  // Filter array
  filter: function(array: any[], field: string, value: any, options?: any) {
    if (!Array.isArray(array)) return [];

    return array.filter(item => {
      if (typeof item === 'object' && item !== null) {
        return item[field] === value;
      }
      return item === value;
    });
  },

  // Map array
  map: function(array: any[], field: string, options?: any) {
    if (!Array.isArray(array)) return [];

    return array.map(item => {
      if (typeof item === 'object' && item !== null) {
        return item[field];
      }
      return item;
    });
  },

  // Find in array
  find: function(array: any[], field: string, value: any, options?: any) {
    if (!Array.isArray(array)) return null;

    return array.find(item => {
      if (typeof item === 'object' && item !== null) {
        return item[field] === value;
      }
      return item === value;
    });
  },

  // Check if array includes value
  includes: function(array: any[], value: any, options?: any) {
    if (!Array.isArray(array)) return false;

    const hasValue = array.includes(value);

    // Block helper
    if (options && options.fn) {
      return hasValue ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return hasValue;
  },

  // Get unique values
  unique: function(array: any[], field?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    if (!Array.isArray(array)) return [];

    if (field) {
      // Unique by field
      const seen = new Set();
      return array.filter(item => {
        const value = item[field];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }

    // Simple unique
    return [...new Set(array)];
  },

  // Group by field
  groupBy: function(array: any[], field: string, options?: any) {
    if (!Array.isArray(array)) return {};

    const groups: Record<string, any[]> = {};

    array.forEach(item => {
      const key = item[field] || 'undefined';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Block helper
    if (options && options.fn) {
      let result = '';
      Object.entries(groups).forEach(([key, items]) => {
        const groupContext = {
          key,
          items,
          count: items.length
        };
        result += options.fn(groupContext);
      });
      return result;
    }

    return groups;
  },

  // Chunk array
  chunk: function(array: any[], size: number, options?: any) {
    if (!Array.isArray(array)) return [];

    const chunkSize = typeof size === 'string' ? parseInt(size, 10) : size;
    if (isNaN(chunkSize) || chunkSize <= 0) return [array];

    const chunks: any[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    // Block helper
    if (options && options.fn) {
      return chunks.map((chunk, index) => {
        const chunkContext = {
          items: chunk,
          '@index': index,
          '@first': index === 0,
          '@last': index === chunks.length - 1
        };
        return options.fn(chunkContext);
      }).join('');
    }

    return chunks;
  },

  // Each with index
  eachWithIndex: function(array: any[], options?: any) {
    if (!Array.isArray(array)) return '';

    if (options && options.fn) {
      return array.map((item, index) => {
        const context = {
          ...item,
          '@index': index,
          '@first': index === 0,
          '@last': index === array.length - 1,
          '@even': index % 2 === 0,
          '@odd': index % 2 === 1
        };
        return options.fn(context);
      }).join('');
    }

    return array;
  },

  // Pluck values from array of objects
  pluck: function(array: any[], field: string, options?: any) {
    if (!Array.isArray(array)) return [];

    return array.map(item => item[field]).filter(v => v !== undefined);
  },

  // Take while condition is true
  takeWhile: function(array: any[], field: string, value: any, options?: any) {
    if (!Array.isArray(array)) return [];

    const result: any[] = [];
    for (const item of array) {
      if (item[field] === value) {
        result.push(item);
      } else {
        break;
      }
    }

    return result;
  },

  // Skip while condition is true
  skipWhile: function(array: any[], field: string, value: any, options?: any) {
    if (!Array.isArray(array)) return [];

    let skipIndex = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i][field] !== value) {
        skipIndex = i;
        break;
      }
    }

    return array.slice(skipIndex);
  }
};