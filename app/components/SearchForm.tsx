'use client';

import { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { COURSE_CODE_PATTERN } from '../../lib/constants';

interface SearchFormProps {
  onSearch: (course: string) => void;
  loading: boolean;
}

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [course, setCourse] = useState('');
  const [school, setSchool] = useState('carleton');
  const [validationError, setValidationError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidCourseCode = (code: string): boolean => {
    // Carleton course codes: 4 letters followed by 4 numbers (e.g., COMP 1005)
    return COURSE_CODE_PATTERN.test(code.trim());
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
    onSearch(trimmedCourse);
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
    }
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
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 md:p-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none rounded-3xl"></div>
          
          <div className="relative z-10">
            {/* School Selector */}
            <div className="mb-4 sm:mb-6">
              <label htmlFor="school" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-3 sm:mb-4 tracking-normal sm:tracking-wide uppercase">
                Select University
              </label>
              <div className="relative group">
                <select
                  id="school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 rounded-2xl focus:ring-4 focus:border-transparent outline-none transition-all duration-300 text-white bg-slate-900/50 text-base sm:text-lg font-medium backdrop-blur-sm border-slate-600/50 focus:ring-blue-500/20 focus:border-blue-400 group-hover:border-slate-500/70 appearance-none cursor-pointer"
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
            <div className="mb-6 sm:mb-8 relative" style={{ zIndex: 200 }}>
              <label htmlFor="course" className="block text-xs sm:text-sm font-semibold text-slate-300 mb-3 sm:mb-4 tracking-normal sm:tracking-wide uppercase">
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
                  className={`w-full px-4 sm:px-6 py-3 sm:py-4 border-2 rounded-2xl focus:ring-4 focus:border-transparent outline-none transition-all duration-300 text-white bg-slate-900/50 placeholder-slate-400 text-base sm:text-lg font-medium backdrop-blur-sm ${
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
                className="group relative flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-base sm:text-lg shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 disabled:shadow-none transform hover:scale-105 disabled:transform-none w-full sm:w-auto min-h-[44px]"
              >
                <Search size={20} className="group-hover:rotate-12 transition-transform duration-300 flex-shrink-0" />
                <span>
                  {loading ? 'Analyzing...' : 'Get insights'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
      


    </div>
  );
}
