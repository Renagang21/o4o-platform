// Format Helpers

export const formatHelpers = {
  // Format price
  priceFormat: function(value: number | string, currency?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof currency === 'object' && currency.hash !== undefined) {
      options = currency;
      currency = 'KRW';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;

    try {
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: currency || 'KRW'
      }).format(numValue);
    } catch (e) {
      // Fallback formatting
      return `${currency || 'KRW'} ${numValue.toLocaleString()}`;
    }
  },

  // Format date
  dateFormat: function(date: string | Date, format?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof format === 'object' && format.hash !== undefined) {
      options = format;
      format = 'YYYY-MM-DD';
    }

    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    const formatMap: Record<string, () => string> = {
      'YYYY': () => d.getFullYear().toString(),
      'YY': () => d.getFullYear().toString().slice(-2),
      'MM': () => (d.getMonth() + 1).toString().padStart(2, '0'),
      'M': () => (d.getMonth() + 1).toString(),
      'DD': () => d.getDate().toString().padStart(2, '0'),
      'D': () => d.getDate().toString(),
      'HH': () => d.getHours().toString().padStart(2, '0'),
      'H': () => d.getHours().toString(),
      'mm': () => d.getMinutes().toString().padStart(2, '0'),
      'm': () => d.getMinutes().toString(),
      'ss': () => d.getSeconds().toString().padStart(2, '0'),
      's': () => d.getSeconds().toString()
    };

    let result = format || 'YYYY-MM-DD';
    Object.entries(formatMap).forEach(([key, fn]) => {
      result = result.replace(new RegExp(key, 'g'), fn());
    });

    return result;
  },

  // Format number
  numberFormat: function(value: number | string, decimals?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof decimals === 'object' && decimals.hash !== undefined) {
      options = decimals;
      decimals = 0;
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;

    if (decimals !== undefined) {
      return numValue.toFixed(decimals);
    }

    return numValue.toLocaleString();
  },

  // Create excerpt from text
  excerpt: function(text: string, length?: number, suffix?: string, options?: any) {
    // Handle different parameter configurations
    if (typeof length === 'object' && length.hash !== undefined) {
      options = length;
      length = 200;
      suffix = '...';
    } else if (typeof suffix === 'object' && suffix.hash !== undefined) {
      options = suffix;
      suffix = '...';
    }

    if (!text) return '';

    const maxLength = length || 200;
    const ellipsis = suffix || '...';

    // Strip HTML tags
    const cleanText = text.replace(/<[^>]*>/g, '');

    if (cleanText.length <= maxLength) {
      return cleanText;
    }

    // Cut at word boundary
    let trimmed = cleanText.substr(0, maxLength);
    const lastSpace = trimmed.lastIndexOf(' ');

    if (lastSpace > 0) {
      trimmed = trimmed.substr(0, lastSpace);
    }

    return trimmed + ellipsis;
  },

  // Convert to uppercase
  uppercase: function(text: string) {
    if (!text) return '';
    return String(text).toUpperCase();
  },

  // Convert to lowercase
  lowercase: function(text: string) {
    if (!text) return '';
    return String(text).toLowerCase();
  },

  // Capitalize first letter
  capitalize: function(text: string) {
    if (!text) return '';
    const str = String(text);
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  // Title case
  titleCase: function(text: string) {
    if (!text) return '';
    return String(text).replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  },

  // Truncate text
  truncate: function(text: string, length?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof length === 'object' && length.hash !== undefined) {
      options = length;
      length = 50;
    }

    if (!text) return '';

    const maxLength = length || 50;
    const str = String(text);

    if (str.length <= maxLength) {
      return str;
    }

    return str.substr(0, maxLength) + '...';
  },

  // Strip HTML tags
  stripHtml: function(html: string) {
    if (!html) return '';
    return String(html).replace(/<[^>]*>/g, '');
  },

  // Convert newlines to <br>
  nl2br: function(text: string) {
    if (!text) return '';
    return String(text).replace(/\n/g, '<br>');
  },

  // URL encode
  urlEncode: function(text: string) {
    if (!text) return '';
    return encodeURIComponent(String(text));
  },

  // URL decode
  urlDecode: function(text: string) {
    if (!text) return '';
    try {
      return decodeURIComponent(String(text));
    } catch (e) {
      return text;
    }
  },

  // JSON stringify
  json: function(obj: any, pretty?: boolean, options?: any) {
    // Handle Handlebars options object
    if (typeof pretty === 'object' && pretty.hash !== undefined) {
      options = pretty;
      pretty = false;
    }

    if (obj === undefined || obj === null) return '';

    try {
      return pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
    } catch (e) {
      return '[Object]';
    }
  },

  // Format file size
  fileSize: function(bytes: number | string, decimals?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof decimals === 'object' && decimals.hash !== undefined) {
      options = decimals;
      decimals = 2;
    }

    const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(size) || size === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals || 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));

    return parseFloat((size / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  },

  // Format percentage
  percent: function(value: number | string, decimals?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof decimals === 'object' && decimals.hash !== undefined) {
      options = decimals;
      decimals = 0;
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;

    const percentage = numValue * 100;
    const dm = decimals || 0;

    return percentage.toFixed(dm) + '%';
  },

  // Format phone number
  phoneFormat: function(phone: string, format?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof format === 'object' && format.hash !== undefined) {
      options = format;
      format = 'XXX-XXXX-XXXX';
    }

    if (!phone) return '';

    // Remove non-numeric characters
    const cleaned = String(phone).replace(/\D/g, '');

    // Korean phone number format
    if (cleaned.length === 11 && cleaned.startsWith('010')) {
      return `${cleaned.substr(0, 3)}-${cleaned.substr(3, 4)}-${cleaned.substr(7, 4)}`;
    } else if (cleaned.length === 10) {
      if (cleaned.startsWith('02')) {
        return `${cleaned.substr(0, 2)}-${cleaned.substr(2, 4)}-${cleaned.substr(6, 4)}`;
      } else {
        return `${cleaned.substr(0, 3)}-${cleaned.substr(3, 3)}-${cleaned.substr(6, 4)}`;
      }
    }

    return phone;
  },

  // Pluralize
  pluralize: function(count: number, singular: string, plural?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof plural === 'object' && plural.hash !== undefined) {
      options = plural;
      plural = singular + 's';
    }

    const num = typeof count === 'string' ? parseInt(count, 10) : count;
    if (isNaN(num)) return singular;

    return num === 1 ? singular : (plural || singular + 's');
  },

  // Relative time
  timeAgo: function(date: string | Date, options?: any) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return String(date);

    const now = new Date();
    const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

    const intervals: Array<[string, number]> = [
      ['년', 31536000],
      ['개월', 2592000],
      ['일', 86400],
      ['시간', 3600],
      ['분', 60],
      ['초', 1]
    ];

    for (const [name, unit] of intervals) {
      const interval = Math.floor(seconds / unit);
      if (interval >= 1) {
        return `${interval}${name} 전`;
      }
    }

    return '방금 전';
  }
};