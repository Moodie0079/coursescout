import { NextRequest, NextResponse } from 'next/server';
import { courseInsightsService } from '../../../lib/services/course-insights-service';
import { logger } from '../../../lib/logger';
import { COURSE_CODE_PATTERN } from '../../../lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { course } = body;

    // Validate course code is provided
    if (!course?.trim()) {
      return NextResponse.json(
        { error: 'Course code is required' },
        { status: 400 }
      );
    }

    const courseCode = course.trim().toUpperCase();
    
    // Validate course code format
    if (!COURSE_CODE_PATTERN.test(courseCode)) {
      return NextResponse.json(
        { error: 'Invalid course code format. Please use format like COMP 1005' },
        { status: 400 }
      );
    }

    // Use service layer for business logic
    const result = await courseInsightsService.getInsights(courseCode);
    
    // If there's an error, return appropriate status code
    if (result.error) {
      const status = result.error.includes('not found') ? 404 : 500;
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
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const course = searchParams.get('course') || '';

  // Validate course code is provided
  if (!course?.trim()) {
    return NextResponse.json(
      { error: 'Course code is required' },
      { status: 400 }
    );
  }

  const courseCode = course.trim().toUpperCase();
  
  // Validate course code format
  if (!COURSE_CODE_PATTERN.test(courseCode)) {
    return NextResponse.json(
      { error: 'Invalid course code format. Please use format like COMP 1005' },
      { status: 400 }
    );
  }

  // Call service directly instead of wrapping POST
  try {
    const result = await courseInsightsService.getInsights(courseCode);
    
    if (result.error) {
      const status = result.error.includes('not found') ? 404 : 500;
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
      { status: 500 }
    );
  }
}
