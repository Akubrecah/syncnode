export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
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

export class Logger {
  constructor(private readonly service: string) {}

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const sensitiveKeys = ['password', 'secret', 'totp', 'token', 'privateKey', 'seed', 'apiKey'];
    const cleaned: Record<string, any> = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
        cleaned[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        cleaned[key] = this.sanitize(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  private write(level: LogLevel, message: string, meta?: Record<string, any>, err?: Error): void {
    const log: StructuredLog = {
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
    } else if (level === LogLevel.WARN) {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  public debug(message: string, meta?: Record<string, any>): void {
    this.write(LogLevel.DEBUG, message, meta);
  }

  public info(message: string, meta?: Record<string, any>): void {
    this.write(LogLevel.INFO, message, meta);
  }

  public warn(message: string, meta?: Record<string, any>): void {
    this.write(LogLevel.WARN, message, meta);
  }

  public error(message: string, err?: Error, meta?: Record<string, any>): void {
    this.write(LogLevel.ERROR, message, meta, err);
  }

  public fatal(message: string, err?: Error, meta?: Record<string, any>): void {
    this.write(LogLevel.FATAL, message, meta, err);
  }
}
