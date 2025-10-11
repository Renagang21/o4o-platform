/**
 * API Response Helper Utilities
 * 
 * Standardizes API response handling to prevent runtime errors
 * when data is not in expected format (especially arrays)
 */

/**
 * Safely extract array data from API response
 * Handles various response structures and ensures array return
 */
export function ensureArray<T = unknown>(
  data: unknown,
  defaultValue: T[] = []
): T[] {
  // If already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  // Handle nested data structures
  if (data && typeof data === 'object') {
    const dataObj = data as Record<string, unknown>;
    
    // Check for data.data pattern
    if (Array.isArray(dataObj.data)) {
      return dataObj.data;
    }

    // Check for data.data.items pattern
    if (dataObj.data && typeof dataObj.data === 'object' && !Array.isArray(dataObj.data)) {
      const nestedData = dataObj.data as Record<string, unknown>;
      if (Array.isArray(nestedData.items)) {
        return nestedData.items;
      }

      // Check for data.data.{resource} pattern (like users, posts, etc.)
      const firstArrayKey = Object.keys(nestedData).find(
        key => Array.isArray(nestedData[key])
      );
      if (firstArrayKey) {
        return nestedData[firstArrayKey] as T[];
      }
    }

    // Check for data.items pattern
    if (Array.isArray(dataObj.items)) {
      return dataObj.items;
    }

    // Check for data.results pattern
    if (Array.isArray(dataObj.results)) {
      return dataObj.results;
    }

    // Check for data.content pattern
    if (Array.isArray(dataObj.content)) {
      return dataObj.content;
    }
  }

  // Return default value if no array found
  return defaultValue;
}

/**
 * Safely extract object data from API response
 * Handles nested response structures
 */
export function ensureObject<T extends Record<string, unknown> = Record<string, unknown>>(
  data: unknown,
  defaultValue: T = {} as T
): T {
  // If data is null or undefined, return default
  if (data == null) {
    return defaultValue;
  }

  // If already an object (not array), process it
  if (typeof data === 'object' && !Array.isArray(data)) {
    const dataObj = data as Record<string, unknown>;
    
    // Check for data.data pattern
    if (dataObj.data && typeof dataObj.data === 'object' && !Array.isArray(dataObj.data)) {
      return dataObj.data as T;
    }

    // Check for data.result pattern
    if (dataObj.result && typeof dataObj.result === 'object' && !Array.isArray(dataObj.result)) {
      return dataObj.result as T;
    }

    // Return the object itself
    return dataObj as T;
  }

  // Return default value if not an object
  return defaultValue;
}

/**
 * Extract pagination info from various API response formats
 */
export function extractPagination(response: unknown): {
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
} {
  const defaultPagination = {
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  };

  if (!response) return defaultPagination;

  // Check for pagination at different levels
  const responseObj = response as Record<string, unknown>;
  const dataObj = responseObj.data as Record<string, unknown> | undefined;
  const nestedDataObj = dataObj?.data as Record<string, unknown> | undefined;
  const metaObj = responseObj.meta as Record<string, unknown> | undefined;
  
  const pagination =
    responseObj.pagination ||
    dataObj?.pagination ||
    nestedDataObj?.pagination ||
    metaObj?.pagination;

  if (pagination) {
    const paginationObj = pagination as Record<string, any>;
    return {
      total: paginationObj.totalItems || paginationObj.total || 0,
      totalPages: paginationObj.totalPages || paginationObj.total_pages || 0,
      currentPage: paginationObj.currentPage || paginationObj.current_page || 1,
      pageSize: paginationObj.pageSize || paginationObj.per_page || 10
    };
  }

  // Check for total in response
  const total =
    (responseObj.total as number) ||
    (dataObj?.total as number) ||
    (responseObj.totalCount as number) ||
    (dataObj?.totalCount as number) ||
    0;

  return {
    ...defaultPagination,
    total
  };
}

/**
 * Safely map over data that might not be an array
 */
export function safeMap<T, R>(
  data: unknown,
  mapFn: (item: T, index: number, array: T[]) => R,
  defaultValue: R[] = []
): R[] {
  const array = ensureArray<T>(data);
  if (array.length === 0) {
    return defaultValue;
  }
  
  try {
    return array.map(mapFn);
  } catch (error) {
    // Error in safeMap
    return defaultValue;
  }
}

/**
 * Safely filter data that might not be an array
 */
export function safeFilter<T>(
  data: unknown,
  filterFn: (item: T, index: number, array: T[]) => boolean,
  defaultValue: T[] = []
): T[] {
  const array = ensureArray<T>(data);
  if (array.length === 0) {
    return defaultValue;
  }
  
  try {
    return array.filter(filterFn);
  } catch (error) {
    // Error in safeFilter
    return defaultValue;
  }
}

/**
 * Safely find item in data that might not be an array
 */
export function safeFind<T>(
  data: unknown,
  findFn: (item: T, index: number, array: T[]) => boolean,
  defaultValue?: T
): T | undefined {
  const array = ensureArray<T>(data);
  if (array.length === 0) {
    return defaultValue;
  }
  
  try {
    return array.find(findFn) || defaultValue;
  } catch (error) {
    // Error in safeFind
    return defaultValue;
  }
}

/**
 * Check if response indicates success
 */
export function isSuccessResponse(response: unknown): boolean {
  if (!response) return false;
  
  const responseObj = response as Record<string, unknown>;
  const dataObj = responseObj.data as Record<string, unknown> | undefined;
  
  // Check for explicit success flag
  if (typeof responseObj.success === 'boolean') {
    return responseObj.success;
  }
  
  if (dataObj && typeof dataObj.success === 'boolean') {
    return dataObj.success;
  }
  
  // Check for status codes
  if (typeof responseObj.status === 'number' && responseObj.status >= 200 && responseObj.status < 300) {
    return true;
  }
  
  // Check for error indicators
  if (responseObj.error || responseObj.errors || dataObj?.error) {
    return false;
  }
  
  // Assume success if we have data
  return !!(responseObj.data || responseObj.result || responseObj.items);
}

/**
 * Extract error message from various response formats
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const responseObj = errorObj.response as Record<string, unknown> | undefined;
    const responseDataObj = responseObj?.data as Record<string, unknown> | undefined;
    
    // Check for axios error response
    if (typeof responseDataObj?.message === 'string') {
      return responseDataObj.message;
    }
    
    if (typeof responseDataObj?.error === 'string') {
      return responseDataObj.error;
    }
    
    // Check for direct error message
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }
  }
  
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * Normalize API response to consistent format
 */
export function normalizeResponse<T = unknown>(response: unknown): {
  data: T;
  success: boolean;
  message?: string;
  pagination?: unknown;
} {
  if (!response) {
    return {
      data: null as T,
      success: false,
      pagination: extractPagination(response)
    };
  }
  
  const responseObj = response as Record<string, unknown>;
  
  // Handle axios response
  const rawData = responseObj.data || response;
  const rawDataObj = rawData as Record<string, unknown>;
  
  // Extract data based on common patterns
  let data: T;
  
  if (rawDataObj?.data && typeof rawDataObj.data === 'object') {
    const nestedDataObj = rawDataObj.data as Record<string, unknown>;
    if (nestedDataObj.data) {
      data = nestedDataObj.data as T;
    } else {
      data = rawDataObj.data as T;
    }
  } else if (rawDataObj?.result) {
    data = rawDataObj.result as T;
  } else {
    data = rawData as T;
  }
  
  return {
    data,
    success: isSuccessResponse(response),
    message: (rawDataObj?.message as string) || (responseObj?.statusText as string),
    pagination: extractPagination(response)
  };
}