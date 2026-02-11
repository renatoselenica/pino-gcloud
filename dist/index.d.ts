/**
 * pino-cloud-logging
 *
 * Google Cloud Logging transport for Pino
 */
export { default, createTransport } from './transport.js';
export { LOGGING_TRACE_KEY, LOGGING_SPAN_KEY, LOGGING_SAMPLED_KEY, PINO_LEVELS, CLOUD_LOGGING_SEVERITY, PINO_TO_CLOUD_SEVERITY, type TransportOptions, type ServiceContext, type MonitoredResource, type HttpRequest, type Callback, type PinoLogObject, type CloudLogEntry, type CloudLoggingSeverity, } from './types.js';
export { getCurrentTraceFromAgent, getCurrentSpanFromAgent, parseTraceHeader, } from './trace.js';
export { LoggingCommon } from './common.js';
export { makeMiddleware, makeChildLogger, type MiddlewareOptions, type LoggingRequest, } from './middleware/index.js';
//# sourceMappingURL=index.d.ts.map