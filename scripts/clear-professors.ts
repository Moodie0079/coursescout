/**
 * Clear Professors Script
 * Deletes all professor records from the database
 */

import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearProfessors() {
  console.log('🗑️  Clearing all professors from database...');
  
  try {
    const result = await prisma.professor.deleteMany({});
    
    console.log(`✅ Deleted ${result.count} professors`);
    
  } catch (error) {
    console.error('❌ Error clearing professors:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearProfessors();

