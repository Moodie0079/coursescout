/**
 * Application constants
 * Centralized configuration values and magic strings
 */

// Course code validation
export const COURSE_CODE_PATTERN = /^[A-Z]{4}\s[0-9]{4}$/;

// Database query limits
export const MAX_THREADS = 1000;
export const MAX_COMMENTS_PER_POST = 500;
export const MAX_CONTENT_FOR_AI = 2000;

// Text truncation limits
export const MAX_TEXT_LENGTH_FOR_AI = 800;

// AI processing
export const AI_MODEL = 'gpt-4o-mini';
export const AI_TEMPERATURE = 0.3;
export const AI_MAX_TOKENS = 1800; // Based on observed actual usage of ~1500 tokens

// Loading phases
export const LOADING_PHASE_TIMES = {
  SEARCHING: 5,
  PROCESSING: 15,
} as const;

// Crawling & rate limiting
export const BULK_CRAWL_BATCH_SIZE = 50;
export const CRAWL_RATE_LIMIT_DELAY = 100; // Milliseconds between requests
export const CRAWL_DELAY_BETWEEN_COURSES = 1000; // Milliseconds
export const REDDIT_RATE_LIMIT_QUOTA = 100; // Default Reddit API quota
export const REDDIT_MIN_WAIT_TIME_SECONDS = 30; // Minimum wait when rate limited
export const REDDIT_REQUEST_LIMIT = 1000; // Max items per request
export const REDDIT_SEARCH_PAGE_SIZE = 100; // Results per page
export const REDDIT_MAX_SEARCH_PAGES = 50; // Prevent infinite loops
export const REDDIT_MAX_COMMENT_DEPTH = 10; // Maximum comment nesting

// Bulk crawler
export const BULK_CRAWL_TEST_COUNT = 10; // Number of courses in test mode
export const BULK_CRAWL_PROGRESS_INTERVAL = 10; // Report progress every N courses

// Professor data management
export const PROFESSOR_DATA_STALE_DAYS = 30;
export const RMP_GRAPHQL_ENDPOINT = 'https://www.ratemyprofessors.com/graphql';
export const RMP_SCHOOL_ID = 'U2Nob29sLTE1Mg=='; // Carleton University
export const RMP_SEARCH_RESULT_LIMIT = 10;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  TOO_MANY_REQUESTS: 429,
} as const;

// Input Validation
export const MAX_COURSE_CODE_LENGTH = 100;

// Network Timeouts (milliseconds)
// Frontend: Only timeout to catch true network failures (not legitimate slow AI processing)
export const FETCH_TIMEOUT_MS = 120000; // 2 minutes - only catches true hangs, not slow OpenAI
export const RMP_FETCH_TIMEOUT_MS = 10000; // 10 seconds for RateMyProfessors API



