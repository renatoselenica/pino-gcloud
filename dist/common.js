"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingCommon = void 0;
const logging_1 = require("@google-cloud/logging");
const types_js_1 = require("./types.js");
const trace_js_1 = require("./trace.js");
const DEFAULT_LOG_NAME = 'pino_log';
const DEFAULT_MAX_ENTRY_SIZE = 250000; // 250KB
/**
 * Core logging engine that handles transformation from Pino logs
 * to Google Cloud Logging entries.
 */
class LoggingCommon {
    logging;
    cloudLog;
    projectId;
    serviceContext;
    labels;
    prefix;
    redirectToStdout;
    useMessageField;
    maxEntrySize;
    defaultCallback;
    constructor(options = {}) {
        this.projectId = options.projectId;
        this.serviceContext = options.serviceContext;
        this.labels = options.labels;
        this.prefix = options.prefix;
        this.redirectToStdout = options.redirectToStdout ?? false;
        this.useMessageField = options.useMessageField ?? true;
        this.maxEntrySize = options.maxEntrySize ?? DEFAULT_MAX_ENTRY_SIZE;
        this.defaultCallback = options.defaultCallback;
        // Initialize Cloud Logging client
        this.logging = new logging_1.Logging({
            projectId: options.projectId,
            credentials: options.credentials,
            keyFilename: options.keyFilename,
        });
        const logName = options.logName ?? DEFAULT_LOG_NAME;
        // Use LogSync for stdout mode, Log for API mode
        if (this.redirectToStdout) {
            this.cloudLog = this.logging.logSync(logName);
        }
        else {
            this.cloudLog = this.logging.log(logName, {
                removeCircular: true,
                maxEntrySize: this.maxEntrySize,
            });
        }
    }
    /**
     * Get the project ID (may require async initialization)
     */
    async getProjectId() {
        if (this.projectId) {
            return this.projectId;
        }
        this.projectId = await this.logging.auth.getProjectId();
        return this.projectId;
    }
    /**
     * Map Pino numeric level to Cloud Logging severity
     */
    mapLevel(level) {
        // Find the closest matching level
        if (level >= 60)
            return 'CRITICAL';
        if (level >= 50)
            return 'ERROR';
        if (level >= 40)
            return 'WARNING';
        if (level >= 30)
            return 'INFO';
        return 'DEBUG';
    }
    /**
     * Extract and format the log message
     */
    formatMessage(logObject) {
        let message = logObject.msg ?? '';
        // Add prefix if configured
        if (this.prefix) {
            message = `[${this.prefix}] ${message}`;
        }
        // Append error stack if present
        if (logObject.err?.stack) {
            message = message ? `${message}\n${logObject.err.stack}` : logObject.err.stack;
        }
        return message;
    }
    /**
     * Extract trace information from the log object or trace agent
     */
    extractTraceInfo(logObject) {
        const result = {};
        // First, check for trace info in the log object
        if (logObject[types_js_1.LOGGING_TRACE_KEY]) {
            result.trace = logObject[types_js_1.LOGGING_TRACE_KEY];
        }
        if (logObject[types_js_1.LOGGING_SPAN_KEY]) {
            result.spanId = logObject[types_js_1.LOGGING_SPAN_KEY];
        }
        if (logObject[types_js_1.LOGGING_SAMPLED_KEY] !== undefined) {
            result.traceSampled = logObject[types_js_1.LOGGING_SAMPLED_KEY];
        }
        // Fall back to trace agent if no trace info in log object
        if (!result.trace) {
            const agentTrace = (0, trace_js_1.getCurrentTraceFromAgent)();
            if (agentTrace) {
                result.trace = agentTrace;
            }
        }
        return result;
    }
    /**
     * Build metadata object for the log entry, extracting
     * special fields that should be elevated to entry metadata
     */
    buildMetadata(logObject) {
        const metadata = {};
        // Copy all properties except special ones
        const excludeKeys = new Set([
            'level',
            'time',
            'msg',
            'pid',
            'hostname',
            'err',
            types_js_1.LOGGING_TRACE_KEY,
            types_js_1.LOGGING_SPAN_KEY,
            types_js_1.LOGGING_SAMPLED_KEY,
            'httpRequest',
            'labels',
        ]);
        for (const [key, value] of Object.entries(logObject)) {
            if (!excludeKeys.has(key)) {
                metadata[key] = value;
            }
        }
        // Include error info in metadata (without stack, which goes in message)
        if (logObject.err) {
            metadata.error = {
                type: logObject.err.type,
                message: logObject.err.message,
            };
        }
        // Include process info
        if (logObject.pid) {
            metadata.pid = logObject.pid;
        }
        if (logObject.hostname) {
            metadata.hostname = logObject.hostname;
        }
        return metadata;
    }
    /**
     * Process a Pino log object and send it to Cloud Logging
     */
    async writeLog(logObject, callback) {
        const severity = this.mapLevel(logObject.level);
        const message = this.formatMessage(logObject);
        const traceInfo = this.extractTraceInfo(logObject);
        const metadata = this.buildMetadata(logObject);
        // Build the entry data
        const entryData = {
            ...metadata,
        };
        if (this.useMessageField && message) {
            entryData.message = message;
        }
        // Merge labels from options and log object
        const labels = {
            ...this.labels,
            ...logObject.labels,
        };
        // Build entry metadata
        const entryMetadata = {
            severity: severity,
            timestamp: new Date(logObject.time),
            labels: Object.keys(labels).length > 0 ? labels : undefined,
            trace: traceInfo.trace,
            spanId: traceInfo.spanId,
            traceSampled: traceInfo.traceSampled,
            httpRequest: logObject.httpRequest,
        };
        // Add service context for error reporting if this is an error
        if (this.serviceContext &&
            (severity === 'ERROR' || severity === 'CRITICAL') &&
            logObject.err?.stack) {
            entryData.serviceContext = this.serviceContext;
            // The @type field enables Error Reporting integration
            entryData['@type'] =
                'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent';
        }
        const entry = this.cloudLog.entry(entryMetadata, entryData);
        // Write the entry
        try {
            if (this.redirectToStdout) {
                // LogSync writes synchronously to stdout
                this.cloudLog.write(entry);
            }
            else {
                // Log writes asynchronously to the API
                await this.cloudLog.write(entry);
            }
            // Call callbacks
            if (callback) {
                callback(null);
            }
            if (this.defaultCallback) {
                this.defaultCallback(null);
            }
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (callback) {
                callback(error);
            }
            if (this.defaultCallback) {
                this.defaultCallback(error);
            }
            throw error;
        }
    }
    /**
     * Write a request log entry (used by middleware)
     */
    async writeRequestLog(httpRequest, trace, spanId, traceSampled, latencyMs) {
        const entryMetadata = {
            severity: 'INFO',
            httpRequest: {
                ...httpRequest,
                latency: latencyMs
                    ? { seconds: Math.floor(latencyMs / 1000), nanos: (latencyMs % 1000) * 1e6 }
                    : undefined,
            },
            trace,
            spanId,
            traceSampled,
            labels: this.labels,
        };
        const entry = this.cloudLog.entry(entryMetadata, {});
        if (this.redirectToStdout) {
            this.cloudLog.write(entry);
        }
        else {
            await this.cloudLog.write(entry);
        }
    }
}
exports.LoggingCommon = LoggingCommon;
//# sourceMappingURL=common.js.map