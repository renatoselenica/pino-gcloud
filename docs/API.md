# API Reference

Detailed API documentation for `pino-cloud-logging`.

## Table of Contents

- [Transport](#transport)
- [LoggingCommon Class](#loggingcommon-class)
- [Middleware](#middleware)
- [Trace Utilities](#trace-utilities)
- [Types and Constants](#types-and-constants)

---

## Transport

### `createTransport(options?)`

Creates a Pino transport that sends logs to Google Cloud Logging.

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: { /* TransportOptions */ }
  }
});
```

**Parameters:**

- `options` (`TransportOptions`, optional) - Configuration options

**Returns:** `Promise<Transform>` - A Node.js transform stream

---

## LoggingCommon Class

The core logging engine that transforms Pino logs to Cloud Logging entries.

### Constructor

```typescript
new LoggingCommon(options?: TransportOptions)
```

**Parameters:**

- `options.logName` (`string`) - Log name in Cloud Logging. Default: `'pino_log'`
- `options.projectId` (`string`) - GCP project ID. Auto-detected if not provided.
- `options.credentials` (`object`) - Service account credentials
- `options.keyFilename` (`string`) - Path to service account key file
- `options.resource` (`MonitoredResource`) - GCP monitored resource
- `options.serviceContext` (`ServiceContext`) - Service context for Error Reporting
- `options.labels` (`Record<string, string>`) - Labels applied to all entries
- `options.prefix` (`string`) - Prefix prepended to all messages
- `options.redirectToStdout` (`boolean`) - Use stdout instead of API. Default: `false`
- `options.useMessageField` (`boolean`) - Include message in JSON payload. Default: `true`
- `options.maxEntrySize` (`number`) - Max entry size in bytes. Default: `250000`
- `options.defaultCallback` (`Callback`) - Callback for all log operations

### Methods

#### `getProjectId()`

```typescript
async getProjectId(): Promise<string>
```

Returns the GCP project ID. May trigger async authentication if not already provided.

#### `writeLog(logObject, callback?)`

```typescript
async writeLog(logObject: PinoLogObject, callback?: Callback): Promise<void>
```

Processes a Pino log object and sends it to Cloud Logging.

**Parameters:**

- `logObject` (`PinoLogObject`) - The Pino log object
- `callback` (`Callback`, optional) - Callback invoked after write

**Log Object Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `level` | `number` | Pino numeric level (10-60) |
| `time` | `number` | Unix timestamp in milliseconds |
| `msg` | `string` | Log message |
| `err` | `object` | Error object with `type`, `message`, `stack` |
| `pid` | `number` | Process ID |
| `hostname` | `string` | Host name |
| `httpRequest` | `HttpRequest` | HTTP request details |
| `labels` | `Record<string, string>` | Entry-specific labels |
| `[LOGGING_TRACE_KEY]` | `string` | Trace resource name |
| `[LOGGING_SPAN_KEY]` | `string` | Span ID |
| `[LOGGING_SAMPLED_KEY]` | `boolean` | Trace sampling flag |

#### `writeRequestLog(httpRequest, trace?, spanId?, traceSampled?, latencyMs?)`

```typescript
async writeRequestLog(
  httpRequest: HttpRequest,
  trace?: string,
  spanId?: string,
  traceSampled?: boolean,
  latencyMs?: number
): Promise<void>
```

Writes an HTTP request log entry. Used internally by the Express middleware.

---

## Middleware

### `makeMiddleware(logger, options?)`

Creates Express middleware for request correlation.

```typescript
import { makeMiddleware } from 'pino-cloud-logging/middleware';

app.use(makeMiddleware(logger, options));
```

**Parameters:**

- `logger` (`Logger`) - Pino logger instance
- `options` (`MiddlewareOptions`, optional) - Configuration options

**Options:**

All `TransportOptions` plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `skipParentRequestEntry` | `boolean` | auto | Skip parent request log creation |

**Behavior:**

1. Extracts trace context from `X-Cloud-Trace-Context` header
2. Generates trace/span IDs if not present
3. Attaches child logger to `req.log`
4. Writes parent request log on response finish (unless skipped)

**Request Object Extension:**

```typescript
interface LoggingRequest extends Request {
  log?: Logger;  // Child logger with trace context
}
```

### `makeChildLogger(logger, trace, spanId?, traceSampled?)`

Creates a child logger with trace context bindings.

```typescript
import { makeChildLogger } from 'pino-cloud-logging/middleware';

const childLogger = makeChildLogger(logger, trace, spanId, traceSampled);
```

**Parameters:**

- `logger` (`Logger`) - Parent Pino logger
- `trace` (`string`) - Trace resource name (`projects/{project}/traces/{traceId}`)
- `spanId` (`string`, optional) - Span identifier
- `traceSampled` (`boolean`, optional) - Whether trace is sampled

**Returns:** `Logger` - Child logger with trace bindings

---

## Trace Utilities

### `getCurrentTraceFromAgent()`

```typescript
function getCurrentTraceFromAgent(): string | null
```

Gets the current trace ID from `@google-cloud/trace-agent`.

**Returns:** Trace resource name or `null` if no active trace

**Format:** `projects/{projectId}/traces/{traceId}`

### `getCurrentSpanFromAgent()`

```typescript
function getCurrentSpanFromAgent(): string | null
```

Gets the current span ID from the trace agent.

**Returns:** Span ID string or `null`

### `parseTraceHeader(header, projectId)`

```typescript
function parseTraceHeader(
  header: string,
  projectId: string
): {
  trace: string | null;
  spanId: string | null;
  sampled: boolean;
}
```

Parses the `X-Cloud-Trace-Context` header.

**Header Format:** `TRACE_ID/SPAN_ID;o=TRACE_TRUE`

**Parameters:**

- `header` (`string`) - The header value
- `projectId` (`string`) - GCP project ID for trace resource name

**Returns:** Object with `trace`, `spanId`, and `sampled` properties

---

## Types and Constants

### Constants

```typescript
// Trace metadata keys
const LOGGING_TRACE_KEY = 'logging.googleapis.com/trace';
const LOGGING_SPAN_KEY = 'logging.googleapis.com/spanId';
const LOGGING_SAMPLED_KEY = 'logging.googleapis.com/trace_sampled';

// Pino level values
const PINO_LEVELS = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
};

// Cloud Logging severities
const CLOUD_LOGGING_SEVERITY = {
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

// Level mapping
const PINO_TO_CLOUD_SEVERITY: Record<number, CloudLoggingSeverity> = {
  60: 'CRITICAL',
  50: 'ERROR',
  40: 'WARNING',
  30: 'INFO',
  20: 'DEBUG',
  10: 'DEBUG',
};
```

### Type Definitions

#### `TransportOptions`

```typescript
interface TransportOptions {
  logName?: string;
  projectId?: string;
  credentials?: {
    client_email?: string;
    private_key?: string;
  };
  keyFilename?: string;
  resource?: MonitoredResource;
  serviceContext?: ServiceContext;
  labels?: Record<string, string>;
  prefix?: string;
  redirectToStdout?: boolean;
  useMessageField?: boolean;
  maxEntrySize?: number;
  defaultCallback?: Callback;
}
```

#### `ServiceContext`

```typescript
interface ServiceContext {
  service?: string;
  version?: string;
}
```

#### `HttpRequest`

```typescript
// From @google-cloud/logging
interface HttpRequest {
  requestMethod?: string;
  requestUrl?: string;
  requestSize?: number;
  status?: number;
  responseSize?: number;
  userAgent?: string;
  remoteIp?: string;
  serverIp?: string;
  referer?: string;
  latency?: { seconds?: number; nanos?: number };
  cacheLookup?: boolean;
  cacheHit?: boolean;
  cacheValidatedWithOriginServer?: boolean;
  cacheFillBytes?: number;
  protocol?: string;
}
```

#### `PinoLogObject`

```typescript
interface PinoLogObject {
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
```

#### `CloudLogEntry`

```typescript
interface CloudLogEntry {
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
```

#### `Callback`

```typescript
type Callback = (err: Error | null, response?: object) => void;
```

#### `MiddlewareOptions`

```typescript
interface MiddlewareOptions extends TransportOptions {
  skipParentRequestEntry?: boolean;
}
```

#### `LoggingRequest`

```typescript
interface LoggingRequest extends Request {
  log?: Logger;
}
```

---

## Error Handling

### Transport Errors

Transport errors are logged to stderr and do not throw:

```typescript
// In transport.ts
try {
  await loggingCommon.writeLog(logObject);
} catch (err) {
  console.error('pino-cloud-logging transport error:', err);
}
```

### Callback Pattern

Both per-call and default callbacks are supported:

```typescript
const common = new LoggingCommon({
  defaultCallback: (err) => {
    if (err) console.error('Logging failed:', err);
  }
});

await common.writeLog(logObject, (err) => {
  // Per-call callback
});
```

### Middleware Error Handling

Request log write failures are caught and logged:

```typescript
loggingCommon.writeRequestLog(...)
  .catch((err) => {
    console.error('pino-cloud-logging: Failed to write request log:', err);
  });
```

---

## Internal Architecture

### Log Processing Pipeline

1. **Pino** serializes log to JSON
2. **Worker thread** receives JSON via stream
3. **pino-abstract-transport** parses JSON to object
4. **LoggingCommon.writeLog()** transforms to Cloud Logging format:
   - Maps level to severity
   - Formats message with prefix and error stack
   - Extracts trace context
   - Builds metadata (excluding special fields)
   - Constructs log entry
5. **Cloud Logging client** writes entry (API or stdout)

### Metadata Elevation

Special fields are "elevated" from the JSON payload to entry metadata:

| Field | Elevated To |
|-------|-------------|
| `level` | `severity` |
| `time` | `timestamp` |
| `httpRequest` | `httpRequest` |
| `labels` | `labels` |
| `[LOGGING_TRACE_KEY]` | `trace` |
| `[LOGGING_SPAN_KEY]` | `spanId` |
| `[LOGGING_SAMPLED_KEY]` | `traceSampled` |

All other fields remain in the JSON payload.

### Error Reporting Integration

When all conditions are met:

1. `serviceContext` is configured
2. Severity is ERROR or CRITICAL
3. `err.stack` is present

The entry includes:

```json
{
  "@type": "type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent",
  "serviceContext": { "service": "...", "version": "..." }
}
```

This enables automatic Error Reporting integration.
