import { config } from 'dotenv';
config();

import { prisma } from '../lib/prisma';

async function clearCache() {
  console.log('Clearing course cache...');
  
  const result = await prisma.courseCache.deleteMany();
  
  console.log(`Cleared ${result.count} cached courses`);
  
  await prisma.$disconnect();
}

clearCache()
  .catch((error) => {
    console.error('Error clearing cache:', error);
    process.exit(1);
  });

