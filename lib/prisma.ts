/**
 * Prisma Client Singleton
 * Prevents multiple instances in development (hot reload) and ensures proper connection pooling
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'], // Only log errors, not all queries
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}



