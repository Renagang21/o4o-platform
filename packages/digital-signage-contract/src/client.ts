/**
 * Digital Signage Contract Client
 *
 * HTTP client for Extensions to interact with Digital Signage Core.
 * Contract Version: v1.0
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const axios = require('axios');

import {
  SignageContractConfig,
  ExecuteActionRequest,
  ExecuteActionResponse,
  StopActionRequest,
  PauseActionRequest,
  ResumeActionRequest,
  ActionControlResponse,
  ActionStatusResponse,
  SlotStatusResponse,
  CONTRACT_VERSION,
  CONTRACT_VERSION_HEADER,
} from './types';

/**
 * Signage Contract Client
 *
 * Provides a type-safe interface for Extensions to interact
 * with Digital Signage Core.
 *
 * @example
 * ```typescript
 * const client = new SignageContractClient({
 *   baseUrl: 'http://localhost:3001',
 *   appId: 'my-extension',
 * });
 *
 * const result = await client.executeAction({
 *   mediaListId: 'media-list-uuid',
 *   displaySlotId: 'slot-uuid',
 *   duration: 60,
 * });
 * ```
 */
export class SignageContractClient {
  private config: Required<SignageContractConfig>;
  private httpClient: any;

  constructor(config: SignageContractConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      appId: config.appId,
      timeout: config.timeout ?? 10000,
      contractVersion: config.contractVersion ?? CONTRACT_VERSION,
      headers: config.headers ?? {},
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        [CONTRACT_VERSION_HEADER]: this.config.contractVersion,
        ...this.config.headers,
      },
    });
  }

  /**
   * Execute an action to play media on a display slot.
   *
   * @param request - Execute action request (sourceAppId is auto-filled)
   * @returns Execute action response
   */
  async executeAction(
    request: Omit<ExecuteActionRequest, 'sourceAppId'>
  ): Promise<ExecuteActionResponse> {
    try {
      const payload: ExecuteActionRequest = {
        ...request,
        sourceAppId: this.config.appId,
      };

      const response = await this.httpClient.post(
        '/api/signage/actions/execute',
        payload
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as ExecuteActionResponse;
      }
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Stop a running action.
   *
   * @param executionId - Action execution ID
   * @param request - Optional stop request with reason
   * @returns Control response
   */
  async stopAction(
    executionId: string,
    request?: StopActionRequest
  ): Promise<ActionControlResponse> {
    try {
      const response = await this.httpClient.post(
        `/api/signage/actions/${executionId}/stop`,
        request ?? {}
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as ActionControlResponse;
      }
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Pause a running action.
   *
   * @param executionId - Action execution ID
   * @param request - Optional pause request with reason
   * @returns Control response
   */
  async pauseAction(
    executionId: string,
    request?: PauseActionRequest
  ): Promise<ActionControlResponse> {
    try {
      const response = await this.httpClient.post(
        `/api/signage/actions/${executionId}/pause`,
        request ?? {}
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as ActionControlResponse;
      }
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Resume a paused action.
   *
   * @param executionId - Action execution ID
   * @param request - Optional resume request
   * @returns Control response
   */
  async resumeAction(
    executionId: string,
    request?: ResumeActionRequest
  ): Promise<ActionControlResponse> {
    try {
      const response = await this.httpClient.post(
        `/api/signage/actions/${executionId}/resume`,
        request ?? {}
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as ActionControlResponse;
      }
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Get the status of an action execution.
   *
   * @param executionId - Action execution ID
   * @returns Action status response
   */
  async getActionStatus(executionId: string): Promise<ActionStatusResponse> {
    try {
      const response = await this.httpClient.get(
        `/api/signage/actions/${executionId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as ActionStatusResponse;
      }
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Get the status of a display slot.
   *
   * @param slotId - Display slot ID
   * @returns Slot status response
   */
  async getSlotStatus(slotId: string): Promise<SlotStatusResponse> {
    try {
      const response = await this.httpClient.get(
        `/api/signage/actions/slot-status/${slotId}`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data as SlotStatusResponse;
      }
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }

  /**
   * Get the current contract version.
   */
  getContractVersion(): string {
    return this.config.contractVersion;
  }

  /**
   * Get the configured app ID.
   */
  getAppId(): string {
    return this.config.appId;
  }
}
