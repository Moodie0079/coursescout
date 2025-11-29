/**
 * Logging utility
 * Clean, minimal logging for production readability
 */

import { config } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = config.app.isDevelopment;
  private enableDebug = false; // Set to true only when debugging

  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Only show important logs
    if (level === 'debug' && !this.enableDebug) return;
    
    // Simple, readable format
    const contextStr = context && Object.keys(context).length > 0 
      ? ` | ${Object.entries(context).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}` 
      : '';
    
    const logMessage = `[${level.toUpperCase()}] ${message}${contextStr}`;

    switch (level) {
      case 'debug':
        console.log(logMessage);
        break;
      case 'info':
        console.log(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = error instanceof Error 
      ? { ...context, error: error.message }
      : context;
    this.log('error', message, errorContext);
  }
}

export const logger = new Logger();



