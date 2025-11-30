-- CreateTable
CREATE TABLE "GlobalStats" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "totalSearches" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalStats_pkey" PRIMARY KEY ("id")
);
