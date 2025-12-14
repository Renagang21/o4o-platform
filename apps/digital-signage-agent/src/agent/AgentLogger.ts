/**
 * Agent Logger
 *
 * Minimal logging for the Device Agent
 * Phase 7: Device Agent
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class AgentLogger {
  private level: LogLevel;
  private prefix: string;

  constructor(level: LogLevel = 'info', prefix: string = '[Agent]') {
    this.level = level;
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp} ${levelStr} ${this.prefix} ${message}${dataStr}`;
  }

  debug(message: string, data?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, data?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, data));
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}
