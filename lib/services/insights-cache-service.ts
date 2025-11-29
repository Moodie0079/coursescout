import { prisma } from '../prisma';
import { Insights } from '../types';
import { logger } from '../logger';

export class InsightsCacheService {
  async get(courseCode: string): Promise<Insights | null> {
    const cached = await prisma.courseInsightsCache.findUnique({
      where: { courseCode: courseCode.toUpperCase() }
    });
    
    if (cached) {
      logger.info(`Cache hit for ${courseCode}`);
      return cached.insights as Insights;
    }
    
    return null;
  }

  async set(courseCode: string, insights: Insights): Promise<void> {
    await prisma.courseInsightsCache.upsert({
      where: { courseCode: courseCode.toUpperCase() },
      create: {
        courseCode: courseCode.toUpperCase(),
        insights: insights as any
      },
      update: {
        insights: insights as any,
        cachedAt: new Date()
      }
    });
    logger.info(`Cached insights for ${courseCode}`);
  }
}

export const insightsCacheService = new InsightsCacheService();

