export declare const capitalize: (str: string) => string;
export declare const debounce: <T extends (...args: unknown[]) => unknown>(func: T, wait: number) => ((...args: Parameters<T>) => void);
export declare const throttle: <T extends (...args: unknown[]) => unknown>(func: T, wait: number) => ((...args: Parameters<T>) => void);
export declare const parseQueryString: (query: string) => Record<string, string>;
export declare const buildQueryString: (params: Record<string, string | number | boolean | undefined>) => string;
export declare const sleep: (ms: number) => Promise<void>;
export declare const isValidEmail: (email: string) => boolean;
export declare const isValidPhone: (phone: string) => boolean;
export declare const generateId: () => string;
export declare const truncateText: (text: string, maxLength: number, suffix?: string) => string;
export declare const groupBy: <T, K extends keyof T>(array: T[], key: K) => Record<string, T[]>;
export declare const sortBy: <T>(array: T[], key: keyof T, order?: "asc" | "desc") => T[];
export declare const clamp: (value: number, min: number, max: number) => number;
export declare const range: (start: number, end: number, step?: number) => number[];
//# sourceMappingURL=helpers.d.ts.map