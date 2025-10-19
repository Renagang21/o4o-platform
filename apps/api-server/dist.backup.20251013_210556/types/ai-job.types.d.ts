/**
 * AI Job Types for BullMQ
 * Sprint 2 - P2: Async Reliability with Queue
 */
import { AIProvider } from './ai-proxy.types';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
export interface ValidationResultLog {
    valid: boolean;
    errorCount: number;
    validationMode: 'full' | 'limited' | 'none';
    timestamp: string;
}
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
    validationResult?: ValidationResultLog;
}
export interface AIJobProgress {
    jobId: string;
    status: JobStatus;
    progress: number;
    message: string;
    timestamp: string;
}
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
//# sourceMappingURL=ai-job.types.d.ts.map