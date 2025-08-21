'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Info, ThumbsUp, ThumbsDown, Brain, Clock, BarChart3, Quote as QuoteIcon, AlertTriangle } from 'lucide-react';
import { SearchResult, SearchFilters, CircuitBreakerStatus } from '../types';

interface InsightsDisplayProps {
  result: SearchResult;
}

export default function InsightsDisplay({ result }: InsightsDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
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
    return <LoadingState circuitBreakerStatus={result.circuitBreakerStatus} />;
  }

  if (result.error) {
    return <ErrorState message={result.error} />;
  }

  if (!result.insights) {
    return <NoResultsState />;
  }

  const { insights, course, professor } = result;

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
      <div className="max-w-5xl mx-auto mb-8">
        <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl flex items-center justify-center">
                <span className="text-white text-lg font-bold">{course?.code ? course.code.split(' ')[0]?.slice(0, 2) : 'CS'}</span>
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{course?.code || 'Course Analysis'}</h1>
                <div className="flex items-center gap-4 text-slate-400">
                  <span className="flex items-center gap-2">
                    <Brain size={16} />
                    Course Analysis
                  </span>
                  <span className="flex items-center gap-2">
                    <Info size={16} />
                    Data from Reddit student discussions
                  </span>
                </div>
              </div>
              <a 
                href={course?.code ? "https://calendar.carleton.ca/search/?P=" + encodeURIComponent(course.code) : "https://calendar.carleton.ca/undergrad/"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 font-medium transition-colors"
              >
                <ExternalLink size={16} />
                Official Catalog
              </a>
            </div>
            <p className="text-slate-300 text-lg leading-relaxed">{insights.summary}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* At a glance scores */}
        {insights && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Difficulty Score */}
            {insights.difficulty && (
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl flex items-center justify-center">
                      <Brain size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Difficulty</h3>
                      <p className="text-sm text-slate-400">Based on student experiences</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-orange-400">{insights.difficulty.score}</span>
                    <span className="text-lg text-slate-400">/10</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{insights.difficulty.reason}</p>
                </div>
              </div>
            )}

            {/* Workload Score */}
            {insights.workload && (
              <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 pointer-events-none"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center">
                      <Clock size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Workload</h3>
                      <p className="text-sm text-slate-400">Time commitment required</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-blue-400">{insights.workload.score}</span>
                    <span className="text-lg text-slate-400">/10</span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">{insights.workload.reason}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pros and Cons Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pros */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <ThumbsUp size={16} className="text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Pros</h3>
              </div>
              <div className="space-y-3">
                {insights.pros.length > 0 ? insights.pros.map((pro, index) => (
                  <div key={index} className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                    <p className="text-slate-300 text-sm leading-relaxed">{pro.text}</p>
                  </div>
                )) : (
                  <p className="text-slate-400 text-sm italic">No specific pros mentioned in discussions.</p>
                )}
              </div>
            </div>
          </div>

          {/* Cons */}
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <ThumbsDown size={16} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Cons</h3>
              </div>
              <div className="space-y-3">
                {insights.cons.length > 0 ? insights.cons.map((con, index) => (
                  <div key={index} className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <p className="text-slate-300 text-sm leading-relaxed">{con.text}</p>
                  </div>
                )) : (
                  <p className="text-slate-400 text-sm italic">No specific cons mentioned in discussions.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Professors */}
        {insights.professors && insights.professors.length > 0 && (
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">P</span>
                </div>
                <h3 className="text-lg font-bold text-white">Professors</h3>
              </div>
              <div className="space-y-4">
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
                                                  <div className="grid grid-cols-4 gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-400">{professor.rateMyProfData.avgRating.toFixed(1)}</div>
                              <div className="text-xs text-gray-400">Overall Quality</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-orange-400">{professor.rateMyProfData.avgDifficulty.toFixed(1)}</div>
                              <div className="text-xs text-gray-400">Difficulty</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-400">{professor.rateMyProfData.wouldTakeAgainPercent}%</div>
                              <div className="text-xs text-gray-400">Would Take Again</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-400">{professor.rateMyProfData.numRatings}</div>
                              <div className="text-xs text-gray-400">Total Ratings</div>
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
                                } catch (error) {
                                  console.warn('Could not decode professor ID:', error);
                                }
                              }
                              // Final fallback: search for professor by name
                              return `https://www.ratemyprofessors.com/search/professors?query=${encodeURIComponent(professor.name)}`;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
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
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Course Summary</h3>
              <p className="text-sm text-slate-400">AI-powered insights for prospective students</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Key Takeaways Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Student Benefits */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <h4 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <ThumbsUp size={16} />
                  Student Benefits
                </h4>
                <div className="space-y-2">
                  {insights.studentBenefits && insights.studentBenefits.length > 0 ? (
                    insights.studentBenefits.map((benefit, index) => (
                      <div key={index} className="text-xs text-slate-300 leading-relaxed">
                        • {benefit.text}
                      </div>
                    ))
                  ) : (
                    insights.pros.map((pro, index) => (
                      <div key={index} className="text-xs text-slate-300 leading-relaxed">
                        • {pro.text}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Common Concerns */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  Common Concerns
                </h4>
                <div className="space-y-2">
                  {insights.commonConcerns && insights.commonConcerns.length > 0 ? (
                    insights.commonConcerns.map((concern, index) => (
                      <div key={index} className="text-xs text-slate-300 leading-relaxed">
                        • {concern.text}
                      </div>
                    ))
                  ) : (
                    insights.cons.map((con, index) => (
                      <div key={index} className="text-xs text-slate-300 leading-relaxed">
                        • {con.text}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Prerequisites & Preparation */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <Info size={16} />
                  Prerequisites & Preparation
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  {insights.prerequisites && insights.prerequisites.length > 0 ? (
                    insights.prerequisites.map((prereq, index) => (
                      <div key={index}>• {prereq.text}</div>
                    ))
                  ) : (
                    <div>• Check official course prerequisites in catalog</div>
                  )}
                </div>
              </div>

              {/* What to Expect */}
              <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                <h4 className="font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                  <Clock size={16} />
                  What to Expect
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  {insights.expectations && insights.expectations.length > 0 ? (
                    insights.expectations.map((expectation, index) => (
                      <div key={index}>• {expectation.text}</div>
                    ))
                  ) : (
                    <div>• Course format details will vary by instructor</div>
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
            <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <ExternalLink size={16} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Discussion Sources</h3>
                  <p className="text-sm text-slate-400">{insights.threadSources.length} Reddit discussions analyzed</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {insights.threadSources.slice(0, 15).map((thread, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-slate-700/20 rounded-lg"
                  >
                    <span className="font-medium text-blue-400">[{index + 1}]</span>
                    <div className="flex-1 min-w-0">
                      {thread.permalink ? (
                        <a
                          href={thread.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-300 hover:text-white transition-colors text-sm block truncate"
                        >
                          {thread.title}
                        </a>
                      ) : (
                        <div className="text-slate-300 truncate text-sm">{thread.title}</div>
                      )}
                      <div className="text-xs text-slate-500">r/{thread.subreddit} • {thread.score} pts • {thread.comments} comments</div>
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
            <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <QuoteIcon size={16} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Top Comments</h3>
                  <p className="text-sm text-slate-400">{insights.citations.length} student comments</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {insights.citations.slice(0, 10).map((citation, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 bg-slate-700/20 rounded-lg"
                  >
                    <span className="font-medium text-purple-400">[{index + 1}]</span>
                    <div className="flex-1 min-w-0">
                      {citation.permalink ? (
                        <a
                          href={citation.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group cursor-pointer hover:bg-slate-600/20 rounded-md p-1 -m-1 transition-all duration-200"
                        >
                          <div className="text-slate-300 group-hover:text-white text-sm leading-tight transition-colors">{citation.text}</div>
                          <div className="text-xs text-slate-500 group-hover:text-slate-400 mt-1 transition-colors">
                            {citation.score} pts • by {citation.author}
                          </div>
                        </a>
                      ) : (
                        <>
                          <div className="text-slate-300 text-sm leading-tight">{citation.text}</div>
                          <div className="text-xs text-slate-500 mt-1">
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
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-600/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 size={16} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Analysis Details</h3>
                <p className="text-sm text-slate-400">Data collection summary</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Time Period</span>
                <span className="text-white font-medium">{insights.coverage.timeWindow}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Threads Considered</span>
                <span className="text-white font-medium">{insights.coverage.threadsConsidered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Threads Used</span>
                <span className="text-white font-medium">{insights.coverage.threadsUsed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Comments Analyzed</span>
                <span className="text-white font-medium">{insights.coverage.relevantCommentsUsed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Latest Post</span>
                <span className="text-white font-medium">{insights.coverage.latestPostDate}</span>
              </div>
            </div>
        </div>

        {/* Sample Size Warning */}
        {insights.coverage.threadsUsed < 5 && (
          <div className="bg-yellow-900/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-yellow-500/30 p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-300 mb-1">Limited Data Available</h4>
                <p className="text-yellow-200/80 text-sm">
                  This analysis is based on only {insights.coverage.threadsUsed} discussions. 
                  Results may not be fully representative of student experiences. 
                  Consider checking official course resources for additional information.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-slate-800/20 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-6">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-slate-400 text-sm leading-relaxed">
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
                  className="text-blue-400 hover:text-blue-300 transition-colors ml-1"
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

function LoadingState({ circuitBreakerStatus }: { circuitBreakerStatus?: CircuitBreakerStatus }) {
  const [loadingTime, setLoadingTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('searching');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingTime(elapsed);

      // Update phase based on elapsed time
      if (elapsed < 5) {
        setCurrentPhase('searching');
      } else if (elapsed < 15) {
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
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Analyzing Course Data</h2>
          <p className="text-slate-300 mb-4">
            {getPhaseMessage()}
          </p>
          <div className="text-sm text-slate-400 mb-6">

          </div>
          <div className="space-y-3">
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Searching Reddit discussions</span>
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  currentPhase === 'searching' ? 'bg-blue-400' : 
                  loadingTime > 15 ? 'bg-green-400' : 'bg-blue-400'
                }`}></div>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Processing with AI</span>
                <div className={`w-2 h-2 rounded-full animate-pulse delay-100 ${
                  currentPhase === 'processing' ? 'bg-purple-400' :
                  loadingTime > 45 ? 'bg-green-400' : 'bg-slate-500'
                }`}></div>
              </div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Fetching professor ratings</span>
                <div className={`w-2 h-2 rounded-full animate-pulse delay-200 ${
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
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-red-900/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500/30 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5 pointer-events-none"></div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Analysis Failed</h2>
          <p className="text-red-200 mb-6">{message}</p>
          <p className="text-slate-400 text-sm">
            Please try again with a different course code or check your internet connection.
          </p>
        </div>
      </div>
    </div>
  );
}

function NoResultsState() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/50 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"></div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info size={32} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">No Data Found</h2>
          <p className="text-slate-300 mb-6">
            We couldn&apos;t find any discussions about this course on Reddit.
          </p>
          <p className="text-slate-400 text-sm">
            Try searching for a different course or check the course code spelling.
          </p>
        </div>
      </div>
    </div>
  );
}