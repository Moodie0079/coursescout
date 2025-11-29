# CourseScout

A course insight platform that analyzes Reddit discussions to provide students with comprehensive information about courses at their university. CourseScout crawls historical Reddit data, uses AI to extract meaningful insights, and enriches results with professor ratings from RateMyProfessors.

## 📚 Documentation

- **[Recent Updates (Nov 2025)](./RECENT_UPDATES.md)** - Latest features including AI caching, improved scoring, and token monitoring
- **[Changelog](./CHANGELOG.md)** - Detailed version history and technical changes
- **[Database System](./DATABASE_SYSTEM.md)** - Technical architecture and schema
- **[Cache Testing Guide](../TESTING_CACHE.md)** - Step-by-step testing instructions

## Features

- **AI-Powered Analysis**: GPT-4o-mini analyzes thousands of Reddit discussions to extract insights about course difficulty, workload, prerequisites, and student experiences
- **Intelligent Caching**: AI-generated insights cached in database - first search takes ~20s, subsequent searches ~100ms (200x faster!)
- **Professor Ratings**: Automatic integration with RateMyProfessors data, including ratings, difficulty scores, and would-take-again percentages
- **Database-First Architecture**: Pre-crawled Reddit data stored in PostgreSQL for instant search results
- **Comprehensive Coverage**: Historical analysis of all discussions mentioning courses
- **Performance Monitoring**: Real-time token usage tracking and API performance metrics

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js API routes with Prisma ORM
- **Database**: PostgreSQL with GIN and B-Tree indexes for optimal performance
- **AI**: OpenAI GPT-4o-mini for content analysis and insight extraction
- **Data Sources**: Reddit (crawled and stored), RateMyProfessors (on-demand with caching)

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL 15+

### Development Setup

#### 1. Install PostgreSQL

