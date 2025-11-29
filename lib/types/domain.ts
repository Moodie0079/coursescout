/**
 * Domain model types
 * Core business entities and data structures
 */

export interface Course {
  code: string;
  title: string;
  description?: string;
  catalogLink?: string;
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
    score: number | null; // 1-10, or null if insufficient data
    reason: string;
  };
  workload: {
    score: number | null; // 1-10, or null if insufficient data
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
    subredditsSearched: string[];
    earliestPostDate: string | null;
    latestPostDate: string | null;
  };
  metadata?: {
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    processingTimeMs?: number;
  };
}



