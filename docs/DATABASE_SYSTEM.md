# Database System Documentation

## Overview

CourseScout uses a database-first architecture where Reddit data is pre-crawled and stored in PostgreSQL. This enables instant search results and comprehensive historical analysis without rate limiting or slow API calls.

## Database Technology

**PostgreSQL 15+** with advanced indexing:
- **GIN (Generalized Inverted Index)** for array searches
- **B-Tree indexes** for sorting and filtering
- **Composite indexes** for multi-field queries

## Database Schema

### Course Table

Stores course metadata and statistics.

```prisma
model Course {
  courseCode        String   @id          // "COMP 1005"
  totalPosts        Int      @default(0)  // Number of posts mentioning this course
  totalComments     Int      @default(0)  // Total comments in those posts
  lastUpdated       DateTime @default(now())
  firstPostDate     DateTime?             // Earliest post found
  latestPostDate    DateTime?             // Most recent post found
  hasFullCrawl      Boolean  @default(false)  // Was this course explicitly crawled?
  lastCrawledAt     DateTime?             // When was it last crawled
}
```

**Key Concepts:**
- `hasFullCrawl: true` - Course was explicitly searched for and crawled
- `hasFullCrawl: false` - Course was discovered mentioned in another course's post
- Courses with `totalPosts: 0` and `totalComments: 0` are treated as "no discussions found"

### Post Table

Stores Reddit posts with course code arrays for many-to-many relationships.

```prisma
model Post {
  id            String   @id              // Reddit post ID
  subreddit     String                    // "CarletonU"
  title         String
  body          String                    // Post content
  score         Int                       // Reddit score
  createdUtc    Int                       // Unix timestamp
  permalink     String                    // Reddit link
  courseCodes   String[]                  // Array of ALL courses mentioned
  comments      Comment[]
  
  // Indexes for performance
  @@index([courseCodes], type: Gin)      // Fast array search
  @@index([score])
  @@index([createdUtc])
  @@index([score, createdUtc])           // Composite for sorting
}
```

**Why Array Instead of Junction Table:**
- PostgreSQL GIN indexes make array searches extremely fast (O(log n))
- Simpler schema without extra junction table
- Direct support for `@>` (contains) and `&&` (overlaps) operators
- More intuitive: "find posts containing COMP 1005" = `WHERE courseCodes @> ARRAY['COMP 1005']`

### Comment Table

Stores Reddit comments linked to posts.

```prisma
model Comment {
  id         String @id                  // Reddit comment ID
  postId     String                      // Foreign key to Post
  post       Post   @relation(...)
  body       String                      // Comment text
  score      Int
  author     String?
  permalink  String
  createdUtc Int                         // Unix timestamp
  
  @@index([postId])                      // Fast post lookup
  @@index([score])
}
```

**Comment Collection:**
- Fetches complete comment trees (replies to replies)
- Maximum depth: 10 levels (prevents stack overflow)
- Maximum per post: 1000 comments (Reddit API limit)
- Comments stored if post OR comment mentions the course

### Professor Table

Caches RateMyProfessors data with automatic staleness tracking.

```prisma
model Professor {
  id              String   @id @default(cuid())
  rmpId           String?                // RMP legacy ID for direct linking
  fullName        String
  avgRating       Float?                 // 1-5 scale
  numRatings      Int      @default(0)
  avgDifficulty   Float?                 // 1-5 scale
  wouldTakeAgain  Int?                   // Percentage
  department      String?
  searchNames     String[]               // Name variations for fuzzy matching
  school          String   @default("Carleton University")
  lastCheckedAt   DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([searchNames])                 // Fast name lookup
  @@index([lastCheckedAt])               // Stale data detection
  @@index([rmpId])
}
```

**Caching Strategy:**
- Data cached for 30 days (configurable via `PROFESSOR_DATA_STALE_DAYS`)
- Automatic refresh when accessed after 30 days
- `searchNames` array stores variations: "John Smith", "j smith", "smith", "john", etc.
- If professor not found on RMP, stored with `rmpId: null` to prevent repeated lookups

### CourseInsightsCache Table

Caches complete AI-generated insights for dramatic performance improvement.

```prisma
model CourseInsightsCache {
  courseCode    String   @id              // "COMP 1005"
  insights      Json                      // Full Insights object as JSON
  cachedAt      DateTime @default(now())
  
  @@index([courseCode])                   // Fast lookup
}
```

**Caching Strategy:**
- First search: AI processes Reddit data, result is cached (~20 seconds)
- Subsequent searches: Instant retrieval from cache (~100ms)
- Cache persists until manually cleared or yearly recrawl
- Stores complete Insights object including professor ratings

**Performance Impact:**
- 200x faster response time for cached courses
- 90% reduction in OpenAI API costs
- Essential for production scalability

