# CourseScout

A  course insight platform that analyzes Reddit discussions to give students information about courses at their school.

## Features

- **Course Insights**: AI-powered analysis of Reddit discussions
- **Professor Ratings**: Integration with RateMyProfessors
- **Course Catalog**: Official course information from Carleton University
- **Comprehensive Search**: Full historical analysis of the schools reddit
- **Real-time Analysis**: Fast insights

## Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Node.js API routes with Prisma ORM
- **Database**: SQLite (development) / PostgreSQL (production)
- **AI**: OpenAI GPT-4o-mini for analysis
- **Data Sources**: Reddit API, RateMyProfessors, Carleton Course Catalog

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (for production)

### Development Setup
```bash

# Clone the repository
git clone https://github.com/Moodie0079/coursescout.git
cd coursescout

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env # Edit .env with your API keys

# Set up database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables
```bash
DATABASE_URL="your_database_url"
OPENAI_API_KEY="your_openai_api_key"
NODE_ENV="development"
```

## Data Collection

### Crawl Individual Course
```bash
npx tsx scripts/crawl-reddit.ts "COMP 1005"
```

### Bulk Crawl (Production)
```bash
# Crawl all courses
npx tsx scripts/bulk-crawl-all-courses.ts

# Test with limited courses
npx tsx scripts/bulk-crawl-all-courses.ts --test --count=10
```

### Database Management
```bash
# Clear all data
npx tsx scripts/clear-database.ts

# Browse stored courses
npx tsx scripts/browse-courses.ts
```

## Production Deployment

### Server Requirements
- Linux server with root access
- Node.js 18+
- PostgreSQL 12+
- Nginx
- PM2

### Deployment Steps
1. **Server Setup**: Install dependencies
2. **Database**: Configure PostgreSQL
3. **Code Deployment**: Clone and build
4. **Process Management**: Use PM2
5. **Reverse Proxy**: Configure Nginx
6. **SSL**: Set up certificates
7. **Domain**: Configure DNS
8. **Automation**: Schedule crawling

See deployment documentation for detailed steps.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
coursescout/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── types.ts          # TypeScript definitions
├── lib/                   # Utility libraries
│   ├── ai-processor.ts   # AI analysis
│   ├── db-reddit-api.ts  # Database operations
│   └── carleton-catalog.ts
├── prisma/               # Database schema
├── scripts/              # Data collection scripts
└── real-carleton-courses.json # Course data
```

## Security Features

- Input validation and sanitization
- SQL injection protection
- Rate limiting for API calls
- Environment variable protection

## Performance

- O(1) course lookup with caching
- Crawl tracking
- Optimized database queries

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.