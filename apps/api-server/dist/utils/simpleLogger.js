"use strict";
// Simple logger implementation without external dependencies
// Will be replaced with winston when installed
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["ERROR"] = "ERROR";
    LogLevel["WARN"] = "WARN";
    LogLevel["INFO"] = "INFO";
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["HTTP"] = "HTTP";
})(LogLevel || (LogLevel = {}));
class SimpleLogger {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }
    log(level, message, meta) {
        const formattedMessage = this.formatMessage(level, message, meta);
        switch (level) {
            case LogLevel.ERROR:
                console.error(formattedMessage);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage);
                break;
            case LogLevel.DEBUG:
                if (this.isDevelopment) {
                    console.debug(formattedMessage);
                }
                break;
            default:
            // console.log(formattedMessage);
        }
    }
    error(message, meta) {
        this.log(LogLevel.ERROR, message, meta);
    }
    warn(message, meta) {
        this.log(LogLevel.WARN, message, meta);
    }
    info(message, meta) {
        this.log(LogLevel.INFO, message, meta);
    }
    debug(message, meta) {
        this.log(LogLevel.DEBUG, message, meta);
    }
    http(message, meta) {
        this.log(LogLevel.HTTP, message, meta);
    }
}
// Create singleton instance
const logger = new SimpleLogger();
// HTTP stream for morgan
exports.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};
// Export logger instance
exports.default = logger;
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${(reason === null || reason === void 0 ? void 0 : reason.message) || reason}`);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught Exception: ${error.message}`);
    // Give time to log before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});
//# sourceMappingURL=simpleLogger.js.map