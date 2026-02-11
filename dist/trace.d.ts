/**
 * Trace agent integration for Google Cloud Trace correlation
 */
/**
 * Interface for the Google Cloud Trace Agent
 */
interface TraceAgent {
    getCurrentContextId(): string | null;
    getWriterProjectId(): string | null;
    getCurrentRootSpan(): {
        getTraceContext(): string;
    } | null;
}
/**
 * Global trace agent instance (injected by @google-cloud/trace-agent)
 */
declare global {
    var _google_trace_agent: TraceAgent | undefined;
}
/**
 * Get the current trace ID from the Google Cloud Trace Agent.
 * Returns the full trace resource name in the format:
 * projects/{projectId}/traces/{traceId}
 *
 * @returns The trace resource name, or null if no trace agent is active
 */
export declare function getCurrentTraceFromAgent(): string | null;
/**
 * Get the current span ID from the trace agent.
 *
 * @returns The span ID, or null if no trace agent is active
 */
export declare function getCurrentSpanFromAgent(): string | null;
/**
 * Extract trace information from the X-Cloud-Trace-Context header.
 * Header format: TRACE_ID/SPAN_ID;o=TRACE_TRUE
 *
 * @param header The X-Cloud-Trace-Context header value
 * @param projectId The GCP project ID
 * @returns Object containing trace, spanId, and sampled values
 */
export declare function parseTraceHeader(header: string, projectId: string): {
    trace: string | null;
    spanId: string | null;
    sampled: boolean;
};
export {};
//# sourceMappingURL=trace.d.ts.map