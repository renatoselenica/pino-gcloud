import { type TransportOptions, type PinoLogObject, type Callback } from './types.js';
/**
 * Core logging engine that handles transformation from Pino logs
 * to Google Cloud Logging entries.
 */
export declare class LoggingCommon {
    private logging;
    private cloudLog;
    private projectId?;
    private serviceContext?;
    private labels?;
    private prefix?;
    private redirectToStdout;
    private useMessageField;
    private maxEntrySize;
    private defaultCallback?;
    constructor(options?: TransportOptions);
    /**
     * Get the project ID (may require async initialization)
     */
    getProjectId(): Promise<string>;
    /**
     * Map Pino numeric level to Cloud Logging severity
     */
    private mapLevel;
    /**
     * Extract and format the log message
     */
    private formatMessage;
    /**
     * Extract trace information from the log object or trace agent
     */
    private extractTraceInfo;
    /**
     * Build metadata object for the log entry, extracting
     * special fields that should be elevated to entry metadata
     */
    private buildMetadata;
    /**
     * Process a Pino log object and send it to Cloud Logging
     */
    writeLog(logObject: PinoLogObject, callback?: Callback): Promise<void>;
    /**
     * Write a request log entry (used by middleware)
     */
    writeRequestLog(httpRequest: NonNullable<PinoLogObject['httpRequest']>, trace?: string, spanId?: string, traceSampled?: boolean, latencyMs?: number): Promise<void>;
}
//# sourceMappingURL=common.d.ts.map