import type { Logger } from 'pino';
/**
 * Create a child logger with trace context bindings.
 * All logs from the child logger will automatically include
 * the trace, span, and sampling information for correlation
 * in Google Cloud Logging.
 *
 * @param logger - The parent Pino logger
 * @param trace - The trace resource name (projects/{projectId}/traces/{traceId})
 * @param spanId - Optional span ID
 * @param traceSampled - Optional trace sampling flag
 * @returns A child logger with trace context
 *
 * @example
 * ```typescript
 * import pino from 'pino';
 * import { makeChildLogger } from 'pino-cloud-logging/middleware';
 *
 * const logger = pino({ ... });
 * const childLogger = makeChildLogger(logger, 'projects/my-project/traces/abc123', '456');
 *
 * childLogger.info('This log will be correlated with the trace');
 * ```
 */
export declare function makeChildLogger(logger: Logger, trace: string, spanId?: string, traceSampled?: boolean): Logger;
//# sourceMappingURL=child-logger.d.ts.map