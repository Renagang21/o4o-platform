// Helper utility functions
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let isThrottled = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): void => {
    if (isThrottled) {
      lastArgs = args;
      return;
    }

    func(...args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
      if (lastArgs !== null) {
        func(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };
};

export const parseQueryString = (query: string): Record<string, string> => {
  const params = new URLSearchParams(query);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
};

export const buildQueryString = (params: Record<string, string | number | boolean | undefined>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+82|0)1[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone);
};

/** Strip non-digit characters from phone number (for DB storage) */
export const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

/** Strip non-digit characters from business registration number (for DB storage) */
export const normalizeBusinessNumber = (bn: string): string => bn.replace(/\D/g, '');

/** Validate Korean business registration number (10 digits) */
export const isValidBusinessNumber = (bn: string): boolean => {
  const normalized = bn.replace(/\D/g, '');
  return /^\d{10}$/.test(normalized);
};

/** Password strength checks matching backend @Matches regex */
export const PASSWORD_CHECKS = {
  length: (pw: string) => pw.length >= 8,
  lowercase: (pw: string) => /[a-z]/.test(pw),
  uppercase: (pw: string) => /[A-Z]/.test(pw),
  number: (pw: string) => /\d/.test(pw),
  special: (pw: string) => /[@$!%*?&]/.test(pw),
};

/** Validate password meets platform security policy */
export const validatePassword = (password: string): { valid: boolean; checks: Record<string, boolean> } => {
  const checks = {
    length: PASSWORD_CHECKS.length(password),
    lowercase: PASSWORD_CHECKS.lowercase(password),
    uppercase: PASSWORD_CHECKS.uppercase(password),
    number: PASSWORD_CHECKS.number(password),
    special: PASSWORD_CHECKS.special(password),
  };
  return { valid: Object.values(checks).every(Boolean), checks };
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const truncateText = (text: string, maxLength: number, suffix: string = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

export const groupBy = <T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    if (aValue < bValue) return order === 'asc' ? -1 : 1;
    if (aValue > bValue) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const range = (start: number, end: number, step: number = 1): number[] => {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
};