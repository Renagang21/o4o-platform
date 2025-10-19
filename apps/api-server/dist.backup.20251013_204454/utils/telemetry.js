"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceAsync = exports.addSpanEvent = exports.endSpanError = exports.endSpanSuccess = exports.startValidationSpan = exports.startLLMCallSpan = exports.startJobWorkerSpan = exports.startAIProxySpan = exports.getTracer = exports.initTelemetry = void 0;
const api_1 = require("@opentelemetry/api");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const logger_1 = __importDefault(require("./logger"));
// Service name for telemetry
const SERVICE_NAME = 'o4o-api-server';
// Tracer instance
let tracerInstance;
/**
 * Initialize OpenTelemetry SDK
 * Call this on server startup
 */
function initTelemetry() {
    // Only enable telemetry if OTLP endpoint is configured
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!otlpEndpoint && process.env.NODE_ENV === 'production') {
        logger_1.default.warn('⚠️ OpenTelemetry OTLP endpoint not configured, tracing disabled');
        return null;
    }
    try {
        const sdk = new sdk_node_1.NodeSDK({
            // Note: Resource configuration can be set via environment variables
            // OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES
            traceExporter: otlpEndpoint
                ? new exporter_trace_otlp_http_1.OTLPTraceExporter({
                    url: otlpEndpoint,
                    headers: {
                    // Add auth headers if needed
                    // 'x-api-key': process.env.OTEL_API_KEY || '',
                    },
                })
                : undefined,
            instrumentations: [
                (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                    // Auto-instrument HTTP, Express, Redis, etc.
                    '@opentelemetry/instrumentation-http': { enabled: true },
                    '@opentelemetry/instrumentation-express': { enabled: true },
                    '@opentelemetry/instrumentation-ioredis': { enabled: true },
                }),
            ],
        });
        sdk.start();
        logger_1.default.info('✅ OpenTelemetry initialized', {
            serviceName: SERVICE_NAME,
            endpoint: otlpEndpoint || 'console',
        });
        // Graceful shutdown
        process.on('SIGTERM', () => {
            sdk.shutdown()
                .then(() => logger_1.default.info('OpenTelemetry SDK shut down'))
                .catch((error) => logger_1.default.error('Error shutting down OpenTelemetry', { error }));
        });
        return sdk;
    }
    catch (error) {
        logger_1.default.error('Failed to initialize OpenTelemetry', { error: error.message });
        return null;
    }
}
exports.initTelemetry = initTelemetry;
/**
 * Get tracer instance
 */
function getTracer() {
    if (!tracerInstance) {
        tracerInstance = api_1.trace.getTracer(SERVICE_NAME);
    }
    return tracerInstance;
}
exports.getTracer = getTracer;
/**
 * Create a new span for AI proxy request
 */
function startAIProxySpan(requestId, userId, provider, model) {
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
exports.startAIProxySpan = startAIProxySpan;
/**
 * Create a span for BullMQ job processing
 */
function startJobWorkerSpan(jobId, requestId, userId, provider, model) {
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
exports.startJobWorkerSpan = startJobWorkerSpan;
/**
 * Create a span for LLM API call
 */
function startLLMCallSpan(provider, model, requestId) {
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
exports.startLLMCallSpan = startLLMCallSpan;
/**
 * Create a span for validation
 */
function startValidationSpan(requestId, schemaVersion) {
    const tracer = getTracer();
    const span = tracer.startSpan('ai.validation', {
        attributes: {
            'request.id': requestId,
            'schema.version': schemaVersion,
        },
    });
    return span;
}
exports.startValidationSpan = startValidationSpan;
/**
 * End span with success
 */
function endSpanSuccess(span, attributes) {
    if (attributes) {
        span.setAttributes(attributes);
    }
    span.setStatus({ code: api_1.SpanStatusCode.OK });
    span.end();
}
exports.endSpanSuccess = endSpanSuccess;
/**
 * End span with error
 */
function endSpanError(span, error, attributes) {
    if (attributes) {
        span.setAttributes(attributes);
    }
    span.recordException(error);
    span.setStatus({
        code: api_1.SpanStatusCode.ERROR,
        message: error.message,
    });
    span.end();
}
exports.endSpanError = endSpanError;
/**
 * Add event to current span
 */
function addSpanEvent(span, name, attributes) {
    span.addEvent(name, attributes);
}
exports.addSpanEvent = addSpanEvent;
/**
 * Execute function with tracing
 */
async function traceAsync(spanName, attributes, fn) {
    const tracer = getTracer();
    const span = tracer.startSpan(spanName, { attributes });
    try {
        const result = await fn(span);
        endSpanSuccess(span);
        return result;
    }
    catch (error) {
        endSpanError(span, error);
        throw error;
    }
}
exports.traceAsync = traceAsync;
//# sourceMappingURL=telemetry.js.map