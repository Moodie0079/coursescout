// Service to fetch professor information from RateMyProfessors using the working library
import NodeCache from 'node-cache';
import { RateMyProfessor } from 'rate-my-professor-api-ts';

// const cache = new NodeCache({ stdTTL: 3600 }); // 1-hour cache - DISABLED per user request

export interface RateMyProfData {
  id: string;
  name: string;
  school: string;
  department: string;
  avgRating: number;
  numRatings: number;
  avgDifficulty: number;
  wouldTakeAgainPercent: number;
  topTags: string[];
  recentComments: Array<{
    comment: string;
    rating: number;
    difficulty: number;
    date: string;
    course: string;
  }>;
}

export class RateMyProfAPI {
  private rmp: RateMyProfessor;
  private debugMode: boolean = false; // Set to true for detailed matching logs
  // Cache disabled per user request
  // private professorListCache: any[] | null = null;
  // private professorListCacheTime: number = 0;
  // private readonly CACHE_DURATION = 3600000; // 1 hour in ms
  
  // Efficient indexing for professor lookups
  private professorIndex: Map<string, any> = new Map();
  private indexBuilt: boolean = false;

  constructor() {
    this.rmp = new RateMyProfessor("Carleton University");
  }

  // Method to enable debug mode for detailed RMP matching logs
  enableDebugMode() {
    this.debugMode = true;
    console.log("🐛 RateMyProfessor debug mode enabled - will show detailed matching logs");
  }

  disableDebugMode() {
    this.debugMode = false;
    console.log("🔇 RateMyProfessor debug mode disabled - reduced logging");
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }

