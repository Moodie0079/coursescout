/**
 * Custom error classes
 * Structured error handling for the application
 */

export class DatabaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class AIProcessingError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'AIProcessingError';
  }
}

export class NoDiscussionsFoundError extends Error {
  constructor(courseCode: string) {
    super(`No discussions found for ${courseCode}. This course may be new, rarely discussed, or hasn't been crawled yet.`);
    this.name = 'NoDiscussionsFoundError';
  }
}



