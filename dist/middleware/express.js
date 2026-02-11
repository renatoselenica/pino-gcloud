"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeMiddleware = makeMiddleware;
const node_crypto_1 = require("node:crypto");
const common_js_1 = require("../common.js");
const trace_js_1 = require("../trace.js");
const child_logger_js_1 = require("./child-logger.js");
/**
 * Detect if running in a managed GCP environment that
 * automatically creates request log entries.
 */
function isMangedEnvironment() {
    return !!(process.env.GAE_SERVICE || // App Engine
        process.env.K_SERVICE || // Cloud Run
        process.env.FUNCTION_NAME || // Cloud Functions (legacy)
        process.env.K_REVISION // Cloud Functions (gen2)
    );
}
/**
 * Generate a trace ID for correlation
 */
function generateTraceId() {
    return (0, node_crypto_1.randomUUID)().replace(/-/g, '');
}
/**
 * Generate a span ID for correlation
 */
function generateSpanId() {
    // Span ID should be a 64-bit integer as a decimal string
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}
/**
 * Build HttpRequest object from Express request/response
 */
function buildHttpRequest(req, res, latencyMs) {
    const httpRequest = {
        requestMethod: req.method,
        requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        requestSize: req.get('content-length')
            ? parseInt(req.get('content-length'), 10)
            : undefined,
        status: res.statusCode,
        responseSize: res.get('content-length')
            ? parseInt(res.get('content-length'), 10)
            : undefined,
        userAgent: req.get('user-agent'),
        remoteIp: req.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            req.socket.remoteAddress,
        referer: req.get('referer'),
        latency: {
            seconds: Math.floor(latencyMs / 1000),
            nanos: Math.round((latencyMs % 1000) * 1e6),
        },
        protocol: `HTTP/${req.httpVersion}`,
    };
    return httpRequest;
}
/**
 * Create Express middleware for Google Cloud Logging request correlation.
 *
 * This middleware:
 * 1. Extracts or generates trace context for the request
 * 2. Creates a child logger with trace context attached to req.log
 * 3. Optionally creates a parent request log entry (for non-managed environments)
 *
 * @param logger - The Pino logger instance
 * @param options - Middleware options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import pino from 'pino';
 * import { makeMiddleware } from 'pino-cloud-logging/middleware';
 *
 * const app = express();
 * const logger = pino({
 *   transport: {
 *     target: 'pino-cloud-logging',
 *     options: { projectId: 'my-project' }
 *   }
 * });
 *
 * app.use(makeMiddleware(logger, { projectId: 'my-project' }));
 *
 * app.get('/', (req, res) => {
 *   // req.log is a child logger with trace context
 *   req.log?.info('Handling request');
 *   res.send('Hello!');
 * });
 * ```
 */
function makeMiddleware(logger, options = {}) {
    const projectId = options.projectId;
    const skipParentRequestEntry = options.skipParentRequestEntry ?? isMangedEnvironment();
    // Create LoggingCommon for writing request logs (only if needed)
    let loggingCommon = null;
    if (!skipParentRequestEntry) {
        loggingCommon = new common_js_1.LoggingCommon({
            ...options,
            // Use a separate log name for request logs to enable proper correlation
            logName: options.logName ? `${options.logName}_reqlog` : 'pino_log_reqlog',
        });
    }
    return function cloudLoggingMiddleware(req, res, next) {
        const loggingReq = req;
        const startTime = Date.now();
        // Extract or generate trace context
        let trace;
        let spanId;
        let traceSampled = false;
        const traceHeader = req.get('x-cloud-trace-context');
        if (traceHeader && projectId) {
            const parsed = (0, trace_js_1.parseTraceHeader)(traceHeader, projectId);
            trace = parsed.trace ?? undefined;
            spanId = parsed.spanId ?? undefined;
            traceSampled = parsed.sampled;
        }
        // Generate trace/span if not provided
        if (!trace && projectId) {
            const traceId = generateTraceId();
            trace = `projects/${projectId}/traces/${traceId}`;
        }
        if (!spanId) {
            spanId = generateSpanId();
        }
        // Create child logger with trace context
        if (trace) {
            loggingReq.log = (0, child_logger_js_1.makeChildLogger)(logger, trace, spanId, traceSampled);
        }
        else {
            // If no project ID, just use parent logger
            loggingReq.log = logger;
        }
        // Hook into response finish to write request log
        if (!skipParentRequestEntry && loggingCommon && trace) {
            const capturedTrace = trace;
            const capturedSpanId = spanId;
            const capturedTraceSampled = traceSampled;
            res.on('finish', () => {
                const latencyMs = Date.now() - startTime;
                const httpRequest = buildHttpRequest(req, res, latencyMs);
                // Write request log asynchronously
                loggingCommon
                    .writeRequestLog(httpRequest, capturedTrace, capturedSpanId, capturedTraceSampled, latencyMs)
                    .catch((err) => {
                    console.error('pino-cloud-logging: Failed to write request log:', err);
                });
            });
        }
        next();
    };
}
//# sourceMappingURL=express.js.map