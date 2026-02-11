import type { Request, RequestHandler } from 'express';
import type { Logger } from 'pino';
import type { TransportOptions } from '../types.js';
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
export declare function makeMiddleware(logger: Logger, options?: MiddlewareOptions): RequestHandler;
//# sourceMappingURL=express.d.ts.map