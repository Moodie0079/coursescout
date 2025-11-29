/**
 * Professor Name Utilities
 * Functions for normalizing and generating searchable professor name variations
 */

/**
 * Normalize a professor name for searching
 * Removes titles, special characters, and converts to lowercase
 * 
 * @example
 * normalizeName("Dr. Mohammad Sadeghi") → "mohammad sadeghi"
 * normalizeName("Prof. J. Smith") → "j smith"
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(dr|prof|professor|mr|ms|mrs)\.?\s*/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim();
}

/**
 * Generate all searchable variations of a professor name
 * Creates multiple search terms to handle different name formats from AI extraction
 * 
 * @example
 * generateSearchNames("Mohammad Rafsanjani-Sadeghi")
 * → ["mohammad rafsanjani sadeghi", "mohammad sadeghi", "m sadeghi", "mohammad", "rafsanjani", "sadeghi"]
 */
export function generateSearchNames(fullName: string): string[] {
  const normalized = normalizeName(fullName);
  const parts = normalized.split(/[\s-]+/).filter(p => p.length > 0);
  
  const variations = new Set<string>();
  
  // Full name
  variations.add(normalized);
  
  // Individual parts (especially useful for last names)
  parts.forEach(part => {
    if (part.length > 1) {
      variations.add(part);
    }
  });
  
  // First + Last name combination
  if (parts.length >= 2) {
    variations.add(`${parts[0]} ${parts[parts.length - 1]}`);
  }
  
  // First initial + Last name (e.g., "m sadeghi")
  if (parts.length >= 2) {
    variations.add(`${parts[0][0]} ${parts[parts.length - 1]}`);
  }
  
  return Array.from(variations);
}

