import apiFetch from '@wordpress/api-fetch';

/**
 * Configure WordPress API fetch to use our backend
 */
export function setupWordPressAPI() {
  // Set the root URL for WordPress API requests
  apiFetch.use(apiFetch.createRootURLMiddleware(
    import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
  ));

  // Add authentication headers
  apiFetch.use((options, next) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    return next(options);
  });

  // Transform paths to match our API structure
  apiFetch.use((options, next) => {
    // Replace WordPress paths with our API paths
    if (typeof options.path === 'string') {
      // Map WordPress paths to our API
      if (options.path.startsWith('/wp/v2/types')) {
        options.path = options.path.replace('/wp/v2/types', '/cpt/types');
      } else if (options.path.includes('/wp/v2/')) {
        // For post type queries, transform to our CPT endpoints
        const match = options.path.match(/\/wp\/v2\/([^/?]+)/);
        if (match) {
          const postType = match[1];
          options.path = options.path.replace(`/wp/v2/${postType}`, `/cpt/${postType}/posts`);
        }
      } else if (options.path.startsWith('/acf/v3/')) {
        // Handle ACF paths
        options.path = options.path.replace('/acf/v3/', '/cpt/acf/');
      }
    }
    
    return next(options);
  });

  // Handle response format differences
  apiFetch.use(async (options, next) => {
    const response = await next(options);
    
    // If the response has a success property, extract the data
    if (response && typeof response === 'object' && 'success' in response && 'data' in response) {
      return response.data;
    }
    
    return response;
  });
}

// Initialize on import
setupWordPressAPI();