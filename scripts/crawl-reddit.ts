#!/usr/bin/env node

import { config } from 'dotenv';
config();

import { prisma } from '../lib/prisma';
import {
  CRAWL_RATE_LIMIT_DELAY,
  REDDIT_RATE_LIMIT_QUOTA,
  REDDIT_MIN_WAIT_TIME_SECONDS,
  REDDIT_REQUEST_LIMIT,
  REDDIT_SEARCH_PAGE_SIZE,
  REDDIT_MAX_SEARCH_PAGES,
  REDDIT_MAX_COMMENT_DEPTH
} from '../lib/constants';

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  permalink: string;
  author: string;
}

interface RedditComment {
  id: string;
  body: string;
  score: number;
  created_utc: number;
  author: string;
  permalink?: string;
}

interface RedditThread {
  post: RedditPost;
  comments: RedditComment[];
}

export class SimpleComprehensiveCrawler {
  private rateLimitDelay = CRAWL_RATE_LIMIT_DELAY;
  private remainingRequests = REDDIT_RATE_LIMIT_QUOTA;
  private rateLimitResetTime = 0; // Unix timestamp when quota resets

  /**
   * Check current rate limit status before starting crawling
   */
  async checkInitialRateLimit(): Promise<void> {
    console.log('Checking Reddit rate limit...');
    try {
      // Make a simple test request to get current quota
      const testResponse = await fetch('https://www.reddit.com/r/CarletonU/about.json', {
        headers: {
          'User-Agent': 'CourseScout/1.0.0',
          'Accept': 'application/json'
        }
      });

      // Update our tracking from headers
      const remaining = testResponse.headers.get('x-ratelimit-remaining');
      const reset = testResponse.headers.get('x-ratelimit-reset');
      
      if (remaining) this.remainingRequests = parseFloat(remaining);
      if (reset) this.rateLimitResetTime = Date.now() + (parseInt(reset) * 1000);

      
      if (this.remainingRequests <= 0 && Date.now() < this.rateLimitResetTime) {
        const waitTimeSeconds = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
        console.log(`Rate limited. Waiting ${waitTimeSeconds}s...`);
        await this.delay(waitTimeSeconds * 1000);
        this.remainingRequests = REDDIT_RATE_LIMIT_QUOTA;
        console.log(`Rate limit reset. Ready to crawl.`);
      } else {
        console.log(`Ready to crawl.\n`);
      }
    } catch (error) {
      console.warn('Could not check rate limit, proceeding anyway');
    }
  }
  
  private buildSearchQueries(courseCode: string): string[] {
    const [dept, num] = courseCode.split(' ');
    
    // Simple, comprehensive search for all variations
    return [
      courseCode,                    // "COMP 1005"
      `${dept}${num}`,              // "COMP1005"
      courseCode.toLowerCase(),      // "comp 1005"
      `${dept.toLowerCase()}${num}`, // "comp1005"
    ];
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    // Check if we need to wait for rate limit reset
    await this.checkRateLimit();
    
    const startTime = Date.now();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CourseScout/1.0.0',
        'Accept': 'application/json'
      }
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      // Update our tracking from headers
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      
      if (remaining) this.remainingRequests = parseFloat(remaining);
      if (reset) {
        // Use Reddit's server time for accurate calculations
        const serverTime = response.headers.get('date');
        const baseTime = serverTime ? new Date(serverTime).getTime() : Date.now();
        this.rateLimitResetTime = baseTime + (parseInt(reset) * 1000);
      }
      
