/**
 * pino-cloud-logging
 *
 * Google Cloud Logging transport for Pino
 */

// Export the transport as default (for use with pino.transport())
export { default, createTransport } from './transport.js';

// Export types and constants
export {
  LOGGING_TRACE_KEY,
  LOGGING_SPAN_KEY,
  LOGGING_SAMPLED_KEY,
  PINO_LEVELS,
  CLOUD_LOGGING_SEVERITY,
  PINO_TO_CLOUD_SEVERITY,
  type TransportOptions,
  type ServiceContext,
  type MonitoredResource,
  type HttpRequest,
  type Callback,
  type PinoLogObject,
  type CloudLogEntry,
  type CloudLoggingSeverity,
} from './types.js';

// Export trace utilities
export {
  getCurrentTraceFromAgent,
  getCurrentSpanFromAgent,
  parseTraceHeader,
} from './trace.js';

// Export the LoggingCommon class for advanced usage
export { LoggingCommon } from './common.js';

// Re-export middleware (also available via 'pino-cloud-logging/middleware')
export {
  makeMiddleware,
  makeChildLogger,
  type MiddlewareOptions,
  type LoggingRequest,
} from './middleware/index.js';
