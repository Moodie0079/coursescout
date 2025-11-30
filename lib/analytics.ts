/**
 * Google Analytics helper functions
 * Track custom events throughout your app
 */

// TypeScript types for Google Analytics
declare global {
  interface Window {
    gtag: (
      command: 'event',
      action: string,
      params: Record<string, any>
    ) => void;
  }
}

/**
 * Track when a user searches for a course
 */
export function trackCourseSearch(courseCode: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'search', {
      search_term: courseCode,
      event_category: 'course',
      event_label: courseCode,
    });
  }
}

/**
 * Track when insights are successfully loaded
 */
export function trackInsightsViewed(courseCode: string, cacheHit: boolean) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_insights', {
      course_code: courseCode,
      cache_hit: cacheHit,
      event_category: 'insights',
    });
  }
}

/**
 * Track when user views professor data
 */
export function trackProfessorView(professorName: string, hasRmpData: boolean) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'view_professor', {
      professor_name: professorName,
      has_rmp_data: hasRmpData,
      event_category: 'professor',
    });
  }
}

/**
 * Track errors for debugging
 */
export function trackError(errorMessage: string, errorType: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'exception', {
      description: errorMessage,
      fatal: false,
      error_type: errorType,
    });
  }
}

/**
 * Track external link clicks (to Carleton catalog, RMP, etc.)
 */
export function trackExternalLink(url: string, linkType: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'click', {
      event_category: 'external_link',
      event_label: linkType,
      value: url,
    });
  }
}