      // Only log if remaining requests are getting low
      if (this.remainingRequests <= 10) {
        console.log(`Low quota: ${this.remainingRequests} requests remaining`);
      }
      return response;
    }

    if (response.status === 429 || response.status === 403) {
      // We hit rate limit - update our tracking
      this.remainingRequests = 0;
      const reset = response.headers.get('x-ratelimit-reset');
      if (reset) {
        // Use Reddit's server time if available for more accurate calculations
        const serverTime = response.headers.get('date');
        const baseTime = serverTime ? new Date(serverTime).getTime() : Date.now();
        this.rateLimitResetTime = baseTime + (parseInt(reset) * 1000);
        const waitTimeSeconds = Math.max(REDDIT_MIN_WAIT_TIME_SECONDS, (this.rateLimitResetTime - Date.now()) / 1000);
        console.log(`RATE LIMITED - Waiting ${Math.ceil(waitTimeSeconds)}s...`);
        await this.delay(waitTimeSeconds * 1000);
        this.remainingRequests = REDDIT_RATE_LIMIT_QUOTA;
        console.log(`Rate limit reset. Continuing...`);
        // Don't retry - just continue, the next request should work
      }
    }

    // For other HTTP errors, log and return the response anyway
    // Let the caller handle the error gracefully instead of crashing
    console.warn(`HTTP ${response.status}: ${response.statusText}`);
    return response;
  }

  private async checkRateLimit(): Promise<void> {
    // If we're out of requests and haven't reached reset time, wait
    if (this.remainingRequests <= 0 && Date.now() < this.rateLimitResetTime) {
      const waitTime = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
      console.log(`Waiting ${waitTime}s for rate limit reset...`);
      await this.delay(waitTime * 1000);
      this.remainingRequests = REDDIT_RATE_LIMIT_QUOTA;
      console.log(`Rate limit reset. Fresh quota available.`);
    }
    
    // Small delay to avoid overwhelming the API
    await this.delay(this.rateLimitDelay);
  }

  private async fetchCompleteThread(permalink: string): Promise<RedditThread | null> {
    try {
      const url = `https://www.reddit.com${permalink}.json?limit=${REDDIT_REQUEST_LIMIT}&sort=top`;
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length < 2) {
        return null;
      }
      
      // Extract post data
      const postData = data[0].data.children[0].data;
      const post: RedditPost = {
        id: postData.id,
        title: postData.title,
        selftext: postData.selftext || '',
        score: postData.score,
        num_comments: postData.num_comments,
        created_utc: postData.created_utc,
        subreddit: postData.subreddit,
        permalink: postData.permalink,
        author: postData.author
      };
      
      // Extract all comments recursively
      const comments: RedditComment[] = [];
      this.extractCommentsRecursively(data[1].data.children, comments, 0);
      
      return { post, comments };
      
    } catch (error) {
      console.warn(`Error fetching thread ${permalink}:`, error);
      return null;
    }
  }
  
  private extractCommentsRecursively(children: any[], comments: RedditComment[], depth: number) {
    for (const child of children) {
      if (child.kind === 't1' && child.data) {
        const comment = child.data;
        
        // Skip deleted/removed comments
        if (comment.body === '[deleted]' || comment.body === '[removed]' || !comment.body) {
          continue;
        }
        
        comments.push({
          id: comment.id,
          body: comment.body,
          score: comment.score || 0,
          created_utc: comment.created_utc,
          author: comment.author || '[deleted]',
          permalink: `https://reddit.com${comment.permalink}`
        });
        
        // Recursively extract replies (limit depth to prevent stack overflow)
        if (comment.replies && comment.replies.data && comment.replies.data.children && depth < REDDIT_MAX_COMMENT_DEPTH) {
          this.extractCommentsRecursively(comment.replies.data.children, comments, depth + 1);
        }
      }
    }
  }

  /**
   * Validate and sanitize course code input to prevent SQL injection and invalid formats
   * @param courseCode Raw input course code
   * @returns Sanitized course code or null if invalid
   */
  private validateAndSanitizeCourseCode(courseCode: string): string | null {
    if (!courseCode || typeof courseCode !== 'string') {
      return null;
    }
    
    // Remove any potential SQL injection characters and trim whitespace
    const sanitized = courseCode.trim().replace(/[;'"\\<>{}()\[\]]/g, '');
    
    // Validate format: 3-5 uppercase letters followed by space and 4 digits
    const coursePattern = /^([A-Z]{2,5})\s+(\d{4})$/;
    const match = sanitized.match(coursePattern);
    
    if (!match) {
      return null;
    }
    
    // Return standardized format
    return `${match[1]} ${match[2]}`;
  }
  
  private extractCourseCodes(text: string): string[] {
    const coursePattern = /\b([A-Z]{4})\s*(\d{4})\b/g;
    const matches = [];
    let match;
    
    while ((match = coursePattern.exec(text)) !== null) {
      matches.push(`${match[1]} ${match[2]}`);
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Updates Course table statistics for all courses mentioned in a post.
   * - Searched course: marked as fully crawled + stats incremented
   * - Other courses: stats incremented but not marked as fully crawled
   */
  private async updateCourseData(searchedCourse: string, allCourseCodes: string[], savedPost: any, postData: any): Promise<void> {
    const postDate = new Date(postData.created_utc * 1000);
    
    // Update searched course: mark as fully crawled + increment stats
    await prisma.course.upsert({
      where: { courseCode: searchedCourse },
      update: {
        totalPosts: { increment: 1 },
        lastUpdated: new Date(),
        latestPostDate: postDate,
        hasFullCrawl: true,
        lastCrawledAt: new Date()
      },
      create: {
        courseCode: searchedCourse,
        totalPosts: 1,
        totalComments: 0,
        firstPostDate: postDate,
        latestPostDate: postDate,
        hasFullCrawl: true,
        lastCrawledAt: new Date()
      }
    });

    // Update all other mentioned courses: increment stats but don't mark as fully crawled
    for (const courseCode of allCourseCodes) {
      if (courseCode !== searchedCourse) {
        await prisma.course.upsert({
          where: { courseCode: courseCode },
          update: {
            totalPosts: { increment: 1 },  // ← FIX: Increment for all mentions
            lastUpdated: new Date(),
            latestPostDate: postDate
          },
          create: {
            courseCode: courseCode,
            totalPosts: 1,  // ← FIX: Start at 1, not 0
            totalComments: 0,
            firstPostDate: postDate,
            latestPostDate: postDate,
            hasFullCrawl: false
          }
        });
      }
    }
  }

  private containsCourseCode(text: string, courseCode: string): boolean {
    const [dept, num] = courseCode.split(' ');
    const variations = [
      courseCode,                    // "COMP 1005"
      `${dept}${num}`,              // "COMP1005"
      courseCode.toLowerCase(),      // "comp 1005"  
      `${dept.toLowerCase()}${num}`, // "comp1005"
      `${dept.toLowerCase()} ${num}`, // "comp 1005"
      `${dept.toUpperCase()} ${num}`, // "COMP 1005"
      `${dept.toUpperCase()}${num}`,  // "COMP1005"
    ];
    
    const textLower = text.toLowerCase();
    return variations.some(variation => textLower.includes(variation.toLowerCase()));
  }

  /**
   * Fetches all pages of search results for a query
   * @param query Search term
   * @param courseCode Course code to filter by
   * @returns Array of Reddit posts
   */
  private async searchAllPages(query: string, courseCode: string): Promise<any[]> {
    const allPosts: any[] = [];
    let after = null;
    let pageCount = 0;
    
    do {
      pageCount++;
      const encodedQuery = encodeURIComponent(query);

      // Search in r/CarletonU subreddit
      const url = `https://www.reddit.com/r/CarletonU/search.json?q=${encodedQuery}&restrict_sr=1&sort=new&limit=${REDDIT_SEARCH_PAGE_SIZE}&t=all${after ? `&after=${after}` : ''}`;
      
      try {
        console.log(`  Page ${pageCount}...`);
        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        if (!data.data?.children) break;
        
        const posts = data.data.children.map((child: any) => child.data);
        
        // Filter posts that actually contain the course code (double-check)
        const relevantPosts = posts.filter((post: any) => {
          const fullText = `${post.title} ${post.selftext || ''}`;
          return this.containsCourseCode(fullText, courseCode);
        });
        
        console.log(`  Matched: ${relevantPosts.length}/${posts.length}`);
        allPosts.push(...relevantPosts);
        
        after = data.data.after;
        
        // If we got less than the page size, we've reached the end
        if (posts.length < REDDIT_SEARCH_PAGE_SIZE) break;
        
      } catch (error) {
        console.warn(`Error fetching page ${pageCount}:`, error);
        break;
      }
      
    } while (after && pageCount < REDDIT_MAX_SEARCH_PAGES);
    
    return allPosts;
  }

  async searchAndStoreCourse(courseCode: string): Promise<void> {
    // Validate and sanitize course code input
    const sanitizedCourseCode = this.validateAndSanitizeCourseCode(courseCode);
    if (!sanitizedCourseCode) {
      console.error(`Invalid course code format: "${courseCode}". Expected format: "DEPT ####" (e.g., "COMP 1005")`);
      throw new Error(`Invalid course code: ${courseCode}`);
    }
    
    console.log(`\nCrawling: ${sanitizedCourseCode}`);
    console.log(`Subreddit: r/CarletonU`);
    
    const searchQueries = this.buildSearchQueries(sanitizedCourseCode);
    console.log(`Variations: ${searchQueries.join(', ')}\n`);
    
    let totalPosts = 0;
    let totalComments = 0;
    const processedPostIds = new Set<string>();
    
    try {
      // Search for each variation of the course code
      for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        console.log(`[${i+1}/${searchQueries.length}] Searching: "${query}"`);
        
        // Get ALL pages of results for this query
        const posts = await this.searchAllPages(query, sanitizedCourseCode);
        console.log(`Found: ${posts.length} posts\n`);
        
        // Process each post
        for (const post of posts) {
          if (processedPostIds.has(post.id)) continue;
          
          // Skip posts with no comments if we want engagement
          if (post.num_comments === 0) {
            continue;
          }
          
          console.log(`Processing: "${post.title.slice(0, 60)}..." (${this.remainingRequests} requests remaining)`);
          
          try {
            // Extract course codes from post content
            const courseCodes = this.extractCourseCodes(post.title + ' ' + (post.selftext || ''));
            const searchedCourse = courseCode.toUpperCase();

            // Check if post already exists (duplicate detection)
            const existingPost = await prisma.post.findUnique({
              where: { id: post.id }
            });

            if (existingPost) {
              console.log(`  → Already stored, skipping\n`);
              continue;
            }

            // Only track posts that are actually being stored
            processedPostIds.add(post.id);

            // Ensure searched course is always included in courseCodes
            const allCourseCodes = courseCodes.length > 0 
              ? (courseCodes.includes(searchedCourse) ? courseCodes : [...courseCodes, searchedCourse])
              : [searchedCourse];

            // Create the post with all course mentions
            const savedPost = await prisma.post.create({
              data: {
                id: post.id,
                subreddit: post.subreddit,
                title: post.title,
                body: post.selftext || '',
                score: post.score,
                createdUtc: post.created_utc,
                permalink: `https://reddit.com${post.permalink}`,
                courseCodes: allCourseCodes
              }
            });

            // Update Course summary
            await this.updateCourseData(searchedCourse, allCourseCodes, savedPost, post);
            totalPosts++;

            // Fetch and store comments - check each comment for course code mentions
            const thread = await this.fetchCompleteThread(post.permalink);
            if (thread && thread.comments.length > 0) {
              for (const comment of thread.comments) {
                try {
                  // Only store comments that mention the course code OR are part of relevant thread
                  const commentMentionsCourse = this.containsCourseCode(comment.body, courseCode);
                  const postMentionsCourse = this.containsCourseCode(`${post.title} ${post.selftext}`, courseCode);
                  
                  // Store comment if either the comment mentions course OR the post does
                  if (commentMentionsCourse || postMentionsCourse) {
                    // Check if comment already exists (duplicate detection)
                    const existingComment = await prisma.comment.findUnique({
                      where: { id: comment.id }
                    });
                    
                    if (existingComment) {
                      continue;
                    }
                    
                    await prisma.comment.create({
                      data: {
                        id: comment.id,
                        postId: savedPost.id,
                        body: comment.body,
                        score: comment.score,
                        createdUtc: comment.created_utc,
                        author: comment.author || 'unknown',
                        permalink: comment.permalink || `https://reddit.com/r/${post.subreddit}/comments/${post.id}/_/${comment.id}`
                      }
                    });
                    
                    // Increment comment count for ALL courses mentioned in this post
                    for (const courseCode of courseCodes) {
                      await prisma.course.update({
                        where: { courseCode: courseCode },
                        data: { totalComments: { increment: 1 } }
                      });
                    }
                    
                    totalComments++;
                  }
                } catch (commentError) {
                  console.warn(`Error storing comment ${comment.id}:`, commentError);
                }
              }
            }
            
          } catch (error) {
            console.error(`Error processing post ${post.id}:`, error);
          }
        }
      }
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Crawl complete: ${sanitizedCourseCode}`);
      console.log(`Stored: ${totalPosts} posts, ${totalComments} comments`);
      console.log(`Processed: ${processedPostIds.size} unique posts`);
      
      // Update Course summary table with ALL mentions (primary + secondary)
      await this.updateCourseSummary(sanitizedCourseCode.toUpperCase());
      
    } catch (error) {
      console.error(`\nError crawling ${sanitizedCourseCode}:`, error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
  
  /**
   * Update Course summary table with ALL mentions (primary + secondary)
   * This gives accurate statistics for what data is available for analysis
   */
  private async updateCourseSummary(courseCode: string): Promise<void> {
    // Additional validation and sanitization for database operations
    const sanitized = this.validateAndSanitizeCourseCode(courseCode);
    if (!sanitized) {
      console.warn(`Skipping course summary update for invalid course code: ${courseCode}`);
      return;
    }
    
    try {
      // Count all posts that mention this course in their courseCodes array
      const totalPosts = await prisma.post.count({
        where: {
          courseCodes: {
            has: sanitized
          }
        }
      });
      
      // Count all comments for posts that mention this course
      const totalComments = await prisma.comment.count({
        where: {
          post: {
            courseCodes: {
              has: sanitized
            }
          }
        }
      });
      
      // Get date range of posts
      const postDates = await prisma.post.findMany({
        where: {
          courseCodes: {
            has: sanitized
          }
        },
        select: {
          createdUtc: true
        },
        orderBy: {
          createdUtc: 'asc'
        }
      });
      
      let firstPostDate: Date | null = null;
      let latestPostDate: Date | null = null;
      
      if (postDates.length > 0) {
        firstPostDate = new Date(postDates[0].createdUtc * 1000);
        latestPostDate = new Date(postDates[postDates.length - 1].createdUtc * 1000);
      }
      
      // Upsert course summary
      await prisma.course.upsert({
        where: { courseCode: sanitized },
        update: {
          totalPosts: totalPosts,
          totalComments: totalComments,
          firstPostDate: firstPostDate,
          latestPostDate: latestPostDate,
          lastUpdated: new Date()
        },
        create: {
          courseCode: sanitized,
          totalPosts: totalPosts,
          totalComments: totalComments,
          firstPostDate: firstPostDate,
          latestPostDate: latestPostDate
        }
      });
      
      console.log(`Summary: ${totalPosts} posts, ${totalComments} comments`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      
    } catch (error) {
      console.warn(`Could not update course summary:`, error);
    }
  }
}

// Main execution
async function main() {
  const courseCode = process.argv[2];
  
  if (!courseCode) {
    console.error('Please provide a course code (e.g., "COMP 1005")');
    process.exit(1);
  }
  
  // Additional validation for direct script execution
  const coursePattern = /^[A-Z]{2,5}\s+\d{4}$/;
  if (!coursePattern.test(courseCode.trim())) {
    console.error(`Invalid course code format: "${courseCode}". Expected format: "DEPT ####" (e.g., "COMP 1005")`);
    process.exit(1);
  }
  
  const crawler = new SimpleComprehensiveCrawler();
  await crawler.checkInitialRateLimit();
  await crawler.searchAndStoreCourse(courseCode);
}

// Only run main() if this script is executed directly, not when imported
if (require.main === module) {
  main().catch(console.error);
}
