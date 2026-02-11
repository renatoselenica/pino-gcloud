# pino-cloud-logging

Google Cloud Logging transport for [Pino](https://github.com/pinojs/pino).

This package provides seamless integration between Pino and Google Cloud Logging, allowing you to send structured logs directly to Cloud Logging with full support for trace correlation, error reporting, and request bundling.

## Features

- **Pino Transport** - Worker thread-based transport using `pino-abstract-transport`
- **Dual Output Modes** - Direct API calls or stdout for managed environments
- **Level Mapping** - Automatic Pino to Cloud Logging severity conversion
- **Trace Correlation** - Integration with `@google-cloud/trace-agent` and HTTP headers
- **Express Middleware** - Request correlation with automatic trace context
- **Error Reporting** - Google Cloud Error Reporting integration
- **TypeScript** - Full TypeScript support with type definitions

## Installation

```bash
npm install pino-cloud-logging pino
```

## Quick Start

### Basic Usage

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: {
      projectId: 'your-gcp-project-id',
      logName: 'my-application'
    }
  }
});

logger.info('Hello from Pino!');
logger.error({ err: new Error('Something went wrong') }, 'An error occurred');
```

### Stdout Mode (Cloud Run, Cloud Functions, GKE)

For managed environments that have a logging agent, use stdout mode:

```typescript
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: {
      redirectToStdout: true
    }
  }
});
```

### With Express Middleware

```typescript
import express from 'express';
import pino from 'pino';
import { makeMiddleware } from 'pino-cloud-logging/middleware';

const app = express();

const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: {
      projectId: 'your-gcp-project-id',
      logName: 'my-application'
    }
  }
});

// Add middleware for request correlation
app.use(makeMiddleware(logger, {
  projectId: 'your-gcp-project-id',
  logName: 'my-application'
}));

app.get('/', (req, res) => {
  // req.log is a child logger with trace context
  req.log?.info('Handling request');
  res.send('Hello!');
});

app.listen(3000);
```

## Configuration

### Transport Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `logName` | `string` | `'pino_log'` | Name of the log in Cloud Logging |
| `projectId` | `string` | auto-detected | Google Cloud project ID |
| `credentials` | `object` | - | Service account credentials |
| `keyFilename` | `string` | - | Path to service account key file |
| `resource` | `MonitoredResource` | auto-detected | GCP monitored resource |
| `serviceContext` | `ServiceContext` | - | Service context for Error Reporting |
| `labels` | `Record<string, string>` | - | Custom labels for all log entries |
| `prefix` | `string` | - | Prefix for all log messages |
| `redirectToStdout` | `boolean` | `false` | Output to stdout instead of API |
| `useMessageField` | `boolean` | `true` | Use 'message' field for log text |
| `maxEntrySize` | `number` | `250000` | Maximum entry size in bytes |
| `defaultCallback` | `Callback` | - | Default callback for all operations |

### Middleware Options

All transport options plus:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `skipParentRequestEntry` | `boolean` | auto-detected | Skip creating parent request log |

## Level Mapping

Pino log levels are automatically mapped to Cloud Logging severity:

| Pino Level | Numeric | Cloud Logging Severity |
|------------|---------|------------------------|
| `fatal` | 60 | CRITICAL |
| `error` | 50 | ERROR |
| `warn` | 40 | WARNING |
| `info` | 30 | INFO |
| `debug` | 20 | DEBUG |
| `trace` | 10 | DEBUG |

## Trace Correlation

### Automatic Trace Agent Integration

If you're using `@google-cloud/trace-agent`, trace context is automatically extracted:

```typescript
import * as traceAgent from '@google-cloud/trace-agent';
traceAgent.start();

import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: { projectId: 'your-project' }
  }
});

// Trace context is automatically included
logger.info('This log will be correlated with the active trace');
```

### Manual Trace Context

You can manually add trace context to logs:

```typescript
import { LOGGING_TRACE_KEY, LOGGING_SPAN_KEY, LOGGING_SAMPLED_KEY } from 'pino-cloud-logging';

logger.info({
  [LOGGING_TRACE_KEY]: 'projects/your-project/traces/abc123',
  [LOGGING_SPAN_KEY]: '456',
  [LOGGING_SAMPLED_KEY]: true
}, 'Log with trace context');
```

### HTTP Header Parsing

The middleware automatically parses the `X-Cloud-Trace-Context` header:

```
X-Cloud-Trace-Context: TRACE_ID/SPAN_ID;o=TRACE_TRUE
```

## Express Middleware

The middleware provides:

1. **Trace Context Extraction** - Parses `X-Cloud-Trace-Context` header or generates new trace
2. **Child Logger** - Attaches `req.log` with trace context bindings
3. **Request Log Entry** - Creates parent request log for correlation in Cloud Logging UI

### Request Correlation in Cloud Logging

When using the middleware in non-managed environments, the package creates two types of log entries:

1. **Request Log** (`{logName}_reqlog`) - Parent entry with HTTP request details
2. **Application Logs** (`{logName}`) - Child entries with your log messages

These are automatically correlated in the Cloud Logging UI using the trace ID.

### TypeScript Support

```typescript
import { LoggingRequest } from 'pino-cloud-logging/middleware';

