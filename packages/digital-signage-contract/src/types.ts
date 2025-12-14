/**
 * Digital Signage Extension Contract - Type Definitions
 *
 * Contract Version: v1.0
 *
 * These types define the contract between Digital Signage Core
 * and service Extensions. Extensions must use these types for
 * all Core interactions.
 */

// ============================================================
// Core Types
// ============================================================

/**
 * Action Execution Status
 */
export type ActionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'STOPPED'
  | 'FAILED';

/**
 * Display Slot Status
 */
export type SlotStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'ERROR';

/**
 * Execute Mode - How to handle existing actions
 */
export type ExecuteMode = 'immediate' | 'replace' | 'reject';

/**
 * Rejection Reason Codes
 */
export type RejectionReason =
  | 'SLOT_BUSY'
  | 'SLOT_NOT_FOUND'
  | 'MEDIA_NOT_FOUND'
  | 'DEVICE_OFFLINE'
  | 'PRIORITY_TOO_LOW'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR';

// ============================================================
// Request Types
// ============================================================

/**
 * Execute Action Request
 *
 * Request to start playing media on a display slot.
 */
export interface ExecuteActionRequest {
  /**
   * Source App ID - Identifies the requesting extension
   * Must be unique per extension
   */
  sourceAppId: string;

  /**
   * Media List ID to play
   */
  mediaListId: string;

  /**
   * Target Display Slot ID
   */
  displaySlotId: string;

  /**
   * Duration in seconds
   * 0 = unlimited (plays until explicitly stopped)
   * @default 0
   */
  duration?: number;

  /**
   * Execution mode
   * - 'immediate': Queue and execute in order
   * - 'replace': Stop current and execute immediately
   * - 'reject': Fail if slot is busy
   * @default 'reject'
   */
  executeMode?: ExecuteMode;

  /**
   * Priority (1-100)
   * Higher priority can preempt lower priority actions
   * @default 50
   */
  priority?: number;

  /**
   * Extension-provided metadata
   * Core does not interpret this data
   */
  metadata?: Record<string, unknown>;
}

/**
 * Stop Action Request
 */
export interface StopActionRequest {
  /**
   * Optional reason for stopping
   */
  reason?: string;
}

/**
 * Pause Action Request
 */
export interface PauseActionRequest {
  /**
   * Optional reason for pausing
   */
  reason?: string;
}

/**
 * Resume Action Request
 */
export interface ResumeActionRequest {
  /**
   * Optional metadata for resume
   */
  metadata?: Record<string, unknown>;
}

// ============================================================
// Response Types
// ============================================================

/**
 * Base API Response
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute Action Response
 */
export interface ExecuteActionResponse {
  success: boolean;

  /**
   * Created Action Execution ID
   * Only present when success is true
   */
  executionId?: string;

  /**
   * Current status
   */
  status?: 'PENDING' | 'RUNNING' | 'REJECTED';

  /**
   * Rejection reason (when status is REJECTED)
   */
  reason?: RejectionReason;

  /**
   * Error message
   */
  error?: string;
}

/**
 * Action Control Response (stop/pause/resume)
 */
export interface ActionControlResponse {
  success: boolean;
  error?: string;
}

/**
 * Action Status Data
 */
export interface ActionStatusData {
  id: string;
  status: ActionStatus;
  mediaSourceId: string;
  displaySlotId: string;
  sourceAppId?: string;
  priority?: number;
  startedAt?: string;
  endedAt?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Action Status Response
 */
export interface ActionStatusResponse {
  success: boolean;
  data?: ActionStatusData;
  error?: string;
}

/**
 * Slot Status Data
 */
export interface SlotStatusData {
  slotId: string;
  displayId: string;
  displayName?: string;
  status: SlotStatus;
  currentActionId?: string;
  isActive: boolean;
}

/**
 * Slot Status Response
 */
export interface SlotStatusResponse {
  success: boolean;
  data?: SlotStatusData;
  error?: string;
}

// ============================================================
// Client Configuration
// ============================================================

/**
 * Contract Client Configuration
 */
export interface SignageContractConfig {
  /**
   * Base URL of the Digital Signage API
   */
  baseUrl: string;

  /**
   * Your extension's App ID
   */
  appId: string;

  /**
   * Request timeout in milliseconds
   * @default 10000
   */
  timeout?: number;

  /**
   * Contract version to use
   * @default '1.0'
   */
  contractVersion?: string;

  /**
   * Custom headers to include in requests
   */
  headers?: Record<string, string>;
}

// ============================================================
// Contract Version
// ============================================================

/**
 * Current Contract Version
 */
export const CONTRACT_VERSION = '1.0';

/**
 * Contract Version Header Name
 */
export const CONTRACT_VERSION_HEADER = 'X-Signage-Contract-Version';
