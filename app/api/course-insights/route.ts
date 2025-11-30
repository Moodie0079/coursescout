import { NextRequest, NextResponse } from 'next/server';
import { courseInsightsService } from '../../../lib/services/course-insights-service';
import { logger } from '../../../lib/logger';
import { COURSE_CODE_PATTERN, HTTP_STATUS, MAX_COURSE_CODE_LENGTH } from '../../../lib/constants';
import { prisma } from '../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course, trackSearch = true } = body;

    // Validate course code is provided and within length limits
    if (!course?.trim()) {
      return NextResponse.json(
        { error: 'Course code is required' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (course.length > MAX_COURSE_CODE_LENGTH) {
      return NextResponse.json(
        { error: `Course code must be less than ${MAX_COURSE_CODE_LENGTH} characters` },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const courseCode = course.trim().toUpperCase();
    
    // Validate course code format
    if (!COURSE_CODE_PATTERN.test(courseCode)) {
      return NextResponse.json(
        { error: 'Invalid course code format. Please use format like COMP 1005' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Use service layer for business logic
    const result = await courseInsightsService.getInsights(courseCode);
    
    // If there's an error, return appropriate status code (do NOT track failed searches)
    if (result.error) {
      const status = result.error.includes('not found') ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return NextResponse.json(result, { status });
    }

    // Track search statistics ONLY for successful searches with insights (prevent spam and invalid courses)
    if (trackSearch && result.insights) {
      // Track per-course search count
      prisma.searchStats.upsert({
        where: { courseCode },
        update: {
          searchCount: { increment: 1 },
          lastSearched: new Date()
        },
        create: {
          courseCode,
          searchCount: 1,
          lastSearched: new Date()
        }
      }).catch(err => logger.error('Failed to update course search stats', err, { courseCode }));

      // Track global total searches (_GLOBAL special row)
      prisma.searchStats.upsert({
        where: { courseCode: '_GLOBAL' },
        update: {
          searchCount: { increment: 1 },
          lastSearched: new Date()
        },
        create: {
          courseCode: '_GLOBAL',
          searchCount: 1,
          lastSearched: new Date()
        }
      }).catch(err => logger.error('Failed to update global search count', err));
    }

    return NextResponse.json(result);

  } catch (error) {
    logger.error('Course insights API error', error);
    
    return NextResponse.json(
      { 
        error: 'An error occurred while analyzing course discussions',
        loading: false,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const course = searchParams.get('course') || '';

  // Validate course code is provided and within length limits
  if (!course?.trim()) {
    return NextResponse.json(
      { error: 'Course code is required' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  if (course.length > MAX_COURSE_CODE_LENGTH) {
    return NextResponse.json(
      { error: `Course code must be less than ${MAX_COURSE_CODE_LENGTH} characters` },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const courseCode = course.trim().toUpperCase();
  
  // Validate course code format
  if (!COURSE_CODE_PATTERN.test(courseCode)) {
    return NextResponse.json(
      { error: 'Invalid course code format. Please use format like COMP 1005' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  // Call service directly instead of wrapping POST
  try {
    const result = await courseInsightsService.getInsights(courseCode);
    
    if (result.error) {
      const status = result.error.includes('not found') ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Course insights API error', error);
    
    return NextResponse.json(
      { 
        error: 'An error occurred while analyzing course discussions',
        loading: false,
      },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