  private isNameMatch(teacherName: string, searchName: string): boolean {
    const t = teacherName.toLowerCase().trim();
    const s = searchName.toLowerCase().trim();
    
    if (t === s) return true;
    
    // Prevent completely different names from matching (debug guard)
    const tWords = t.split(' ').filter(w => w.length > 1);
    const sWords = s.split(' ').filter(w => w.length > 1);
    const hasAnyCommonWord = tWords.some(tw => sWords.some(sw => 
      tw === sw || tw.includes(sw) || sw.includes(tw)
    ));
    
    if (!hasAnyCommonWord && tWords.length > 0 && sWords.length > 0) {
      if (this.debugMode) {
        console.log(`🚫 Rejecting match: "${searchName}" vs "${teacherName}" - no common words`);
      }
      return false;
    }
    
    // Only allow substring matching if one name is substantially contained in the other
    // and they share significant overlap (prevents false matches)
    if (s.length > 3 && t.includes(s) && s.length / t.length > 0.4) return true;
    if (t.length > 3 && s.includes(t) && t.length / s.length > 0.4) return true;
    
    // Try partial matches
    const tParts = t.split(' ').filter(p => p.length > 0);
    const sParts = s.split(' ').filter(p => p.length > 0);
    
    // Common nickname mappings
    const nicknameMap: Record<string, string[]> = {
      'michael': ['mike', 'mick'],
      'mike': ['michael'],
      'william': ['bill', 'will', 'billy'],
      'bill': ['william'],
      'will': ['william'],
      'robert': ['rob', 'bob', 'bobby'],
      'rob': ['robert'],
      'bob': ['robert'],
      'richard': ['rick', 'dick', 'rich'],
      'rick': ['richard'],
      'james': ['jim', 'jimmy'],
      'jim': ['james'],
      'john': ['johnny', 'jack'],
      'johnny': ['john'],
      'jack': ['john'],
      'david': ['dave', 'davy'],
      'dave': ['david'],
      'daniel': ['dan', 'danny'],
      'dan': ['daniel'],
      'anthony': ['tony'],
      'tony': ['anthony'],
      'christopher': ['chris'],
      'chris': ['christopher'],
      'matthew': ['matt'],
      'matt': ['matthew'],
      'andrew': ['andy', 'drew'],
      'andy': ['andrew'],
      'drew': ['andrew'],
      'joseph': ['joe', 'joey'],
      'joe': ['joseph'],
      'thomas': ['tom', 'tommy'],
      'tom': ['thomas'],
      'elizabeth': ['liz', 'beth', 'betty'],
      'liz': ['elizabeth'],
      'beth': ['elizabeth'],
      'jennifer': ['jen', 'jenny'],
      'jen': ['jennifer'],
      'jessica': ['jess', 'jessie'],
      'jess': ['jessica'],
      'catherine': ['cathy', 'cat', 'kate'],
      'cathy': ['catherine'],
      'kate': ['catherine'],
      'margaret': ['maggie', 'meg', 'peg'],
      'maggie': ['margaret'],
      'patricia': ['pat', 'patty', 'tricia'],
      'pat': ['patricia'],
      'susan': ['sue', 'susie'],
      'sue': ['susan']
    };

    // Clean both names of common titles and suffixes
    const cleanTeacherName = t.replace(/\b(dr|prof|professor|mr|ms|mrs)\b\.?\s*/gi, '');
    const cleanSearchName = s.replace(/\b(dr|prof|professor|mr|ms|mrs)\b\.?\s*/gi, '');
    
    // Check for exact match after cleaning
    if (cleanTeacherName === cleanSearchName) return true;
    
    const cleanTParts = cleanTeacherName.split(' ').filter(p => p.length > 0);
    const cleanSParts = cleanSearchName.split(' ').filter(p => p.length > 0);
    
    // Smart matching for professor names - handle cases like:
    // "Mohammad Rafsanjani-Sadeghi" should match "Mohammad Sadeghi"
    // Require first name + at least one other name component to match
    let actualMatches = 0;
    let hasFirstNameMatch = false;
    
    for (const sPart of cleanSParts) {
      let foundMatch = false;
      
      for (const tPart of cleanTParts) {
        // Only allow very strong matches
        if (tPart === sPart) {
          foundMatch = true;
          break;
        }
        
        // Allow exact substring only if substantial (>50% overlap)
        if (sPart.length > 2 && tPart.length > 2) {
          if ((tPart.includes(sPart) && sPart.length / tPart.length > 0.5) ||
              (sPart.includes(tPart) && tPart.length / sPart.length > 0.5)) {
            foundMatch = true;
            break;
          }
        }
        
        // Single letter initials only if exact match
        if (sPart.length === 1 && tPart.length === 1 && sPart === tPart) {
          foundMatch = true;
          break;
        }
        
        // Initial matching (e.g., "J" matches "John") only if first letter
        if (sPart.length === 1 && tPart.length > 1 && tPart.startsWith(sPart)) {
          foundMatch = true;
          break;
        }
        if (tPart.length === 1 && sPart.length > 1 && sPart.startsWith(tPart)) {
          foundMatch = true;
          break;
        }
        
        // Nickname matching only for exact matches in the map
        const searchVariants = nicknameMap[sPart] || [];
        const teacherVariants = nicknameMap[tPart] || [];
        
        if (searchVariants.includes(tPart) || teacherVariants.includes(sPart)) {
          foundMatch = true;
          break;
        }
        
        // Special case: handle hyphenated names
        // "Rafsanjani-Sadeghi" should match "Sadeghi"
        if (sPart.includes('-')) {
          const hyphenParts = sPart.split('-');
          if (hyphenParts.some(part => tPart === part)) {
            foundMatch = true;
            break;
          }
        }
        if (tPart.includes('-')) {
          const hyphenParts = tPart.split('-');
          if (hyphenParts.some(part => sPart === part)) {
            foundMatch = true;
            break;
          }
        }
      }
      
      if (foundMatch) {
        actualMatches++;
        // Track if this is likely a first name (first word in either name)
        if (cleanSParts.indexOf(sPart) === 0) {
          hasFirstNameMatch = true;
        }
      }
    }
    
    // For professor names, require:
    // 1. At least first name match + one other component
    // 2. At least 50% of search terms matched
    const minMatches = Math.max(2, Math.ceil(cleanSParts.length * 0.5));
    return hasFirstNameMatch && actualMatches >= minMatches;
  }

