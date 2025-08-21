'use client';

import { useState, useEffect } from 'react';
import SearchForm from './components/SearchForm';
import InsightsDisplay from './components/InsightsDisplay';
import { SearchResult, SearchFilters } from './types';

export default function Home() {
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    timeWindow: 'past-year',
    showQuotes: true
  });
  const [hasAnimated, setHasAnimated] = useState(false);

  // Set animation flag after first render to prevent re-animations
  useEffect(() => {
    const timer = setTimeout(() => setHasAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = async (course: string, searchFilters: SearchFilters) => {
    setFilters(searchFilters);
    
    // Set loading state
    setSearchResult({
      course: course ? { code: course, title: course } : undefined,
      loading: true
    });

    try {
      const response = await fetch('/api/course-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course: course,
          timeWindow: searchFilters.timeWindow
        }),
      });

      if (!response.ok) {
        throw new Error('Search request failed');
      }

      const result: SearchResult = await response.json();
      setSearchResult(result);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResult({
        course: course ? { code: course, title: course } : undefined,
        loading: false,
        error: 'Failed to fetch course insights. Please try again.'
      });
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
          <div className={`text-center mb-16 pt-8 ${!hasAnimated ? 'animate-fadeInUp' : ''}`}>
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent leading-tight hover:scale-105 transition-transform duration-700 cursor-default">
              CourseScout
            </h1>
            <p className={`text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed ${!hasAnimated ? 'animate-fadeInUp animation-delay-200' : ''}`}>
              Discover what students really think about courses through 
              <span className="text-blue-400 font-semibold hover:text-blue-300 transition-colors duration-300"> real discussions</span> and 
              <span className="text-purple-400 font-semibold hover:text-purple-300 transition-colors duration-300"> honest reviews</span>
            </p>
            <div className={`flex flex-wrap justify-center gap-4 text-sm text-slate-400 ${!hasAnimated ? 'animate-slideInRight animation-delay-400' : ''}`}>
              <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 group">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse group-hover:animate-none"></div>
                Live Reddit Data
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 group">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse group-hover:animate-none"></div>
                RateMyProfessors Integration
              </div>
              <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full backdrop-blur-sm hover:bg-slate-700/50 transition-all duration-300 hover:scale-105 group">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse group-hover:animate-none"></div>
                AI-Powered Insights
              </div>
            </div>
          </div>

          <SearchForm 
            onSearch={handleSearch} 
            loading={searchResult?.loading || false} 
          />
          
          {searchResult && (
            <div className="mt-12">
              <InsightsDisplay result={searchResult} />
            </div>
          )}
          
          {/* Enhanced Footer */}
          <footer className="mt-20 text-center">
            <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
              <p className="text-slate-300 text-sm mb-4">
                Opinions are from public posts and may not reflect official views. Always verify with the catalog and your advisor.
              </p>
              <div className="flex justify-center items-center gap-6 text-xs text-slate-500">
                <span>Made for Carleton University students</span>
                <span>•</span>
                <span>Data sourced from public discussions</span>
                <span>•</span>
                <span>Updated regularly</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
