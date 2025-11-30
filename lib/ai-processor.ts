/**
 * AI Processor
 * Analyzes Reddit discussions using OpenAI to generate course insights
 */

import OpenAI from 'openai';
import { RedditThread, Insights, AIAnalysisResult, ContentItem, CitationItem } from './types';
import { config } from './config';
import { logger } from './logger';
import { MAX_CONTENT_FOR_AI, MAX_TEXT_LENGTH_FOR_AI, AI_MODEL, AI_TEMPERATURE, AI_MAX_TOKENS } from './constants';
import { AIProcessingError } from './errors';
import { buildCourseAnalysisPrompt, SYSTEM_PROMPT } from './prompts/course-analysis-prompt';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!config.openai.apiKey) {
      throw new AIProcessingError('OpenAI API key is not configured');
    }
    openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }
  return openai;
}

export class AIProcessor {
  async processThreads(
    threads: RedditThread[],
    courseCode: string
  ): Promise<Insights | null> {
    
    if (threads.length === 0) {
      return this.buildEmptyInsights(courseCode);
    }
    
    try {
      const startTime = Date.now();
      
      // Extract relevant content from threads
      const relevantContent = this.extractRelevantContent(threads, courseCode);
      
      // Generate AI analysis
      const { analysis, tokenUsage } = await this.generateAnalysis(relevantContent, courseCode);
      
      const processingTime = Date.now() - startTime;
      
      // Build comprehensive insights
      return this.buildInsights(analysis, threads, courseCode, { tokenUsage, processingTimeMs: processingTime });
      
    } catch (error) {
      logger.error('AI processing failed', error, { courseCode });
      throw new AIProcessingError('Failed to process threads with AI', error);
    }
  }

  private extractRelevantContent(threads: RedditThread[], courseCode: string): ContentItem[] {
    const content: ContentItem[] = [];
    
    for (const thread of threads) {
      // Include ALL post content - let AI filter
      if (thread.post.title || thread.post.selftext) {
        content.push({
          type: 'post',
          text: `${thread.post.title}\n${thread.post.selftext || ''}`,
          score: thread.post.score,
          subreddit: thread.post.subreddit
        });
      }
      
      // Include ALL comments - let AI filter for relevance
      for (const comment of thread.comments) {
        if (comment.body && comment.body.trim()) {
          content.push({
            type: 'comment',
            text: comment.body,
            score: comment.score,
            author: comment.author,
            permalink: comment.permalink
            });
          }
        }
    }
    
    return content.slice(0, MAX_CONTENT_FOR_AI);
  }