  private generateSearchKeys(name: string): string[] {
    const keys = new Set<string>();
    const cleanName = name.toLowerCase().trim().replace(/\b(dr|prof|professor|mr|ms|mrs)\b\.?\s*/gi, '');
    
    // Add full name
    keys.add(cleanName);
    
    // Add individual words
    const words = cleanName.split(/\s+/).filter(w => w.length > 1);
    words.forEach(word => keys.add(word));
    
    // Add first + last name combinations
    if (words.length >= 2) {
      keys.add(`${words[0]} ${words[words.length - 1]}`);
    }
    
    // Add hyphenated name parts
    words.forEach(word => {
      if (word.includes('-')) {
        word.split('-').forEach(part => {
          if (part.length > 1) keys.add(part);
        });
      }
    });
    
    // Add common nickname variations
    const nicknameMap: Record<string, string[]> = {
      'michael': ['mike', 'mick'], 'mike': ['michael'], 'william': ['bill', 'will'],
      'bill': ['william'], 'robert': ['rob', 'bob'], 'richard': ['rick', 'dick'],
      'james': ['jim'], 'john': ['jack'], 'david': ['dave'], 'daniel': ['dan'],
      'anthony': ['tony'], 'christopher': ['chris'], 'matthew': ['matt'],
      'andrew': ['andy'], 'joseph': ['joe'], 'thomas': ['tom']
    };
    
    words.forEach(word => {
      if (nicknameMap[word]) {
        nicknameMap[word].forEach(nickname => keys.add(nickname));
      }
    });
    
    return Array.from(keys);
  }

  private buildProfessorIndex(professors: any[]): void {
    this.professorIndex.clear();
    
    console.log(`🔨 Building efficient search index for ${professors.length} professors...`);
    const startTime = Date.now();
    
    professors.forEach(prof => {
      const searchKeys = this.generateSearchKeys(prof.name);
      searchKeys.forEach(key => {
        if (!this.professorIndex.has(key)) {
          this.professorIndex.set(key, []);
        }
        this.professorIndex.get(key)!.push(prof);
      });
    });
    
    const buildTime = Date.now() - startTime;
    console.log(`✅ Search index built in ${buildTime}ms with ${this.professorIndex.size} search keys`);
    this.indexBuilt = true;
  }

  private async getProfessorList(): Promise<any[]> {
    const now = Date.now();
    
    // Cache disabled per user request - always fetch fresh data
    // if (this.professorListCache && (now - this.professorListCacheTime) < this.CACHE_DURATION) {
    //   return this.professorListCache;
    // }
    
    try {
      console.log('Fetching professor list from RateMyProfessors...');
      const professors = await this.rmp.get_professor_list();
      
      // Build search index for efficient lookups
      this.buildProfessorIndex(professors);
      
      // Cache disabled per user request
      // this.professorListCache = professors;
      // this.professorListCacheTime = now;
      console.log(`Fetched ${professors.length} professors from Carleton University (no caching)`);
      return professors;
    } catch (error) {
      console.error('Error fetching professor list:', error);
      // Cache disabled - return empty array on error
      this.indexBuilt = false;
      return [];
    }
  }

