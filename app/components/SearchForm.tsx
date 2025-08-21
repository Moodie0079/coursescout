'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Clock, X } from 'lucide-react';
import { SearchFilters } from '../types';
// Recent searches functionality removed for simplicity

interface SearchFormProps {
  onSearch: (course: string, filters: SearchFilters) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [course, setCourse] = useState('');
  const [school, setSchool] = useState('carleton');
  const [validationError, setValidationError] = useState('');
  // Removed recent searches state
  const [didYouMeanSuggestions, setDidYouMeanSuggestions] = useState<string[]>([]);
  const [filters] = useState<SearchFilters>({
    timeWindow: 'all',
    showQuotes: true
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Removed recent searches loading





  const isValidCourseCode = (code: string): boolean => {
    // Carleton course codes: 4 letters followed by 4 numbers (e.g., COMP 1005)
    const courseCodePattern = /^[A-Z]{4}\s[0-9]{4}$/;
    return courseCodePattern.test(code.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!course.trim()) return;
    
    if (school !== 'carleton') {
      setValidationError('Only Carleton University is currently supported. More schools coming soon!');
      return;
    }
    
    const trimmedCourse = course.trim();
    
    if (!isValidCourseCode(trimmedCourse)) {
      setValidationError('Please enter a valid course code (4 letters followed by 4 numbers, e.g., COMP 1005)');
      return;
    }
    
    setValidationError('');
    setDidYouMeanSuggestions([]);
    
    // Recent searches functionality removed
    
    onSearch(trimmedCourse, filters);
  };

  const handleCourseChange = (value: string) => {
    // Auto-format course codes (e.g., "comp1005" -> "COMP 1005")
    const formatted = value
      .toUpperCase()
      .replace(/([A-Z]+)(\d+)/, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
    setCourse(formatted);
    
    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
      setDidYouMeanSuggestions([]);
    }
  };

  const handleRecentSearchClick = (courseCode: string) => {
    setCourse(courseCode);
    setValidationError('');
    setDidYouMeanSuggestions([]);
  };

  const schools = [
    { id: 'carleton', name: 'Carleton University', available: true },
    { id: 'uottawa', name: 'University of Ottawa', available: false },
    { id: 'mcgill', name: 'McGill University', available: false },
    { id: 'toronto', name: 'University of Toronto', available: false }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* School Selector */}
            <div className="mb-6">
              <label htmlFor="school" className="block text-sm font-semibold text-slate-300 mb-4 tracking-wide uppercase">
                Select University
              </label>
              <div className="relative group">
                <select
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-6 py-4 border-2 rounded-2xl focus:ring-4 focus:border-transparent outline-none transition-all duration-300 text-white bg-slate-900/50 text-lg font-medium backdrop-blur-sm border-slate-600/50 focus:ring-blue-500/20 focus:border-blue-400 group-hover:border-slate-500/70 appearance-none cursor-pointer"
                >
                  {schools.map((schoolOption) => (
                    <option
                      key={schoolOption.id}
                      value={schoolOption.id}
                      disabled={!schoolOption.available}
                      className="bg-slate-900 text-white"
                    >
                      {schoolOption.name} {!schoolOption.available && '(Coming Soon)'}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Course Input */}
            <div className="mb-8 relative" style={{ zIndex: 200 }}>
              <label htmlFor="course" className="block text-sm font-semibold text-slate-300 mb-4 tracking-wide uppercase">
                Enter Course Code
              </label>
              <div className="relative group" style={{ zIndex: 100 }}>
                <input
                  ref={inputRef}
                  type="text"
                  id="course"
                  value={course}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  placeholder="e.g., COMP 1005"
                  className={`w-full px-6 py-4 border-2 rounded-2xl focus:ring-4 focus:border-transparent outline-none transition-all duration-300 text-white bg-slate-900/50 placeholder-slate-400 text-lg font-medium backdrop-blur-sm ${
                    validationError 
                      ? 'border-red-500/50 focus:ring-red-500/20 focus:border-red-400' 
                      : 'border-slate-600/50 focus:ring-blue-500/20 focus:border-blue-400 group-hover:border-slate-500/70'
                  }`}
                />

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                

              </div>
              {validationError && (
                <div className="mt-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                    {validationError}
                  </div>
                </div>
              )}

            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading || !course.trim()}
                className="group relative flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 disabled:shadow-none transform hover:scale-105 disabled:transform-none"
              >
                <Search size={22} className="group-hover:rotate-12 transition-transform duration-300" />
                <span>
                  {loading ? 'Analyzing discussions...' : 'Get insights'}
                </span>
                {loading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
      


    </div>
  );
}
