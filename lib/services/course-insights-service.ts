/**
 * Course Insights Service
 * Business logic for fetching and analyzing course insights
 */

import { Course, Insights, SearchResult } from '../types';
import { dbRedditAPI } from '../db-reddit-api';
import { aiProcessor } from '../ai-processor';
import { professorService } from './professor-service';
import { insightsCacheService } from './insights-cache-service';
import { logger } from '../logger';
import { config } from '../config';
import { NoDiscussionsFoundError, AIProcessingError } from '../errors';
import { prisma } from '../prisma';

export class CourseInsightsService {
  /**
   * Get comprehensive insights for a course
   */
  async getInsights(courseCode: string): Promise<SearchResult> {
    const totalStart = Date.now();
    logger.info(`\n=== Analyzing course: ${courseCode} ===`);

    // Check if OpenAI API key is configured
    if (!config.openai.enabled) {
      logger.warn('OpenAI API key not configured');
      return {
        course: this.createBasicCourseInfo(courseCode),
        insights: undefined,
        loading: false,
        error: 'AI analysis is not configured. Please set OPENAI_API_KEY environment variable.',
      };
    }

    try {
      // Check cache first
      const cachedInsights = await insightsCacheService.get(courseCode);
      if (cachedInsights) {
        const totalTime = Date.now() - totalStart;
        logger.info(`Returning cached insights for ${courseCode} (${totalTime}ms)`);
        return {
          course: this.createBasicCourseInfo(courseCode),
          insights: cachedInsights,
          loading: false,
        };
      }

      // Cache miss - continue with normal flow
      logger.info(`Cache miss for ${courseCode} - performing full analysis`);
      
      // Search for Reddit discussions in database
      const dbStart = Date.now();
      const searchResult = await dbRedditAPI.searchCourseDiscussions(courseCode);
      const dbTime = Date.now() - dbStart;
      logger.info(`[1/3] Database search (${dbTime}ms) - Found ${searchResult.threads.length} discussions`);

      // Check if no discussions were found
      if (searchResult.threads.length === 0) {
        throw new NoDiscussionsFoundError(courseCode);
      }

      // Check if course exists but has no actual data (edge case from secondary mentions)
      const courseData = await prisma.course.findUnique({
        where: { courseCode: courseCode.toUpperCase() }
      });
      
      if (courseData && courseData.totalPosts === 0 && courseData.totalComments === 0) {
        throw new NoDiscussionsFoundError(courseCode);
      }

      // Use AI to analyze the threads from database
      logger.info(`[2/3] AI analysis starting...`);
      const aiStart = Date.now();
      const insights = await aiProcessor.processThreads(
        searchResult.threads,
        courseCode
      );
      const aiTime = Date.now() - aiStart;

      if (!insights) {
        throw new AIProcessingError('AI analysis failed or found no relevant content');
      }

      logger.info(`[2/3] AI analysis complete (${aiTime}ms)`);

      // Fetch RateMyProfessors data for mentioned professors
      if (insights.professors && insights.professors.length > 0) {
        logger.info(`[3/3] Fetching professor ratings (${insights.professors.length} professors)...`);
        const profStart = Date.now();
        await this.enrichWithRateMyProfData(insights);
        const profTime = Date.now() - profStart;
        logger.info(`[3/3] Professor data complete (${profTime}ms)`);
      }

      // Cache the insights for future requests (fire-and-forget for better UX)
      insightsCacheService.set(courseCode, insights).catch((err) => {
        logger.error('Failed to cache insights', err, { courseCode });
      });

      const totalTime = Date.now() - totalStart;
      logger.info(`=== Analysis complete: ${totalTime}ms total ===\n`);

      return {
        course: this.createBasicCourseInfo(courseCode),
        insights,
        loading: false,
      };
    } catch (error) {
      return this.handleError(error, courseCode);
    }
  }

  /**
   * Enrich insights with RateMyProfessors data from database
   */
  private async enrichWithRateMyProfData(insights: Insights): Promise<void> {
    if (!insights.professors || insights.professors.length === 0) return;

    // Fetch professor data from database for each mentioned professor
    for (const prof of insights.professors) {
      const profStart = Date.now();
      const professorData = await professorService.getProfessorData(prof.name);
      const profTime = Date.now() - profStart;
      
      if (professorData) {
        const status = professorData.rmpId ? 'found' : 'not on RMP';
        logger.info(`    ${prof.name} - ${profTime}ms (${status})`);
        prof.rateMyProfData = {
          id: professorData.id,
          legacyId: professorData.rmpId ? parseInt(professorData.rmpId, 10) : undefined,
          name: professorData.fullName,
          school: professorData.school,
          department: professorData.department || 'Unknown',
          avgRating: professorData.avgRating || 0,
          numRatings: professorData.numRatings,
          avgDifficulty: professorData.avgDifficulty || 0,
          wouldTakeAgainPercent: professorData.wouldTakeAgain || 0,
          topTags: [],
          recentComments: []
        };
      } else {
        logger.info(`    ${prof.name} - ${profTime}ms (not found)`);
      }
    }
  }

  /**
   * Create basic course info from course code
   */
  private createBasicCourseInfo(courseCode: string): Course {
    return {
      code: courseCode,
      title: courseCode,
      description: `Student insights and discussions for ${courseCode}`,
    };
  }


  /**
   * Handle errors and return appropriate SearchResult
   */
  private handleError(error: unknown, courseCode: string): SearchResult {
    // Log the error appropriately
    if (error instanceof NoDiscussionsFoundError) {
      logger.info('No discussions found in database', { courseCode });
    } else if (error instanceof AIProcessingError) {
      logger.error('AI processing error', error);
    } else {
      logger.error('Unexpected error', error);
    }

    // Return error result
    return {
      course: this.createBasicCourseInfo(courseCode),
      insights: undefined,
      loading: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while analyzing course discussions',
    };
  }
}

export const courseInsightsService = new CourseInsightsService();