**Windows:**
- Download from [postgresql.org](https://www.postgresql.org/download/windows/)
- Run installer, set a password (remember it!)
- Install includes pgAdmin (GUI tool)

**Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### 2. Create Database

**Using pgAdmin (Windows/Mac):**
1. Open pgAdmin
2. Right-click "Databases" → Create → Database
3. Name: `coursescout_dev`

**Using Command Line:**
```bash
createdb coursescout_dev
```

#### 3. Project Setup

```bash
# Clone the repository
git clone https://github.com/Moodie0079/coursescout.git
cd coursescout

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your configuration
```

#### 4. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# .env file
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/coursescout_dev"
OPENAI_API_KEY="your_openai_api_key"
NODE_ENV="development"
```

Replace:
- `postgres` - your PostgreSQL username (default: postgres)
- `yourpassword` - your PostgreSQL password
- `coursescout_dev` - your database name

**Note:** This project uses `.env` (not `.env.local`) for all environment variables to ensure compatibility with all tools (Next.js, Prisma CLI, scripts).

#### 5. Initialize Database

```bash
# Apply database schema and indexes
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

**Your app is now running at http://localhost:3000!** 🎉

## Data Collection

### Crawl Individual Course
```bash
npx tsx scripts/crawl-reddit.ts "COMP 1005"
```

This will:
- Search r/CarletonU for all posts mentioning the course
- Extract all course codes mentioned in each post
- Store posts with their complete `courseCodes` array
- Mark the searched course as fully crawled (`hasFullCrawl: true`)
- Count all comments from relevant threads

### Bulk Crawl (Production)
```bash
# Crawl all courses in real-carleton-courses.json
npx tsx scripts/bulk-crawl-all-courses.ts

# Test with limited courses (10 courses)
npx tsx scripts/bulk-crawl-all-courses.ts --test
```

The bulk crawler automatically skips courses already marked as fully crawled, allowing you to resume interrupted crawls.

### Professor Data Management

Professor ratings are fetched automatically using an on-demand caching strategy:

**How it works:**
1. When a user searches for a course, the AI extracts professor names from Reddit discussions
2. For each professor, the system checks the database cache
3. **Cache hit (< 30 days old)**: Returns cached data immediately (~5-10ms)
4. **Cache miss or stale**: Fetches fresh data from RateMyProfessors via GraphQL API, stores it, and returns it
5. **Not found on RMP**: System stores a record to avoid repeated lookups, UI displays "No ratings available"

**Benefits:**
- No manual professor data management required
- Only fetches data for professors actually mentioned in searches
- Respects RateMyProfessors API limits through intelligent caching
- Automatic refresh of stale data (older than 30 days)

```bash
# Optional: clear all cached professor data (forces fresh lookups)
npm run professors:clear
```

### Cache Management

CourseScout caches AI-generated insights to dramatically improve performance:

**How it works:**
1. First search for a course: ~20 seconds (full AI processing, result is cached)
2. Subsequent searches: ~100ms (instant retrieval from cache)
3. Cache persists until manually cleared or yearly recrawl

**Benefits:**
- 200x faster response times for cached courses
- 90% reduction in OpenAI API costs for repeated searches
- Better user experience for popular courses

```bash
# Clear AI insights cache (forces fresh analysis on next search)
npm run cache:clear

# Clear professor cache (forces fresh RMP lookups)
npm run professors:clear
```

### Database Management
```bash
# Clear all data (posts, comments, courses, professors, cache)
npx tsx scripts/clear-database.ts

# Browse database visually
npx prisma studio
```

## Production Deployment

### Server Requirements
- Linux server with root access
- Node.js 18+
- PostgreSQL 12+
- Nginx (reverse proxy)
- PM2 (process manager)

### Initial Setup (One-Time)

**1. Clone and install:**
```bash
git clone https://github.com/yourusername/coursescout.git
cd coursescout
npm install
```

**2. Configure environment:**
```bash
# Create .env file
DATABASE_URL="postgresql://user:password@localhost:5432/coursescout_db"
OPENAI_API_KEY="your_key"
NODE_ENV="production"
```

**3. Set up database:**
```bash
npx prisma generate
npx prisma migrate deploy
```

**4. Build and start:**
```bash
npm run build
pm2 start npm --name "coursescout" -- start
pm2 save
pm2 startup
```

### Regular Deployments (Code Updates)

**Every time you push code changes:**

```bash
# SSH into server
ssh your_user@your_server
cd ~/coursescout

# Pull latest code
git pull origin main

# If database schema changed (check if new migration files exist):
npx prisma migrate deploy

# Restart application
pm2 restart coursescout
```

**Most deployments are just:** `git pull` → `pm2 restart`

## Project Structure

```
coursescout/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   └── course-insights/  # Main search endpoint
│   ├── components/           # React components
│   │   ├── SearchForm.tsx    # Course search interface
│   │   └── InsightsDisplay.tsx # Results display
│   └── page.tsx              # Main page
├── lib/                      # Core libraries
│   ├── services/             # Business logic layer
│   │   ├── course-insights-service.ts
│   │   └── professor-service.ts
│   ├── prompts/              # AI prompts
│   ├── utils/                # Utility functions
│   ├── ai-processor.ts       # AI analysis logic
│   ├── db-reddit-api.ts      # Database queries
│   ├── prisma.ts             # Database client
│   ├── config.ts             # Environment configuration
│   ├── constants.ts          # Application constants
│   ├── logger.ts             # Structured logging
│   └── errors.ts             # Custom error classes
├── types/                    # TypeScript type definitions
│   ├── api.ts                # API types
│   ├── domain.ts             # Domain models
│   ├── reddit.ts             # Reddit data types
│   └── ai-analysis.ts        # AI response types
├── prisma/                   # Database
│   ├── schema.prisma         # Database schema
│   └── migrations/           # Schema migration history
├── scripts/                  # Data collection scripts
│   ├── crawl-reddit.ts       # Single course crawler
│   ├── bulk-crawl-all-courses.ts
│   ├── clear-database.ts
│   └── clear-professors.ts
└── real-carleton-courses.json # Course catalog
```

## Database Schema

### Tables

**Course**: Course metadata and statistics
- `courseCode` (PK): Course identifier (e.g., "COMP 1005")
- `totalPosts`, `totalComments`: Statistics
- `hasFullCrawl`: Whether course has been explicitly crawled
- `lastCrawledAt`: Timestamp of last crawl
- `firstPostDate`, `latestPostDate`: Date range

**Post**: Reddit posts
- `id` (PK): Reddit post ID
- `courseCodes` (Array): All courses mentioned in this post
- `title`, `body`, `score`, `createdUtc`, `permalink`
- **GIN Index** on `courseCodes` for fast array searches

**Comment**: Reddit comments
- `id` (PK): Reddit comment ID
- `postId` (FK): Links to Post
- `body`, `score`, `author`, `createdUtc`, `permalink`

**Professor**: Cached RateMyProfessors data
- `id` (PK): Database ID
- `rmpId`: RateMyProfessors legacy ID (for direct linking)
- `fullName`, `avgRating`, `numRatings`, `avgDifficulty`, `wouldTakeAgain`
- `searchNames` (Array): Name variations for fuzzy matching
- `lastCheckedAt`: For 30-day staleness checks

### Indexes

- **GIN index** on `Post.courseCodes` - Fast array contains queries
- **B-Tree indexes** on `Post.score`, `Post.createdUtc` - Optimized sorting
- **Composite index** on `(score, createdUtc)` - Multi-field sorting
- **B-Tree indexes** on `Professor.searchNames`, `Professor.lastCheckedAt`

See `GIN_INDEX_EXPLANATION.md` for detailed performance analysis.

## How It Works

### 1. Data Collection (Crawling)

The crawler searches Reddit's r/CarletonU for each course:
- Generates search variations (e.g., "COMP 1005", "COMP1005", "comp 1005")
- Fetches all matching posts using Reddit's JSON API
- Extracts ALL course codes mentioned in each post using regex pattern: `/([A-Z]{4})\s*(\d{4})/g`
- Stores posts with complete `courseCodes` array
- Marks searched course as `hasFullCrawl: true`, others as `false`
- Fetches complete comment trees for each post (up to 1000 comments, 10 levels deep)
- Stores all comments linked to their parent post

**Important:** A course can appear in the database without being fully crawled if it was mentioned in another course's post.

### 2. User Search Flow

When a user searches for "COMP 1005":

1. **Database Query** (~5-10ms)
   - Uses GIN index to find all posts where `courseCodes` contains "COMP 1005"
   - Retrieves top posts sorted by score and date
   - Fetches associated comments

2. **AI Analysis** (~3-5 seconds)
   - Sends post + comment data to GPT-4o-mini
   - AI extracts: difficulty, workload, pros/cons, recommendations, prerequisites, professor names
   - Returns structured JSON response

3. **Professor Data Enrichment** (~50-200ms per professor)
   - For each professor mentioned by AI:
     - Check database cache
     - If missing or stale (>30 days): fetch from RateMyProfessors GraphQL API
     - Store in database for future requests
   - Attach ratings to professor objects

4. **Response** (~3-6 seconds total)
   - Returns course insights with professor ratings
   - Frontend displays results

### 3. Course Tracking

**Primary Course (hasFullCrawl: true):**
- Course was explicitly searched for during crawling
- All relevant posts and comments have been collected
- Statistics (`totalPosts`, `totalComments`) are complete

**Secondary Course (hasFullCrawl: false):**
- Course was discovered mentioned in another course's post
- Statistics may be incomplete
- Will show proper data if user searches for it and it has posts
- System treats courses with 0 posts/comments as "not discussed"

## Performance

### Database Performance
- **GIN Indexes**: Enable O(log n) array searches instead of O(n) table scans
- **Query Speed**: 5,000 posts = ~5ms (with index) vs ~500ms (without)
- **Scaling**: 50,000 posts = ~10ms with GIN index
- **Connection Pooling**: Singleton Prisma client prevents connection exhaustion

### Caching Strategy
- **Professor Data**: 30-day cache reduces RMP API calls by ~95%
- **Database-First**: No live Reddit API calls during searches
- **Smart Refresh**: Only fetches stale data when accessed

### API Response Times

**First Search (Cache Miss):**
- Database search: 5-10ms
- AI analysis: 18-25 seconds
- Professor enrichment: 50-200ms per professor
- Cache storage: 10-20ms
- **Total**: 20-30 seconds

**Repeat Search (Cache Hit):**
- Cache lookup: 50-100ms
- **Total**: ~100ms (200x faster!)

**Cache Coverage:**
- Popular courses: >90% cache hit rate
- Average: ~70% cache hit rate after initial population

## Security Features

- **Input Validation**: Course codes sanitized and validated before database queries
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **Environment Variables**: Sensitive keys stored in `.env` (not in git)
- **Rate Limiting**: Reddit crawler respects API rate limits automatically
- **Error Handling**: Structured error classes with appropriate logging

## Scripts Reference

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint

# Data Collection
npx tsx scripts/crawl-reddit.ts "COMP 1005"      # Crawl single course
npx tsx scripts/bulk-crawl-all-courses.ts        # Crawl all courses
npx tsx scripts/bulk-crawl-all-courses.ts --test # Test mode (10 courses)

# Database Management
npx tsx scripts/clear-database.ts                # Clear all data
npx tsx scripts/clear-insights-cache.ts          # Clear AI insights cache
npx tsx scripts/clear-professors.ts              # Clear professor cache only
npx prisma studio                                # Browse database GUI
npx prisma migrate deploy                        # Apply migrations

# Cache Management
npm run cache:clear       # Clear AI insights cache
npm run professors:clear  # Clear professor cache
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `psql -l`

### Empty Search Results
- Course must be crawled first: `npx tsx scripts/crawl-reddit.ts "COURSE CODE"`
- Check database: `npx prisma studio`
- Courses with 0 posts/comments show "no discussions found"

### Slow Queries
- Verify indexes exist: `npx prisma migrate deploy`
- Check query performance in logs
- See `GIN_INDEX_EXPLANATION.md` for optimization details

### OpenAI Errors
- Verify `OPENAI_API_KEY` in `.env`
- Check API quota/billing at platform.openai.com
- Review error logs for specific error messages

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License.
