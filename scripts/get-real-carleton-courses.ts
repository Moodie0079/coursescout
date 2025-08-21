import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Course {
  code: string;
  title: string;
  description?: string;
  department: string;
  level: number;
}

// Extract department codes from the main page, then fetch courses from each department
async function scrapeCarletonCourses(): Promise<Course[]> {
  console.log('🎓 Fetching real Carleton University courses...');
  
  const baseUrl = 'https://calendar.carleton.ca/undergrad/courses/';
  const courses: Course[] = [];
  
  try {
    console.log(`📡 Fetching department list from ${baseUrl}`);
    
    // First, get the main page to extract department codes
    const response = await fetch(baseUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`📄 Received ${html.length} characters of HTML`);
    
    // Let's save the HTML to examine the structure
    fs.writeFileSync('carleton-courses-page.html', html);
    console.log('💾 Saved HTML to carleton-courses-page.html for analysis');
    
    // Extract department codes from links like <a href="COMP/">COMP</a>
    const departmentRegex = /<a href="([A-Z]{2,5})\/">\1<\/a>/g;
    const departments: string[] = [];
    
    let match;
    while ((match = departmentRegex.exec(html)) !== null) {
      departments.push(match[1]);
    }
    
    // Also look for special department links like /undergrad/courses/DATA/
    const specialDeptRegex = /<a href="\/undergrad\/courses\/([A-Z]{2,5})\/">([A-Z]{2,5})<\/a>/g;
    while ((match = specialDeptRegex.exec(html)) !== null) {
      if (!departments.includes(match[1])) {
        departments.push(match[1]);
      }
    }
    
    console.log(`🏛️  Found ${departments.length} departments:`, departments.sort().join(', '));
    
    // Now fetch courses from each department
    for (const dept of departments.sort()) {
      try {
        console.log(`🔍 Fetching courses for ${dept}...`);
        
        // Try standard URL format first
        let deptUrl = `${baseUrl}${dept}/`;
        let deptResponse = await fetch(deptUrl);
        
        // If that fails, try the special format
        if (!deptResponse.ok) {
          deptUrl = `${baseUrl}${dept.toLowerCase()}/`;
          deptResponse = await fetch(deptUrl);
        }
        
        if (deptResponse.ok) {
          const deptHtml = await deptResponse.text();
          
          // Extract courses in format "DEPT ####"
          const courseRegex = new RegExp(`(${dept})\\s+(\\d{4})`, 'g');
          const courseMatches = deptHtml.matchAll(courseRegex);
          
          for (const courseMatch of courseMatches) {
            const department = courseMatch[1];
            const number = courseMatch[2];
            const code = `${department} ${number}`;
            
            // Try to extract the course title from nearby text
            const titleRegex = new RegExp(
              `${department}\\s+${number}\\s*[\\[\\(]?[^\\n]*?[\\]\\)]?\\s*([^\\n<]+?)(?:<|\\n|$)`, 
              'i'
            );
            const titleMatch = deptHtml.match(titleRegex);
            let title = 'Course title not found';
            
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1]
                .replace(/\s*\([^)]*\)\s*/g, '') // Remove parenthetical content
                .replace(/\s*\[[^\]]*\]\s*/g, '') // Remove bracketed content
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();
            }
            
            // Only add if we haven't seen this course before
            if (!courses.find(c => c.code === code)) {
              courses.push({
                code,
                title,
                department,
                level: parseInt(number.charAt(0))
              });
            }
          }
          
          console.log(`   ✅ Found ${courses.filter(c => c.department === dept).length} courses for ${dept}`);
        } else {
          console.log(`   ⚠️  Could not fetch ${dept} (${deptResponse.status})`);
        }
        
        // Small delay to be respectful to their server
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.log(`   ❌ Error fetching ${dept}: ${error instanceof Error ? error.message : error}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error fetching courses:', error);
  }
  
  // Remove duplicates and sort
  const uniqueCourses = courses.filter((course, index, self) => 
    index === self.findIndex(c => c.code === course.code)
  );
  
  uniqueCourses.sort((a, b) => a.code.localeCompare(b.code));
  
  console.log(`🎯 Total unique courses found: ${uniqueCourses.length}`);
  
  return uniqueCourses;
}

async function saveCoursesToFile(courses: Course[]) {
  const courseCodes = courses.map(c => c.code);
  
  // Save as JSON
  fs.writeFileSync('real-carleton-courses.json', JSON.stringify(courses, null, 2));
  console.log(`💾 Saved ${courses.length} courses to real-carleton-courses.json`);
  
  // Save just course codes as text (one per line)
  fs.writeFileSync('real-carleton-course-codes.txt', courseCodes.join('\n'));
  console.log(`💾 Saved course codes to real-carleton-course-codes.txt`);
  
  // Group by department for analysis
  const byDepartment = courses.reduce((acc, course) => {
    if (!acc[course.department]) acc[course.department] = 0;
    acc[course.department]++;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('\n📊 Courses by Department:');
  Object.entries(byDepartment)
    .sort(([,a], [,b]) => b - a)
    .forEach(([dept, count]) => {
      console.log(`  ${dept}: ${count} courses`);
    });
}

async function main() {
  try {
    console.log('🚀 Starting real Carleton course discovery...\n');
    
    const courses = await scrapeCarletonCourses();
    
    if (courses.length > 0) {
      await saveCoursesToFile(courses);
      
      console.log('\n✅ Successfully extracted real Carleton courses!');
      console.log('📁 Check these files:');
      console.log('   - real-carleton-courses.json (full details)');
      console.log('   - real-carleton-course-codes.txt (just codes)');
      console.log('   - carleton-courses-page.html (raw HTML for analysis)');
    } else {
      console.log('❌ No courses found. The website structure may have changed.');
      console.log('💡 Check carleton-courses-page.html to see what we received.');
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
