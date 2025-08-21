import { RedditSearchResult, RedditPost, RedditThread } from '../app/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dbRedditAPI = {
  async searchCourseDiscussions(courseCode: string): Promise<RedditSearchResult> {
    console.log(`🔍 Searching database for ${courseCode}...`);
    
    try {
      // Use the new CourseMention table for more efficient queries
      const courseMentions = await prisma.courseMention.findMany({
        where: {
          courseCode: courseCode.toUpperCase()
        },
        include: {
          post: {
            include: {
              comments: {
                orderBy: { score: 'desc' },
                take: 500 // Increased from 50 to 500 comments per post
              }
            }
          }
        },
        orderBy: [
          { post: { score: 'desc' } },
          { post: { createdUtc: 'desc' } }
        ],
        take: 1000 // Increased from 100 to 1000 discussions
      });

      // Extract posts from mentions
      const posts = courseMentions.map(mention => mention.post);

      // If no mentions found, fall back to comprehensive text search
      if (posts.length === 0) {
        console.log(`📝 No mentions found, falling back to text search...`);
        const fallbackPosts = await prisma.post.findMany({
          where: {
            OR: [
              { courseCode: courseCode.toUpperCase() },
              { title: { contains: courseCode } },
              { body: { contains: courseCode } },
              // Also search for variations
              { title: { contains: courseCode.replace(' ', '') } }, // COMP1005
              { body: { contains: courseCode.replace(' ', '') } },   // COMP1005
              { title: { contains: courseCode.toLowerCase() } },     // comp 1005
              { body: { contains: courseCode.toLowerCase() } },      // comp 1005
              { title: { contains: courseCode.replace(' ', '').toLowerCase() } }, // comp1005
              { body: { contains: courseCode.replace(' ', '').toLowerCase() } }   // comp1005
            ]
          },
          include: {
            comments: {
              orderBy: { score: 'desc' },
              take: 500 // Increased from 50 to 500 comments per post
            }
          },
          orderBy: [
            { score: 'desc' },
            { createdUtc: 'desc' }
          ],
          take: 1000 // Increased from 100 to 1000 discussions
        });
        posts.push(...fallbackPosts);
      }

      // Transform to RedditThread format expected by AI processor
      const redditThreads: RedditThread[] = posts.map(post => ({
        post: {
          id: post.id,
          title: post.title,
          selftext: post.body,
          score: post.score,
          created_utc: post.createdUtc,
          permalink: post.permalink || `/r/${post.subreddit}/comments/${post.id}`,
          url: post.permalink || `https://reddit.com/r/${post.subreddit}/comments/${post.id}`,
          subreddit: post.subreddit,
          author: 'unknown',
          num_comments: post.comments.length,
          ups: post.score
        },
        comments: post.comments.map(comment => ({
          id: comment.id,
          body: comment.body,
          score: comment.score,
          created_utc: comment.createdUtc,
          permalink: comment.permalink || `https://reddit.com/r/${post.subreddit}/comments/${post.id}/_/${comment.id}`,
          author: comment.author || 'unknown'
        }))
      }));

      console.log(`✅ Found ${redditThreads.length} discussions for ${courseCode} in database`);

      return {
        threads: redditThreads,
        circuitBreakerStatus: {
          state: 'closed',
          rateLimitHits: 0,
          isActive: false
        }
      };
    } catch (error) {
      console.error('Database search error:', error);
      return {
        threads: [],
        circuitBreakerStatus: {
          state: 'closed',
          rateLimitHits: 0,
          isActive: false
        }
      };
    }
  }
};