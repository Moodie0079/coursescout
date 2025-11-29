/**
 * AI Prompts for Course Analysis
 * Centralized prompt templates for OpenAI
 */

export function buildCourseAnalysisPrompt(courseCode: string, contentCount: number, threadContent: string): string {
  return `You are analyzing ${contentCount} Reddit discussions about ${courseCode} from Carleton University. Extract specific insights for prospective students based ONLY on what is explicitly stated in the discussions.

CRITICAL FILTERING REQUIREMENTS:
- ONLY extract information that explicitly mentions ${courseCode} or clearly discusses this specific course
- IGNORE any content about other courses, even if similar (e.g., don't use COMP 1006 info for COMP 1005)  
- IGNORE generic university discussions unless they specifically reference ${courseCode}
- When extracting professor names, ONLY include those explicitly mentioned in context of ${courseCode}
- Be extremely strict - if unsure whether content is about ${courseCode}, exclude it

CRITICAL DATA EXTRACTION RULES:
- ONLY include information explicitly stated in the discussions - DO NOT extrapolate or infer
- DO NOT make up or guess information when data is limited
- If a field lacks sufficient data, return empty array [] or neutral/insufficient message as specified below
- Quality over quantity - better to return limited accurate information than verbose guesses
- When multiple comments express similar points, consolidate them into one, two or three well-phrased items depending on your judgement on how different the comments are rather than repeating similar statements
- Scale your response length to match available data: sparse data = brief response, rich data = detailed response

SCORING GUIDELINES (Difficulty & Workload):
**Judge holistically based on the overall tone, sentiment, and intensity across all student comments.**

**THE SCALE:**
- 1-3 = Easy (students generally found it easy with minimal challenge)
- 4-7 = Moderate (typical course difficulty, manageable with reasonable effort)
- 8 = Hard (significant challenge, considerable effort required, clearly difficult)
- 9-10 = Extremely Hard (among the hardest courses, overwhelming difficulty, intense struggle)

**HOW TO JUDGE:**
1. **Read all relevant comments** about difficulty/workload to understand the overall student experience
2. **Assess the intensity** - Are students casual about it? Neutral? Stressed? Overwhelmed?
3. **Look at consensus** - Do most students agree, or is it split?
4. **Consider context clues:**
   - Do they describe struggling, stress, or being overwhelmed? → Higher scores
   - Do they describe ease, minimal effort, or breezing through? → Lower scores
   - Do they describe it as typical, standard, or what they expected? → Middle scores
5. **Match the score to the OVERALL SENTIMENT**, not individual words

**SCORING PHILOSOPHY:**
- Don't look for specific keywords - interpret the meaning behind what students say
- If students convey significant difficulty → 8
- If students convey it was among the hardest they've taken → 9-10
- If students convey it was standard/manageable → 4-7
- If students convey it was easy → 1-3
- When multiple students express similar intensity, that strengthens the score
- Use 9-10 when students consistently describe extreme difficulty relative to other courses
- Don't save 10 for hypothetical - if students experienced it as extremely hard, that IS a 10

**EXAMPLES:**
- Multiple students say it didn't require much effort, was straightforward → 2-3
- Students describe it as typical workload, nothing unusual, fair difficulty → 5-6
- Students mention needing to study consistently, significant time investment → 7
- Students clearly describe it as very challenging, difficult course → 8
- Students say "one of the hardest" or "extremely difficult" with strong consensus → 9
- Students say "hardest course in the program" or describe overwhelming struggle → 10

**ONLY return null when:** fewer than 5 total comments OR absolutely no one mentions difficulty/workload

REDDIT DISCUSSIONS:
${threadContent}

Provide analysis in this exact JSON format:
{
  "summary": "Write 4-6 sentence narrative about ${courseCode} if sufficient data. If limited data (1-3 comments): Write 1-2 sentence brief summary. If no meaningful data: 'Insufficient student feedback available for ${courseCode}.'",
  "difficulty": {
    "score": <NUMBER 1-10 or null>,
    "reason": "Detailed explanation based on student descriptions of concepts, exams, assignments, and challenge level. Match the score to the INTENSITY of student sentiment. If students expressed significant struggle, use 8-10. If they said it was quite easy, use 1-3. Use null ONLY if fewer than 5 comments total OR no mentions of difficulty."
  },
  "workload": {
    "score": <NUMBER 1-10 or null>,
    "reason": "Detailed explanation based on time commitment, assignment volume, and study requirements. Match the score to the INTENSITY of student sentiment. If students expressed heavy/overwhelming work, use 8-10. If they said it was light, use 1-3. Use null ONLY if fewer than 5 comments total OR no mentions of workload."
  },
  "pros": [
    {"text": "Detailed, specific positive aspect with context. Example: 'Professor explains concepts clearly with real-world examples that make complex topics easier to understand' NOT just 'good professor'"},
    {"text": "Another distinct positive with specifics"}
  ],
  "cons": [
    {"text": "Detailed, specific concern with context and impact. Example: 'Exams are very time-pressured with tricky multiple choice questions that test edge cases rather than understanding' NOT just 'hard exams'"},
    {"text": "Another distinct concern with specifics"}
  ],
  "professors": [
    {
      "name": "Full Professor Name",
      "sentiment": "positive",
      "mentions": 3,
      "feedback": "Summary of what students say about this professor's teaching"
    }
  ],
  "prerequisites": [
    {"text": "Specific prerequisite or preparation advice mentioned by students"}
  ],
  "expectations": [
    {"text": "What students explicitly say to expect about course format or teaching style"}
  ],
  "studentBenefits": [
    {"text": "Specific benefit, skill, or advantage students mention gaining from ${courseCode}"}
  ],
  "commonConcerns": [
    {"text": "Specific worry, challenge, or warning students mention about ${courseCode}"}
  ],
  "quotes": [
    {
      "text": "Verbatim quote from student",
      "author": "reddit_username",
      "score": 15,
      "context": "What this quote reveals about the course"
    }
  ]
}

IMPORTANT ARRAY HANDLING:
- For pros: Extract positive aspects with DETAIL and CONTEXT. Don't just say "good professor" - explain HOW (e.g., "Professor uses interactive coding demos during lectures which help visualize abstract concepts"). Include WHY it matters to students. If comments only say "prof was helpful" without detail, add what context you can from surrounding discussion. Consolidate similar points into comprehensive, descriptive statements. Aim for 3-7 detailed pros. Return empty [] ONLY if literally NO ONE said anything positive.
- For cons: Extract concerns with SPECIFICS and IMPACT. Don't just say "hard exams" - explain WHAT makes them hard and HOW it affects students (e.g., "Midterm covers 8 weeks of material with little partial credit, causing high stress and requiring extensive memorization"). Make each con informative and actionable. Consolidate similar complaints into comprehensive statements. Aim for 3-7 detailed cons. Return empty [] ONLY if literally NO ONE mentioned any concerns.
- For professors: Extract ALL professors mentioned in context of ${courseCode}. Even a single mention counts. Return empty [] only if no professors mentioned.
- For prerequisites: Extract ALL preparation advice mentioned, even brief statements like "need COMP 1004". Return empty [] only if none mentioned.
- For expectations: Extract what students say to expect, even brief mentions. Return empty [] only if none mentioned.
- For studentBenefits: Extract ANY benefits or skills students mention gaining from ${courseCode}, even briefly stated. Can overlap with pros. A single student saying "learned a lot about X" counts. Return empty [] only if no benefits mentioned at all.
- For commonConcerns: Extract ANY worries or warnings mentioned, even briefly. Can overlap with cons. A single student warning "study hard for midterm" counts. Return empty [] only if no concerns mentioned at all.
- For quotes: Include up to 8 meaningful verbatim quotes that capture insights. Return empty [] only if no good quotes exist.
- Consolidate only when points are essentially identical, not just similar.

CRITICAL REQUIREMENTS:
- Extract ONLY information specifically about ${courseCode}
- Return the exact JSON structure above - do not omit any fields
- For array fields: Return empty [] when no data exists (not arrays with description strings)
- For text fields: Return insufficient data message when no data exists
- For score fields: Use full 1-10 scale based on overall sentiment. Only return null if <5 comments OR zero mentions
- Extract information even from brief comments - "prof was great" is enough to be a pro
- DO NOT invent or hallucinate - must be actually stated in discussions, but can be brief
- For scores: Make holistic judgment calls interpreting the collective sentiment
- For arrays: Extract even single mentions - one student's comment is valid data
- Consolidate only truly identical points, not just similar ones
- Make insights specific and actionable for prospective students
- Scale response verbosity to available data (1-4 comments = brief, 10+ comments = moderate, 30+ comments = comprehensive)`;
}

export const SYSTEM_PROMPT = (courseCode: string) => 
  `You are an expert at analyzing student course discussions. Extract insights about ${courseCode} from Reddit discussions. For scores: Be accurate and match what students actually say - use extremes (1-2 or 9-10) ONLY when students explicitly describe something as extreme (e.g., "hardest course" or "easiest ever"). Most courses will naturally score 3-8. For pros/cons: Be detailed and specific - include context, explanations, and impact rather than generic statements. Extract information from comments and add relevant detail to make insights useful. Never invent information, but synthesize comments into comprehensive, informative statements.`;

