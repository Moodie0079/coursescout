-- CreateTable
CREATE TABLE "Course" (
    "courseCode" TEXT NOT NULL,
    "totalPosts" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstPostDate" TIMESTAMP(3),
    "latestPostDate" TIMESTAMP(3),
    "hasFullCrawl" BOOLEAN NOT NULL DEFAULT false,
    "lastCrawledAt" TIMESTAMP(3),

    CONSTRAINT "Course_pkey" PRIMARY KEY ("courseCode")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "subreddit" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdUtc" INTEGER NOT NULL,
    "permalink" TEXT NOT NULL,
    "courseCodes" TEXT[],

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "author" TEXT,
    "permalink" TEXT NOT NULL,
    "createdUtc" INTEGER NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professor" (
    "id" TEXT NOT NULL,
    "rmpId" TEXT,
    "fullName" TEXT NOT NULL,
    "avgRating" DOUBLE PRECISION,
    "numRatings" INTEGER NOT NULL DEFAULT 0,
    "avgDifficulty" DOUBLE PRECISION,
    "wouldTakeAgain" INTEGER,
    "department" TEXT,
    "searchNames" TEXT[],
    "school" TEXT NOT NULL DEFAULT 'Carleton University',
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_courseCodes_idx" ON "Post" USING GIN ("courseCodes");

-- CreateIndex
CREATE INDEX "Post_score_idx" ON "Post"("score");

-- CreateIndex
CREATE INDEX "Post_createdUtc_idx" ON "Post"("createdUtc");

-- CreateIndex
CREATE INDEX "Post_score_createdUtc_idx" ON "Post"("score", "createdUtc");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Comment_score_idx" ON "Comment"("score");

-- CreateIndex
CREATE INDEX "Professor_searchNames_idx" ON "Professor"("searchNames");

-- CreateIndex
CREATE INDEX "Professor_lastCheckedAt_idx" ON "Professor"("lastCheckedAt");

-- CreateIndex
CREATE INDEX "Professor_rmpId_idx" ON "Professor"("rmpId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
