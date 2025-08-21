// Service to fetch official course information from Carleton University

interface CourseInfo {
  code: string;
  title: string;
  description: string;
  prerequisites?: string;
  credits: number;
  catalogLink: string;
}

export async function fetchCourseInfo(courseCode: string): Promise<CourseInfo | null> {
  try {
    const formattedCode = courseCode.toUpperCase().replace(/\s+/g, '%20');
    
    // Try to fetch from Carleton's course search API
    const searchUrl = `https://calendar.carleton.ca/search/?P=${formattedCode}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'CourseScout Educational Tool'
      }
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch course info for ${courseCode}: ${response.status}`);
      return getFallbackCourseInfo(courseCode);
    }
    
    const html = await response.text();
    
    // Parse the HTML to extract course information
    const courseInfo = parseCourseHTML(html, courseCode);
    
    if (courseInfo) {
      return courseInfo;
    }
    
    return getFallbackCourseInfo(courseCode);
    
  } catch (error) {
    console.warn(`Error fetching course info for ${courseCode}:`, error);
    return getFallbackCourseInfo(courseCode);
  }
}

function parseCourseHTML(html: string, courseCode: string): CourseInfo | null {
  try {
    // Look for course title pattern - enhanced to capture more variations
    const titleMatch = html.match(new RegExp(`${courseCode}[^<]*?([^\\n]+?)(?=<|\\.\\s*(?:Prerequisites|Precludes|Also listed|Lectures))`, 'i')) ||
                      html.match(new RegExp(`<h[1-6][^>]*>[^<]*${courseCode}[^<]*([^<]+)</h[1-6]>`, 'i')) ||
                      html.match(new RegExp(`${courseCode}\\s*[-–—]\\s*([^<\\n]+)`, 'i'));
    
    // Look for course description - enhanced with multiple patterns
    const descMatch = html.match(/<p[^>]*class[^>]*searchresult[^>]*>[\s\S]*?<\/p>/i) ||
                     html.match(/<div[^>]*class[^>]*courseblockdesc[^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<p[^>]*>((?:[^<]|<(?!\/p>))*(?:course|students?|topics?|introduction|study)[^<]*)<\/p>/i);
    
    // Look for prerequisites
    const prereqMatch = html.match(/Prerequisite\(s\):\s*([^<\n\.]+)/i) ||
                       html.match(/Prerequisites:\s*([^<\n\.]+)/i);
    
    // Look for credits - more comprehensive patterns
    const creditsMatch = html.match(/(\d+(?:\.\d+)?)\s*credit/i) ||
                        html.match(/Credit[s]?:\s*(\d+(?:\.\d+)?)/i);
    
    if (titleMatch) {
      const fullTitle = titleMatch[0].trim();
      const parts = fullTitle.split(/\s+/);
      const title = parts.slice(2).join(' '); // Remove course code
      
      let description = descMatch ? 
        descMatch[0].replace(/<[^>]*>/g, '').trim() : 
        `Course information for ${courseCode}`;
      
      // Enhance description with additional details
      const credits = creditsMatch ? parseFloat(creditsMatch[1]) : 0.5;
      const prereqs = prereqMatch ? prereqMatch[1].trim() : null;
      
      // Build a more comprehensive description
      const descParts = [description];
      if (prereqs) {
        descParts.push(`Prerequisites: ${prereqs}`);
      }
      if (credits > 0) {
        descParts.push(`Credit value: ${credits} credits`);
      }
      
      return {
        code: courseCode,
        title: title || courseCode,
        description: descParts.join('. '),
        prerequisites: prereqs || undefined,
        credits: credits,
        catalogLink: `https://calendar.carleton.ca/search/?P=${courseCode.replace(/\s+/g, '%20')}`
      };
    }
    
    return null;
    
  } catch (error) {
    console.warn('Error parsing course HTML:', error);
    return null;
  }
}

function getFallbackCourseInfo(courseCode: string): CourseInfo {
  // Provide basic course info based on common patterns
  const dept = courseCode.split(' ')[0];
  const number = courseCode.split(' ')[1];
  
  const deptNames: Record<string, string> = {
    'COMP': 'Computer Science',
    'SYSC': 'Systems and Computer Engineering', 
    'MATH': 'Mathematics',
    'PHYS': 'Physics',
    'CHEM': 'Chemistry',
    'BIOL': 'Biology',
    'PSYC': 'Psychology',
    'ECON': 'Economics',
    'STAT': 'Statistics',
    'ELEC': 'Electrical Engineering'
  };
  
  const deptName = deptNames[dept] || dept;
  const level = number ? Math.floor(parseInt(number) / 1000) : 1;
  const levelName = level === 1 ? 'Introductory' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'Graduate';
  
  return {
    code: courseCode,
    title: `${levelName} ${deptName}`,
    description: `${levelName} level course in ${deptName} at Carleton University. For detailed course information, prerequisites, and current offerings, please check the official course catalog.`,
    credits: 0.5,
    catalogLink: `https://calendar.carleton.ca/search/?P=${courseCode.replace(/\s+/g, '%20')}`
  };
}
