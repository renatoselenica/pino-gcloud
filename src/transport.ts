import build from 'pino-abstract-transport';
import { LoggingCommon } from './common.js';
import type { TransportOptions, PinoLogObject } from './types.js';

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
export default async function createTransport(options: TransportOptions = {}) {
  const loggingCommon = new LoggingCommon(options);

  return build(
    async function (source) {
      for await (const obj of source) {
        try {
          // obj is already parsed JSON from Pino
          const logObject = obj as PinoLogObject;
          await loggingCommon.writeLog(logObject);
        } catch (err) {
          // Log transport errors to stderr to avoid losing them
          console.error('pino-cloud-logging transport error:', err);
        }
      }
    },
    {
      // Don't parse - pino-abstract-transport will give us parsed objects
      async close() {
        // Nothing to clean up - Cloud Logging client handles its own cleanup
      },
    }
  );
}

export { createTransport };
