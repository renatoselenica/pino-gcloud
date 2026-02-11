"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PINO_TO_CLOUD_SEVERITY = exports.CLOUD_LOGGING_SEVERITY = exports.PINO_LEVELS = exports.LOGGING_SAMPLED_KEY = exports.LOGGING_SPAN_KEY = exports.LOGGING_TRACE_KEY = void 0;
/**
 * Keys used for trace correlation in log metadata
 */
exports.LOGGING_TRACE_KEY = 'logging.googleapis.com/trace';
exports.LOGGING_SPAN_KEY = 'logging.googleapis.com/spanId';
exports.LOGGING_SAMPLED_KEY = 'logging.googleapis.com/trace_sampled';
/**
 * Pino log levels mapped to numeric values
 */
exports.PINO_LEVELS = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
};
/**
 * Cloud Logging severity levels
 */
exports.CLOUD_LOGGING_SEVERITY = {
    EMERGENCY: 'EMERGENCY',
    ALERT: 'ALERT',
    CRITICAL: 'CRITICAL',
    ERROR: 'ERROR',
    WARNING: 'WARNING',
    NOTICE: 'NOTICE',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
    DEFAULT: 'DEFAULT',
};
/**
 * Mapping from Pino numeric level to Cloud Logging severity
 */
exports.PINO_TO_CLOUD_SEVERITY = {
    60: 'CRITICAL', // fatal
    50: 'ERROR', // error
    40: 'WARNING', // warn
    30: 'INFO', // info
    20: 'DEBUG', // debug
    10: 'DEBUG', // trace
};
//# sourceMappingURL=types.js.map