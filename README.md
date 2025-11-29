# CourseScout

A course insight platform that analyzes Reddit discussions to provide students with comprehensive information about courses at their university.

## 📚 Documentation

Complete documentation is available in the [`docs/`](./docs/) directory:

- **[Setup & User Guide](./docs/README.md)** - Installation, usage, deployment
- **[Database System](./docs/DATABASE_SYSTEM.md)** - Technical documentation, schema, performance

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY

# Initialize database
npx prisma migrate deploy
npx prisma generate

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📖 Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:studio        # Browse database GUI
npm run db:clear         # Clear all data

# Crawling
npm run crawl:single     # Crawl one course
npm run crawl:bulk       # Crawl all courses
npm run crawl:test       # Test mode (10 courses)

# Cache Management
npm run cache:clear      # Clear AI insights cache
npm run professors:clear # Clear professor cache
```

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15+ with GIN & B-Tree indexes
- **AI**: OpenAI GPT-4o-mini
- **Data**: Reddit (pre-crawled), RateMyProfessors (on-demand)

## 📁 Project Structure

```
coursescout/
├── app/                  # Next.js app (pages, components, API)
├── lib/                  # Core libraries & utilities
│   ├── services/         # Business logic
│   ├── types/            # TypeScript definitions
│   ├── prompts/          # AI prompts
│   └── utils/            # Utility functions
├── scripts/              # Data collection scripts
├── prisma/               # Database schema & migrations
├── docs/                 # Documentation
└── real-carleton-courses.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License