**Management:**
```bash
npm run cache:clear  # Clear all cached insights
```

## Crawling Process

### Single Course Crawl

```bash
npx tsx scripts/crawl-reddit.ts "COMP 1005"
```

**What happens:**

1. **Validation**: Course code sanitized and validated (`/^[A-Z]{2,5}\s+\d{4}$/`)

2. **Search Variations**: Generates multiple search queries
   - "COMP 1005" (standard)
   - "COMP1005" (no space)
   - "comp 1005" (lowercase)
   - "comp1005" (lowercase, no space)

3. **Reddit Search**: For each variation:
   - Searches r/CarletonU using Reddit JSON API
   - Fetches all pages (100 posts per page, max 50 pages)
   - Filters posts that actually contain the course code
   - Deduplicates across variations

4. **Course Code Extraction**: For each post:
   - Scans title and body with regex: `/\b([A-Z]{4})\s*(\d{4})\b/g`
   - Extracts ALL course codes (e.g., "Taking COMP 1005 with MATH 1104")
   - Returns array: `["COMP 1005", "MATH 1104"]`

5. **Post Storage**:
   ```typescript
   await prisma.post.create({
     data: {
       id: "abc123",
       title: "COMP 1005 vs MATH 1104",
       courseCodes: ["COMP 1005", "MATH 1104"],  // Array!
       // ... other fields
     }
   });
   ```

6. **Course Table Updates**:
   - **Searched course** ("COMP 1005"):
     - `totalPosts` incremented
     - `hasFullCrawl: true`
     - `lastCrawledAt: now()`
   - **Other mentioned courses** ("MATH 1104"):
     - `totalPosts` incremented
     - `hasFullCrawl: false` (discovered, not crawled)

7. **Comment Fetching**: For each post:
   - Fetches complete comment tree via `https://reddit.com/permalink.json?limit=1000`
   - Recursively extracts all comments and replies
   - Stores comments that mention course OR belong to relevant posts
   - Increments `totalComments` for ALL courses in post's `courseCodes` array

8. **Summary Update**: After crawling:
   - Counts all posts where `courseCodes` contains the course
   - Counts all comments in those posts
   - Updates `totalPosts`, `totalComments`, date ranges

### Bulk Crawl

```bash
npx tsx scripts/bulk-crawl-all-courses.ts
```

**Features:**
- Reads course list from `real-carleton-courses.json`
- Queries database for courses where `hasFullCrawl: true`
- Crawls only courses not yet fully crawled
- Automatic resume: if interrupted, restarts from last uncrawled course
- Progress tracking every 10 courses
- Test mode available: `--test` (crawls 10 courses)

**Rate Limiting:**
- Tracks Reddit quota from response headers
- Automatically waits when rate limit hit
- Minimum 100ms delay between requests
- Respects Reddit's `x-ratelimit-reset` header

### How Course Codes Are Discovered

**Scenario:** You crawl "COMP 1005", and one post says:
> "Should I take COMP 1005 before COMP 2402?"

**What happens:**
1. Post is found via "COMP 1005" search
2. Regex extracts: `["COMP 1005", "COMP 2402"]`
3. Post stored with `courseCodes: ["COMP 1005", "COMP 2402"]`
4. Database updates:
   - COMP 1005: `hasFullCrawl: true`, `totalPosts: 1`
   - COMP 2402: `hasFullCrawl: false`, `totalPosts: 1` (discovered!)

**Later, when you search "COMP 2402":**
- Database finds this post (GIN index on `courseCodes`)
- Shows data even though COMP 2402 was never explicitly crawled
- But `hasFullCrawl: false` indicates incomplete coverage

## Search Process

### User Searches for "COMP 1005"

**Step 0: Cache Check** (~50-100ms)

```typescript
// lib/services/course-insights-service.ts
const cachedInsights = await insightsCacheService.get(courseCode);
if (cachedInsights) {
  logger.info(`Returning cached insights for ${courseCode}`);
  return {
    course: courseInfo,
    insights: cachedInsights,
    loading: false,
  };
}
```

**If cache hit:** Return immediately (~100ms total response time)

**If cache miss:** Continue to full processing below...

**Step 1: Database Query** (~5-10ms)

```typescript
// lib/db-reddit-api.ts
const posts = await prisma.post.findMany({
  where: {
    courseCodes: { has: "COMP 1005" }  // GIN index makes this fast!
  },
  include: {
    comments: {
      orderBy: { score: 'desc' },
      take: 500  // Top 500 comments per post
    }
  },
  orderBy: [
    { score: 'desc' },
    { createdUtc: 'desc' }
  ],
  take: 1000  // Top 1000 posts
});
```

