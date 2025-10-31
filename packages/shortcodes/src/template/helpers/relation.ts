// Relation Helpers

export const relationHelpers = {
  // Get related entity
  rel: function(type: string, id?: string | number, field?: string, options?: any) {
    // Handle different parameter configurations
    if (typeof id === 'object' && id.hash !== undefined) {
      options = id;
      id = undefined;
      field = undefined;
    } else if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    const context = options?.data?.root || this;

    // Get the relation from context
    const relation = context[type];
    if (!relation) return '';

    // If requesting specific field
    if (field && typeof relation === 'object') {
      return relation[field] || '';
    }

    return relation;
  },

  // Get parent entity
  parent: function(field?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    const context = options?.data?.root || this;
    const parent = context.parent || context.parentPost;

    if (!parent) return '';

    // If requesting specific field
    if (field) {
      return parent[field] || '';
    }

    return parent;
  },

  // Get children entities
  children: function(type?: string, field?: string, options?: any) {
    // Handle different parameter configurations
    if (typeof type === 'object' && type.hash !== undefined) {
      options = type;
      type = undefined;
      field = undefined;
    } else if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    const context = options?.data?.root || this;
    const children = context.children || context.childPosts || [];

    // Filter by type if specified
    let filtered = children;
    if (type) {
      filtered = children.filter((child: any) => child.postType === type);
    }

    // Block helper
    if (options && options.fn) {
      if (filtered.length === 0) {
        return options.inverse ? options.inverse(this) : '';
      }

      return filtered.map((child: any, index: number) => {
        const childContext = {
          ...child,
          '@index': index,
          '@first': index === 0,
          '@last': index === filtered.length - 1
        };
        return options.fn(childContext);
      }).join('');
    }

    // If requesting specific field
    if (field) {
      return filtered.map((child: any) => child[field] || '').join(', ');
    }

    return filtered;
  },

  // Get author information
  author: function(field?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    const context = options?.data?.root || this;
    const author = context.author || context.authorData;

    if (!author) return '';

    // If requesting specific field
    if (field) {
      return author[field] || '';
    }

    // Default to display name
    return author.displayName || author.name || '';
  },

  // Get category information
  category: function(field?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    const context = options?.data?.root || this;
    const category = context.category || context.primaryCategory;

    if (!category) return '';

    // If requesting specific field
    if (field) {
      return category[field] || '';
    }

    // Default to name
    return category.name || '';
  },

  // Get tags
  tags: function(separator?: string, field?: string, options?: any) {
    // Handle different parameter configurations
    if (typeof separator === 'object' && separator.hash !== undefined) {
      options = separator;
      separator = ', ';
      field = undefined;
    } else if (typeof field === 'object' && field.hash !== undefined) {
      options = field;
      field = undefined;
    }

    const context = options?.data?.root || this;
    const tags = context.tags || [];

    if (!Array.isArray(tags) || tags.length === 0) return '';

    // Block helper
    if (options && options.fn) {
      return tags.map((tag: any, index: number) => {
        const tagContext = {
          ...tag,
          '@index': index,
          '@first': index === 0,
          '@last': index === tags.length - 1
        };
        return options.fn(tagContext);
      }).join('');
    }

    // Extract field values
    if (field) {
      return tags.map((tag: any) => tag[field] || '').join(separator || ', ');
    }

    // Default to names
    return tags.map((tag: any) => tag.name || tag).join(separator || ', ');
  },

  // Get related posts
  related: function(limit?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof limit === 'object' && limit.hash !== undefined) {
      options = limit;
      limit = undefined;
    }

    const context = options?.data?.root || this;
    let related = context.related || context.relatedPosts || [];

    // Apply limit
    if (limit && limit > 0) {
      related = related.slice(0, limit);
    }

    // Block helper
    if (options && options.fn) {
      if (related.length === 0) {
        return options.inverse ? options.inverse(this) : '';
      }

      return related.map((post: any, index: number) => {
        const postContext = {
          ...post,
          '@index': index,
          '@first': index === 0,
          '@last': index === related.length - 1
        };
        return options.fn(postContext);
      }).join('');
    }

    return related;
  },

  // Check if has relation
  hasRelation: function(type: string, options?: any) {
    const context = options?.data?.root || this;
    const relation = context[type];

    const hasValue = relation !== undefined && relation !== null &&
      (Array.isArray(relation) ? relation.length > 0 : true);

    // Block helper
    if (options && options.fn) {
      return hasValue ? options.fn(this) : (options.inverse ? options.inverse(this) : '');
    }

    return hasValue;
  },

  // Get comments
  comments: function(limit?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof limit === 'object' && limit.hash !== undefined) {
      options = limit;
      limit = undefined;
    }

    const context = options?.data?.root || this;
    let comments = context.comments || [];

    // Apply limit
    if (limit && limit > 0) {
      comments = comments.slice(0, limit);
    }

    // Block helper
    if (options && options.fn) {
      if (comments.length === 0) {
        return options.inverse ? options.inverse(this) : '';
      }

      return comments.map((comment: any, index: number) => {
        const commentContext = {
          ...comment,
          '@index': index,
          '@first': index === 0,
          '@last': index === comments.length - 1
        };
        return options.fn(commentContext);
      }).join('');
    }

    return comments;
  },

  // Get reviews
  reviews: function(limit?: number, options?: any) {
    // Handle Handlebars options object
    if (typeof limit === 'object' && limit.hash !== undefined) {
      options = limit;
      limit = undefined;
    }

    const context = options?.data?.root || this;
    let reviews = context.reviews || [];

    // Apply limit
    if (limit && limit > 0) {
      reviews = reviews.slice(0, limit);
    }

    // Block helper
    if (options && options.fn) {
      if (reviews.length === 0) {
        return options.inverse ? options.inverse(this) : '';
      }

      return reviews.map((review: any, index: number) => {
        const reviewContext = {
          ...review,
          '@index': index,
          '@first': index === 0,
          '@last': index === reviews.length - 1
        };
        return options.fn(reviewContext);
      }).join('');
    }

    return reviews;
  },

  // Get attachments
  attachments: function(type?: string, options?: any) {
    // Handle Handlebars options object
    if (typeof type === 'object' && type.hash !== undefined) {
      options = type;
      type = undefined;
    }

    const context = options?.data?.root || this;
    let attachments = context.attachments || [];

    // Filter by type if specified
    if (type) {
      attachments = attachments.filter((att: any) =>
        att.mimeType?.startsWith(type) || att.type === type
      );
    }

    // Block helper
    if (options && options.fn) {
      if (attachments.length === 0) {
        return options.inverse ? options.inverse(this) : '';
      }

      return attachments.map((attachment: any, index: number) => {
        const attachmentContext = {
          ...attachment,
          '@index': index,
          '@first': index === 0,
          '@last': index === attachments.length - 1
        };
        return options.fn(attachmentContext);
      }).join('');
    }

    return attachments;
  }
};