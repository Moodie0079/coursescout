'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Info, ThumbsUp, ThumbsDown, Brain, Clock, BarChart3, Quote as QuoteIcon, AlertTriangle } from 'lucide-react';
import { SearchResult } from '../../lib/types';
import { LOADING_PHASE_TIMES } from '../../lib/constants';
import { trackExternalLink } from '../../lib/analytics';

interface InsightsDisplayProps {
  result: SearchResult;
}

export default function InsightsDisplay({ result }: InsightsDisplayProps) {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  // Trigger animation when new results come in
  useEffect(() => {
    if (!result.loading && result.insights) {
      setShouldAnimate(false); // Start hidden
      const timer = setTimeout(() => setShouldAnimate(true), 50); // Then become visible
      return () => clearTimeout(timer);
    }
  }, [result.insights]); // Only depend on actual insights, not loading state

  if (result.loading) {
    return <LoadingState />;
  }

  if (result.error) {
    return <ErrorState message={result.error} />;
  }

  if (!result.insights) {
    return <NoResultsState />;
  }

  const { insights, course } = result;

  return (
    <div className={`w-full min-h-screen p-4 lg:p-6 fade-in ${shouldAnimate ? 'visible' : ''}`}>
      {/* Data Reliability Assessment */}
      <div className="max-w-5xl mx-auto mb-4">
        <div className={`rounded-lg p-3 border ${
          insights.coverage.threadsUsed >= 15 
            ? 'bg-green-500/10 border-green-500/30' 
            : insights.coverage.threadsUsed >= 8 
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {insights.coverage.threadsUsed >= 15 ? (
              <>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs font-medium text-green-400">High Confidence Data</span>
              </>
            ) : insights.coverage.threadsUsed >= 8 ? (
              <>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-xs font-medium text-yellow-400">Moderate Confidence Data</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs font-medium text-red-400">Limited Data Available</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {insights.coverage.threadsUsed >= 15 
              ? `Based on comprehensive analysis of ${insights.coverage.threadsUsed} discussions with ${insights.coverage.relevantCommentsUsed} student comments. Insights are highly reliable.`
              : insights.coverage.threadsUsed >= 8 
              ? `Based on analysis of ${insights.coverage.threadsUsed} discussions with ${insights.coverage.relevantCommentsUsed} student comments. Insights provide good overview but may not capture all perspectives.`
              : `Based on limited analysis of ${insights.coverage.threadsUsed} discussions with ${insights.coverage.relevantCommentsUsed} student comments. Consider seeking additional sources for a complete picture.`
            }
          </p>
        </div>
      </div>
      
      {/* Header Section - Full Width */}
      <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-white text-base sm:text-lg font-bold">{course?.code ? course.code.split(' ')[0]?.slice(0, 2) : 'CS'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{course?.code || 'Course Analysis'}</h1>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-slate-400 text-sm">
                  <span className="flex items-center gap-2">
                    <Brain size={14} />
                    Course Analysis
                  </span>
                  <span className="flex items-center gap-2">
                    <Info size={14} />
                    Data from Reddit
                  </span>
                </div>
              </div>
              <a 
                href={course?.code ? "https://calendar.carleton.ca/search/?P=" + encodeURIComponent(course.code) : "https://calendar.carleton.ca/undergrad/"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackExternalLink(
                  course?.code ? `https://calendar.carleton.ca/search/?P=${encodeURIComponent(course.code)}` : 'https://calendar.carleton.ca/undergrad/',
                  'official_catalog'
                )}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors w-full sm:w-auto mt-2 sm:mt-0 min-h-[44px]"
              >
                <ExternalLink size={16} />
                <span className="text-sm sm:text-base">Official Catalog</span>
              </a>
            </div>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">{insights.summary}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* At a glance scores */}
        {insights && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Difficulty Score */}
            {insights.difficulty && (
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Brain size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-white">Difficulty</h3>
                      <p className="text-xs sm:text-sm text-slate-400">Based on student experiences</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl sm:text-5xl md:text-4xl font-bold text-orange-400">
                      {insights.difficulty.score !== null ? insights.difficulty.score : '?'}
                    </span>
                    <span className="text-base sm:text-lg md:text-base text-slate-400">/10</span>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{insights.difficulty.reason}</p>
                </div>
              </div>
            )}

            {/* Workload Score */}
            {insights.workload && (
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-white">Workload</h3>
                      <p className="text-xs sm:text-sm text-slate-400">Time commitment required</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-4xl sm:text-5xl md:text-4xl font-bold text-blue-400">
                      {insights.workload.score !== null ? insights.workload.score : '?'}
                    </span>
                    <span className="text-base sm:text-lg md:text-base text-slate-400">/10</span>
                  </div>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{insights.workload.reason}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pros and Cons Grid */}
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* Pros */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ThumbsUp size={14} className="text-green-400 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Pros</h3>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {insights.pros.length > 0 ? insights.pros.map((pro, index) => (
                  <div key={index} className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{pro.text}</p>
                  </div>
                )) : (
                  <p className="text-slate-400 text-xs sm:text-sm italic">No specific pros mentioned in discussions.</p>
                )}
              </div>
            </div>
          </div>

          {/* Cons */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ThumbsDown size={14} className="text-red-400 sm:w-4 sm:h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-white">Cons</h3>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {insights.cons.length > 0 ? insights.cons.map((con, index) => (
                  <div key={index} className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{con.text}</p>
                  </div>
                )) : (
                  <p className="text-slate-400 text-xs sm:text-sm italic">No specific cons mentioned in discussions.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Professors */}
        {insights.professors && insights.professors.length > 0 && (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-4 sm:p-5 md:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">P</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Professors</h3>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {insights.professors.map((professor, index) => (
                  <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-white text-base">{professor.name}</h4>
                          <span className={
                            "px-2 py-1 rounded-full text-xs font-medium " +
                            (professor.sentiment === 'positive' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            professor.sentiment === 'negative' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30')
                          }>
                            {professor.sentiment === 'positive' ? '👍 Positive' :
                             professor.sentiment === 'negative' ? '👎 Negative' :
                             '⚖️ Mixed'}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-2">{professor.feedback}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{professor.mentions} mentions</span>
                          {professor.citations && professor.citations.length > 0 && (
                            <span className="text-xs text-slate-500 ml-2">
                              Based on {professor.citations.length} student comment{professor.citations.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* RateMyProfessors Data */}
                    {professor.rateMyProfData ? (
                      <div className="border-t border-gray-600 pt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">RateMyProfessors Data:</h4>
                                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-3">
                            <div className="text-center min-w-0">
                              <div className="text-base sm:text-lg font-bold text-blue-400">{professor.rateMyProfData.avgRating.toFixed(1)}</div>
                              <div className="text-[10px] sm:text-xs text-gray-400">Overall Quality</div>
                            </div>
                            <div className="text-center min-w-0">
                              <div className="text-base sm:text-lg font-bold text-orange-400">{professor.rateMyProfData.avgDifficulty.toFixed(1)}</div>
                              <div className="text-[10px] sm:text-xs text-gray-400">Difficulty</div>
                            </div>
                            <div className="text-center min-w-0">
                              <div className="text-base sm:text-lg font-bold text-green-400">{professor.rateMyProfData.wouldTakeAgainPercent}%</div>
                              <div className="text-[10px] sm:text-xs text-gray-400">Would Take Again</div>
                            </div>
                            <div className="text-center min-w-0">
                              <div className="text-base sm:text-lg font-bold text-purple-400">{professor.rateMyProfData.numRatings}</div>
                              <div className="text-[10px] sm:text-xs text-gray-400">Total Ratings</div>
                            </div>
                          </div>
                        
                        <div className="flex justify-end">
                          <a 
                            href={(() => {
                              // Use legacyId for direct professor page link
                              if (professor.rateMyProfData?.legacyId) {
                                return `https://www.ratemyprofessors.com/professor/${professor.rateMyProfData.legacyId}`;
                              }
                              // Fallback: try to decode base64 ID if legacyId not available
                              if (professor.rateMyProfData?.id) {
                                try {
                                  const decoded = atob(professor.rateMyProfData.id);
                                  const match = decoded.match(/Teacher-(\d+)/);
                                  if (match) {
                                    return `https://www.ratemyprofessors.com/professor/${match[1]}`;
                                  }
                                } catch {
                                  // Silently fail - fallback will handle it
                                }
                              }
                              // Final fallback: search for professor by name
                              return `https://www.ratemyprofessors.com/search/professors?query=${encodeURIComponent(professor.name)}`;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              const url = professor.rateMyProfData?.legacyId 
                                ? `https://www.ratemyprofessors.com/professor/${professor.rateMyProfData.legacyId}`
                                : `https://www.ratemyprofessors.com/search/professors?query=${encodeURIComponent(professor.name)}`;
                              trackExternalLink(url, 'ratemyprofessors');
                            }}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors"
                          >
                            <ExternalLink size={12} />
                            View on RateMyProfessors
                          </a>
                        </div>

                      </div>
                    ) : (
                      <div className="border-t border-gray-600 pt-4">
                        <p className="text-sm text-gray-400">RateMyProfessors data not available for this professor.</p>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Course Summary */}
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain size={14} className="text-white sm:w-4 sm:h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-white">Course Summary</h3>
              <p className="text-xs sm:text-sm text-slate-400">AI-powered insights</p>
            </div>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Key Takeaways Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Student Benefits */}
              <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 border border-slate-600/30">
                <h4 className="text-sm sm:text-base font-semibold text-green-400 mb-2 sm:mb-3 flex items-center gap-2">
                  <ThumbsUp size={14} className="flex-shrink-0" />
                  Student Benefits
                </h4>
                <div className="space-y-1.5 sm:space-y-2">
                  {insights.studentBenefits && insights.studentBenefits.length > 0 ? (
                    insights.studentBenefits.map((benefit, index) => (
                      <div key={index} className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        • {benefit.text}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs sm:text-sm text-slate-400 italic">
                      Insufficient data
                    </div>
                  )}
                </div>
              </div>

              {/* Common Concerns */}
              <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 border border-slate-600/30">
                <h4 className="text-sm sm:text-base font-semibold text-red-400 mb-2 sm:mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  Common Concerns
                </h4>
                <div className="space-y-1.5 sm:space-y-2">
                  {insights.commonConcerns && insights.commonConcerns.length > 0 ? (
                    insights.commonConcerns.map((concern, index) => (
                      <div key={index} className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        • {concern.text}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs sm:text-sm text-slate-400 italic">
                      Insufficient data
                    </div>
                  )}
                </div>
              </div>

              {/* Prerequisites & Preparation */}
              <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 border border-slate-600/30">
                <h4 className="text-sm sm:text-base font-semibold text-purple-400 mb-2 sm:mb-3 flex items-center gap-2">
                  <Info size={14} className="flex-shrink-0" />
                  Prerequisites
                </h4>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-300">
                  {insights.prerequisites && insights.prerequisites.length > 0 ? (
                    insights.prerequisites.map((prereq, index) => (
                      <div key={index}>• {prereq.text}</div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">Check official catalog</div>
                  )}
                </div>
              </div>

              {/* What to Expect */}
              <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 border border-slate-600/30">
                <h4 className="text-sm sm:text-base font-semibold text-cyan-400 mb-2 sm:mb-3 flex items-center gap-2">
                  <Clock size={14} className="flex-shrink-0" />
                  What to Expect
                </h4>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-300">
                  {insights.expectations && insights.expectations.length > 0 ? (
                    insights.expectations.map((expectation, index) => (
                      <div key={index}>• {expectation.text}</div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">Details vary by instructor</div>
                  )}
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* Bottom Info Row */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Discussion Sources - Show the actual threads used */}
          {insights.threadSources && insights.threadSources.length > 0 && (
            <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExternalLink size={14} className="text-blue-400 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">Discussion Sources</h3>
                  <p className="text-xs sm:text-sm text-slate-400">{insights.threadSources.length} discussions</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {insights.threadSources.slice(0, 15).map((thread, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-700/20 rounded-lg hover:bg-slate-700/30 transition-colors min-h-[44px]"
                  >
                    <span className="font-medium text-blue-400 text-xs sm:text-sm flex-shrink-0">[{index + 1}]</span>
                    <div className="flex-1 min-w-0">
                      {thread.permalink ? (
                        <a
                          href={thread.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackExternalLink(thread.permalink, 'reddit_thread')}
                          className="text-slate-300 hover:text-white transition-colors text-xs sm:text-sm block truncate py-1"
                        >
                          {thread.title}
                        </a>
                      ) : (
                        <div className="text-slate-300 truncate text-xs sm:text-sm">{thread.title}</div>
                      )}
                      <div className="text-[10px] sm:text-xs text-slate-500">r/{thread.subreddit} • {thread.score} pts • {thread.comments} comments</div>
                    </div>
                  </div>
                ))}
                {insights.threadSources && insights.threadSources.length > 15 && (
                  <div className="text-center py-2 text-sm text-slate-400">
                    +{insights.threadSources.length - 15} more discussions
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Comment Citations - Show top cited comments */}
          {insights.citations && insights.citations.length > 0 && (
            <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <QuoteIcon size={14} className="text-purple-400 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-white">Top Comments</h3>
                  <p className="text-xs sm:text-sm text-slate-400">{insights.citations.length} comments</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {insights.citations.slice(0, 10).map((citation, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-700/20 rounded-lg min-h-[44px]"
                  >
                    <span className="font-medium text-purple-400 text-xs sm:text-sm flex-shrink-0">[{index + 1}]</span>
                    <div className="flex-1 min-w-0">
                      {citation.permalink ? (
                        <a
                          href={citation.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackExternalLink(citation.permalink, 'reddit_comment')}
                          className="block group cursor-pointer hover:bg-slate-600/20 rounded-md p-2 -m-2 transition-all duration-200"
                        >
                          <div className="text-slate-300 group-hover:text-white text-xs sm:text-sm leading-tight transition-colors">{citation.text}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 group-hover:text-slate-400 mt-1 transition-colors">
                            {citation.score} pts • by {citation.author}
                          </div>
                        </a>
                      ) : (
                        <>
                          <div className="text-slate-300 text-xs sm:text-sm leading-tight">{citation.text}</div>
                          <div className="text-[10px] sm:text-xs text-slate-500 mt-1">
                            {citation.score} pts • by {citation.author}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {insights.citations && insights.citations.length > 10 && (
                  <div className="text-center py-2 text-sm text-slate-400">
                    +{insights.citations.length - 10} more comments
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Analysis Details - Full Width */}
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 size={14} className="text-emerald-400 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white">Analysis Details</h3>
                <p className="text-xs sm:text-sm text-slate-400">Data summary</p>
              </div>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 text-xs sm:text-sm">Threads Considered</span>
                <span className="text-white font-medium text-sm sm:text-base">{insights.coverage.threadsConsidered}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 text-xs sm:text-sm">Threads Used</span>
                <span className="text-white font-medium text-sm sm:text-base">{insights.coverage.threadsUsed}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 text-xs sm:text-sm">Comments Analyzed</span>
                <span className="text-white font-medium text-sm sm:text-base">{insights.coverage.relevantCommentsUsed}</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 text-xs sm:text-sm">Latest Post</span>
                <span className="text-white font-medium text-sm sm:text-base">{insights.coverage.latestPostDate}</span>
              </div>
            </div>
        </div>

        {/* Sample Size Warning */}
        {insights.coverage.threadsUsed < 5 && (
          <div className="bg-yellow-900/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-yellow-500/30 p-4 sm:p-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-yellow-300 mb-1">Limited Data Available</h4>
                <p className="text-yellow-200/80 text-xs sm:text-sm leading-relaxed">
                  This analysis is based on only {insights.coverage.threadsUsed} discussions. 
                  Results may not be fully representative of student experiences. 
                  Consider checking official course resources for additional information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-slate-800/20 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-4 sm:p-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <Info size={14} className="text-slate-400 flex-shrink-0 mt-1 sm:w-4 sm:h-4" />
            <div className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              <p className="mb-2">
                <strong className="text-slate-300">Important:</strong> This analysis is based on public Reddit discussions and should be used as a general guide only. 
                Individual experiences may vary significantly depending on your background, study habits, and the specific professor/section.
              </p>
              <p>
                For official course information, prerequisites, and enrollment details, please consult the 
                <a 
                  href="https://calendar.carleton.ca/undergrad/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  onClick={() => trackExternalLink('https://calendar.carleton.ca/undergrad/', 'official_catalog_footer')}
                  className="text-blue-400 hover:text-blue-300 transition-colors ml-1 inline-flex items-center py-1"
                >
                  Carleton University course catalog
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  const [loadingTime, setLoadingTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('searching');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingTime(elapsed);

      // Update phase based on elapsed time
      if (elapsed < LOADING_PHASE_TIMES.SEARCHING) {
        setCurrentPhase('searching');
      } else if (elapsed < LOADING_PHASE_TIMES.PROCESSING) {
        setCurrentPhase('processing');  
      } else {
        setCurrentPhase('finalizing');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getPhaseMessage = () => {
    switch (currentPhase) {
      case 'searching':
        return 'Searching local database for course discussions and student feedback...';
      case 'processing':
        return 'Analyzing discussion data with AI and cross-referencing with RateMyProfessors...';
      case 'finalizing':
        return 'Finalizing insights and generating comprehensive analysis...';
      default:
        return 'Analyzing course data...';
    }
  };

  const getEstimatedTime = () => {
    const baseEstimate = 45; // Base estimate for normal completion (45 seconds)
    
    if (currentPhase === 'searching') {
      // Normal search should take 15-30 seconds
      const remaining = Math.max(5, 25 - loadingTime);
      return `~${remaining}s remaining`;
    }
    
    if (currentPhase === 'processing') {
      // Processing should take 15-30 more seconds after searching
      const remaining = Math.max(10, baseEstimate - loadingTime);
      return `~${remaining}s remaining`;
    }
    
    if (currentPhase === 'finalizing') {
      const remaining = Math.max(5, 30 - loadingTime);
      return `~${remaining}s remaining`;
    }
    
    return `~${Math.max(10, baseEstimate - loadingTime)}s remaining`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Analyzing Course Data</h2>
          <p className="text-sm sm:text-base text-slate-300 mb-4 px-2">
            {getPhaseMessage()}
          </p>
          <div className="space-y-2 sm:space-y-3">
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm text-slate-400">Searching Reddit discussions</span>
                <div className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${
                  currentPhase === 'searching' ? 'bg-blue-400' : 
                  loadingTime > 15 ? 'bg-green-400' : 'bg-blue-400'
                }`}></div>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm text-slate-400">Processing with AI</span>
                <div className={`w-2 h-2 rounded-full animate-pulse delay-100 flex-shrink-0 ${
                  currentPhase === 'processing' ? 'bg-purple-400' :
                  loadingTime > 45 ? 'bg-green-400' : 'bg-slate-500'
                }`}></div>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm text-slate-400">Fetching professor ratings</span>
                <div className={`w-2 h-2 rounded-full animate-pulse delay-200 flex-shrink-0 ${
                  currentPhase === 'finalizing' ? 'bg-green-400' : 'bg-slate-500'
                }`}></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  // Determine if it's a "not found" error vs other error
  const isNotFound = message.toLowerCase().includes('not found') || 
                     message.toLowerCase().includes('no discussions');
  
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className={`backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 md:p-12 relative overflow-hidden ${
        isNotFound 
          ? 'bg-slate-800/40 border border-slate-700/50' 
          : 'bg-red-900/20 border border-red-500/30'
      }`}>
        <div className={`absolute inset-0 pointer-events-none ${
          isNotFound 
            ? 'bg-gradient-to-br from-blue-500/5 to-purple-500/5' 
            : 'bg-gradient-to-br from-red-500/5 to-pink-500/5'
        }`}></div>
        <div className="relative z-10 text-center">
          <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 ${
            isNotFound ? 'bg-slate-700/50' : 'bg-red-500/20'
          }`}>
            {isNotFound ? (
              <Info size={24} className="text-slate-400 sm:w-8 sm:h-8" />
            ) : (
              <AlertTriangle size={24} className="text-red-400 sm:w-8 sm:h-8" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
            {isNotFound ? 'Course Not Found' : 'Analysis Error'}
          </h2>
          <p className={`mb-4 sm:mb-6 text-sm sm:text-base md:text-lg px-2 ${isNotFound ? 'text-slate-300' : 'text-red-200'}`}>
            {message}
          </p>
          {!isNotFound && (
            <p className="text-slate-400 text-xs sm:text-sm px-2">
              Please try again or contact support if the issue persists.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Info size={24} className="text-slate-400 sm:w-8 sm:h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">No Data Found</h2>
          <p className="text-sm sm:text-base text-slate-300 mb-4 sm:mb-6 px-2">
            We couldn&apos;t find any discussions about this course on Reddit.
          </p>
          <p className="text-xs sm:text-sm text-slate-400 px-2">
            Try searching for a different course or check the course code spelling.
          </p>
        </div>
      </div>
    </div>
  );
}