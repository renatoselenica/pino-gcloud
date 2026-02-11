"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeChildLogger = makeChildLogger;
const types_js_1 = require("../types.js");
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
function makeChildLogger(logger, trace, spanId, traceSampled) {
    const bindings = {
        [types_js_1.LOGGING_TRACE_KEY]: trace,
    };
    if (spanId !== undefined) {
        bindings[types_js_1.LOGGING_SPAN_KEY] = spanId;
    }
    if (traceSampled !== undefined) {
        bindings[types_js_1.LOGGING_SAMPLED_KEY] = traceSampled;
    }
    return logger.child(bindings);
}
//# sourceMappingURL=child-logger.js.map