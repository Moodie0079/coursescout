import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import realCourses from '../real-carleton-courses.json';

const prisma = new PrismaClient();

interface BulkCrawlProgress {
  totalCourses: number;
  coursesCompleted: number;
  coursesSkipped: number;
  coursesFailed: number;
  startTime: number;
  lastSaveTime: number;
  completedCourses: string[];
  failedCourses: Array<{ code: string; error: string; timestamp: number }>;
  currentBatch: number;
  estimatedTimeRemaining?: number;
}

interface CrawlStats {
  postsFound: number;
  commentsFound: number;
  requestsMade: number;
  rateLimitHits: number;
}

class BulkCourseCrawler {
  private progress: BulkCrawlProgress;
  private progressFile: string;
  private testMode: boolean = false;
  private testCount: number = 10;
  private batchSize: number = 50; // Save progress every 50 courses
  private stats: CrawlStats = { postsFound: 0, commentsFound: 0, requestsMade: 0, rateLimitHits: 0 };
  
  // Performance optimization: cache already-crawled courses in memory
  private crawledCoursesCache: Set<string> = new Set();
  private cacheBuilt: boolean = false;

  constructor(testMode = false, testCount = 10) {
    this.testMode = testMode;
    this.testCount = testCount;
    this.progressFile = testMode ? 'bulk_crawl_test_progress.json' : 'bulk_crawl_progress.json';
    this.progress = this.loadProgress();
  }

