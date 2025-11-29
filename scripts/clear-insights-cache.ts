import { config } from 'dotenv';
config();

import { prisma } from '../lib/prisma';

async function clearCache() {
  console.log('Clearing insights cache...');
  
  const result = await prisma.courseInsightsCache.deleteMany();
  
  console.log(`Cleared ${result.count} cached insights`);
  
  await prisma.$disconnect();
}

clearCache()
  .catch((error) => {
    console.error('Error clearing cache:', error);
    process.exit(1);
  });

