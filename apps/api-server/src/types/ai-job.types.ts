/**
 * AI Job Types for BullMQ
 * Sprint 2 - P2: Async Reliability with Queue
 */

import { AIProvider } from './ai-proxy.types';

// Job Status
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Validation Result (for logging)
export interface ValidationResultLog {
  valid: boolean;
  errorCount: number;
  validationMode: 'full' | 'limited' | 'none';
  timestamp: string;
}

// Job Data (input)
export interface AIJobData {
  provider: AIProvider;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  userId: string;
  userEmail?: string;
  requestId: string;
}

// Job Result (output)
export interface AIJobResult {
  success: boolean;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  result?: {
    blocks: any[];
  };
  error?: string;
  errorType?: string;
  requestId: string;
  jobId: string;
  duration: number;
  retryCount: number;
  validationResult?: ValidationResultLog; // Sprint 2 - P2: validation logging
}

// Job Progress Update
export interface AIJobProgress {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  message: string;
  timestamp: string;
}

// Job Status Response (for SSE/polling)
export interface AIJobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: number;
  data?: AIJobData;
  result?: AIJobResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failedReason?: string;
  attemptsMade: number;
}
