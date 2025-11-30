import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

async function viewStats() {
  try {
    console.log('\n📊 CourseScout Analytics Dashboard\n');
    console.log('═'.repeat(60));

    // Get global stats from _GLOBAL row
    const globalStats = await prisma.searchStats.findUnique({
      where: { courseCode: '_GLOBAL' }
    });

    // Count unique courses (excluding _GLOBAL)
    const uniqueCourses = await prisma.searchStats.count({
      where: {
        courseCode: { not: '_GLOBAL' }
      }
    });

    if (globalStats) {
      console.log('\n🌍 GLOBAL STATISTICS');
      console.log('─'.repeat(60));
      console.log(`Total Searches:        ${globalStats.searchCount.toLocaleString()}`);
      console.log(`Unique Courses:        ${uniqueCourses.toLocaleString()}`);
      console.log(`Last Updated:          ${globalStats.lastSearched.toLocaleString()}`);
    } else {
      console.log('\n🌍 GLOBAL STATISTICS');
      console.log('─'.repeat(60));
      console.log('No data available yet. Start searching courses!');
    }

    // Get top searched courses (excluding _GLOBAL)
    const topCourses = await prisma.searchStats.findMany({
      where: {
        courseCode: { not: '_GLOBAL' }
      },
      orderBy: { searchCount: 'desc' },
      take: 20
    });

    if (topCourses.length > 0) {
      console.log('\n🔥 TOP 20 SEARCHED COURSES');
      console.log('─'.repeat(60));
      console.log('Rank  Course Code        Searches    Last Searched');
      console.log('─'.repeat(60));
      
      topCourses.forEach((course, index) => {
        const rank = (index + 1).toString().padStart(4, ' ');
        const code = course.courseCode.padEnd(18, ' ');
        const count = course.searchCount.toString().padStart(8, ' ');
        const date = course.lastSearched.toLocaleDateString();
        console.log(`${rank}  ${code}${count}    ${date}`);
      });
    } else {
      console.log('\n🔥 TOP SEARCHED COURSES');
      console.log('─'.repeat(60));
      console.log('No courses searched yet.');
    }

    // Get recent searches (excluding _GLOBAL)
    const recentSearches = await prisma.searchStats.findMany({
      where: {
        courseCode: { not: '_GLOBAL' }
      },
      orderBy: { lastSearched: 'desc' },
      take: 10
    });

    if (recentSearches.length > 0) {
      console.log('\n🕐 RECENT SEARCHES (Last 10)');
      console.log('─'.repeat(60));
      console.log('Course Code        Searches    Last Searched');
      console.log('─'.repeat(60));
      
      recentSearches.forEach((course) => {
        const code = course.courseCode.padEnd(18, ' ');
        const count = course.searchCount.toString().padStart(8, ' ');
        const date = course.lastSearched.toLocaleString();
        console.log(`${code}${count}    ${date}`);
      });
    }

    console.log('\n' + '═'.repeat(60) + '\n');

  } catch (error) {
    logger.error('Failed to fetch statistics', error);
    console.error('Error fetching statistics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewStats();

