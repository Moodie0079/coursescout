/**
 * Next.js Instrumentation File
 * This file runs once when the server starts (in both dev and production)
 * Perfect for startup validation and initialization
 */

export async function register() {
  // Only run on server, not in edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateConfig } = await import('./lib/config');
    
    // Validate environment variables on startup
    try {
      validateConfig();
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      // In production, exit the process if config is invalid
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}

