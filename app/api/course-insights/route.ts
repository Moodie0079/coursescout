import { NextRequest, NextResponse } from 'next/server';
import { dbRedditAPI } from '../../../lib/db-reddit-api'; // Using database instead of live Reddit
import { aiProcessor } from '../../../lib/ai-processor';
import { fetchCourseInfo } from '../../../lib/carleton-catalog';
import { rateMyProfAPI } from '../../../lib/ratemyprof-api';

export async function POST(request: NextRequest) 
{
  try 
  {
    const body = await request.json();
    const { course, timeWindow = 'all', stream = false }: { course: string; timeWindow: 'past-year' | '2-years' | 'all'; stream?: boolean } = body;

    if (!course?.trim()) {
      return NextResponse.json(
        { error: 'Course code is required' },
        { status: 400 }
      );
    }

    const courseCode = course.trim().toUpperCase();
    
    // Validate course code format
    const courseCodePattern = /^[A-Z]{4}\s[0-9]{4}$/;
    if (!courseCodePattern.test(courseCode)) {
      return NextResponse.json(
        { error: 'Invalid course code format. Please use format like COMP 1005' },
        { status: 400 }
      );
    }
    console.log(`🔍 Course insights request: ${courseCode} (${timeWindow})`);
    console.log(`🚀 Starting Reddit search and AI analysis pipeline...`);

    try {
      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        // Still fetch course info even without AI
        const courseInfo = await fetchCourseInfo(courseCode);
        
        return NextResponse.json({
          course: courseInfo || { 
            code: courseCode, 
            title: courseCode,
            description: `Course discussions and student insights for ${courseCode}`,
            catalogLink: `https://calendar.carleton.ca/search/?P=${courseCode.replace(' ', '%20')}`
          },
          insights: null,
          error: 'AI analysis is not configured. Please set OPENAI_API_KEY environment variable.'
        });
      }

      // First, verify the course exists in Carleton's catalog
      console.log(`📚 Verifying course exists: ${courseCode}`);
      const courseInfo = await fetchCourseInfo(courseCode);
      
      if (!courseInfo) {
        return NextResponse.json({
          error: `Course ${courseCode} not found in Carleton University catalog. Please verify the course code.`
        }, { status: 404 });
      }
      
      // Now search for Reddit discussions in database
      console.log(`🔍 Searching database for discussions about: ${courseCode}`);
      
      const searchResult = await dbRedditAPI.searchCourseDiscussions(courseCode);
      console.log(`📊 Database search completed: ${searchResult.threads.length} threads found`);
      
      if (searchResult.threads.length === 0) {
        console.log(`❌ No discussions found for ${courseCode}`);
        return NextResponse.json({
          course: courseInfo,
          insights: null,
          error: 'No discussions found for this course in our database'
        });
      }

      // Use AI to analyze the threads from database
      console.log(`🤖 Starting AI analysis of ${searchResult.threads.length} threads...`);
      const insights = await aiProcessor.processThreads(
        searchResult.threads,
        courseCode,
        timeWindow === 'past-year' ? 'Past year' : timeWindow === '2-years' ? 'Past 2 years' : 'All time',
        ['Database'] // No specific subreddits since it's from database
      );

      if (!insights) {
        console.log(`❌ AI analysis failed or found no relevant content`);
        return NextResponse.json({
          course: courseInfo,
          insights: null,
          error: 'No relevant course discussions found after AI analysis'
        });
      }

      console.log(`✅ AI analysis completed successfully`);

      // Fetch RateMyProfessors data for mentioned professors
      if (insights.professors && insights.professors.length > 0) {
        console.log(`🎓 Fetching RateMyProfessors data for ${insights.professors.length} professors...`);
        
        const professorNames = insights.professors.map((p: any) => p.name);
        const rmpResults = await rateMyProfAPI.getMultipleProfessors(professorNames);
        
        // Log detailed results for debugging
        rmpResults.forEach(result => {
          if (result.data) {
            console.log(`✅ Found "${result.name}" with rating ${result.data.avgRating} (${result.data.numRatings} ratings)`);
          } else {
            console.log(`❌ Professor "${result.name}" not found or has no ratings`);
          }
        });
        
        insights.professors = insights.professors.map((prof: any) => {
          const rmpResult = rmpResults.find(r => r.name === prof.name);
          console.log(`🔗 Linking professor "${prof.name}" to RMP data:`, rmpResult?.data?.name || 'not found');
          return {
            ...prof,
            rateMyProfData: rmpResult?.data || null
          };
        });
        
        console.log(`✅ RateMyProfessors data fetched for professors`);
      }

      const result = {
        course: courseInfo,
        insights,
        circuitBreakerStatus: searchResult.circuitBreakerStatus
      };

      console.log(`🔍 Circuit breaker status being returned:`, searchResult.circuitBreakerStatus);
      console.log(`🎉 COURSE INSIGHTS COMPLETED FOR ${courseCode} - ${insights.pros?.length || 0} pros, ${insights.cons?.length || 0} cons, ${insights.quotes?.length || 0} quotes`);

      console.log(`✅ AI generated insights for ${courseCode}: ${insights.pros.length} pros, ${insights.cons.length} cons, ${insights.quotes.length} quotes from ${insights.coverage.relevantCommentsUsed} relevant comments`);
      return NextResponse.json(result);

    } catch (redditError) {
      console.error('Reddit API error:', redditError);
      
      // Try to get course info for the error response
      const fallbackCourseInfo = await fetchCourseInfo(courseCode).catch(() => null);
      
      return NextResponse.json({
        course: fallbackCourseInfo || { 
          code: courseCode, 
          title: courseCode,
          description: `Course discussions and student insights for ${courseCode}`,
          catalogLink: `https://calendar.carleton.ca/search/?P=${courseCode.replace(' ', '%20')}`
        },
        insights: null,
        error: 'Unable to connect to Reddit. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Course insights API error:', error);
    
    return NextResponse.json(
      { 
        error: 'An error occurred while analyzing course discussions',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const course = searchParams.get('course') || '';
  const timeWindow = (searchParams.get('timeWindow') as 'past-year' | '2-years' | 'all') || 'past-year';

  // Convert GET to POST format
  const body = { course, timeWindow };
  
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  }));
}
