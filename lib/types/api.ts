/**
 * API types
 * Request/response interfaces and search-related types
 */

import { Course, Insights } from './domain';

export interface SearchResult {
  course?: Course;
  insights?: Insights;
  loading: boolean;
  error?: string;
}



