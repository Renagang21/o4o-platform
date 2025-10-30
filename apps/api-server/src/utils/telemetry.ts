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

import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import logger from './logger.js';

// Service name for telemetry
const SERVICE_NAME = 'o4o-api-server';

// Tracer instance
let tracerInstance: any;

/**
 * Initialize OpenTelemetry SDK
 * Call this on server startup
 */
export function initTelemetry(): NodeSDK | null {
  // Only enable telemetry if OTLP endpoint is configured
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

  if (!otlpEndpoint && process.env.NODE_ENV === 'production') {
    logger.warn('⚠️ OpenTelemetry OTLP endpoint not configured, tracing disabled');
    return null;
  }

  try {
    const sdk = new NodeSDK({
      // Note: Resource configuration can be set via environment variables
      // OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES
      traceExporter: otlpEndpoint
        ? new OTLPTraceExporter({
            url: otlpEndpoint,
            headers: {
              // Add auth headers if needed
              // 'x-api-key': process.env.OTEL_API_KEY || '',
            },
          })
        : undefined,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Auto-instrument HTTP, Express, Redis, etc.
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-ioredis': { enabled: true },
        }),
      ],
    });

    sdk.start();

    logger.info('✅ OpenTelemetry initialized', {
      serviceName: SERVICE_NAME,
      endpoint: otlpEndpoint || 'console',
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => logger.info('OpenTelemetry SDK shut down'))
        .catch((error) => logger.error('Error shutting down OpenTelemetry', { error }));
    });

    return sdk;

  } catch (error: any) {
    logger.error('Failed to initialize OpenTelemetry', { error: error.message });
    return null;
  }
}

/**
 * Get tracer instance
 */
export function getTracer() {
  if (!tracerInstance) {
    tracerInstance = trace.getTracer(SERVICE_NAME);
  }
  return tracerInstance;
}

/**
 * Create a new span for AI proxy request
 */
export function startAIProxySpan(
  requestId: string,
  userId: string,
  provider: string,
  model: string
): Span {
  const tracer = getTracer();

  const span = tracer.startSpan('ai.proxy.request', {
    attributes: {
      'request.id': requestId,
      'user.id': userId,
      'ai.provider': provider,
      'ai.model': model,
      'service.name': SERVICE_NAME,
    },
  });

  return span;
}

/**
 * Create a span for BullMQ job processing
 */
export function startJobWorkerSpan(
  jobId: string,
  requestId: string,
  userId: string,
  provider: string,
  model: string
): Span {
  const tracer = getTracer();

  const span = tracer.startSpan('ai.worker.process', {
    attributes: {
      'job.id': jobId,
      'request.id': requestId,
      'user.id': userId,
      'ai.provider': provider,
      'ai.model': model,
    },
  });

  return span;
}

/**
 * Create a span for LLM API call
 */
export function startLLMCallSpan(
  provider: string,
  model: string,
  requestId: string
): Span {
  const tracer = getTracer();

  const span = tracer.startSpan('ai.llm.call', {
    attributes: {
      'ai.provider': provider,
      'ai.model': model,
      'request.id': requestId,
    },
  });

  return span;
}

/**
 * Create a span for validation
 */
export function startValidationSpan(
  requestId: string,
  schemaVersion: string
): Span {
  const tracer = getTracer();

  const span = tracer.startSpan('ai.validation', {
    attributes: {
      'request.id': requestId,
      'schema.version': schemaVersion,
    },
  });

  return span;
}

/**
 * End span with success
 */
export function endSpanSuccess(span: Span, attributes?: Record<string, any>) {
  if (attributes) {
    span.setAttributes(attributes);
  }
  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
}

/**
 * End span with error
 */
export function endSpanError(span: Span, error: Error, attributes?: Record<string, any>) {
  if (attributes) {
    span.setAttributes(attributes);
  }
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  span.end();
}

/**
 * Add event to current span
 */
export function addSpanEvent(span: Span, name: string, attributes?: Record<string, any>) {
  span.addEvent(name, attributes);
}

/**
 * Execute function with tracing
 */
export async function traceAsync<T>(
  spanName: string,
  attributes: Record<string, any>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getTracer();
  const span = tracer.startSpan(spanName, { attributes });

  try {
    const result = await fn(span);
    endSpanSuccess(span);
    return result;
  } catch (error: any) {
    endSpanError(span, error);
    throw error;
  }
}