  /**
   * LOAD PROGRESS: Resumes from where we left off if the script was interrupted
   * Loads from JSON file if it exists
   * - Creates new progress object if starting fresh
   */
  private loadProgress(): BulkCrawlProgress {
    try {
      if (fs.existsSync(this.progressFile)) {
        console.log(`📂 Loading progress from ${this.progressFile}...`);
        const savedProgress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
        
        // Validate progress matches current parameters
        const expectedTotal = this.testMode ? this.testCount : realCourses.length;
        if (savedProgress.totalCourses !== expectedTotal) {
          console.warn(`⚠️  Progress file expects ${savedProgress.totalCourses} courses but current run expects ${expectedTotal}. Starting fresh.`);
        } else {
          console.log(`🔄 Resuming: ${savedProgress.coursesCompleted}/${savedProgress.totalCourses} courses completed`);
          return savedProgress;
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not load progress file, starting fresh:', error);
    }

    // Create new progress object
    const coursesToCrawl = this.testMode 
      ? realCourses.slice(0, this.testCount)
      : realCourses;

    return {
      totalCourses: coursesToCrawl.length,
      coursesCompleted: 0,
      coursesSkipped: 0,
      coursesFailed: 0,
      startTime: Date.now(),
      lastSaveTime: Date.now(),
      completedCourses: [],
      failedCourses: [],
      currentBatch: 1,
    };
  }

  /**
   * SAVE PROGRESS: Saves current state to disk so we can resume if interrupted
   * - Updates estimated time remaining
   * - Saves to JSON file
   * - Called every few courses to prevent data loss
   */
  private saveProgress(): void {
    try {
      // Calculate estimated time remaining
      const elapsed = Date.now() - this.progress.startTime;
      const coursesProcessed = this.progress.coursesCompleted + this.progress.coursesFailed;
      const remainingCourses = this.progress.totalCourses - coursesProcessed;
      
      if (coursesProcessed > 0) {
        const avgTimePerCourse = elapsed / coursesProcessed;
        this.progress.estimatedTimeRemaining = Math.round((avgTimePerCourse * remainingCourses) / 1000 / 60); // minutes
      }

      this.progress.lastSaveTime = Date.now();
      fs.writeFileSync(this.progressFile, JSON.stringify(this.progress, null, 2));
      
      console.log(`💾 Progress saved: ${coursesProcessed}/${this.progress.totalCourses} courses processed`);
      if (this.progress.estimatedTimeRemaining) {
        console.log(`⏱️  Estimated time remaining: ${this.progress.estimatedTimeRemaining} minutes`);
      }
    } catch (error) {
      console.error('❌ Failed to save progress:', error);
    }
  }

  /**
   * BUILD CRAWLED COURSES CACHE: One-time database query to load all fully crawled courses
   * - Queries CrawledCourse table (persistent tracking)
   * - Stores in memory for O(1) lookups
   * - Massive performance improvement over per-course database queries
   */
  private async buildCrawledCoursesCache(): Promise<void> {
    if (this.cacheBuilt) return;
    
    try {
      console.log(`🧠 Building cache of fully crawled courses...`);
      const startTime = Date.now();
      
      const crawledCourses = await prisma.crawledCourse.findMany({
        select: { courseCode: true }
      });
      
      // Add to cache
      crawledCourses.forEach(course => {
        this.crawledCoursesCache.add(course.courseCode);
      });
      
      const buildTime = Date.now() - startTime;
      this.cacheBuilt = true;
      
      console.log(`✅ Cache built: ${this.crawledCoursesCache.size} fully crawled courses (${buildTime}ms)`);
      console.log(`🚀 Performance: O(1) lookups instead of database queries for each course`);
      
    } catch (error) {
      console.error('❌ Failed to build crawled courses cache:', error);
      this.cacheBuilt = false; // Allow retry
    }
  }

  /**
   * INVALIDATE CACHE: Clears the in-memory cache and forces rebuild
   * - Useful if database is modified externally during crawling
   * - Cache will rebuild automatically on next lookup
   */
  public invalidateCache(): void {
    this.crawledCoursesCache.clear();
    this.cacheBuilt = false;
    console.log(`🔄 Cache invalidated - will rebuild on next lookup`);
  }

  /**
   * VALIDATE COURSE CODE: Check if course code has valid format
   * - Prevents SQL injection and invalid data
   * - Ensures only proper course codes are processed
   */
  private isValidCourseCode(courseCode: string): boolean {
    if (!courseCode || typeof courseCode !== 'string') {
      return false;
    }
    
    // Remove potential harmful characters and check format
    const sanitized = courseCode.trim().replace(/[;'"\\<>{}()\[\]]/g, '');
    const coursePattern = /^[A-Z]{2,5}\s+\d{4}$/;
    
    return coursePattern.test(sanitized) && sanitized === courseCode.trim();
  }

  /**
   * CHECK IF COURSE ALREADY CRAWLED: Ultra-fast duplicate detection
   * - Checks progress file first (current session)
   * - Checks in-memory cache second (O(1) lookup)
   * - No database queries per course = massive speed improvement
   */
  private async isCourseAlreadyCrawled(courseCode: string): Promise<boolean> {
    // Quick check: already completed in this session
    if (this.progress.completedCourses.includes(courseCode)) {
      return true;
    }

    // Build cache once if needed (one database query for all courses)
    await this.buildCrawledCoursesCache();
    
    // O(1) memory lookup instead of database query
    const wasAlreadyCrawled = this.crawledCoursesCache.has(courseCode.toUpperCase());
    
    if (wasAlreadyCrawled) {
      console.log(`🔍 ${courseCode} found in cache (previously crawled)`);
    }
    
    return wasAlreadyCrawled;
  }

  /**
   * CRAWL SINGLE COURSE: The main crawling logic
   * - Imports and uses our existing crawler
   * - Tracks statistics (posts, comments found)
   * - Handles errors gracefully
   * - Updates progress tracking
   */
  private async crawlSingleCourse(courseCode: string): Promise<{ success: boolean; stats?: any; error?: string }> {
    try {
      console.log(`\n🕷️  Crawling ${courseCode}...`);
      
      // Dynamic import to avoid circular dependencies
      const { SimpleComprehensiveCrawler } = await import('./crawl-reddit');
      const crawler = new SimpleComprehensiveCrawler();
      
      const startTime = Date.now();
      await crawler.searchAndStoreCourse(courseCode);
      const endTime = Date.now();
      
      // Get stats from database - count posts with PRIMARY mentions for this course
      const primaryMentions = await prisma.courseMention.count({
        where: { 
          courseCode: courseCode.toUpperCase(),
          mentionType: 'primary'
        }
      });
      
      // Count comments for posts where this course is primary
      const commentsCount = await prisma.comment.count({
        where: {
          post: {
            mentions: {
              some: {
                courseCode: courseCode.toUpperCase(),
                mentionType: 'primary'
              }
            }
          }
        }
      });
      
      const crawlStats = {
        timeElapsed: Math.round((endTime - startTime) / 1000),
        postsFound: primaryMentions,
        commentsFound: commentsCount
      };
      
      // Update global stats (only count new data from this session)
      this.stats.postsFound += crawlStats.postsFound;
      this.stats.commentsFound += crawlStats.commentsFound;
      this.stats.requestsMade += 1;
      
      console.log(`✅ ${courseCode}: ${crawlStats.postsFound} posts, ${crawlStats.commentsFound} comments (${crawlStats.timeElapsed}s)`);
      return { success: true, stats: crawlStats };
      
    } catch (error) {
      console.error(`❌ Failed to crawl ${courseCode}:`, error instanceof Error ? error.message : error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * DISPLAY PROGRESS: Shows comprehensive progress information
   * - Current course and percentage
   * - Speed statistics (courses per hour)
   * - Data statistics (total posts/comments found)
   * - Time estimates
   */
  private displayProgress(): void {
    const elapsed = Date.now() - this.progress.startTime;
    const elapsedMinutes = elapsed / 1000 / 60;
    const coursesProcessed = this.progress.coursesCompleted + this.progress.coursesFailed;
    const completionPercent = (coursesProcessed / this.progress.totalCourses * 100).toFixed(1);
    const coursesPerHour = coursesProcessed / (elapsedMinutes / 60);
    
    console.log(`\n📊 PROGRESS REPORT:`);
    console.log(`   Completed: ${this.progress.coursesCompleted}/${this.progress.totalCourses} (${completionPercent}%)`);
    console.log(`   Failed: ${this.progress.coursesFailed}`);
    console.log(`   Skipped: ${this.progress.coursesSkipped}`);
    console.log(`   Speed: ${coursesPerHour.toFixed(1)} courses/hour`);
    console.log(`   Data Found: ${this.stats.postsFound} posts, ${this.stats.commentsFound} comments`);
    
    if (this.progress.estimatedTimeRemaining) {
      console.log(`   ETA: ${this.progress.estimatedTimeRemaining} minutes remaining`);
    }
    console.log(`   ` + '='.repeat(50));
  }

  /**
   * MAIN CRAWL FUNCTION: Orchestrates the entire crawling process
   * - Gets list of courses to crawl
   * - Filters out already completed courses
   * - Crawls each course systematically
   * - Saves progress regularly
   * - Provides detailed reporting
   */
  async crawlAllCourses(): Promise<void> {
    try {
      console.log(`\n🚀 ${this.testMode ? 'TEST MODE' : 'FULL'} BULK COURSE CRAWLER STARTING`);
      console.log(`📚 Total courses to process: ${this.progress.totalCourses}`);
      console.log(`🔄 Already completed: ${this.progress.coursesCompleted}`);
      console.log(`⚡ Rate limiting: Intelligent delays to avoid Reddit 429s`);
      console.log(`💾 Progress saving: Every ${this.batchSize} courses`);
      
      // Get the list of courses to crawl
      const allCoursesToCrawl = this.testMode 
        ? realCourses.slice(0, this.testCount)
        : realCourses;
      
      // Filter out courses we've already completed
      const remainingCourses = allCoursesToCrawl.filter(course => 
        !this.progress.completedCourses.includes(course.code)
      );
      
      console.log(`🎯 Courses remaining to crawl: ${remainingCourses.length}\n`);
      
      if (remainingCourses.length === 0) {
        console.log(`🎉 All courses already completed! Nothing to do.`);
        return;
      }
      
      // Track courses discovered as already crawled during this run
      let coursesSkippedThisRun = 0;
      
      // Crawl each remaining course
      for (let i = 0; i < remainingCourses.length; i++) {
        const course = remainingCourses[i];
        const courseCode = course.code;
        
        // Validate course code format
        if (!this.isValidCourseCode(courseCode)) {
          console.log(`\n[${i + 1}/${remainingCourses.length}] Processing: ${courseCode}`);
          console.log(`❌ Skipping invalid course code: "${courseCode}"`);
          continue;
        }
        
        console.log(`\n[${i + 1}/${remainingCourses.length}] Processing: ${courseCode}`);
        console.log(''); // Add spacing
        
        // Skip if already crawled (double-check with database)
        if (await this.isCourseAlreadyCrawled(courseCode)) {
          console.log(`⏭️  ${courseCode} already has data, skipping...`);
          coursesSkippedThisRun++;
          continue;
        }
        
        // Crawl the course
        const result = await this.crawlSingleCourse(courseCode);
        
        if (result.success) {
          this.progress.coursesCompleted++;
          this.progress.completedCourses.push(courseCode);
          // Update cache to reflect newly crawled course
          this.crawledCoursesCache.add(courseCode.toUpperCase());
          
          // Mark as fully crawled in persistent storage (done by crawler itself)
          console.log(`🎯 Course ${courseCode} completed successfully`);
        } else {
          this.progress.coursesFailed++;
          this.progress.failedCourses.push({
            code: courseCode,
            error: result.error || 'Crawl failed',
            timestamp: Date.now()
          });
          console.log(`💥 Course ${courseCode} failed: ${result.error || 'Unknown error'}`);
        }
        
        // Save progress and show update every batch
        if ((i + 1) % this.batchSize === 0 || i === remainingCourses.length - 1) {
          this.saveProgress();
          this.displayProgress();
        }
        
        // Small delay between courses (the crawler has its own rate limiting)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Update final skipped count
      this.progress.coursesSkipped += coursesSkippedThisRun;
      
      // Final report
      await this.generateFinalReport();
      
    } catch (error) {
      console.error('💥 Bulk crawler failed:', error);
      this.saveProgress(); // Save progress even on failure
    } finally {
      await prisma.$disconnect();
    }
  }

  /**
   * FINAL REPORT: Comprehensive summary when crawling completes
   * - Total statistics
   * - Failed courses (if any)
   * - Performance metrics
   * - Next steps recommendations
   */
  private async generateFinalReport(): Promise<void> {
    const totalElapsed = Date.now() - this.progress.startTime;
    const totalHours = totalElapsed / 1000 / 60 / 60;
    
    console.log(`\n🎉 CRAWL COMPLETED!`);
    console.log(`=`.repeat(50));
    console.log(`📊 RESULTS:`);
    console.log(`   Time taken: ${totalHours.toFixed(1)} hours`);
    console.log(`   ✅ Successful: ${this.progress.coursesCompleted}`);
    console.log(`   ❌ Failed: ${this.progress.coursesFailed}`);
    console.log(`   ⏭️ Skipped: ${this.progress.coursesSkipped}`);
    console.log(`   📊 Data collected: ${this.stats.postsFound} posts, ${this.stats.commentsFound} comments`);
    
    if (this.progress.coursesFailed > 0) {
      console.log(`\n💥 FAILED COURSES (with reasons):`);
      this.progress.failedCourses.forEach(failure => {
        console.log(`   • ${failure.code}: ${failure.error}`);
      });
      console.log(`\n💡 Re-run this script to retry failed courses.`);
    } else {
      console.log(`\n🎉 All courses crawled successfully!`);
    }
    
    // Database summary
    try {
      const dbStats = await prisma.course.aggregate({
        _count: { courseCode: true },
        _sum: { totalPosts: true, totalComments: true }
      });
      
      console.log(`\n🗄️  DATABASE SUMMARY:`);
      console.log(`   Courses with data: ${dbStats._count.courseCode}`);
      console.log(`   Total posts: ${dbStats._sum.totalPosts || 0}`);
      console.log(`   Total comments: ${dbStats._sum.totalComments || 0}`);
    } catch (error) {
      console.warn('Could not generate database summary:', error);
    }
    
    // Clean up progress file for successful runs
    if (this.progress.coursesFailed === 0) {
      try {
        fs.unlinkSync(this.progressFile);
        console.log(`🧹 Progress file cleaned up (all courses successful)`);
      } catch (error) {
        console.warn('Could not clean up progress file:', error);
      }
    }
    
    console.log(`\n✅ Bulk crawl session complete!`);
    console.log(`=`.repeat(50));
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const isTestMode = args.includes('--test');
  const testCount = parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1] || '10');
  
  if (isTestMode) {
    console.log(`🧪 TEST MODE: Will crawl ${testCount} courses`);
  }
  
  const crawler = new BulkCourseCrawler(isTestMode, testCount);
  await crawler.crawlAllCourses();
}

// Only run if called directly (not imported)
if (require.main === module) {
  main().catch(console.error);
}

export { BulkCourseCrawler };
