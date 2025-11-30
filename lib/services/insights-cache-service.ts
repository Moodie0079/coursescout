import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { Insights } from '../types';
import { logger } from '../logger';

export class InsightsCacheService {
  async get(courseCode: string): Promise<Insights | null> {
    const cached = await prisma.courseCache.findUnique({
      where: { courseCode: courseCode.toUpperCase() }
    });
    
    if (cached) {
      logger.info(`Cache hit for ${courseCode}`);
      return cached.insights as unknown as Insights;
    }
    
    return null;
  }

  async set(courseCode: string, insights: Insights): Promise<void> {
    await prisma.courseCache.upsert({
      where: { courseCode: courseCode.toUpperCase() },
      create: {
        courseCode: courseCode.toUpperCase(),
        insights: insights as unknown as Prisma.InputJsonValue
      },
      update: {
        insights: insights as unknown as Prisma.InputJsonValue,
        cachedAt: new Date()
      }
    });
    logger.info(`Cached insights for ${courseCode}`);
  }
}

export const insightsCacheService = new InsightsCacheService();

