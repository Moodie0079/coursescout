#!/usr/bin/env node

import { config } from 'dotenv';
config();

import { prisma } from '../lib/prisma';

async function clearEverything() {
  console.log('🧹 Clearing ALL database tables and progress files...');
  
  // Clear database tables in correct order due to foreign key constraints
  await prisma.comment.deleteMany();
  console.log('✅ Cleared comments');
  
  await prisma.post.deleteMany();
  console.log('✅ Cleared posts');
  
  await prisma.course.deleteMany();
  console.log('✅ Cleared courses');
  
  await prisma.professor.deleteMany();
  console.log('✅ Cleared professors');
  
  console.log('🎉 Complete reset successful - all tables cleared (courses, posts, comments, professors)');
  
  await prisma.$disconnect();
}

clearEverything();
