import { config } from 'dotenv';
config();

import { prisma } from '../lib/prisma';
import realCourses from '../real-carleton-courses.json';
import { BULK_CRAWL_TEST_COUNT, BULK_CRAWL_PROGRESS_INTERVAL } from '../lib/constants';

class BulkCourseCrawler {
  private testMode: boolean = false;
  private testCount: number = BULK_CRAWL_TEST_COUNT;

  constructor(testMode = false, testCount = BULK_CRAWL_TEST_COUNT) {
    this.testMode = testMode;
    this.testCount = testCount;
  }

  /**
   * Validates course code format to prevent SQL injection and invalid formats
   */
  private isValidCourseCode(courseCode: string): boolean {
    if (!courseCode || typeof courseCode !== 'string') {
      return false;
    }
    
    const sanitized = courseCode.trim().replace(/[;'"\\<>{}()\[\]]/g, '');
    const coursePattern = /^[A-Z]{2,5}\s+\d{4}$/;
    
    return coursePattern.test(sanitized) && sanitized === courseCode.trim();
  }

  /**
   * Crawls a single course and returns success/failure
   */
  private async crawlSingleCourse(courseCode: string, crawler: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`\n🕷️  Crawling ${courseCode}...`);
      
      const startTime = Date.now();
      await crawler.searchAndStoreCourse(courseCode);
      const endTime = Date.now();
      
      // Get stats from database
      const totalPosts = await prisma.post.count({
        where: { courseCodes: { has: courseCode.toUpperCase() } }
      });
      
      const totalComments = await prisma.comment.count({
        where: {
          post: {
            courseCodes: { has: courseCode.toUpperCase() }
          }
        }
      });
      
      const timeElapsed = Math.round((endTime - startTime) / 1000);
      console.log(`✅ ${courseCode}: ${totalPosts} posts, ${totalComments} comments (${timeElapsed}s)`);
      
      return { success: true };
    } catch (error: any) {
      console.error(`❌ ${courseCode} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Main crawl function - crawls all uncrawled courses
   */
  async start(): Promise<void> {
    console.log('🚀 Starting Bulk Course Crawler');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get list of all courses to consider
    const allCoursesToCheck = this.testMode 
      ? realCourses.slice(0, this.testCount)
      : realCourses;
    
    console.log(`📚 Total courses in catalog: ${allCoursesToCheck.length}`);
    
    // Query database to find courses that haven't been fully crawled
    const crawledCourses = await prisma.course.findMany({
      where: { hasFullCrawl: true },
      select: { courseCode: true }
    });
    
    const crawledSet = new Set(crawledCourses.map(c => c.courseCode));
    const coursesToCrawl = allCoursesToCheck
      .map(c => c.code)
      .filter(code => !crawledSet.has(code));
    
    console.log(`✅ Already crawled: ${crawledCourses.length}`);
    console.log(`🎯 Remaining to crawl: ${coursesToCrawl.length}\n`);
    
    if (coursesToCrawl.length === 0) {
      console.log('🎉 All courses already crawled!');
      return;
    }
    
    // Create crawler instance
    const { SimpleComprehensiveCrawler } = await import('./crawl-reddit');
    const crawler = new SimpleComprehensiveCrawler();
    await crawler.checkInitialRateLimit();
    
    // Track stats
    let completed = 0;
    let failed = 0;
    const startTime = Date.now();
    
    // Crawl each course
    for (let i = 0; i < coursesToCrawl.length; i++) {
      const courseCode = coursesToCrawl[i];
      
      // Validate course code
      if (!this.isValidCourseCode(courseCode)) {
        console.warn(`⚠️  Skipping invalid course code: ${courseCode}`);
        failed++;
        continue;
      }
      
      console.log(`\n[${i + 1}/${coursesToCrawl.length}] Processing: ${courseCode}`);
      
      const result = await this.crawlSingleCourse(courseCode, crawler);
      
      if (result.success) {
        completed++;
      } else {
        failed++;
      }
      
      // Progress update at regular intervals
      if ((i + 1) % BULK_CRAWL_PROGRESS_INTERVAL === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        const remaining = coursesToCrawl.length - (i + 1);
        const avgPerCourse = elapsed / (i + 1);
        const estimatedRemaining = Math.round(avgPerCourse * remaining);
        
        console.log(`\n📊 Progress: ${i + 1}/${coursesToCrawl.length} | ✅ ${completed} | ❌ ${failed}`);
        console.log(`⏱️  Elapsed: ${elapsed}m | Estimated remaining: ${estimatedRemaining}m\n`);
      }
    }
    
    // Final summary
    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Bulk Crawl Complete!');
    console.log(`✅ Completed: ${completed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total time: ${totalTime} minutes`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await prisma.$disconnect();
  }
}

// Run the crawler
const testMode = process.argv.includes('--test');
const crawler = new BulkCourseCrawler(testMode, 10);
crawler.start().catch(console.error);
