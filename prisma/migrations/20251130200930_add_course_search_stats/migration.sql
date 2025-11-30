-- AlterTable
ALTER TABLE "GlobalStats" ADD COLUMN     "uniqueCourses" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CourseSearchStats" (
    "courseCode" TEXT NOT NULL,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "lastSearched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSearchStats_pkey" PRIMARY KEY ("courseCode")
);

-- CreateIndex
CREATE INDEX "CourseSearchStats_searchCount_idx" ON "CourseSearchStats"("searchCount");

-- CreateIndex
CREATE INDEX "CourseSearchStats_lastSearched_idx" ON "CourseSearchStats"("lastSearched");
