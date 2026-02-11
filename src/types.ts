import type { Log, LogSync, Logging } from '@google-cloud/logging';
import type { google } from '@google-cloud/logging/build/protos/protos.js';

/**
 * Keys used for trace correlation in log metadata
 */
export const LOGGING_TRACE_KEY = 'logging.googleapis.com/trace';
export const LOGGING_SPAN_KEY = 'logging.googleapis.com/spanId';
export const LOGGING_SAMPLED_KEY = 'logging.googleapis.com/trace_sampled';

/**
 * Service context for Google Cloud Error Reporting
 */
export interface ServiceContext {
  service?: string;
  version?: string;
}

/**
 * Monitored resource configuration
 */
export type MonitoredResource = google.api.IMonitoredResource;

/**
 * HTTP request information for request correlation
 */
export type HttpRequest = google.logging.type.IHttpRequest;

/**
 * Callback type for async operations
 */
export type Callback = (err: Error | null, response?: object) => void;

/**
 * Pino log levels mapped to numeric values
 */
export const PINO_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
} as const;

/**
 * Cloud Logging severity levels
 */
export const CLOUD_LOGGING_SEVERITY = {
  EMERGENCY: 'EMERGENCY',
  ALERT: 'ALERT',
  CRITICAL: 'CRITICAL',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  NOTICE: 'NOTICE',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  DEFAULT: 'DEFAULT',
} as const;

export type CloudLoggingSeverity = keyof typeof CLOUD_LOGGING_SEVERITY;

/**
 * Mapping from Pino numeric level to Cloud Logging severity
 */
export const PINO_TO_CLOUD_SEVERITY: Record<number, CloudLoggingSeverity> = {
  60: 'CRITICAL', // fatal
  50: 'ERROR',    // error
  40: 'WARNING',  // warn
  30: 'INFO',     // info
  20: 'DEBUG',    // debug
  10: 'DEBUG',    // trace
};

/**
 * Options for the transport
 */
export interface TransportOptions {
  /**
   * The name of the log. Default: 'pino_log'
   */
  logName?: string;

  /**
   * The Google Cloud project ID
   */
  projectId?: string;

  /**
   * Service account credentials
   */
  credentials?: {
    client_email?: string;
    private_key?: string;
  };

  /**
   * Path to a key file containing credentials
   */
  keyFilename?: string;

  /**
   * The monitored resource to associate logs with
   */
  resource?: MonitoredResource;

  /**
   * Service context for Google Cloud Error Reporting integration
   */
  serviceContext?: ServiceContext;

  /**
   * Custom labels to attach to all log entries
   */
  labels?: Record<string, string>;

  /**
   * Prefix to prepend to all log messages
   */
  prefix?: string;

  /**
   * If true, output logs to stdout in JSON format instead of sending to the API.
   * Use this for managed environments (Cloud Run, Cloud Functions, GKE with logging agent)
   */
  redirectToStdout?: boolean;

  /**
   * Whether to use the 'message' field for the log message.
   * Default: true
   */
  useMessageField?: boolean;

  /**
   * Maximum size of a single log entry in bytes.
   * Entries exceeding this size will be truncated.
   * Default: 250000 (250KB)
   */
  maxEntrySize?: number;

  /**
   * Default callback for all log operations
   */
  defaultCallback?: Callback;
}

/**
 * Pino log object structure
 */
export interface PinoLogObject {
  level: number;
  time: number;
  msg?: string;
  pid?: number;
  hostname?: string;
  err?: {
    type?: string;
    message?: string;
    stack?: string;
  };
  [LOGGING_TRACE_KEY]?: string;
  [LOGGING_SPAN_KEY]?: string;
  [LOGGING_SAMPLED_KEY]?: boolean;
  httpRequest?: HttpRequest;
  labels?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Structured log entry for Cloud Logging
 */
export interface CloudLogEntry {
  severity: CloudLoggingSeverity;
  message?: string;
  timestamp?: Date | string;
  trace?: string;
  spanId?: string;
  traceSampled?: boolean;
  httpRequest?: HttpRequest;
  labels?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Internal state for LoggingCommon
 */
export interface LoggingCommonState {
  logging: Logging;
  log: Log | LogSync;
  projectId?: string;
  resource?: MonitoredResource;
  serviceContext?: ServiceContext;
  labels?: Record<string, string>;
  prefix?: string;
  redirectToStdout: boolean;
  useMessageField: boolean;
  maxEntrySize: number;
  defaultCallback?: Callback;
}
