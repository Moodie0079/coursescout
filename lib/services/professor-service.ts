/**
 * Professor Service
 * Manages professor data retrieval with automatic stale data refresh
 */

import { Professor } from '@prisma/client';
import { prisma } from '../prisma';
import { generateSearchNames, normalizeName } from '../utils/professor-name-utils';
import { logger } from '../logger';
import {
  PROFESSOR_DATA_STALE_DAYS,
  RMP_GRAPHQL_ENDPOINT,
  RMP_SCHOOL_ID,
  RMP_SEARCH_RESULT_LIMIT,
  RMP_FETCH_TIMEOUT_MS,
} from '../constants';

type RmpTeacherNode = {
  id: string;
  legacyId?: string;
  firstName: string;
  lastName: string;
  department?: string;
  avgRating?: number;
  numRatings?: number;
  avgDifficulty?: number;
  wouldTakeAgainPercent?: number;
  school?: { name?: string } | null;
};

const TEACHER_SEARCH_QUERY = `
  query TeacherSearchResultsPageQuery($query: TeacherSearchQuery!) {
    newSearch {
      teachers(query: $query, first: ${RMP_SEARCH_RESULT_LIMIT}) {
        edges {
          node {
            id
            legacyId
            firstName
            lastName
            department
            avgRating
            numRatings
            wouldTakeAgainPercent
            avgDifficulty
            school {
              name
            }
          }
        }
      }
    }
  }
`;

