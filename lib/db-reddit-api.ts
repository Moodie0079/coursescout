import { RedditSearchResult, RedditThread } from './types';
import { prisma } from './prisma';
import { logger } from './logger';
import { MAX_THREADS, MAX_COMMENTS_PER_POST } from './constants';
import { DatabaseError } from './errors';

export const dbRedditAPI = {
  async searchCourseDiscussions(courseCode: string): Promise<RedditSearchResult> {
    try {
      // Search for posts where courseCodes array contains the requested course
      // GIN index makes this fast!
      const posts = await prisma.post.findMany({
        where: {
          courseCodes: {
            has: courseCode.toUpperCase()  // Array contains search
          }
        },
        include: {
          comments: {
            orderBy: { score: 'desc' },
            take: MAX_COMMENTS_PER_POST
          }
        },
        orderBy: [
          { score: 'desc' },
          { createdUtc: 'desc' }
        ],
        take: MAX_THREADS
      });

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

      return {
        threads: redditThreads,
      };
    } catch (error) {
      logger.error('Database search error', error, { courseCode });
      throw new DatabaseError('Failed to search course discussions', error);
    }
  }
};