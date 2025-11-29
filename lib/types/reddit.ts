/**
 * Reddit API types
 * Data structures for Reddit posts, comments, and discussions
 */

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



