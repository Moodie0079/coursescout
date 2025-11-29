/**
 * AI Analysis Types
 * Types for OpenAI analysis results
 */

export interface AIAnalysisResult {
  summary: string;
  difficulty: {
    score: number | null;
    reason: string;
  };
  workload: {
    score: number | null;
    reason: string;
  };
  pros: Array<{ text: string }>;
  cons: Array<{ text: string }>;
  professors?: Array<{
    name: string;
    sentiment: 'positive' | 'negative' | 'mixed';
    mentions: number;
    feedback: string;
  }>;
  prerequisites?: Array<{ text: string }>;
  expectations?: Array<{ text: string }>;
  studentBenefits?: Array<{ text: string }>;
  commonConcerns?: Array<{ text: string }>;
  quotes?: Array<{
    text: string;
    author: string;
    score: number;
    context: string;
  }>;
}

export interface ContentItem {
  type: 'post' | 'comment';
  text: string;
  score: number;
  subreddit?: string;
  author?: string;
  permalink?: string;
}

export interface CitationItem {
  id: string;
  permalink: string;
  text: string;
  author: string;
  date: string;
  score: number;
}