class ProfessorService {
  /**
   * Get professor data with automatic on-demand caching.
   */
  async getProfessorData(name: string): Promise<Professor | null> {
    const cachedProfessor = await this.findInDatabase(name);

    if (!cachedProfessor) {
      logger.info(`    → ${name} not found in database - fetching from RMP...`);
      return await this.fetchAndStoreProfessor(name);
    }

    // Check if data needs refresh (>30 days old)
    const daysSinceCheck = Math.floor((Date.now() - cachedProfessor.lastCheckedAt.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysSinceCheck > PROFESSOR_DATA_STALE_DAYS) {
      logger.info(`    → ${cachedProfessor.fullName} data is ${daysSinceCheck} days old (stale) - refreshing...`);
      const refreshed = await this.refreshProfessor(cachedProfessor);
      return refreshed ?? cachedProfessor;
    }

    return cachedProfessor;
  }

  /**
   * Search database for professor using pre-computed search variations.
   */
  private async findInDatabase(name: string): Promise<Professor | null> {
    const searchTerm = normalizeName(name);

    return prisma.professor.findFirst({
      where: {
        searchNames: {
          has: searchTerm,
        },
      },
    });
  }

  /**
   * Fetch professor from RMP and store in database.
   */
  private async fetchAndStoreProfessor(name: string): Promise<Professor | null> {
    const rmpProfessor = await this.fetchProfessorFromRmp(name);

    if (!rmpProfessor) {
      logger.info('Professor not found on RMP', { name });
      return null;
    }

    const fullName = this.buildFullName(rmpProfessor);
    const searchNames = generateSearchNames(fullName);

    return prisma.professor.create({
      data: {
        rmpId: rmpProfessor.legacyId ? String(rmpProfessor.legacyId) : null,
        fullName,
        avgRating: rmpProfessor.avgRating ?? null,
        numRatings: rmpProfessor.numRatings ?? 0,
        avgDifficulty: rmpProfessor.avgDifficulty ?? null,
        wouldTakeAgain: this.roundValue(rmpProfessor.wouldTakeAgainPercent),
        department: rmpProfessor.department ?? null,
        school: rmpProfessor.school?.name ?? 'Carleton University',
        searchNames,
      },
    });
  }

  /**
   * Refresh existing professor data if needed.
   */
  private async refreshProfessor(existing: Professor): Promise<Professor | null> {
    const rmpProfessor = await this.fetchProfessorFromRmp(existing.fullName);

    if (!rmpProfessor) {
      await this.markChecked(existing.id);
      return null;
    }

    const fullName = this.buildFullName(rmpProfessor);

    return prisma.professor.update({
      where: { id: existing.id },
      data: {
        rmpId: rmpProfessor.legacyId ? String(rmpProfessor.legacyId) : existing.rmpId,
        fullName,
        avgRating: rmpProfessor.avgRating ?? existing.avgRating,
        numRatings: rmpProfessor.numRatings ?? existing.numRatings,
        avgDifficulty: rmpProfessor.avgDifficulty ?? existing.avgDifficulty,
        wouldTakeAgain:
          this.roundValue(rmpProfessor.wouldTakeAgainPercent) ?? existing.wouldTakeAgain,
        department: rmpProfessor.department ?? existing.department,
        school: rmpProfessor.school?.name ?? existing.school,
        searchNames: generateSearchNames(fullName),
        lastCheckedAt: new Date(),
      },
    });
  }

  /**
   * Fetch best matching professor from RateMyProfessors.
   */
  private async fetchProfessorFromRmp(name: string): Promise<RmpTeacherNode | null> {
    try {
      const response = await fetch(RMP_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // RMP expects a header. Any value works; mimic browser behavior.
          Authorization: 'Basic dGVzdDp0ZXN0',
        },
        body: JSON.stringify({
          query: TEACHER_SEARCH_QUERY,
          variables: {
            query: {
              text: name,
              schoolID: RMP_SCHOOL_ID,
              fallback: true,
              departmentID: null,
            },
          },
        }),
        signal: AbortSignal.timeout(RMP_FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        logger.warn('RMP request failed', { name, status: response.status });
        return null;
      }

      const body = (await response.json()) as {
        data?: {
          newSearch?: {
            teachers?: { edges?: Array<{ node: RmpTeacherNode }> };
          };
        };
      };

      const edges = body.data?.newSearch?.teachers?.edges ?? [];
      if (edges.length === 0) {
        return null;
      }

      const normalizedTarget = normalizeName(name);
      const scoredCandidates = edges
        .map((edge) => this.scoreCandidate(edge.node, normalizedTarget))
        .filter((candidate): candidate is ScoredCandidate => candidate.score > 0);

      if (scoredCandidates.length === 0) {
        return null;
      }

      scoredCandidates.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (b.node.numRatings ?? 0) - (a.node.numRatings ?? 0);
      });

      return scoredCandidates[0].node;
    } catch (error) {
      logger.warn('Failed to fetch professor from RMP', { name, error });
      return null;
    }
  }

  /**
   * Check if cached data is stale.
   */
  private isDataStale(lastCheckedAt: Date): boolean {
    const staleThresholdMs = PROFESSOR_DATA_STALE_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - lastCheckedAt.getTime() > staleThresholdMs;
  }

  private async markChecked(professorId: string): Promise<void> {
    await prisma.professor.update({
      where: { id: professorId },
      data: { lastCheckedAt: new Date() },
    });
  }

  private buildFullName(node: RmpTeacherNode): string {
    return `${node.firstName ?? ''} ${node.lastName ?? ''}`.trim();
  }

  private roundValue(value?: number | null): number | null {
    if (value === undefined || value === null) return null;
    return Math.round(value);
  }

  private scoreCandidate(node: RmpTeacherNode, normalizedTarget: string): ScoredCandidate {
    const candidateName = normalizeName(this.buildFullName(node));
    if (!candidateName) {
      return { node, score: 0 };
    }

    const targetParts = normalizedTarget.split(' ').filter(Boolean);
    const candidateParts = candidateName.split(' ').filter(Boolean);

    const targetLastName = targetParts[targetParts.length - 1];
    const candidateLastName = candidateParts[candidateParts.length - 1];

    if (!targetLastName || !candidateLastName || targetLastName !== candidateLastName) {
      return { node, score: 0 };
    }

    let score = 3; // strong weight for matching last name

    const targetFirstName = targetParts[0];
    const candidateFirstName = candidateParts[0];
    if (targetFirstName && candidateFirstName && targetFirstName === candidateFirstName) {
      score += 2;
    }

    const overlap = candidateParts.filter((part) => targetParts.includes(part)).length;
    score += overlap;

    return { node, score };
  }
}

type ScoredCandidate = { node: RmpTeacherNode; score: number };

export const professorService = new ProfessorService();

