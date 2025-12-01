'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import SearchForm from './components/SearchForm';
import InsightsDisplay from './components/InsightsDisplay';
import { SearchResult } from '../lib/types';
import { FETCH_TIMEOUT_MS } from '../lib/constants';
import { trackCourseSearch, trackInsightsViewed, trackError } from '../lib/analytics';

export default function Home() {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Set animation flag after first render to prevent re-animations
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = async (course: string) => {
    const courseCode = course.trim().toUpperCase();
    
    // Check if user is searching for the same course that's already displayed
    if (searchResult && searchResult.course?.code.toUpperCase() === courseCode && searchResult.insights) {
      // Just scroll to the existing results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 150);
      return; // Don't make a new API call
    }
    
    // Track the search in Google Analytics
    trackCourseSearch(course);

    // Delay showing loading state for fast cached responses
    let showLoadingTimer: NodeJS.Timeout | null = setTimeout(() => {
      setSearchResult({
        course: course ? { code: course, title: course } : undefined,
        loading: true
      });
      showLoadingTimer = null;
    }, 300); // Only show loading if request takes longer than 300ms

    try {
      const response = await fetch('/api/course-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ course }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      const result: SearchResult = await response.json();
      
      // Cancel loading state timer if still pending (fast response)
      if (showLoadingTimer) {
        clearTimeout(showLoadingTimer);
      }
      
      // Track successful insights view
      if (result.insights) {
        trackInsightsViewed(course, false); // false = we don't know if cache hit from frontend
      }
      
      // Track errors
      if (result.error) {
        trackError(result.error, 'search_failed');
      }
      
      // Always set the result - error message will be in result.error if there's an issue
      setSearchResult(result);
      
      // Smooth scroll to results/error when they appear
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 150);
    } catch (error) {
      // Cancel loading state timer if still pending
      if (showLoadingTimer) {
        clearTimeout(showLoadingTimer);
      }
      
      // Track network errors
      const errorMessage = 'Network error: Unable to connect to the server. Please check your connection and try again.';
      trackError(errorMessage, 'network_error');
      
      // Network error or JSON parse error
      setSearchResult({
        course: course ? { code: course, title: course } : undefined,
        loading: false,
        error: errorMessage
      });
      
      // Smooth scroll to error message
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 150);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      {/* Main content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Hero Section */}
          <div className={`text-center mb-8 md:mb-16 pt-4 md:pt-8 ${!hasAnimated ? 'animate-fadeInUp' : ''}`}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent leading-tight hover:scale-105 transition-transform duration-700 cursor-default">
              CourseScout
            </h1>
            <p className={`text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed px-4 ${!hasAnimated ? 'animate-fadeInUp animation-delay-200' : ''}`}>
              Discover what students really think about courses through 
              <span className="text-blue-400 font-semibold hover:text-blue-300 transition-colors duration-300"> unfiltered Reddit discussions</span> analyzed by 
              <span className="text-purple-400 font-semibold hover:text-purple-300 transition-colors duration-300"> AI</span>
            </p>
            <div className={`flex flex-wrap justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-400 px-4 ${!hasAnimated ? 'animate-slideInRight animation-delay-400' : ''}`}>
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 sm:px-4 py-2 rounded-full backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 group">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse group-hover:animate-none"></div>
                Real Student Experiences
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 sm:px-4 py-2 rounded-full backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 group">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse group-hover:animate-none"></div>
                AI-powered Insights
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 px-3 sm:px-4 py-2 rounded-full backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 group">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse group-hover:animate-none"></div>
                Community-Sourced
              </div>
            </div>
          </div>

          <SearchForm 
            onSearch={handleSearch} 
            loading={searchResult?.loading || false} 
          />
          
          {searchResult && (
            <div ref={resultsRef} className="mt-12 animate-fadeInUp">
              <InsightsDisplay result={searchResult} />
            </div>
          )}
          
          {/* Enhanced Footer */}
          <footer className="mt-6 text-center">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-slate-700/50">
              <p className="text-slate-300 text-sm mb-4 px-2">
                Opinions are from public posts and individual experiences may vary. Always verify with the official catalog and your advisor.
              </p>
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-6 text-xs text-slate-500 mb-4">
                <span>Made for Carleton University students</span>
                <span className="hidden sm:inline">•</span>
                <span>Data sourced from public discussions</span>
                <span className="hidden sm:inline">•</span>
                <span>Updated regularly</span>
              </div>
              <Link 
                href="/feedback"
                className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-300 font-medium"
              >
                Share Feedback
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