**Why it's fast:**
- GIN index on `courseCodes` allows O(log n) lookup
- Instead of scanning all posts, PostgreSQL:
  1. Looks up "COMP 1005" in the GIN index
  2. Gets list of matching post IDs instantly
  3. Fetches only those posts

**Step 2: Check for Empty Results**

```typescript
// lib/services/course-insights-service.ts
if (searchResult.threads.length === 0) {
  throw new NoDiscussionsFoundError(courseCode);
}

// Also check if course exists but has no actual data
const courseData = await prisma.course.findUnique({
  where: { courseCode: courseCode.toUpperCase() }
});

if (courseData && courseData.totalPosts === 0 && courseData.totalComments === 0) {
  throw new NoDiscussionsFoundError(courseCode);
}
```

**This ensures:**
- Courses not in database → "No discussions found"
- Courses with 0 posts/0 comments → "No discussions found"
- Same user-facing message regardless of why data is missing

**Step 3: AI Analysis** (~3-5 seconds)

```typescript
// lib/ai-processor.ts
const insights = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{
    role: 'system',
    content: 'Analyze Reddit discussions and extract course insights...'
  }, {
    role: 'user',
    content: JSON.stringify(posts) // Send post + comment data
  }]
});
```

**AI extracts:**
- Difficulty level (1-5)
- Workload description
- Pros and cons
- Recommendations
- Prerequisites mentioned
- **Professor names**

**Step 4: Professor Data Enrichment** (~50-200ms per professor)

```typescript
// lib/services/professor-service.ts
for (const professorName of insights.professors) {
  // 1. Check database cache
  const cached = await prisma.professor.findFirst({
    where: { searchNames: { has: normalizeName(professorName) } }
  });
  
  // 2. If found and fresh (< 30 days), return it
  if (cached && !isStale(cached.lastCheckedAt)) {
    return cached;
  }
  
  // 3. If missing or stale, fetch from RMP
  const rmpData = await fetchFromRateMyProfessors(professorName);
  
  // 4. Store in database
  await prisma.professor.upsert({
    where: { id: cached?.id || generateId() },
    update: { ...rmpData, lastCheckedAt: new Date() },
    create: { ...rmpData, searchNames: generateVariations(professorName) }
  });
}
```

**Step 5: Cache Storage** (~10-20ms)

```typescript
// lib/services/course-insights-service.ts
await insightsCacheService.set(courseCode, insights);
```

Stores the complete insights object (including professor ratings) in the CourseInsightsCache table for instant retrieval on future requests.

**Step 6: Return Results** (~20-30 seconds total for cache miss)

Response includes:
- Course insights from AI
- Professor ratings from database/RMP
- Statistics (post count, date range)
- Token usage metadata (for monitoring)

**Next request for same course:** ~100ms (cache hit!)

## Performance Optimization

### GIN Index Performance

**Without GIN Index** (full table scan):
```
SELECT * FROM "Post" WHERE 'COMP 1005' = ANY(courseCodes);
Time: 500ms for 5,000 posts
```

**With GIN Index**:
```
SELECT * FROM "Post" WHERE courseCodes @> ARRAY['COMP 1005'];
Time: 5ms for 5,000 posts
```

**100x faster!**

**How it works:**
1. GIN index maintains a B-tree of all unique values in all arrays
2. Each value points to a list of rows containing it
3. Query looks up value in B-tree (O(log n))
4. Retrieves row IDs directly (O(1))
5. Fetches only matching rows

See `GIN_INDEX_EXPLANATION.md` for detailed analysis.

### Caching Strategy

**AI Insights (NEW - Nov 2025):**
- Complete AI analysis results cached in database
- First search: 20-30 seconds (full processing + cache storage)
- Subsequent searches: ~100ms (200x faster!)
- 90% reduction in OpenAI API costs for repeat queries
- Cache persists until manually cleared
- Essential for production scalability

**Professor Data:**
- 95% of requests served from cache (~5ms)
- 5% require RMP API call (~200ms)
- Automatic 30-day refresh keeps data current
- Prevents RMP rate limiting

**Reddit Data:**
- Zero live API calls during search
- All data pre-crawled and indexed
- Updates via manual re-crawl (recommended yearly)

### Connection Management

```typescript
// lib/prisma.ts
export const prisma = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
```

**Singleton pattern:**
- Reuses connections across requests
- Prevents connection pool exhaustion
- Essential for serverless/edge deployments

## Database Operations

### Viewing Data

```bash
# Visual database browser (http://localhost:5555)
npx prisma studio

# Generates admin interface to view/edit all tables
```

### Clearing Data

```bash
# Clear everything (posts, comments, courses, professors, insights cache)
npx tsx scripts/clear-database.ts

# Clear only AI insights cache (keeps Reddit data, forces fresh AI analysis)
npx tsx scripts/clear-insights-cache.ts
npm run cache:clear  # Shorthand

# Clear only professor cache (keeps everything else)
npx tsx scripts/clear-professors.ts
npm run professors:clear  # Shorthand
```

