// ACF (Advanced Custom Fields) Helpers

export const acfHelpers = {
  // Get ACF field value
  acf: function(field: string, fallback?: any, options?: any) {
    // Handle Handlebars options object
    if (typeof fallback === 'object' && fallback.hash !== undefined) {
      options = fallback;
      fallback = undefined;
    }

    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const value = acfFields[field];
    return value !== undefined && value !== null ? value : (fallback || '');
  },

  // Get ACF image field
  acfImage: function(field: string, size?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof size === 'object' && size.hash !== undefined) {
      options = size;
      size = 'thumbnail';
    }

    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const image = acfFields[field];
    if (!image) return '';

    // If image is an object with sizes
    if (typeof image === 'object' && image.sizes) {
      return image.sizes[size || 'thumbnail'] || image.url || '';
    }

    // If image is just a URL
    if (typeof image === 'string') {
      return image;
    }

    // If image is an ID, return media URL
    if (typeof image === 'number') {
      return `/media/${image}/${size || 'thumbnail'}`;
    }

    return '';
  },

  // Get ACF relationship field
  acfRelation: function(field: string, property?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof property === 'object' && property.hash !== undefined) {
      options = property;
      property = undefined;
    }

    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const relation = acfFields[field];
    if (!relation) return '';

    // If asking for specific property
    if (property) {
      if (Array.isArray(relation)) {
        return relation.map(item => item[property] || '').join(', ');
      }
      return relation[property] || '';
    }

    return relation;
  },

  // Get ACF repeater field
  acfRepeater: function(field: string, options?: any) {
    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const repeater = acfFields[field];
    if (!repeater || !Array.isArray(repeater)) return '';

    // Use block helper if provided
    if (options && options.fn) {
      return repeater.map((item, index) => {
        const itemContext = {
          ...item,
          '@index': index,
          '@first': index === 0,
          '@last': index === repeater.length - 1
        };
        return options.fn(itemContext);
      }).join('');
    }

    return repeater;
  },

  // Get ACF gallery field
  acfGallery: function(field: string, size?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof size === 'object' && size.hash !== undefined) {
      options = size;
      size = 'thumbnail';
    }

    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const gallery = acfFields[field];
    if (!gallery || !Array.isArray(gallery)) return '';

    // Use block helper if provided
    if (options && options.fn) {
      return gallery.map((image, index) => {
        const imageContext = {
          url: image.sizes?.[size || 'thumbnail'] || image.url,
          alt: image.alt || '',
          title: image.title || '',
          caption: image.caption || '',
          '@index': index,
          '@first': index === 0,
          '@last': index === gallery.length - 1
        };
        return options.fn(imageContext);
      }).join('');
    }

    // Return array of URLs
    return gallery.map(image =>
      image.sizes?.[size || 'thumbnail'] || image.url
    );
  },

  // Check if ACF field exists and has value
  hasAcf: function(field: string, options?: any) {
    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const value = acfFields[field];
    const hasValue = value !== undefined && value !== null && value !== '';

    // Block helper
    if (options && options.fn) {
      return hasValue ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return hasValue;
  },

  // Get ACF select field label
  acfSelect: function(field: string, options?: any) {
    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const value = acfFields[field];
    if (!value) return '';

    // If value has label property (from select field with return format as object)
    if (typeof value === 'object' && value.label) {
      return value.label;
    }

    return value;
  },

  // Get ACF true/false field
  acfBool: function(field: string, trueText?: string, falseText?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof trueText === 'object' && trueText.hash !== undefined) {
      options = trueText;
      trueText = 'Yes';
      falseText = 'No';
    } else if (typeof falseText === 'object' && falseText.hash !== undefined) {
      options = falseText;
      falseText = 'No';
    }

    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const value = acfFields[field];

    // Block helper
    if (options && options.fn) {
      return value ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    // Return text based on value
    return value ? (trueText || 'Yes') : (falseText || 'No');
  },

  // Get ACF link field
  acfLink: function(field: string, options?: any) {
    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const link = acfFields[field];
    if (!link) return '';

    // If link is an object with url and title
    if (typeof link === 'object' && link.url) {
      const target = link.target || '_self';
      const title = link.title || link.url;
      return `<a href="${link.url}" target="${target}">${title}</a>`;
    }

    // If link is just a URL
    if (typeof link === 'string') {
      return `<a href="${link}">${link}</a>`;
    }

    return '';
  },

  // Get ACF date field
  acfDate: function(field: string, format?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof format === 'object' && format.hash !== undefined) {
      options = format;
      format = 'YYYY-MM-DD';
    }

    const context = options?.data?.root || this;
    const acfFields = context.acfFields || context.acf_fields || {};

    const date = acfFields[field];
    if (!date) return '';

    // Format date (simplified - in production use a proper date library)
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;

    // Simple format replacement
    const formatted = (format || 'YYYY-MM-DD')
      .replace('YYYY', d.getFullYear().toString())
      .replace('MM', (d.getMonth() + 1).toString().padStart(2, '0'))
      .replace('DD', d.getDate().toString().padStart(2, '0'));

    return formatted;
  }
};