  async searchProfessor(name: string, schoolName = 'Carleton University'): Promise<RateMyProfData | null> {
    // Cache disabled per user request - always fetch fresh data
    // const cacheKey = `rmp:${name}`;
    // const cached = cache.get<RateMyProfData>(cacheKey);
    // if (cached) return cached;

    try {
      // Ensure professor list is loaded and indexed
      await this.getProfessorList();
      
      if (!this.indexBuilt) {
        console.log(`❌ Search index not available for professor: "${name}"`);
        return null;
      }
      
      // Fast lookup using search index
      const searchKeys = this.generateSearchKeys(name);
      const candidateProfs = new Set<any>();
      
      if (this.debugMode) {
        console.log(`🔍 Fast search for: "${name}" using keys: [${searchKeys.join(', ')}]`);
      }
      
      // Collect all potential matches from index
      searchKeys.forEach(key => {
        const matches = this.professorIndex.get(key);
        if (matches) {
          matches.forEach((prof: any) => candidateProfs.add(prof));
        }
      });
      
      if (this.debugMode) {
        console.log(`⚡ Found ${candidateProfs.size} candidates in index (vs ${this.professorIndex.size} total keys)`);
      }
      
      // Now do detailed matching only on candidates (much smaller set)
      let matchingProf = null;
      for (const prof of candidateProfs) {
        if (this.isNameMatch(prof.name, name)) {
          matchingProf = prof;
          console.log(`✅ Matched "${name}" to "${prof.name}" (fast lookup)`);
          break;
        }
      }
      
      if (!matchingProf || matchingProf.num_ratings === 0) {
        console.log(`Professor "${name}" not found or has no ratings`);
        return null;
      }

      console.log(`Found professor "${matchingProf.name}" with ${matchingProf.num_ratings} ratings`);

      // Get detailed professor info which has the most current ratings
      let professorId = '';
      let detailedData = null;
      try {
        console.log(`🔗 Fetching detailed info for: "${matchingProf.name}"`);
        this.rmp.set_professor_name(matchingProf.name);
        const profDetails = await this.rmp.get_professor_info();
        detailedData = profDetails;
        professorId = profDetails.id || profDetails.legacyId?.toString() || '';
        console.log(`🆔 Professor ID: "${professorId}" for "${matchingProf.name}"`);
        console.log(`🔍 Professor details:`, JSON.stringify(profDetails, null, 2));
      } catch (error) {
        console.warn('Could not fetch detailed professor info:', error);
      }

      // Use detailed data if available (more current), fallback to basic data
      const finalData = detailedData || matchingProf;
      
      const result: RateMyProfData = {
        id: professorId,
        name: matchingProf.name,
        school: schoolName,
        department: matchingProf.department || 'Unknown Department',
        avgRating: finalData.avgRating || finalData.avg_rating || 0,
        numRatings: finalData.numRatings || finalData.num_ratings || 0,
        avgDifficulty: finalData.avgDifficulty || finalData.avg_difficulty || 0,
        wouldTakeAgainPercent: Math.round(finalData.wouldTakeAgainPercent || finalData.would_take_again_percent || 0),
        topTags: [], // The basic professor list doesn't include tags
        recentComments: []
      };
      
      // Cache disabled per user request
      // cache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.warn('RMP fetch error:', e);
      return null;
    }
  }

  async getMultipleProfessors(professorNames: string[], schoolName: string = "Carleton University"): Promise<Array<{ name: string; data: RateMyProfData | null }>> {
    const results: Array<{ name: string; data: RateMyProfData | null }> = [];
    
    // Build the search index once for all searches (major optimization)
    console.log(`🚀 Optimized batch lookup for ${professorNames.length} professors`);
    await this.getProfessorList();
    
    const batchStartTime = Date.now();
    
    for (const name of professorNames) {
      const data = await this.searchProfessor(name, schoolName);
      results.push({ name, data });
      
      // Reduced delay since we're now much more efficient
      if (professorNames.length > 1) {
        await this.delay(200); // Reduced from 500ms to 200ms
      }
    }
    
    const batchTime = Date.now() - batchStartTime;
    console.log(`⚡ Batch professor lookup completed in ${batchTime}ms (avg ${Math.round(batchTime/professorNames.length)}ms per professor)`);
    
    return results;
  }
}

export const rateMyProfAPI = new RateMyProfAPI();
