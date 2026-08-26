"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["FATAL"] = "FATAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    service;
    constructor(service) {
        this.service = service;
    }
    sanitize(obj) {
        if (!obj || typeof obj !== 'object')
            return obj;
        const sensitiveKeys = ['password', 'secret', 'totp', 'token', 'privateKey', 'seed', 'apiKey'];
        const cleaned = Array.isArray(obj) ? [] : {};
        for (const [key, value] of Object.entries(obj)) {
            if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
                cleaned[key] = '[REDACTED]';
            }
            else if (typeof value === 'object') {
                cleaned[key] = this.sanitize(value);
            }
            else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    }
    write(level, message, meta, err) {
        const log = {
            timestamp: new Date().toISOString(),
            level,
            service: this.service,
            message,
            ...(meta ? { metadata: this.sanitize(meta) } : {}),
            ...(err ? { error: { name: err.name, message: err.message, stack: err.stack } } : {})
        };
        const formatted = JSON.stringify(log);
        if (level === LogLevel.ERROR || level === LogLevel.FATAL) {
            console.error(formatted);
        }
        else if (level === LogLevel.WARN) {
            console.warn(formatted);
        }
        else {
            console.log(formatted);
        }
    }
    debug(message, meta) {
        this.write(LogLevel.DEBUG, message, meta);
    }
    info(message, meta) {
        this.write(LogLevel.INFO, message, meta);
    }
    warn(message, meta) {
        this.write(LogLevel.WARN, message, meta);
    }
    error(message, err, meta) {
        this.write(LogLevel.ERROR, message, meta, err);
    }
    fatal(message, err, meta) {
        this.write(LogLevel.FATAL, message, meta, err);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map