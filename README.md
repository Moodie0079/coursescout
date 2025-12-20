# CourseScout

A web application that helps students make informed course selection decisions by analyzing real Reddit discussions from university communities. Built with Next.js, React, Typscript and PostgreSQL.

## What It Does

CourseScout crawls and analyzes student discussions from Reddit to provide comprehensive course insights. When you search for a course, it shows you difficulty ratings, workload assessments, professor feedback, and common opinions - all backed by actual student comments with direct citations to the source discussions.

## Technology Stack

**Frontend**
- Next.js with React
- TypeScript
- Tailwind CSS for styling

**Backend**
- Next.js API Routes
- Prisma ORM for database access
- OpenAI GPT-4o-mini for analysis
- PostgreSQL with GIN indexing

**Analytics**
- Google Analytics for analytics

## How It Works

### Data Collection

The app uses a pre-crawled database for instant searches:

1. **Crawling**: Scripts fetch posts and comments from university subreddits (like r/CarletonU)
2. **Storage**: All data is stored in PostgreSQL with course codes extracted and indexed
3. **Processing**: When you search, the app retrieves relevant discussions from the database
4. **Analysis**: OpenAI processes the discussions to extract insights (difficulty, workload, pros/cons etc)
5. **Caching**: Results are cached in the database for instant future retrievals

### Database Structure

The database has 6 main tables:

**Course** - Stores course metadata and statistics (total posts, comments, last updated)

**Post** - Reddit posts with a `courseCodes` array field. Uses GIN indexing for fast array searches.

**Comment** - Reddit comments linked to posts

**Professor** - Cached RateMyProfessors data with 30-day staleness tracking

**CourseCache** - Complete AI analysis results stored as JSON for instant repeat queries

**SearchStats** - Tracks how many times each course has been searched

### Caching Strategy

First search for a course: ~20-30 seconds (full OpenAI analysis)
Second search: <100ms (retrieved from cache)

This makes the app fast while keeping OpenAI costs low.

## Getting Started

### Installation

```bash
# Clone and install
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables

Create a `.env` file:

```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/coursescout"
OPENAI_API_KEY="sk-proj-..."

# Optional
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"  # Google Analytics

# Feedback Form (Optional)
FEEDBACK_EMAIL="your-email@gmail.com"  # Where to receive feedback
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"  # Generate at https://myaccount.google.com/apppasswords
```

### Database Setup

Install PostgreSQL:

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Windows:** Download from [postgresql.org](https://www.postgresql.org/download/windows/)

Create the database:

```sql
CREATE DATABASE coursescout;
CREATE USER coursescout_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE coursescout TO coursescout_user;
```

Run migrations to create tables:

```bash
npx prisma migrate deploy
npx prisma generate
```

### Crawling Data

Before the app can work, you need to crawl Reddit data:

```bash
# Crawl a single course 
npm run crawl:single

# Crawl all courses from real-carleton-courses.json (this has all Carleton Courses)
npm run crawl:bulk

# Test with 10 courses (for testing)
npm run crawl:test
```

The crawler:
- Searches multiple variations of course codes ("COMP 1005", "COMP1005", etc.)
- Fetches complete comment trees
- Extracts all course codes mentioned in posts
- Respects Reddit rate limits automatically
- Can resume if interrupted

### Start the App

```bash
npm run dev
```

Visit http://localhost:3000

## Available Commands

**Development:**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run linter
```

**Database:**
```bash
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio (visual database browser)
npm run db:clear     # Clear all data
```

**Data Management:**
```bash
npm run crawl:single     # Crawl one course
npm run crawl:bulk       # Crawl all courses
npm run crawl:test       # Test with 10 courses
npm run cache:clear      # Clear AI analysis cache
npm run professors:clear # Clear professor cache
npm run stats:view       # View search statistics
```

## Google Analytics Setup

If you want usage tracking:

1. Create a Google Analytics 4 property at [analytics.google.com](https://analytics.google.com)
2. Get your Measurement ID (format: `G-XXXXXXXXXX`)
3. Add it to `.env`: `NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"`
4. Restart the server

The app tracks page views, course searches, and errors. Data appears in your Google Analytics dashboard.

## Feedback Form

The app includes a user feedback form at `/feedback`. To enable email notifications:

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Add the email configuration to your `.env` file (see Environment Variables section)
4. Restart the server

Users can then submit feedback which will be emailed directly to you.

## API

The app exposes one main endpoint:

**POST** `/api/course-insights`

Request:
```json
{
  "course": "COMP 2804",
  "trackSearch": true
}
```

Response:
```json
{
  "course": {
    "code": "COMP 2804",
    "title": "COMP 2804"
  },
  "insights": {
    "summary": "...",
    "difficulty": { "score": 7, "reason": "..." },
    "workload": { "score": 6, "reason": "..." },
    "pros": ["..."],
    "cons": ["..."],
    "professors": [...],
    "quotes": [...],
    "citations": [...],
    "threadSources": [...],
    "coverage": {
      "threadsConsidered": 61,
      "threadsUsed": 61,
      "commentsConsidered": 450
    },
    "confidence": 0.9
  },
  "loading": false
}
```

Status codes:
- `200` - Success
- `400` - Invalid course code
- `404` - No discussions found
- `500` - Server error

## Performance

**Typical response times:**
- Cached course: <100ms
- New course: 20-30 seconds (depends on discussion volume)
- Database queries: <500ms

**Optimizations used:**
- GIN indexes for fast array searches
- Database caching
- Exponential backoff for API failures

## Deployment

### Build

```bash
npm install
npm run build
```

### Options

**Linux server with PM2:** 
```bash
npm run build
pm2 start npm --name "coursescout" -- start
pm2 save
pm2 startup
```

Make sure to set all environment variables in production and run database migrations after deployment.

## Project Structure

```
coursescout/
├── app/
│   ├── api/course-insights/    # Main API endpoint
│   ├── components/             # React components
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── lib/
│   ├── services/               # Business logic
│   ├── types/                  # TypeScript types
│   ├── prompts/                # AI prompts
│   ├── ai-processor.ts         # OpenAI integration
│   ├── analytics.ts            # Google Analytics
│   ├── config.ts               # Config validation
│   ├── constants.ts            # App constants
│   └── db-reddit-api.ts        # Database queries
├── prisma/
│   ├── migrations/             # Database migrations
│   └── schema.prisma           # Database schema
├── scripts/                    # Utility scripts
└── instrumentation.ts          # Startup validation
```

## Security

The app includes:
- Input validation with length limits and regex
- SQL injection prevention (Prisma parameterized queries)

## License

MIT License
