/**
 * Endpoint configuration types and helpers
 */

export interface EndpointConfig {
  [key: string]: string | ((param: string) => string) | EndpointConfig;
}

/**
 * Creates a typed endpoints object with optional base path
 */
export function createEndpoints<T extends EndpointConfig>(
  endpoints: T,
  basePath: string = ''
): T {
  if (!basePath) return endpoints;

  const processEndpoint = (endpoint: any): any => {
    if (typeof endpoint === 'string') {
      return `${basePath}${endpoint}`;
    }
    if (typeof endpoint === 'function') {
      return (param: string) => `${basePath}${endpoint(param)}`;
    }
    if (typeof endpoint === 'object' && endpoint !== null) {
      const processed: any = {};
      for (const key in endpoint) {
        processed[key] = processEndpoint(endpoint[key]);
      }
      return processed;
    }
    return endpoint;
  };

  return processEndpoint(endpoints);
}

/**
 * Common API endpoint patterns
 */
export const createCrudEndpoints = (resource: string) => ({
  LIST: `/api/${resource}`,
  DETAIL: (id: string) => `/api/${resource}/${id}`,
  CREATE: `/api/${resource}`,
  UPDATE: (id: string) => `/api/${resource}/${id}`,
  DELETE: (id: string) => `/api/${resource}/${id}`,
});

/**
 * Helper to extract endpoint groups
 */
export function extractEndpointGroup<T extends EndpointConfig, K extends keyof T>(
  endpoints: T,
  group: K
): T[K] {
  return endpoints[group];
}