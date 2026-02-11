import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Logger } from 'pino';
import { randomUUID } from 'node:crypto';
import { LoggingCommon } from '../common.js';
import { parseTraceHeader } from '../trace.js';
import { makeChildLogger } from './child-logger.js';
import type { TransportOptions, HttpRequest } from '../types.js';

/**
 * Middleware options
 */
export interface MiddlewareOptions extends TransportOptions {
  /**
   * Skip creating the parent request log entry.
   * Set to true for managed environments (Cloud Run, Cloud Functions)
   * that automatically create request logs.
   */
  skipParentRequestEntry?: boolean;
}

/**
 * Extended Request type with logging properties
 */
export interface LoggingRequest extends Request {
  /**
   * Child logger with trace context for this request
   */
  log?: Logger;
}

/**
 * Detect if running in a managed GCP environment that
 * automatically creates request log entries.
 */
function isMangedEnvironment(): boolean {
  return !!(
    process.env.GAE_SERVICE || // App Engine
    process.env.K_SERVICE || // Cloud Run
    process.env.FUNCTION_NAME || // Cloud Functions (legacy)
    process.env.K_REVISION // Cloud Functions (gen2)
  );
}

/**
 * Generate a trace ID for correlation
 */
function generateTraceId(): string {
  return randomUUID().replace(/-/g, '');
}

/**
 * Generate a span ID for correlation
 */
function generateSpanId(): string {
  // Span ID should be a 64-bit integer as a decimal string
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString();
}

/**
 * Build HttpRequest object from Express request/response
 */
function buildHttpRequest(
  req: Request,
  res: Response,
  latencyMs: number
): HttpRequest {
  const httpRequest: HttpRequest = {
    requestMethod: req.method,
    requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    requestSize: req.get('content-length')
      ? parseInt(req.get('content-length')!, 10)
      : undefined,
    status: res.statusCode,
    responseSize: res.get('content-length')
      ? parseInt(res.get('content-length')!, 10)
      : undefined,
    userAgent: req.get('user-agent'),
    remoteIp:
      (req.get('x-forwarded-for') as string)?.split(',')[0]?.trim() ||
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
export function makeMiddleware(
  logger: Logger,
  options: MiddlewareOptions = {}
): RequestHandler {
  const projectId = options.projectId;
  const skipParentRequestEntry =
    options.skipParentRequestEntry ?? isMangedEnvironment();

  // Create LoggingCommon for writing request logs (only if needed)
  let loggingCommon: LoggingCommon | null = null;
  if (!skipParentRequestEntry) {
    loggingCommon = new LoggingCommon({
      ...options,
      // Use a separate log name for request logs to enable proper correlation
      logName: options.logName ? `${options.logName}_reqlog` : 'pino_log_reqlog',
    });
  }

  return function cloudLoggingMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const loggingReq = req as LoggingRequest;
    const startTime = Date.now();

    // Extract or generate trace context
    let trace: string | undefined;
    let spanId: string | undefined;
    let traceSampled = false;

    const traceHeader = req.get('x-cloud-trace-context');

    if (traceHeader && projectId) {
      const parsed = parseTraceHeader(traceHeader, projectId);
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
      loggingReq.log = makeChildLogger(logger, trace, spanId, traceSampled);
    } else {
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
        loggingCommon!
          .writeRequestLog(
            httpRequest,
            capturedTrace,
            capturedSpanId,
            capturedTraceSampled,
            latencyMs
          )
          .catch((err) => {
            console.error('pino-cloud-logging: Failed to write request log:', err);
          });
      });
    }

    next();
  };
}
