import { config } from 'dotenv';
config();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function browseCourses() {
  console.log('📚 Browsing Courses in Database\n');
  
  try {
    // Get all courses with their statistics
    const courses = await prisma.course.findMany({
      orderBy: [
        { totalPosts: 'desc' },
        { courseCode: 'asc' }
      ]
    });

    if (courses.length === 0) {
      console.log('❌ No courses found in database');
      console.log('💡 Run the crawler first: npx tsx scripts/crawl_reddit_rate_limited.ts "COMP 1005"');
      return;
    }

    console.log(`✅ Found ${courses.length} courses in database:\n`);

    // Display course summary
    courses.forEach((course, index) => {
      const lastUpdated = course.lastUpdated.toLocaleDateString();
      const firstPost = course.firstPostDate?.toLocaleDateString() || 'N/A';
      const latestPost = course.latestPostDate?.toLocaleDateString() || 'N/A';
      
      console.log(`${index + 1}. ${course.courseCode}`);
      console.log(`   📊 Posts: ${course.totalPosts} | Comments: ${course.totalComments}`);
      console.log(`   📅 First Post: ${firstPost} | Latest: ${latestPost}`);
      console.log(`   🔄 Last Updated: ${lastUpdated}`);
      console.log('');
    });

    // Show top courses by activity
    const topCourses = courses.slice(0, 5);
    console.log('🏆 Top 5 Most Active Courses:');
    topCourses.forEach((course, index) => {
      const total = course.totalPosts + course.totalComments;
      console.log(`   ${index + 1}. ${course.courseCode} - ${total} total items (${course.totalPosts} posts, ${course.totalComments} comments)`);
    });

  } catch (error) {
    console.error('❌ Error browsing courses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

browseCourses().catch(console.error);
