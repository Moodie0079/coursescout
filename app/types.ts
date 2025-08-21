// Core data types for CourseScout application

export interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  rateLimitHits: number;
  coolingUntil?: number;
  currentCooldownMinutes?: number;
  isActive: boolean;
  remainingSeconds?: number;
}

export interface Quote {
  text: string;
  sourceTitle: string;
  subredditOrSite: string;
  url: string;
  postedAt: string; // ISO date string
  score?: number;
}

export interface Coverage {
  threadsConsidered: number;
  threadsUsed: number;
  timeWindow: string;
}

export interface Insights {
  summary: string; // AI-generated narrative summary
  pros: Array<{
    text: string;
    citations: string[]; // Comment IDs that support this pro
  }>;
  cons: Array<{
    text: string;
    citations: string[]; // Comment IDs that support this con
  }>;
  difficulty: {
    score: number; // 1-10
    reason: string;
  };
  workload: {
    score: number; // 1-10
    reason: string;
  };
  professors?: Array<{
    name: string;
    mentions: number;
    sentiment: 'positive' | 'negative' | 'mixed';
    feedback: string;
    citations: string[]; // Comment IDs that mention this professor
    rateMyProfData?: {
      id: string;
      legacyId?: number;
      name: string;
      school: string;
      department: string;
      avgRating: number;
      numRatings: number;
      avgDifficulty: number;
      wouldTakeAgainPercent: number;
      topTags: string[];
      recentComments: Array<{
        comment: string;
        rating: number;
        difficulty: number;
        date: string;
        course: string;
      }>;
    } | null;
  }>;
  quotes: Array<{
    text: string;
    commentId: string;
    permalink: string;
    subreddit: string;
    date: string;
    score: number;
  }>;
  citations: Array<{
    id: string;
    permalink: string;
    text: string;
    author: string;
    date: string;
    score: number;
  }>;
  threadSources?: Array<{
    id: string;
    title: string;
    permalink: string;
    subreddit: string;
    score: number;
    comments: number;
    date: string;
  }>;
  prerequisites?: Array<{
    text: string;
  }>;
  expectations?: Array<{
    text: string;
  }>;
  studentBenefits?: Array<{
    text: string;
  }>;
  commonConcerns?: Array<{
    text: string;
  }>;
  confidence: number; // 0-1
  coverage: {
    threadsConsidered: number;
    threadsUsed: number;
    commentsConsidered: number;
    relevantCommentsUsed: number;
    timeWindow: string;
    subredditsSearched: string[];
    earliestPostDate: string | null;
    latestPostDate: string | null;
  };
}

export interface Course {
  code: string;
  title: string;
  description?: string;
  catalogLink?: string;
}

export interface Professor {
  name: string;
  department?: string;
  title?: string;
}

export interface SearchFilters {
  timeWindow: 'past-year' | '2-years' | 'all';
  showQuotes: boolean;
  school?: string;
}

export interface SearchResult {
  course?: Course;
  professor?: Professor;
  insights?: Insights;
  loading: boolean;
  error?: string;
  circuitBreakerStatus?: CircuitBreakerStatus;
}

// Reddit API types
export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  subreddit: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
}

export interface RedditComment {
  id: string;
  body: string;
  author: string;
  created_utc: number;
  score: number;
  permalink: string;
  replies?: RedditComment[];
}

export interface RedditThread {
  post: RedditPost;
  comments: RedditComment[];
}

export interface RedditSearchResult {
  threads: RedditThread[];
  circuitBreakerStatus: CircuitBreakerStatus;
}

export interface ProcessedContent {
  thread: RedditThread;
  relevanceScore: number;
  courseMatch: boolean;
  professorMatch: boolean;
  carletonMatch: boolean;
  extractedThemes: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface SearchQuery {
  course?: string;
  professor?: string;
  timeWindow: SearchFilters['timeWindow'];
  school: SearchFilters['school'];
}
