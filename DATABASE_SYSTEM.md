# Database System Overview

## Purpose

This document explains the database-driven architecture that powers CourseScout's fast course insights.

## Core Concept

Instead of making live API calls to Reddit during user requests, CourseScout pre-crawls and stores discussion data in a local database. This enables:

- Instant response times (3-5 seconds vs 30+ seconds)
- No rate limiting issues for users
- Comprehensive historical data analysis
- Reliable service availability

## Database Schema

### Core Tables

**Course** - Summary statistics for each course
- `courseCode` - Primary key (e.g., "COMP 1005")
- `totalPosts` - Number of Reddit posts mentioning this course
- `totalComments` - Number of comments across all posts
- `firstPostDate` - Earliest discussion found
- `latestPostDate` - Most recent discussion
- `lastUpdated` - When data was last refreshed

**Post** - Individual Reddit posts
- `id` - Reddit post ID
- `title` - Post title
- `body` - Post content
- `score` - Reddit score
- `permalink` - Link to original post
- `courseCode` - Primary course this post discusses

**Comment** - Reddit comments on posts
- `id` - Reddit comment ID
- `postId` - Links to Post table
- `body` - Comment content
- `score` - Comment score
- `author` - Username
- `permalink` - Direct link to comment

**CourseMention** - Links posts to all courses mentioned
- `courseCode` - Course that was mentioned
- `postId` - Post containing the mention
- `mentionType` - "primary" (main topic) or "secondary" (mentioned in passing)

**CrawledCourse** - Tracks crawling progress
- `courseCode` - Course that has been fully crawled
- `crawledAt` - When it was crawled
- `lastUpdated` - Last update time

## Data Collection Process

### 1. Course Discovery
```bash
npx tsx scripts/get-real-carleton-courses.ts
```
Scrapes Carleton's official course catalog to get all valid course codes.

### 2. Individual Course Crawling
```bash
npx tsx scripts/crawl-reddit.ts "COMP 1005"
```
Searches Reddit for all mentions of a specific course, stores posts and comments.

### 3. Bulk Crawling
```bash
npx tsx scripts/bulk-crawl-all-courses.ts
```
Systematically crawls all Carleton courses with progress tracking and duplicate detection.

### 4. Database Inspection
```bash
npx tsx scripts/browse-courses.ts
```
View summary statistics of crawled data.

### 5. Database Reset
```bash
npx tsx scripts/clear-database.ts
```
Clear all data to start fresh.

## How It Works

1. **Pre-crawling**: Scripts collect Reddit discussions and store them locally
2. **User Request**: Frontend sends course code to API
3. **Database Lookup**: Fast query retrieves relevant posts and comments
4. **AI Analysis**: OpenAI analyzes the stored content
5. **Response**: Insights returned to user in seconds

## Benefits

- **Speed**: Database queries are milliseconds vs seconds for API calls
- **Reliability**: No dependency on Reddit API availability during user requests
- **Comprehensiveness**: Can analyze years of historical data
- **Scalability**: Supports unlimited concurrent users
- **Cost Control**: Predictable crawling costs vs unpredictable live API usage

## Development vs Production

**Development**
- Uses SQLite (`dev.db` file)
- Single-user database
- Perfect for testing and development

**Production**
- Uses PostgreSQL
- Multi-user capable
- Supports high traffic loads
- Requires database server setup

## Crawling Strategy

The system tracks which courses have been fully crawled to avoid duplicate work:

- **First run**: Crawls everything for a course
- **Subsequent runs**: Skips already-crawled courses
- **Manual override**: Can force re-crawl specific courses
- **Progress tracking**: Maintains state across multiple crawl sessions

This makes it efficient to run bulk crawls incrementally without re-doing completed work.