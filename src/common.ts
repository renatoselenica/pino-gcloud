import { Logging, Log, LogSync, Entry } from '@google-cloud/logging';
import type { LogEntry } from '@google-cloud/logging/build/src/entry.js';
import {
  type TransportOptions,
  type PinoLogObject,
  type CloudLoggingSeverity,
  type Callback,
  type ServiceContext,
  PINO_TO_CLOUD_SEVERITY,
  LOGGING_TRACE_KEY,
  LOGGING_SPAN_KEY,
  LOGGING_SAMPLED_KEY,
} from './types.js';
import { getCurrentTraceFromAgent } from './trace.js';

const DEFAULT_LOG_NAME = 'pino_log';
const DEFAULT_MAX_ENTRY_SIZE = 250000; // 250KB

/**
 * Core logging engine that handles transformation from Pino logs
 * to Google Cloud Logging entries.
 */
export class LoggingCommon {
  private logging: Logging;
  private cloudLog: Log | LogSync;
  private projectId?: string;
  private serviceContext?: ServiceContext;
  private labels?: Record<string, string>;
  private prefix?: string;
  private redirectToStdout: boolean;
  private useMessageField: boolean;
  private maxEntrySize: number;
  private defaultCallback?: Callback;

  constructor(options: TransportOptions = {}) {
    this.projectId = options.projectId;
    this.serviceContext = options.serviceContext;
    this.labels = options.labels;
    this.prefix = options.prefix;
    this.redirectToStdout = options.redirectToStdout ?? false;
    this.useMessageField = options.useMessageField ?? true;
    this.maxEntrySize = options.maxEntrySize ?? DEFAULT_MAX_ENTRY_SIZE;
    this.defaultCallback = options.defaultCallback;

    // Initialize Cloud Logging client
    this.logging = new Logging({
      projectId: options.projectId,
      credentials: options.credentials,
      keyFilename: options.keyFilename,
    });

    const logName = options.logName ?? DEFAULT_LOG_NAME;

    // Use LogSync for stdout mode, Log for API mode
    if (this.redirectToStdout) {
      this.cloudLog = this.logging.logSync(logName);
    } else {
      this.cloudLog = this.logging.log(logName, {
        removeCircular: true,
        maxEntrySize: this.maxEntrySize,
      });
    }
  }

  /**
   * Get the project ID (may require async initialization)
   */
  async getProjectId(): Promise<string> {
    if (this.projectId) {
      return this.projectId;
    }
    this.projectId = await this.logging.auth.getProjectId();
    return this.projectId;
  }

  /**
   * Map Pino numeric level to Cloud Logging severity
   */
  private mapLevel(level: number): CloudLoggingSeverity {
    // Find the closest matching level
    if (level >= 60) return 'CRITICAL';
    if (level >= 50) return 'ERROR';
    if (level >= 40) return 'WARNING';
    if (level >= 30) return 'INFO';
    return 'DEBUG';
  }

  /**
   * Extract and format the log message
   */
  private formatMessage(logObject: PinoLogObject): string {
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
  private extractTraceInfo(logObject: PinoLogObject): {
    trace?: string;
    spanId?: string;
    traceSampled?: boolean;
  } {
    const result: {
      trace?: string;
      spanId?: string;
      traceSampled?: boolean;
    } = {};

    // First, check for trace info in the log object
    if (logObject[LOGGING_TRACE_KEY]) {
      result.trace = logObject[LOGGING_TRACE_KEY];
    }

    if (logObject[LOGGING_SPAN_KEY]) {
      result.spanId = logObject[LOGGING_SPAN_KEY];
    }

    if (logObject[LOGGING_SAMPLED_KEY] !== undefined) {
      result.traceSampled = logObject[LOGGING_SAMPLED_KEY];
    }

    // Fall back to trace agent if no trace info in log object
    if (!result.trace) {
      const agentTrace = getCurrentTraceFromAgent();
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
  private buildMetadata(logObject: PinoLogObject): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // Copy all properties except special ones
    const excludeKeys = new Set([
      'level',
      'time',
      'msg',
      'pid',
      'hostname',
      'err',
      LOGGING_TRACE_KEY,
      LOGGING_SPAN_KEY,
      LOGGING_SAMPLED_KEY,
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
  async writeLog(logObject: PinoLogObject, callback?: Callback): Promise<void> {
    const severity = this.mapLevel(logObject.level);
    const message = this.formatMessage(logObject);
    const traceInfo = this.extractTraceInfo(logObject);
    const metadata = this.buildMetadata(logObject);

    // Build the entry data
    const entryData: Record<string, unknown> = {
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
    const entryMetadata: LogEntry = {
      severity: severity,
      timestamp: new Date(logObject.time),
      labels: Object.keys(labels).length > 0 ? labels : undefined,
      trace: traceInfo.trace,
      spanId: traceInfo.spanId,
      traceSampled: traceInfo.traceSampled,
      httpRequest: logObject.httpRequest,
    };

    // Add service context for error reporting if this is an error
    if (
      this.serviceContext &&
      (severity === 'ERROR' || severity === 'CRITICAL') &&
      logObject.err?.stack
    ) {
      (entryData as Record<string, unknown>).serviceContext = this.serviceContext;
      // The @type field enables Error Reporting integration
      (entryData as Record<string, unknown>)['@type'] =
        'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent';
    }

    const entry = this.cloudLog.entry(entryMetadata, entryData);

    // Write the entry
    try {
      if (this.redirectToStdout) {
        // LogSync writes synchronously to stdout
        (this.cloudLog as LogSync).write(entry);
      } else {
        // Log writes asynchronously to the API
        await (this.cloudLog as Log).write(entry);
      }

      // Call callbacks
      if (callback) {
        callback(null);
      }
      if (this.defaultCallback) {
        this.defaultCallback(null);
      }
    } catch (err) {
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
  async writeRequestLog(
    httpRequest: NonNullable<PinoLogObject['httpRequest']>,
    trace?: string,
    spanId?: string,
    traceSampled?: boolean,
    latencyMs?: number
  ): Promise<void> {
    const entryMetadata: LogEntry = {
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
      (this.cloudLog as LogSync).write(entry);
    } else {
      await (this.cloudLog as Log).write(entry);
    }
  }
}