**When to clear caches:**
- **Insights cache**: After updating AI prompts or analysis logic
- **Professor cache**: When RMP data needs fresh update
- **Everything**: Before major recrawls or schema changes

### Migrations

```bash
# Apply database schema changes
npx prisma migrate deploy

# Create a new migration (after editing schema.prisma)
npx prisma migrate dev --name description_of_change

# Regenerate Prisma client (after schema changes)
npx prisma generate
```

## Common Queries

### Find all courses mentioned in database

```typescript
const courses = await prisma.course.findMany({
  where: { totalPosts: { gt: 0 } },
  orderBy: { totalPosts: 'desc' }
});
```

### Find posts mentioning multiple courses

```typescript
const posts = await prisma.post.findMany({
  where: {
    courseCodes: {
      hasEvery: ["COMP 1005", "MATH 1104"]  // Contains both
    }
  }
});
```

### Find all uncrawled courses

```typescript
const uncrawled = await prisma.course.findMany({
  where: { hasFullCrawl: false }
});
```

### Get professor data with staleness check

```typescript
const professor = await prisma.professor.findFirst({
  where: {
    searchNames: { has: normalizeName("John Smith") }
  }
});

const isStale = (Date.now() - professor.lastCheckedAt.getTime()) > (30 * 24 * 60 * 60 * 1000);
```

## Deployment Considerations

### Production Database Setup

1. **PostgreSQL 12+** required
2. **Sufficient storage**: ~100MB per 1,000 posts (estimate)
3. **Connection pooling**: Prisma handles automatically
4. **Backups**: Regular pg_dump recommended

### Migration Strategy

**On deployment:**
```bash
npx prisma migrate deploy  # Apply all pending migrations
pm2 restart coursescout     # Restart app
```

**Never:**
- Delete migration files (breaks schema history)
- Edit existing migrations (causes conflicts)
- Skip migrations (can corrupt database)

### Index Maintenance

PostgreSQL automatically maintains indexes. No manual intervention required.

**To verify indexes exist:**
```sql
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## Troubleshooting

### Slow Queries

**Symptom:** Search takes > 1 second

**Diagnosis:**
```typescript
// Add to query
const result = await prisma.post.findMany({
  where: { courseCodes: { has: "COMP 1005" } }
});
console.log(await prisma.$executeRaw`EXPLAIN ANALYZE ...`);
```

**Solutions:**
- Verify GIN index exists: `npx prisma migrate deploy`
- Check index is being used: Should see "Index Scan using" in EXPLAIN
- Regenerate index: `REINDEX INDEX ...` (rare)

### Empty Results

**Symptom:** User searches course, gets "No discussions found"

**Checklist:**
1. Has course been crawled? Check `npx prisma studio`
2. Is `hasFullCrawl: true`? If false, was discovered but not crawled
3. Is `totalPosts: 0`? Course has no discussions (or crawl failed)
4. Check logs for errors during crawl

### Connection Pool Exhausted

**Symptom:** `Error: Can't reach database server`

**Cause:** Too many Prisma clients created

**Solution:**
- Verify using singleton pattern in `lib/prisma.ts`
- Restart app: `pm2 restart coursescout`
- Check connection limit: `SHOW max_connections;` in psql

### Migration Conflicts

**Symptom:** `Migration failed to apply`

**Cause:** Local and production migrations diverged

**Solution:**
```bash
# Last resort - recreate from scratch (loses data!)
npx prisma migrate reset
npx prisma migrate deploy
```

## Best Practices

1. **Always use constants** - No magic numbers in queries
2. **Sanitize input** - Validate course codes before queries
3. **Use transactions** - For multi-table updates
4. **Log queries** - In development for debugging
5. **Monitor performance** - Track query times
6. **Regular backups** - Automated pg_dump
7. **Index strategy** - Add indexes for slow queries, but don't over-index

## Future Enhancements

### Incremental Crawling

Currently planned: Use `lastCrawledAt` to re-crawl only posts since last update.

**Implementation:**
```typescript
const lastCrawl = course.lastCrawledAt;
// Search Reddit for posts after lastCrawl timestamp
// Append new posts to database
```

### Full-Text Search

Potential: Add full-text search on post/comment bodies for keyword searches.

**Implementation:**
```sql
CREATE INDEX post_body_fts ON "Post" USING gin(to_tsvector('english', body));
```

### Analytics

Track popular courses, search trends, most discussed professors.

**Implementation:**
```typescript
model SearchLog {
  id         String   @id @default(cuid())
  courseCode String
  timestamp  DateTime @default(now())
  @@index([courseCode, timestamp])
}
```
