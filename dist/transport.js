"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createTransport;
exports.createTransport = createTransport;
const pino_abstract_transport_1 = __importDefault(require("pino-abstract-transport"));
const common_js_1 = require("./common.js");
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
async function createTransport(options = {}) {
    const loggingCommon = new common_js_1.LoggingCommon(options);
    return (0, pino_abstract_transport_1.default)(async function (source) {
        for await (const obj of source) {
            try {
                // obj is already parsed JSON from Pino
                const logObject = obj;
                await loggingCommon.writeLog(logObject);
            }
            catch (err) {
                // Log transport errors to stderr to avoid losing them
                console.error('pino-cloud-logging transport error:', err);
            }
        }
    }, {
        // Don't parse - pino-abstract-transport will give us parsed objects
        async close() {
            // Nothing to clean up - Cloud Logging client handles its own cleanup
        },
    });
}
//# sourceMappingURL=transport.js.map