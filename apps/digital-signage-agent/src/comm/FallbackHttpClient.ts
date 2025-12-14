/**
 * Fallback HTTP Client
 *
 * HTTP client for Core server communication when WebSocket is unavailable
 * Phase 7: Device Agent
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import { AgentConfig } from '../agent/AgentConfig';
import { AgentLogger } from '../agent/AgentLogger';
import { HeartbeatPayload } from '../agent/AgentHeartbeat';

// Use require for CJS compatibility
const axios = require('axios');
type AxiosInstance = any;
type AxiosError = any;
type AxiosResponse = any;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class FallbackHttpClient {
  private config: AgentConfig;
  private logger: AgentLogger;
  private client: AxiosInstance;
  private displayId: string | null = null;

  constructor(config: AgentConfig, logger: AgentLogger) {
    this.config = config;
    this.logger = logger;

    this.client = axios.create({
      baseURL: config.coreServerUrl,
      timeout: config.connectionTimeoutMs,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        this.logger.error('HTTP request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set display ID for requests
   */
  setDisplayId(displayId: string): void {
    this.displayId = displayId;
    this.client.defaults.headers.common['X-Display-ID'] = displayId;
  }

  /**
   * Generic POST request
   */
  async post<T = any>(url: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data);
      return response.data as ApiResponse<T>;
    } catch (err: unknown) {
      const error = err as AxiosError;
      if (error.response?.data) {
        return error.response.data as ApiResponse<T>;
      }
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Generic GET request
   */
  async get<T = any>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url);
      return response.data as ApiResponse<T>;
    } catch (err: unknown) {
      const error = err as AxiosError;
      if (error.response?.data) {
        return error.response.data as ApiResponse<T>;
      }
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  /**
   * Send heartbeat via HTTP (fallback)
   */
  async sendHeartbeat(payload: HeartbeatPayload): Promise<ApiResponse> {
    return this.post('/api/digital-signage/agent/heartbeat', payload);
  }

  /**
   * Report action status via HTTP (fallback)
   */
  async reportActionStatus(
    actionExecutionId: string,
    status: string,
    errorMessage?: string
  ): Promise<ApiResponse> {
    return this.post(`/api/digital-signage/actions/${actionExecutionId}/status`, {
      status,
      errorMessage,
    });
  }

  /**
   * Poll for pending actions (fallback when WebSocket unavailable)
   */
  async pollPendingActions(): Promise<ApiResponse<any[]>> {
    if (!this.displayId) {
      return { success: false, error: 'Display ID not set' };
    }
    return this.get(`/api/digital-signage/agent/pending-actions?displayId=${this.displayId}`);
  }

  /**
   * Register display
   */
  async registerDisplay(hardwareId: string, name: string): Promise<ApiResponse> {
    return this.post('/api/digital-signage/displays/register', {
      hardwareId,
      name,
      deviceId: hardwareId,
    });
  }
}
