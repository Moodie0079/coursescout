-- CreateTable
CREATE TABLE "CourseInsightsCache" (
    "courseCode" TEXT NOT NULL,
    "insights" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseInsightsCache_pkey" PRIMARY KEY ("courseCode")
);

-- CreateIndex
CREATE INDEX "CourseInsightsCache_courseCode_idx" ON "CourseInsightsCache"("courseCode");