  private async generateAnalysis(content: ContentItem[], courseCode: string): Promise<{ analysis: AIAnalysisResult; tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    if (content.length === 0) {
      return { analysis: this.getDefaultAnalysis(courseCode) };
    }

    // Prepare content for AI
    const threadContent = content
      .map((item, index) => `[${index + 1}] ${item.type.toUpperCase()}: ${item.text.slice(0, MAX_TEXT_LENGTH_FOR_AI)}`)
      .join('\n\n');

    const prompt = buildCourseAnalysisPrompt(courseCode, content.length, threadContent);
    
    try {
      const apiStartTime = Date.now();
      const response = await this.callOpenAIWithRetry(courseCode, prompt);
      
      const apiTime = Date.now() - apiStartTime;
      
      // Capture token usage
      let tokenUsage;
      if (response.usage) {
        tokenUsage = {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        };
        
        logger.info('OpenAI token usage', {
          courseCode,
          ...tokenUsage,
          model: AI_MODEL,
          apiTimeMs: apiTime,
          generationSpeed: Math.round(tokenUsage.completionTokens / (apiTime / 1000))
        });
      }
      
      // Parse and validate response
      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        logger.warn('OpenAI returned empty response', { courseCode });
        return { analysis: this.getDefaultAnalysis(courseCode) };
      }

      let analysis: AIAnalysisResult;
      try {
        analysis = JSON.parse(messageContent);
        
        // Basic validation - ensure critical fields exist
        if (!analysis.summary || typeof analysis.difficulty !== 'object' || typeof analysis.workload !== 'object') {
          logger.warn('OpenAI returned incomplete data structure', { courseCode });
          return { analysis: this.getDefaultAnalysis(courseCode) };
        }
      } catch (parseError) {
        logger.error('Failed to parse OpenAI JSON response', parseError, { courseCode });
        return { analysis: this.getDefaultAnalysis(courseCode) };
      }
      
      return {
        analysis,
        tokenUsage
      };
    } catch (error) {
      logger.error('OpenAI API failed after retries', error, { courseCode });
      throw new AIProcessingError('OpenAI API request failed', error);
    }
  }

  /**
   * Call OpenAI with exponential backoff retry logic
   * Handles rate limits (429) and transient errors (500, 503)
   */
  private async callOpenAIWithRetry(
    courseCode: string,
    prompt: string,
    maxRetries = 3
  ): Promise<any> {
    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await getOpenAI().chat.completions.create({
          model: AI_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT(courseCode) },
            { role: "user", content: prompt }
          ],
          temperature: AI_TEMPERATURE,
          max_tokens: AI_MAX_TOKENS,
          response_format: { type: 'json_object' }
        });
        
        return response; // Success!
        
      } catch (error: any) {
        lastError = error;
        
        // Check if error is retryable
        const isRateLimited = error?.status === 429;
        const isServerError = error?.status >= 500 && error?.status < 600;
        const isRetryable = isRateLimited || isServerError;
        
        // If not retryable or last attempt, throw immediately
        if (!isRetryable || attempt === maxRetries - 1) {
          throw error;
        }
        
        // Calculate exponential backoff delay: 1s, 2s, 4s
        const baseDelay = 1000;
        const delay = baseDelay * Math.pow(2, attempt);
        
        logger.warn('OpenAI request failed, retrying...', {
          courseCode,
          attempt: attempt + 1,
          maxRetries,
          status: error?.status,
          delayMs: delay
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError;
  }

  private buildInsights(analysis: AIAnalysisResult, threads: RedditThread[], courseCode: string, metadata?: { tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number }; processingTimeMs?: number }): Insights {
    const validThreads = threads.filter(t => t.post);
    const totalComments = threads.reduce((sum, t) => sum + (t.comments?.length || 0), 0);
    
    // Calculate threads that actually contributed content to AI analysis
    const threadsWithUsefulContent = threads.filter(thread => {
      // Check if post contributed content
      const postContributed = thread.post && (thread.post.title || thread.post.selftext);
      
      // Check if any comments contributed content  
      const commentsContributed = thread.comments && thread.comments.some(comment => 
        comment.body && comment.body.trim() && comment.body.length > 0
      );
      
      return postContributed || commentsContributed;
    });
    
    // Generate comprehensive citations from actual comments
    const actualCitations: CitationItem[] = [];
    threads.forEach(thread => {
      thread.comments?.forEach(comment => {
        if (comment.body && comment.body.length > 20) {
          // Use the comment's own permalink if available, otherwise construct one
          let commentPermalink;
          if (comment.permalink) {
            commentPermalink = comment.permalink.startsWith('http') 
              ? comment.permalink 
              : `https://reddit.com${comment.permalink}`;
          } else {
            // Construct permalink: post permalink + comment ID
            const postPermalink = thread.post.permalink || thread.post.url;
            commentPermalink = `https://reddit.com${postPermalink}${comment.id}/`;
          }
          
          actualCitations.push({
            id: comment.id,
            text: comment.body.slice(0, 200),
            author: comment.author,
            score: comment.score || 0,
            permalink: commentPermalink,
            date: new Date(comment.created_utc * 1000).toISOString().split('T')[0]
          });
        }
      });
    });
    
    // Sort citations by score and relevance
    const topCitations = actualCitations
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
        
        return {
      summary: analysis.summary || `Comprehensive analysis of ${courseCode} based on ${validThreads.length} Reddit discussions with ${totalComments} student comments.`,
      
      difficulty: {
        score: analysis.difficulty?.score !== null && analysis.difficulty?.score !== undefined 
          ? Math.min(10, Math.max(1, analysis.difficulty.score))
          : null,
        reason: (analysis.difficulty?.score === null || analysis.difficulty?.score === undefined)
          ? `Insufficient data to determine difficulty level for ${courseCode}.`
          : (analysis.difficulty?.reason || "Difficulty assessment based on student discussions")
      },
      
      workload: {
        score: analysis.workload?.score !== null && analysis.workload?.score !== undefined
          ? Math.min(10, Math.max(1, analysis.workload.score))
          : null,
        reason: (analysis.workload?.score === null || analysis.workload?.score === undefined)
          ? `Insufficient data to determine workload for ${courseCode}.`
          : (analysis.workload?.reason || "Workload assessment based on student experiences")
      },
      
      pros: (analysis.pros || []).slice(0, 5).map((pro, index) => ({
        text: typeof pro === 'string' ? pro : pro.text,
        citations: topCitations.slice(index * 2, (index * 2) + 2).map(c => c.id)
      })),
      
      cons: (analysis.cons || []).slice(0, 5).map((con, index) => ({
        text: typeof con === 'string' ? con : con.text,
        citations: topCitations.slice((index + 5) * 2, ((index + 5) * 2) + 2).map(c => c.id)
      })),
      
      professors: (analysis.professors || [])
        .filter((prof) => {
          // Filter out generic/unknown professor names
          const name = prof.name?.toLowerCase() || '';
          return name && 
                 !name.includes('unknown') && 
                 !name.includes('professor') && 
                 !name.includes('instructor') &&
                 !name.includes('teacher') &&
                 !name.includes('prof') &&
                 name.length > 3 &&
                 name.split(' ').length >= 2;
        })
        .map((prof) => ({
          name: prof.name,
          sentiment: prof.sentiment || 'mixed',
          mentions: prof.mentions || 1,
          feedback: prof.feedback || '',
          citations: topCitations.slice(0, 3).map(c => c.id),
          rateMyProfData: null
        })),
      
      prerequisites: (analysis.prerequisites || []).slice(0, 4).map((prereq) => ({
        text: typeof prereq === 'string' ? prereq : prereq.text
      })),
      
      expectations: (analysis.expectations || []).slice(0, 4).map((expect) => ({
        text: typeof expect === 'string' ? expect : expect.text
      })),
      
      studentBenefits: (analysis.studentBenefits || []).slice(0, 5).map((benefit) => ({
        text: typeof benefit === 'string' ? benefit : benefit.text
      })),
      
      commonConcerns: (analysis.commonConcerns || []).slice(0, 5).map((concern) => ({
        text: typeof concern === 'string' ? concern : concern.text
      })),
      
      quotes: (analysis.quotes || []).slice(0, 8).map((quote, index) => ({
        text: quote.text,
        commentId: topCitations[index]?.id || `quote_${index}`,
        permalink: topCitations[index]?.permalink || '#',
        subreddit: validThreads[0]?.post.subreddit || 'CarletonU',
        date: topCitations[index]?.date || new Date().toISOString().split('T')[0],
        score: quote.score || topCitations[index]?.score || 0
      })),
      
      citations: topCitations,
      
      threadSources: validThreads.map(thread => ({
        id: thread.post.id,
        title: thread.post.title,
        subreddit: thread.post.subreddit,
        score: thread.post.score,
        comments: thread.post.num_comments,
        permalink: (() => {
          // Use url if it's a full URL, otherwise use permalink
          if (thread.post.url && thread.post.url.startsWith('http')) {
            return thread.post.url;
          }
          const permalink = thread.post.permalink || thread.post.url;
          return permalink.startsWith('http') ? permalink : `https://reddit.com${permalink}`;
        })(),
        date: new Date(thread.post.created_utc * 1000).toISOString().split('T')[0]
      })),
      
      coverage: {
        threadsConsidered: threads.length,
        threadsUsed: threadsWithUsefulContent.length, // Use threads that actually contributed content
        commentsConsidered: totalComments,
        relevantCommentsUsed: totalComments, // Show actual number of comments processed
        subredditsSearched: ['CarletonU', 'Carleton'],
        earliestPostDate: validThreads.length > 0 
          ? new Date(Math.min(...validThreads.map(t => t.post.created_utc * 1000))).toISOString().split('T')[0]
          : null,
        latestPostDate: validThreads.length > 0 
          ? new Date(Math.max(...validThreads.map(t => t.post.created_utc * 1000))).toISOString().split('T')[0]
          : null,
      },
      
      confidence: threadsWithUsefulContent.length >= 15 ? 0.9 : threadsWithUsefulContent.length >= 8 ? 0.7 : threadsWithUsefulContent.length >= 3 ? 0.5 : 0.3,
      
      metadata
    };
  }

  private buildEmptyInsights(courseCode: string): Insights {
    return {
      summary: `Insufficient student feedback available for ${courseCode}.`,
      difficulty: { score: null, reason: `Insufficient data to determine difficulty level for ${courseCode}.` },
      workload: { score: null, reason: `Insufficient data to determine workload for ${courseCode}.` },
      pros: [],
      cons: [],
      professors: [],
      quotes: [],
      citations: [],
      threadSources: [],
      prerequisites: [],
      expectations: [],
      studentBenefits: [],
      commonConcerns: [],
      coverage: {
        threadsConsidered: 0,
        threadsUsed: 0,
        commentsConsidered: 0,
        relevantCommentsUsed: 0,
        subredditsSearched: [],
        earliestPostDate: null,
        latestPostDate: null,
      },
      confidence: 0.1
    };
  }

  private getDefaultAnalysis(courseCode: string) {
    return {
      summary: `Insufficient student feedback available for ${courseCode}`,
      difficulty: { score: null, reason: `Insufficient data to determine difficulty level for ${courseCode}.` },
      workload: { score: null, reason: `Insufficient data to determine workload for ${courseCode}.` },
      pros: [],
      cons: [],
      professors: [],
      quotes: [],
      prerequisites: [],
      expectations: [],
      studentBenefits: [],
      commonConcerns: []
    };
  }
}

export const aiProcessor = new AIProcessor();