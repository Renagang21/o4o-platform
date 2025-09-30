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
export function ensureArray<T = any>(
  data: any,
  defaultValue: T[] = []
): T[] {
  // If already an array, return it
  if (Array.isArray(data)) {
    return data;
  }

  // Handle nested data structures
  if (data && typeof data === 'object') {
    // Check for data.data pattern
    if (Array.isArray(data.data)) {
      return data.data;
    }

    // Check for data.data.items pattern
    if (data.data && Array.isArray(data.data.items)) {
      return data.data.items;
    }

    // Check for data.data.{resource} pattern (like users, posts, etc.)
    if (data.data && typeof data.data === 'object') {
      // Find first array value in data.data
      const firstArrayKey = Object.keys(data.data).find(
        key => Array.isArray(data.data[key])
      );
      if (firstArrayKey) {
        return data.data[firstArrayKey];
      }
    }

    // Check for data.items pattern
    if (Array.isArray(data.items)) {
      return data.items;
    }

    // Check for data.results pattern
    if (Array.isArray(data.results)) {
      return data.results;
    }

    // Check for data.content pattern
    if (Array.isArray(data.content)) {
      return data.content;
    }
  }

  // Return default value if no array found
  return defaultValue;
}

/**
 * Safely extract object data from API response
 * Handles nested response structures
 */
export function ensureObject<T extends Record<string, any> = Record<string, any>>(
  data: any,
  defaultValue: T = {} as T
): T {
  // If data is null or undefined, return default
  if (data == null) {
    return defaultValue;
  }

  // If already an object (not array), process it
  if (typeof data === 'object' && !Array.isArray(data)) {
    // Check for data.data pattern
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      return data.data;
    }

    // Check for data.result pattern
    if (data.result && typeof data.result === 'object' && !Array.isArray(data.result)) {
      return data.result;
    }

    // Return the object itself
    return data;
  }

  // Return default value if not an object
  return defaultValue;
}

/**
 * Extract pagination info from various API response formats
 */
export function extractPagination(response: any): {
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
  const pagination = 
    response.pagination ||
    response.data?.pagination ||
    response.data?.data?.pagination ||
    response.meta?.pagination;

  if (pagination) {
    return {
      total: pagination.totalItems || pagination.total || 0,
      totalPages: pagination.totalPages || pagination.total_pages || 0,
      currentPage: pagination.currentPage || pagination.current_page || 1,
      pageSize: pagination.pageSize || pagination.per_page || 10
    };
  }

  // Check for total in response
  const total = 
    response.total ||
    response.data?.total ||
    response.totalCount ||
    response.data?.totalCount ||
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
  data: any,
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
    console.error('Error in safeMap:', error);
    return defaultValue;
  }
}

/**
 * Safely filter data that might not be an array
 */
export function safeFilter<T>(
  data: any,
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
    console.error('Error in safeFilter:', error);
    return defaultValue;
  }
}

/**
 * Safely find item in data that might not be an array
 */
export function safeFind<T>(
  data: any,
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
    console.error('Error in safeFind:', error);
    return defaultValue;
  }
}

/**
 * Check if response indicates success
 */
export function isSuccessResponse(response: any): boolean {
  if (!response) return false;
  
  // Check for explicit success flag
  if (typeof response.success === 'boolean') {
    return response.success;
  }
  
  if (response.data && typeof response.data.success === 'boolean') {
    return response.data.success;
  }
  
  // Check for status codes
  if (response.status >= 200 && response.status < 300) {
    return true;
  }
  
  // Check for error indicators
  if (response.error || response.errors || response.data?.error) {
    return false;
  }
  
  // Assume success if we have data
  return !!(response.data || response.result || response.items);
}

/**
 * Extract error message from various response formats
 */
export function extractErrorMessage(error: any): string {
  // Check for axios error response
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Check for direct error message
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return '알 수 없는 오류가 발생했습니다.';
}

/**
 * Normalize API response to consistent format
 */
export function normalizeResponse<T = any>(response: any): {
  data: T;
  success: boolean;
  message?: string;
  pagination?: any;
} {
  // Handle axios response
  const rawData = response?.data || response;
  
  // Extract data based on common patterns
  let data: T;
  
  if (rawData?.data?.data) {
    data = rawData.data.data;
  } else if (rawData?.data) {
    data = rawData.data;
  } else if (rawData?.result) {
    data = rawData.result;
  } else {
    data = rawData;
  }
  
  return {
    data,
    success: isSuccessResponse(response),
    message: rawData?.message || response?.statusText,
    pagination: extractPagination(response)
  };
}