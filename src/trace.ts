/**
 * Trace agent integration for Google Cloud Trace correlation
 */

/**
 * Interface for the Google Cloud Trace Agent
 */
interface TraceAgent {
  getCurrentContextId(): string | null;
  getWriterProjectId(): string | null;
  getCurrentRootSpan(): { getTraceContext(): string } | null;
}

/**
 * Global trace agent instance (injected by @google-cloud/trace-agent)
 */
declare global {
  // eslint-disable-next-line no-var
  var _google_trace_agent: TraceAgent | undefined;
}

/**
 * Get the current trace ID from the Google Cloud Trace Agent.
 * Returns the full trace resource name in the format:
 * projects/{projectId}/traces/{traceId}
 *
 * @returns The trace resource name, or null if no trace agent is active
 */
export function getCurrentTraceFromAgent(): string | null {
  const agent = globalThis._google_trace_agent;

  if (!agent) {
    return null;
  }

  const traceId = agent.getCurrentContextId();
  const projectId = agent.getWriterProjectId();

  if (!traceId || !projectId) {
    return null;
  }

  return `projects/${projectId}/traces/${traceId}`;
}

/**
 * Get the current span ID from the trace agent.
 *
 * @returns The span ID, or null if no trace agent is active
 */
export function getCurrentSpanFromAgent(): string | null {
  const agent = globalThis._google_trace_agent;

  if (!agent) {
    return null;
  }

  const rootSpan = agent.getCurrentRootSpan();
  if (!rootSpan) {
    return null;
  }

  // Extract span ID from trace context
  const traceContext = rootSpan.getTraceContext();
  if (!traceContext) {
    return null;
  }

  // Trace context format: {traceId}/{spanId};o={options}
  const parts = traceContext.split('/');
  if (parts.length < 2) {
    return null;
  }

  const spanPart = parts[1];
  // Remove options suffix if present
  const spanId = spanPart.split(';')[0];
  return spanId || null;
}

/**
 * Extract trace information from the X-Cloud-Trace-Context header.
 * Header format: TRACE_ID/SPAN_ID;o=TRACE_TRUE
 *
 * @param header The X-Cloud-Trace-Context header value
 * @param projectId The GCP project ID
 * @returns Object containing trace, spanId, and sampled values
 */
export function parseTraceHeader(
  header: string,
  projectId: string
): {
  trace: string | null;
  spanId: string | null;
  sampled: boolean;
} {
  const result = {
    trace: null as string | null,
    spanId: null as string | null,
    sampled: false,
  };

  if (!header || !projectId) {
    return result;
  }

  // Format: TRACE_ID/SPAN_ID;o=TRACE_TRUE
  const match = header.match(/^([a-f0-9]+)(?:\/(\d+))?(?:;o=(\d))?$/i);

  if (!match) {
    return result;
  }

  const [, traceId, spanId, traceSampled] = match;

  if (traceId) {
    result.trace = `projects/${projectId}/traces/${traceId}`;
  }

  if (spanId) {
    result.spanId = spanId;
  }

  result.sampled = traceSampled === '1';

  return result;
}