app.get('/', (req: LoggingRequest, res) => {
  req.log?.info('TypeScript-friendly logging');
  res.send('OK');
});
```

## Error Reporting Integration

To enable Google Cloud Error Reporting, provide a `serviceContext`:

```typescript
const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: {
      projectId: 'your-project',
      serviceContext: {
        service: 'my-service',
        version: '1.0.0'
      }
    }
  }
});

// Errors with stack traces will appear in Error Reporting
logger.error({ err: new Error('Something failed') }, 'Operation failed');
```

## Structured Logging

Pino's structured logging maps naturally to Cloud Logging's JSON payload:

```typescript
logger.info({
  userId: '12345',
  action: 'purchase',
  amount: 99.99,
  labels: {
    environment: 'production',
    region: 'us-central1'
  }
}, 'User made a purchase');
```

### HTTP Request Metadata

Include HTTP request details for enhanced Cloud Logging UI:

```typescript
logger.info({
  httpRequest: {
    requestMethod: 'GET',
    requestUrl: '/api/users',
    status: 200,
    latency: { seconds: 0, nanos: 150000000 },
    userAgent: 'Mozilla/5.0...',
    remoteIp: '192.168.1.1'
  }
}, 'Request completed');
```

## Advanced Usage

### Child Loggers with Trace Context

```typescript
import { makeChildLogger } from 'pino-cloud-logging/middleware';

const childLogger = makeChildLogger(
  logger,
  'projects/your-project/traces/abc123',
  '456',  // spanId
  true    // traceSampled
);

childLogger.info('All logs from this logger include trace context');
```

### Custom Level Mappings

The transport uses Pino's numeric levels. If you've customized levels:

```typescript
const logger = pino({
  customLevels: {
    audit: 35  // Between info (30) and warn (40)
  },
  transport: {
    target: 'pino-cloud-logging',
    options: { projectId: 'your-project' }
  }
});

// 'audit' level (35) maps to INFO severity in Cloud Logging
logger.audit('User logged in');
```

### Multiple Transports

Use Pino's multi-transport feature:

```typescript
const logger = pino({
  transport: {
    targets: [
      {
        target: 'pino-cloud-logging',
        options: { projectId: 'your-project' },
        level: 'info'
      },
      {
        target: 'pino-pretty',
        options: { colorize: true },
        level: 'debug'
      }
    ]
  }
});
```

## Environment Detection

The middleware automatically detects managed GCP environments:

- **App Engine** - `GAE_SERVICE` environment variable
- **Cloud Run** - `K_SERVICE` environment variable
- **Cloud Functions** - `FUNCTION_NAME` or `K_REVISION` environment variable

In these environments, the logging agent creates request logs automatically, so `skipParentRequestEntry` defaults to `true`.

## Authentication

### Default Credentials

On GCP, credentials are automatically detected from the environment:

```typescript
const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: {
      projectId: 'your-project'
      // Credentials auto-detected
    }
  }
});
```

### Service Account Key File

```typescript
const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: {
      projectId: 'your-project',
      keyFilename: '/path/to/service-account.json'
    }
  }
});
```

### Explicit Credentials

```typescript
const logger = pino({
  transport: {
    target: 'pino-cloud-logging',
    options: {
      projectId: 'your-project',
      credentials: {
        client_email: 'service-account@project.iam.gserviceaccount.com',
        private_key: '-----BEGIN PRIVATE KEY-----\n...'
      }
    }
  }
});
```

## API Reference

### Exports from `pino-cloud-logging`

```typescript
// Default export - transport factory
export default function createTransport(options?: TransportOptions): Promise<Transform>;

// Named exports
export { createTransport };
export { LoggingCommon };
export { getCurrentTraceFromAgent, getCurrentSpanFromAgent, parseTraceHeader };
export {
  LOGGING_TRACE_KEY,
  LOGGING_SPAN_KEY,
  LOGGING_SAMPLED_KEY,
  PINO_LEVELS,
  CLOUD_LOGGING_SEVERITY,
  PINO_TO_CLOUD_SEVERITY
};

// Types
export type {
  TransportOptions,
  ServiceContext,
  MonitoredResource,
  HttpRequest,
  Callback,
  PinoLogObject,
  CloudLogEntry,
  CloudLoggingSeverity
};
```

### Exports from `pino-cloud-logging/middleware`

```typescript
export { makeMiddleware };
export { makeChildLogger };

// Types
export type { MiddlewareOptions, LoggingRequest };
```

## Comparison with Winston Integration

This package is modeled after `@google-cloud/nodejs-logging-winston` but adapted for Pino's architecture:

| Feature | Winston Package | This Package |
|---------|-----------------|--------------|
| Transport Model | Same-process | Worker thread |
| Log Format | Object metadata | JSON-first |
| Request Bundling | Express middleware | Express middleware |
| Trace Correlation | Dynamic getters | Log bindings |
| Async Handling | Callbacks | Promises |

## License

Apache-2.0

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.
