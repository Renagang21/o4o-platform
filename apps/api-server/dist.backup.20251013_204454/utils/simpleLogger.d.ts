interface LogMeta {
    [key: string]: any;
}
declare class SimpleLogger {
    private isDevelopment;
    private formatMessage;
    private log;
    error(message: string, meta?: LogMeta): void;
    warn(message: string, meta?: LogMeta): void;
    info(message: string, meta?: LogMeta): void;
    debug(message: string, meta?: LogMeta): void;
    http(message: string, meta?: LogMeta): void;
}
declare const logger: SimpleLogger;
export declare const stream: {
    write: (message: string) => void;
};
export default logger;
//# sourceMappingURL=simpleLogger.d.ts.map