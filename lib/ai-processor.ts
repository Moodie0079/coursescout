// Restored AI Processor - Original Working Version
// This recreates the functionality that was working before the refactoring

import OpenAI from 'openai';
import { RedditThread, Insights } from '../app/types';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export class AIProcessor {
  async processThreads(
    threads: RedditThread[],
    courseCode: string,
    timeWindow: string,
    subredditsSearched: string[]
  ): Promise<Insights | null> {
    console.log(`🤖 AI Processor: Analyzing ${threads.length} threads for ${courseCode}`);
    
    if (threads.length === 0) {
      return this.buildEmptyInsights(courseCode, timeWindow, subredditsSearched);
    }
    
    try {
      // Extract relevant content from threads
      const relevantContent = this.extractRelevantContent(threads, courseCode);
      
      // Generate AI analysis
      const analysis = await this.generateAnalysis(relevantContent, courseCode);
      
      // Build comprehensive insights
      return this.buildInsights(analysis, threads, courseCode, timeWindow, subredditsSearched);
      
    } catch (error) {
      console.error('❌ AI processing failed:', error);
      return this.buildEmptyInsights(courseCode, timeWindow, subredditsSearched);
    }
  }

  private extractRelevantContent(threads: RedditThread[], courseCode: string) {
    const content = [];
    
    for (const thread of threads) {
      // Include ALL post content - let AI filter
      if (thread.post.title || thread.post.selftext) {
        content.push({
          type: 'post',
          text: `${thread.post.title}\n${thread.post.selftext || ''}`,
          score: thread.post.score,
          subreddit: thread.post.subreddit
        });
      }
      
      // Include ALL comments - let AI filter for relevance
      for (const comment of thread.comments) {
        if (comment.body && comment.body.trim()) {
          content.push({
            type: 'comment',
            text: comment.body,
            score: comment.score,
            author: comment.author,
            permalink: comment.permalink
            });
          }
        }
    }
    
    console.log(`📊 Sending ${content.length} pieces of content to AI for ${courseCode} analysis`);
    return content.slice(0, 2000); // Increased limit to handle more content
  }



  private async generateAnalysis(content: any[], courseCode: string) {
    if (content.length === 0) {
      return this.getDefaultAnalysis(courseCode);
    }

    // Prepare comprehensive content for AI analysis
    const threadContent = content.map((item, index) => 
      `[${index + 1}] ${item.type.toUpperCase()}: ${item.text.slice(0, 800)}`
    ).join('\n\n');

    const prompt = `You are analyzing ${content.length} Reddit discussions about ${courseCode} from Carleton University. Extract comprehensive insights for prospective students.

CRITICAL FILTERING REQUIREMENTS:
- ONLY extract information that explicitly mentions ${courseCode} or clearly discusses this specific course
- IGNORE any content about other courses, even if similar (e.g., don't use COMP 1006 info for COMP 1005)  
- IGNORE generic university discussions unless they specifically reference ${courseCode}
- When extracting professor names, ONLY include those explicitly mentioned in context of ${courseCode}
- Be extremely strict - if unsure whether content is about ${courseCode}, exclude it

REDDIT DISCUSSIONS:
${threadContent}

Provide detailed analysis in this JSON format:
{
  "summary": "Comprehensive 4-6 sentence narrative about ${courseCode} covering difficulty, workload, teaching quality, student experiences, and key takeaways. Be specific and detailed.",
  "difficulty": {
    "score": 1-10,
    "reason": "Detailed explanation based on student descriptions of concepts, exams, assignments, and overall challenge level"
  },
  "workload": {
    "score": 1-10,
    "reason": "Detailed explanation based on time commitment, assignment volume, and study requirements mentioned by students"
  },
  "pros": [
    {"text": "Detailed positive aspect with specific examples from discussions"},
    {"text": "Another detailed positive covering teaching, content, or learning outcomes"},
    {"text": "Third positive about practical applications or student success"},
    {"text": "Fourth positive about course structure or resources"},
    {"text": "Fifth positive about any other benefits mentioned"}
  ],
  "cons": [
    {"text": "Detailed concern with specific examples from student experiences"},
    {"text": "Another detailed concern about difficulty, workload, or teaching"},
    {"text": "Third concern about course organization or assessment"},
    {"text": "Fourth concern about prerequisites or preparation needed"},
    {"text": "Fifth concern about any other challenges mentioned"}
  ],
  "professors": [
    {
      "name": "Full Professor Name (extract complete names when available)",
      "sentiment": "positive/negative/mixed",
      "mentions": 3,
      "feedback": "Detailed summary of what students say about this professor's teaching style, helpfulness, grading, etc."
    }
  ],
  "prerequisites": [
    {"text": "Specific prerequisite or preparation advice mentioned by students"},
    {"text": "Another preparation recommendation from discussions"},
    {"text": "Additional background knowledge suggestions from students"}
  ],
  "expectations": [
    {"text": "What students say to expect in terms of course format"},
    {"text": "Teaching style or learning approach mentioned in discussions"},
    {"text": "Assessment methods or course structure details from student experiences"}
  ],
  "studentBenefits": [
    {"text": "Specific benefit or advantage students gain from taking this course"},
    {"text": "Academic or career advantage mentioned by students"},
    {"text": "Skills or knowledge students appreciate gaining from this course"}
  ],
  "commonConcerns": [
    {"text": "Specific worry or challenge students frequently mention"},
    {"text": "Common difficulty or frustration expressed in discussions"},
    {"text": "Area where students suggest improvements or warn others"}
  ],
  "quotes": [
    {
      "text": "Verbatim quote from student that captures key insight about the course",
      "author": "reddit_username",
      "score": 15,
      "context": "What this quote reveals about the course experience"
    },
    {
      "text": "Another meaningful quote that provides different perspective",
      "author": "reddit_username", 
      "score": 12,
      "context": "Additional context about this aspect of the course"
    }
  ]
}

CRITICAL REQUIREMENTS:
- Extract ONLY information specifically about ${courseCode}
- Provide 5 detailed pros and 5 detailed cons when sufficient data exists
- Student Benefits should be DIFFERENT from pros - focus on what students gain (skills, career advantages, personal growth)
- Common Concerns should be DIFFERENT from cons - focus on student worries, challenges, and warnings to future students
- Include specific professor names and detailed feedback when mentioned
- Use exact quotes that provide meaningful insights
- Base difficulty/workload scores on actual student experiences described
- If insufficient data exists for any section, return fewer items rather than generic content
- Make insights specific and actionable for prospective students`;
    
    try {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: `You are an expert at analyzing student course discussions. Extract detailed, specific insights about ${courseCode} from Reddit discussions. Focus on actionable information for prospective students. NEVER use generic statements - only specific insights from the provided discussions.` 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 8000, // Increased from 4000 to handle more comprehensive analysis
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      console.log(`✅ AI Analysis generated: ${result.pros?.length || 0} pros, ${result.cons?.length || 0} cons, ${result.professors?.length || 0} professors, ${result.quotes?.length || 0} quotes`);
      return result;
    } catch (error) {
      console.error('❌ OpenAI API failed:', error);
      return this.getDefaultAnalysis(courseCode);
    }
  }

  private buildInsights(analysis: any, threads: RedditThread[], courseCode: string, timeWindow: string, subredditsSearched: string[]): Insights {
    const validThreads = threads.filter(t => t.post);
    const totalComments = threads.reduce((sum, t) => sum + (t.comments?.length || 0), 0);
    
    // Calculate threads that actually contributed content to AI analysis
    const threadsWithUsefulContent = threads.filter(thread => {
      // Check if post contributed content
      const postContributed = thread.post && (thread.post.title || thread.post.selftext);
      
      // Check if any comments contributed content  
      const commentsContributed = thread.comments && thread.comments.some(comment => 
        comment.body && comment.body.trim() && comment.body.length > 0
      );
      
      return postContributed || commentsContributed;
    });
    
    // Generate comprehensive citations from actual comments
    const actualCitations: any[] = [];
    threads.forEach(thread => {
      thread.comments?.forEach(comment => {
        if (comment.body && comment.body.length > 20) {
          // Use the comment's own permalink if available, otherwise construct one
          let commentPermalink;
          if (comment.permalink) {
            commentPermalink = comment.permalink.startsWith('http') 
              ? comment.permalink 
              : `https://reddit.com${comment.permalink}`;
          } else {
            // Construct permalink: post permalink + comment ID
            const postPermalink = thread.post.permalink || thread.post.url;
            commentPermalink = `https://reddit.com${postPermalink}${comment.id}/`;
          }
          
          actualCitations.push({
            id: comment.id,
            text: comment.body.slice(0, 200),
            author: comment.author,
            score: comment.score || 0,
            permalink: commentPermalink,
            date: new Date(comment.created_utc * 1000).toISOString().split('T')[0]
          });
        }
      });
    });
    
    // Sort citations by score and relevance
    const topCitations = actualCitations
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
        
        return {
      summary: analysis.summary || `Comprehensive analysis of ${courseCode} based on ${validThreads.length} Reddit discussions with ${totalComments} student comments.`,
      
      difficulty: {
        score: Math.min(10, Math.max(1, analysis.difficulty?.score || 5)),
        reason: analysis.difficulty?.reason || "Difficulty assessment based on student discussions"
      },
      
      workload: {
        score: Math.min(10, Math.max(1, analysis.workload?.score || 5)),
        reason: analysis.workload?.reason || "Workload assessment based on student experiences"
      },
      
      pros: (analysis.pros || []).slice(0, 5).map((pro: any, index: number) => ({
        text: typeof pro === 'string' ? pro : pro.text,
        citations: topCitations.slice(index * 2, (index * 2) + 2).map(c => c.id)
      })),
      
      cons: (analysis.cons || []).slice(0, 5).map((con: any, index: number) => ({
        text: typeof con === 'string' ? con : con.text,
        citations: topCitations.slice((index + 5) * 2, ((index + 5) * 2) + 2).map(c => c.id)
      })),
      
      professors: (analysis.professors || [])
        .filter((prof: any) => {
          // Filter out generic/unknown professor names
          const name = prof.name?.toLowerCase() || '';
          return name && 
                 !name.includes('unknown') && 
                 !name.includes('professor') && 
                 !name.includes('instructor') &&
                 !name.includes('teacher') &&
                 !name.includes('prof') &&
                 name.length > 3 && // Avoid single letters or very short names
                 name.split(' ').length >= 2; // Require at least first + last name
        })
        .map((prof: any) => ({
          name: prof.name,
          sentiment: prof.sentiment || 'mixed' as 'positive' | 'negative' | 'mixed',
          mentions: prof.mentions || 1,
          feedback: prof.feedback || '',
          citations: topCitations.slice(0, 3).map(c => c.id),
          rateMyProfData: null // Will be populated by RMP API call in route.ts
        })),
      
      prerequisites: (analysis.prerequisites || []).slice(0, 4).map((prereq: any) => ({
        text: typeof prereq === 'string' ? prereq : prereq.text
      })),
      
      expectations: (analysis.expectations || []).slice(0, 4).map((expect: any) => ({
        text: typeof expect === 'string' ? expect : expect.text
      })),
      
      studentBenefits: (analysis.studentBenefits || []).slice(0, 5).map((benefit: any) => ({
        text: typeof benefit === 'string' ? benefit : benefit.text
      })),
      
      commonConcerns: (analysis.commonConcerns || []).slice(0, 5).map((concern: any) => ({
        text: typeof concern === 'string' ? concern : concern.text
      })),
      
      quotes: (analysis.quotes || []).slice(0, 8).map((quote: any, index: number) => ({
        text: quote.text,
        commentId: topCitations[index]?.id || `quote_${index}`,
        permalink: topCitations[index]?.permalink || '#',
        subreddit: validThreads[0]?.post.subreddit || 'CarletonU',
        date: topCitations[index]?.date || new Date().toISOString().split('T')[0],
        score: quote.score || topCitations[index]?.score || 0
      })),
      
      citations: topCitations,
      
      threadSources: validThreads.map(thread => ({
        id: thread.post.id,
        title: thread.post.title,
        subreddit: thread.post.subreddit,
        score: thread.post.score,
        comments: thread.post.num_comments,
        permalink: (() => {
          // Use url if it's a full URL, otherwise use permalink
          if (thread.post.url && thread.post.url.startsWith('http')) {
            return thread.post.url;
          }
          const permalink = thread.post.permalink || thread.post.url;
          return permalink.startsWith('http') ? permalink : `https://reddit.com${permalink}`;
        })(),
        date: new Date(thread.post.created_utc * 1000).toISOString().split('T')[0]
      })),
      
      coverage: {
        threadsConsidered: threads.length,
        threadsUsed: threadsWithUsefulContent.length, // Use threads that actually contributed content
        commentsConsidered: totalComments,
        relevantCommentsUsed: totalComments, // Show actual number of comments processed
        timeWindow: timeWindow,
        subredditsSearched: subredditsSearched,
        earliestPostDate: validThreads.length > 0 
          ? new Date(Math.min(...validThreads.map(t => t.post.created_utc * 1000))).toISOString().split('T')[0]
          : null,
        latestPostDate: validThreads.length > 0 
          ? new Date(Math.max(...validThreads.map(t => t.post.created_utc * 1000))).toISOString().split('T')[0]
          : null,
      },
      
      confidence: threadsWithUsefulContent.length >= 15 ? 0.9 : threadsWithUsefulContent.length >= 8 ? 0.7 : threadsWithUsefulContent.length >= 3 ? 0.5 : 0.3
    };
  }

  private buildEmptyInsights(courseCode: string, timeWindow: string, subredditsSearched: string[]): Insights {
          return {
      summary: `No sufficient discussions found for ${courseCode} in the specified time period.`,
      difficulty: { score: 5, reason: "Insufficient data to determine difficulty" },
      workload: { score: 5, reason: "Insufficient data to determine workload" },
      pros: [],
      cons: [],
      professors: [],
      quotes: [],
      citations: [],
      threadSources: [],
      coverage: {
        threadsConsidered: 0,
        threadsUsed: 0,
        commentsConsidered: 0,
        relevantCommentsUsed: 0,
        timeWindow: timeWindow,
        subredditsSearched: subredditsSearched,
        earliestPostDate: null,
        latestPostDate: null,
      },
      confidence: 0.1
    };
  }

  private getDefaultAnalysis(courseCode: string) {
    return {
      summary: `Limited analysis available for ${courseCode}`,
      difficulty: { score: 5, reason: "Unable to determine from available discussions" },
      workload: { score: 5, reason: "Unable to determine from available discussions" },
      pros: [
        { text: "Course provides learning opportunities" }
      ],
      cons: [
        { text: "Limited student feedback available" }
      ],
      professors: [],
      quotes: []
    };
  }
}

export const aiProcessor = new AIProcessor();