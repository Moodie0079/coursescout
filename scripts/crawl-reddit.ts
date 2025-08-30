#!/usr/bin/env node

import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  private rateLimitDelay = 100; // Minimal delay between requests
  private remainingRequests = 100; // Track remaining quota
  private rateLimitResetTime = 0; // When quota resets

  /**
   * Check current rate limit status before starting crawling
   */
  async checkInitialRateLimit(): Promise<void> {
    console.log('🔍 Checking current Reddit rate limit status...');
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

      console.log(`📊 Current quota: ${this.remainingRequests} requests remaining`);
      
      if (this.remainingRequests <= 0 && Date.now() < this.rateLimitResetTime) {
        const waitTimeSeconds = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
        console.log(`⏳ Already rate limited! Need to wait ${waitTimeSeconds}s before starting...`);
        console.log(`💤 Waiting for rate limit to reset...`);
        await this.delay(waitTimeSeconds * 1000);
        this.remainingRequests = 100;
        console.log(`✅ Rate limit reset! Ready to start crawling.`);
      } else {
        console.log(`✅ Ready to start crawling with ${this.remainingRequests} requests available.`);
      }
    } catch (error) {
      console.warn('⚠️  Could not check initial rate limit status, proceeding anyway:', error);
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
    console.log(`🌐 Making request (${this.remainingRequests} remaining): ${url.includes('search') ? 'search API' : 'thread API'}`);

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
        console.log(`⚠️  Low quota: ${this.remainingRequests} requests remaining`);
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
        const waitTimeSeconds = Math.max(30, (this.rateLimitResetTime - Date.now()) / 1000); // Minimum 30s wait
        console.log(`🚫 RATE LIMITED - Reddit reset header: ${reset}`);
        console.log(`🚫 Current time: ${Date.now()}, Reset time: ${this.rateLimitResetTime}`);
        console.log(`🚫 Calculated wait: ${waitTimeSeconds}s - Waiting...`);
        await this.delay(waitTimeSeconds * 1000);
        this.remainingRequests = 100; // Reset quota
        console.log(`🔄 Wait complete, continuing with fresh quota...`);
        // Don't retry - just continue, the next request should work
      }
    }

    // For other HTTP errors, log and return the response anyway
    // Let the caller handle the error gracefully instead of crashing
    console.warn(`⚠️  HTTP ${response.status}: ${response.statusText} - continuing anyway`);
    return response;
  }

  private async checkRateLimit(): Promise<void> {
    // If we're out of requests and haven't reached reset time, wait
    if (this.remainingRequests <= 0 && Date.now() < this.rateLimitResetTime) {
      const waitTime = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
      console.log(`💤 Waiting ${waitTime}s for rate limit reset...`);
      await this.delay(waitTime * 1000);
      this.remainingRequests = 100; // Fresh quota
      console.log(`🔄 Rate limit reset! Fresh quota of 100 requests available.`);
    }
    
    // Small delay to avoid overwhelming the API
    await this.delay(this.rateLimitDelay);
  }

  private async fetchCompleteThread(permalink: string): Promise<RedditThread | null> {
    try {
      const url = `https://www.reddit.com${permalink}.json?limit=1000&sort=top`;
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
        
        // Recursively extract replies (limit depth)
        if (comment.replies && comment.replies.data && comment.replies.data.children && depth < 10) {
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

  private async updateCourseData(primaryCourse: string, allCourseCodes: string[], savedPost: any, postData: any): Promise<void> {
    const postDate = new Date(postData.created_utc * 1000);
    
    // Ensure primary course exists in Course table
    await prisma.course.upsert({
      where: { courseCode: primaryCourse },
      update: {
        totalPosts: { increment: 1 },
        lastUpdated: new Date(),
        latestPostDate: postDate
      },
      create: {
        courseCode: primaryCourse,
        totalPosts: 1,
        totalComments: 0,
        firstPostDate: postDate,
        latestPostDate: postDate
      }
    });

    // Create primary mention
    await prisma.courseMention.create({
      data: {
        courseCode: primaryCourse,
        postId: savedPost.id,
        mentionType: 'primary'
      }
    });

    // Create secondary mentions for other courses found in the post
    for (const courseCode of allCourseCodes) {
      if (courseCode !== primaryCourse) {
        // Ensure secondary course exists
        await prisma.course.upsert({
          where: { courseCode: courseCode },
          update: {
            lastUpdated: new Date()
          },
          create: {
            courseCode: courseCode,
            totalPosts: 0,
            totalComments: 0,
            firstPostDate: postDate,
            latestPostDate: postDate
          }
        });

        // Create secondary mention
        await prisma.courseMention.create({
          data: {
            courseCode: courseCode,
            postId: savedPost.id,
            mentionType: 'secondary'
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

  private async searchAllPages(query: string, courseCode: string): Promise<any[]> {
    const allPosts: any[] = [];
    let after = null;
    let pageCount = 0;
    const maxPages = 50; // Limit to prevent infinite loops
    
    do {
      pageCount++;
      const encodedQuery = encodeURIComponent(query);

      // Hardcoded to r/CarletonU for now
      const url = `https://www.reddit.com/r/CarletonU/search.json?q=${encodedQuery}&restrict_sr=1&sort=new&limit=100&t=all${after ? `&after=${after}` : ''}`;
      
      try {
        console.log(`    📄 Page ${pageCount} for "${query}"...`);
        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        if (!data.data?.children) break;
        
        const posts = data.data.children.map((child: any) => child.data);
        
        // Filter posts that actually contain the course code (double-check)
        const relevantPosts = posts.filter((post: any) => {
          const fullText = `${post.title} ${post.selftext || ''}`;
          return this.containsCourseCode(fullText, courseCode);
        });
        
        console.log(`    Found ${posts.length} posts, ${relevantPosts.length} contain course code`);
        allPosts.push(...relevantPosts);
        
        after = data.data.after;
        
        // If we got less than 100 posts, we've reached the end
        if (posts.length < 100) break;
        
      } catch (error) {
        console.warn(`Error fetching page ${pageCount}:`, error);
        break;
      }
      
    } while (after && pageCount < maxPages);
    
    return allPosts;
  }

  async searchAndStoreCourse(courseCode: string): Promise<void> {
    // Validate and sanitize course code input
    const sanitizedCourseCode = this.validateAndSanitizeCourseCode(courseCode);
    if (!sanitizedCourseCode) {
      console.error(`❌ Invalid course code format: "${courseCode}". Expected format: "DEPT ####" (e.g., "COMP 1005")`);
      throw new Error(`Invalid course code: ${courseCode}`);
    }
    
    console.log(`Starting simple comprehensive crawler for ${sanitizedCourseCode}...`);
    console.log(`Strategy: Search entire r/CarletonU history for any mention of course code`);
    console.log(''); // Add spacing
    
    const searchQueries = this.buildSearchQueries(sanitizedCourseCode);
    
    console.log(`Searching entire Reddit history for ${sanitizedCourseCode} mentions...`);
    console.log(`Searching r/CarletonU with ${searchQueries.length} course code variations...`);
    console.log(''); // Add spacing
    
    let totalPosts = 0;
    let totalComments = 0;
    const processedPostIds = new Set<string>();
    
    try {
      // Search for each variation of the course code
      for (let i = 0; i < searchQueries.length; i++) {
        const query = searchQueries[i];
        console.log(`  🔎 Query ${i+1}/${searchQueries.length}: "${query}"`);
        
        // Get ALL pages of results for this query
        const posts = await this.searchAllPages(query, sanitizedCourseCode);
        console.log(`    Total posts found: ${posts.length}`);
        console.log(''); // Add spacing between queries
        
        // Process each post
        for (const post of posts) {
          if (processedPostIds.has(post.id)) continue;
          processedPostIds.add(post.id);
          
          // Skip posts with no comments if we want engagement
          if (post.num_comments === 0) {
            console.log(`⏭️  Skipping "${post.title.slice(0, 50)}..." - no comments`);
            continue;
          }
          
          console.log(`💾 Processing: ${post.title.slice(0, 50)}...`);
          
          try {
            // Extract course codes from post content
            const courseCodes = this.extractCourseCodes(post.title + ' ' + (post.selftext || ''));
            const primaryCourse = courseCodes.length > 0 ? courseCodes[0] : courseCode.toUpperCase();

            // Check if post already exists (duplicate detection)
            const existingPost = await prisma.post.findUnique({
              where: { id: post.id }
            });

            if (existingPost) {
              console.log(`⏭️  Duplicate post detected: ${post.title.slice(0, 50)}...`);
              continue;
            }

            // Create the post
            const savedPost = await prisma.post.create({
              data: {
                id: post.id,
                subreddit: post.subreddit,
                title: post.title,
                body: post.selftext || '',
                score: post.score,
                createdUtc: post.created_utc,
                permalink: `https://reddit.com${post.permalink}`,
                courseCode: primaryCourse
              }
            });

            // Update Course summary and create mentions
            await this.updateCourseData(primaryCourse, courseCodes, savedPost, post);
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
                      console.log(`Duplicate comment detected: ${comment.id}`);
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
                    
                    // Update comment count for primary course
                    await prisma.course.update({
                      where: { courseCode: primaryCourse },
                      data: { totalComments: { increment: 1 } }
                    });
                    
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
      
      console.log(''); // Add spacing before completion
      console.log(`✅ Crawling complete for ${sanitizedCourseCode}!`);
      console.log(`📊 Stored: ${totalPosts} posts, ${totalComments} comments`);
      console.log(`📊 Total unique posts processed: ${processedPostIds.size}`);
      
      // Update Course summary table with ALL mentions (primary + secondary)
      await this.updateCourseSummary(sanitizedCourseCode.toUpperCase());
      
      console.log(`🎯 Course ${sanitizedCourseCode} crawling completed`);
      console.log(''); // Add spacing at end
      
    } catch (error) {
      console.error(`❌ Error crawling ${sanitizedCourseCode}:`, error);
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
      console.warn(`⚠️  Skipping course summary update for invalid course code: ${courseCode}`);
      return;
    }
    
    try {
      // Count all posts that mention this course (primary OR secondary)
      const totalPosts = await prisma.post.count({
        where: {
          mentions: {
            some: {
              courseCode: sanitized
            }
          }
        }
      });
      
      // Count all comments for posts that mention this course
      const totalComments = await prisma.comment.count({
        where: {
          post: {
            mentions: {
              some: {
                courseCode: sanitized
              }
            }
          }
        }
      });
      
      // Get date range of posts
      const postDates = await prisma.post.findMany({
        where: {
          mentions: {
            some: {
              courseCode: sanitized
            }
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
      
      console.log(`📊 Updated course summary: ${sanitized} - ${totalPosts} posts, ${totalComments} comments`);
      
    } catch (error) {
      console.warn(`Warning: Could not update course summary for ${sanitized}:`, error);
    }
  }
}

// Main execution
async function main() {
  const courseCode = process.argv[2];
  
  if (!courseCode) {
    console.error('❌ Please provide a course code (e.g., "COMP 1005")');
    process.exit(1);
  }
  
  // Additional validation for direct script execution
  const coursePattern = /^[A-Z]{2,5}\s+\d{4}$/;
  if (!coursePattern.test(courseCode.trim())) {
    console.error(`❌ Invalid course code format: "${courseCode}". Expected format: "DEPT ####" (e.g., "COMP 1005")`);
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
