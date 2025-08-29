#!/usr/bin/env node

import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function clearEverything() {
  console.log('🧹 Clearing database and progress files...');
  
  // Clear database tables in correct order due to foreign key constraints
  await prisma.comment.deleteMany();
  console.log('✅ Cleared comments');
  
  await prisma.courseMention.deleteMany();
  console.log('✅ Cleared course mentions');
  
  await prisma.post.deleteMany();
  console.log('✅ Cleared posts');
  
  await prisma.course.deleteMany();
  console.log('✅ Cleared courses');
  

  
  // Clear progress files
  const progressFiles = [
    'bulk_crawl_progress.json',
    'bulk_crawl_test_progress.json'
  ];
  
  for (const file of progressFiles) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`✅ Cleared ${file}`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not clear ${file}:`, error);
    }
  }
  
  console.log('🎉 Complete reset successful - database and progress files cleared');
  
  await prisma.$disconnect();
}

clearEverything();
