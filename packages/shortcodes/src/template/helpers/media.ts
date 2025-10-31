// Media Helpers

export const mediaHelpers = {
  // Get media URL
  media: function(id: string | number, size?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof size === 'object' && size.hash !== undefined) {
      options = size;
      size = 'full';
    }

    if (!id) return '';

    // If id is an object with URL
    if (typeof id === 'object' && (id as any).url) {
      const media = id as any;
      if (media.sizes && size && media.sizes[size]) {
        return media.sizes[size];
      }
      return media.url;
    }

    // Build media URL
    const baseUrl = options?.data?.root?.$settings?.mediaUrl || '/media';
    return `${baseUrl}/${id}/${size || 'full'}`;
  },

  // Get thumbnail URL
  thumbnail: function(size?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof size === 'object' && size.hash !== undefined) {
      options = size;
      size = 'thumbnail';
    }

    const context = options?.data?.root || this;
    const thumbnail = context.thumbnail || context.featuredImage || context.featured_image;

    if (!thumbnail) return '';

    // If thumbnail is an object with URL
    if (typeof thumbnail === 'object' && thumbnail.url) {
      if (thumbnail.sizes && size && thumbnail.sizes[size]) {
        return thumbnail.sizes[size];
      }
      return thumbnail.url;
    }

    // If thumbnail is an ID
    if (typeof thumbnail === 'number' || typeof thumbnail === 'string') {
      const baseUrl = options?.data?.root?.$settings?.mediaUrl || '/media';
      return `${baseUrl}/${thumbnail}/${size || 'thumbnail'}`;
    }

    return thumbnail;
  },

  // Generate srcset for responsive images
  srcset: function(id: string | number | any, sizes?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof sizes === 'object' && sizes.hash !== undefined) {
      options = sizes;
      sizes = undefined;
    }

    if (!id) return '';

    const defaultSizes = ['small', 'medium', 'large', 'full'];
    const sizeMap: Record<string, number> = {
      small: 300,
      medium: 768,
      large: 1024,
      full: 1920
    };

    let srcsetParts: string[] = [];

    // If id is an object with sizes
    if (typeof id === 'object' && id.sizes) {
      for (const size of defaultSizes) {
        if (id.sizes[size]) {
          srcsetParts.push(`${id.sizes[size]} ${sizeMap[size]}w`);
        }
      }
    } else {
      // Generate URLs for each size
      const baseUrl = options?.data?.root?.$settings?.mediaUrl || '/media';
      for (const size of defaultSizes) {
        srcsetParts.push(`${baseUrl}/${id}/${size} ${sizeMap[size]}w`);
      }
    }

    const srcset = srcsetParts.join(', ');

    // If sizes attribute is provided
    if (sizes) {
      return `srcset="${srcset}" sizes="${sizes}"`;
    }

    return srcset;
  },

  // Get image with attributes
  img: function(src: string, alt?: string, className?: string, options?: any) {
    // Handle different parameter configurations
    if (typeof alt === 'object' && alt.hash !== undefined) {
      options = alt;
      alt = '';
      className = '';
    } else if (typeof className === 'object' && className.hash !== undefined) {
      options = className;
      className = '';
    }

    if (!src) return '';

    const attributes: string[] = [`src="${src}"`];

    if (alt) attributes.push(`alt="${alt}"`);
    if (className) attributes.push(`class="${className}"`);

    // Add any additional attributes from options
    if (options?.hash) {
      Object.entries(options.hash).forEach(([key, value]) => {
        if (key !== 'src' && key !== 'alt' && key !== 'class') {
          attributes.push(`${key}="${value}"`);
        }
      });
    }

    return `<img ${attributes.join(' ')} />`;
  },

  // Get video URL
  video: function(id: string | number, options?: any) {
    if (!id) return '';

    // If id is an object with URL
    if (typeof id === 'object' && (id as any).url) {
      return (id as any).url;
    }

    const baseUrl = options?.data?.root?.$settings?.mediaUrl || '/media';
    return `${baseUrl}/video/${id}`;
  },

  // Get audio URL
  audio: function(id: string | number, options?: any) {
    if (!id) return '';

    // If id is an object with URL
    if (typeof id === 'object' && (id as any).url) {
      return (id as any).url;
    }

    const baseUrl = options?.data?.root?.$settings?.mediaUrl || '/media';
    return `${baseUrl}/audio/${id}`;
  },

  // Get file URL
  file: function(id: string | number, options?: any) {
    if (!id) return '';

    // If id is an object with URL
    if (typeof id === 'object' && (id as any).url) {
      return (id as any).url;
    }

    const baseUrl = options?.data?.root?.$settings?.mediaUrl || '/media';
    return `${baseUrl}/file/${id}`;
  },

  // Check if has media
  hasMedia: function(type?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof type === 'object' && type.hash !== undefined) {
      options = type;
      type = undefined;
    }

    const context = options?.data?.root || this;

    let hasValue = false;

    if (type === 'thumbnail' || type === 'featured') {
      hasValue = !!(context.thumbnail || context.featuredImage || context.featured_image);
    } else if (type === 'gallery') {
      hasValue = !!(context.gallery && Array.isArray(context.gallery) && context.gallery.length > 0);
    } else if (type === 'video') {
      hasValue = !!(context.video || context.videoUrl);
    } else if (type === 'audio') {
      hasValue = !!(context.audio || context.audioUrl);
    } else {
      // Check for any media
      hasValue = !!(
        context.thumbnail ||
        context.featuredImage ||
        context.featured_image ||
        context.media ||
        context.gallery ||
        context.video ||
        context.audio
      );
    }

    // Block helper
    if (options && options.fn) {
      return hasValue ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return hasValue;
  },

  // Get gallery images
  gallery: function(size?: string, limit?: number, options?: any) {
    // Handle different parameter configurations
    if (typeof size === 'object' && size.hash !== undefined) {
      options = size;
      size = 'thumbnail';
      limit = undefined;
    } else if (typeof limit === 'object' && limit.hash !== undefined) {
      options = limit;
      limit = undefined;
    }

    const context = options?.data?.root || this;
    let gallery = context.gallery || [];

    if (!Array.isArray(gallery)) return '';

    // Apply limit
    if (limit && limit > 0) {
      gallery = gallery.slice(0, limit);
    }

    // Block helper
    if (options && options.fn) {
      if (gallery.length === 0) {
        return options.inverse ? options.inverse(this) : '';
      }

      return gallery.map((image: any, index: number) => {
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
    return gallery.map((image: any) =>
      image.sizes?.[size || 'thumbnail'] || image.url
    );
  },

  // Get media metadata
  mediaMeta: function(id: string | number, field?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    const context = options?.data?.root || this;

    // Find media object
    let media: any = null;
    if (typeof id === 'object') {
      media = id;
    } else if (context.media && context.media.id === id) {
      media = context.media;
    }

    if (!media) return '';

    // Return specific field or all metadata
    if (field) {
      return media[field] || '';
    }

    return media;
  }
};