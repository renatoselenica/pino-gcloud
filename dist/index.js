"use strict";
/**
 * pino-cloud-logging
 *
 * Google Cloud Logging transport for Pino
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeChildLogger = exports.makeMiddleware = exports.LoggingCommon = exports.parseTraceHeader = exports.getCurrentSpanFromAgent = exports.getCurrentTraceFromAgent = exports.PINO_TO_CLOUD_SEVERITY = exports.CLOUD_LOGGING_SEVERITY = exports.PINO_LEVELS = exports.LOGGING_SAMPLED_KEY = exports.LOGGING_SPAN_KEY = exports.LOGGING_TRACE_KEY = exports.createTransport = exports.default = void 0;
// Export the transport as default (for use with pino.transport())
var transport_js_1 = require("./transport.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(transport_js_1).default; } });
Object.defineProperty(exports, "createTransport", { enumerable: true, get: function () { return transport_js_1.createTransport; } });
// Export types and constants
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "LOGGING_TRACE_KEY", { enumerable: true, get: function () { return types_js_1.LOGGING_TRACE_KEY; } });
Object.defineProperty(exports, "LOGGING_SPAN_KEY", { enumerable: true, get: function () { return types_js_1.LOGGING_SPAN_KEY; } });
Object.defineProperty(exports, "LOGGING_SAMPLED_KEY", { enumerable: true, get: function () { return types_js_1.LOGGING_SAMPLED_KEY; } });
Object.defineProperty(exports, "PINO_LEVELS", { enumerable: true, get: function () { return types_js_1.PINO_LEVELS; } });
Object.defineProperty(exports, "CLOUD_LOGGING_SEVERITY", { enumerable: true, get: function () { return types_js_1.CLOUD_LOGGING_SEVERITY; } });
Object.defineProperty(exports, "PINO_TO_CLOUD_SEVERITY", { enumerable: true, get: function () { return types_js_1.PINO_TO_CLOUD_SEVERITY; } });
// Export trace utilities
var trace_js_1 = require("./trace.js");
Object.defineProperty(exports, "getCurrentTraceFromAgent", { enumerable: true, get: function () { return trace_js_1.getCurrentTraceFromAgent; } });
Object.defineProperty(exports, "getCurrentSpanFromAgent", { enumerable: true, get: function () { return trace_js_1.getCurrentSpanFromAgent; } });
Object.defineProperty(exports, "parseTraceHeader", { enumerable: true, get: function () { return trace_js_1.parseTraceHeader; } });
// Export the LoggingCommon class for advanced usage
var common_js_1 = require("./common.js");
Object.defineProperty(exports, "LoggingCommon", { enumerable: true, get: function () { return common_js_1.LoggingCommon; } });
// Re-export middleware (also available via 'pino-cloud-logging/middleware')
var index_js_1 = require("./middleware/index.js");
Object.defineProperty(exports, "makeMiddleware", { enumerable: true, get: function () { return index_js_1.makeMiddleware; } });
Object.defineProperty(exports, "makeChildLogger", { enumerable: true, get: function () { return index_js_1.makeChildLogger; } });
//# sourceMappingURL=index.js.map