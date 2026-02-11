import build from 'pino-abstract-transport';
import type { TransportOptions } from './types.js';
/**
 * Create a Pino transport that sends logs to Google Cloud Logging.
 *
 * @example
 * ```typescript
 * import pino from 'pino';
 *
 * const logger = pino({
 *   transport: {
 *     target: 'pino-cloud-logging',
 *     options: {
 *       projectId: 'my-project',
 *       logName: 'my-app'
 *     }
 *   }
 * });
 *
 * logger.info('Hello from Pino!');
 * ```
 */
export default function createTransport(options?: TransportOptions): Promise<import("stream").Transform & build.OnUnknown>;
export { createTransport };
//# sourceMappingURL=transport.d.ts.map