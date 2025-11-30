#!/usr/bin/env node

import { config } from 'dotenv';
config();

import { prisma } from '../lib/prisma';
import * as readline from 'readline';

async function promptConfirmation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('⚠️  WARNING: This will DELETE ALL DATA from the database. Are you sure? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function clearEverything() {
  const confirmed = await promptConfirmation();
  
  if (!confirmed) {
    console.log('❌ Cancelled - no data was deleted');
    process.exit(0);
  }

  console.log('\n🧹 Clearing ALL database tables...');
  
  // Clear database tables in correct order due to foreign key constraints
  await prisma.comment.deleteMany();
  console.log('✅ Cleared comments');
  
  await prisma.post.deleteMany();
  console.log('✅ Cleared posts');
  
  await prisma.course.deleteMany();
  console.log('✅ Cleared courses');
  
  await prisma.professor.deleteMany();
  console.log('✅ Cleared professors');
  
  await prisma.courseCache.deleteMany();
  console.log('✅ Cleared course cache');
  
  await prisma.searchStats.deleteMany();
  console.log('✅ Cleared search stats');
  
  console.log('\n🎉 Complete reset successful - all tables cleared');
  
  await prisma.$disconnect();
}

clearEverything();
