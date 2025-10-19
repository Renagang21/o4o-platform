/**
 * OpenTelemetry Tracing Configuration
 * Sprint 3: Distributed tracing for AI request pipeline
 *
 * Traces the complete AI generation flow:
 * - HTTP request → AI proxy → BullMQ enqueue
 * - BullMQ worker → LLM provider API call
 * - Response → Validation → Result storage
 *
 * Each span includes:
 * - requestId (correlation ID)
 * - userId, provider, model
 * - Duration, status, error details
 */
import { Span } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
/**
 * Initialize OpenTelemetry SDK
 * Call this on server startup
 */
export declare function initTelemetry(): NodeSDK | null;
/**
 * Get tracer instance
 */
export declare function getTracer(): any;
/**
 * Create a new span for AI proxy request
 */
export declare function startAIProxySpan(requestId: string, userId: string, provider: string, model: string): Span;
/**
 * Create a span for BullMQ job processing
 */
export declare function startJobWorkerSpan(jobId: string, requestId: string, userId: string, provider: string, model: string): Span;
/**
 * Create a span for LLM API call
 */
export declare function startLLMCallSpan(provider: string, model: string, requestId: string): Span;
/**
 * Create a span for validation
 */
export declare function startValidationSpan(requestId: string, schemaVersion: string): Span;
/**
 * End span with success
 */
export declare function endSpanSuccess(span: Span, attributes?: Record<string, any>): void;
/**
 * End span with error
 */
export declare function endSpanError(span: Span, error: Error, attributes?: Record<string, any>): void;
/**
 * Add event to current span
 */
export declare function addSpanEvent(span: Span, name: string, attributes?: Record<string, any>): void;
/**
 * Execute function with tracing
 */
export declare function traceAsync<T>(spanName: string, attributes: Record<string, any>, fn: (span: Span) => Promise<T>): Promise<T>;
//# sourceMappingURL=telemetry.d.ts.map