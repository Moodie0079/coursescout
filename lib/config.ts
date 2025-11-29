/**
 * Application configuration
 * Centralized environment variable access and validation
 */

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY,
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
} as const;

/**
 * Validate required configuration on startup
 */
export function validateConfig(): void {
  if (!config.database.url) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (!config.openai.enabled) {
    console.warn('WARNING: OPENAI_API_KEY is not set. AI analysis will be disabled.');
  }
}



