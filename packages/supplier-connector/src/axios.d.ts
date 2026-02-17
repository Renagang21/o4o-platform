declare module 'axios' {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    data?: unknown;
    timeout?: number;
    withCredentials?: boolean;
    responseType?: string;
    maxRedirects?: number;
  }

  export interface AxiosResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
  }

  export interface AxiosError<T = any> extends Error {
    config: AxiosRequestConfig;
    code?: string;
    request?: unknown;
    response?: AxiosResponse<T>;
  }

  export interface AxiosInstance {
    request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    defaults: AxiosRequestConfig;
    interceptors: {
      request: {
        use(onFulfilled?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>, onRejected?: (error: unknown) => unknown): number;
        eject(id: number): void;
      };
      response: {
        use<T = any>(onFulfilled?: (response: AxiosResponse<T>) => AxiosResponse<T> | Promise<AxiosResponse<T>>, onRejected?: (error: unknown) => unknown): number;
        eject(id: number): void;
      };
    };
  }

  export interface AxiosStatic extends AxiosInstance {
    create(config?: AxiosRequestConfig): AxiosInstance;
    isCancel(value: unknown): boolean;
    all<T>(values: (T | Promise<T>)[]): Promise<T[]>;
    spread<T, R>(callback: (...args: T[]) => R): (array: T[]) => R;
    isAxiosError(payload: unknown): payload is AxiosError;
  }

  const axios: AxiosStatic;
  export default axios;
}
