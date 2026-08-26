export declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR",
    FATAL = "FATAL"
}
export interface StructuredLog {
    timestamp: string;
    level: LogLevel;
    service: string;
    message: string;
    requestId?: string;
    traceId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}
export declare class Logger {
    private readonly service;
    constructor(service: string);
    private sanitize;
    private write;
    debug(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    error(message: string, err?: Error, meta?: Record<string, any>): void;
    fatal(message: string, err?: Error, meta?: Record<string, any>): void;
}
