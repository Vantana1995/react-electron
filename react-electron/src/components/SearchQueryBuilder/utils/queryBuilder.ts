/**
 * Query Builder Utility Functions
 * Core logic for building Twitter/X search queries
 */

import { SearchQueryState } from "../../../types";

/**
 * Initialize empty query state
 */
export function createEmptyQuery(): SearchQueryState {
  return {
    orGroups: [],
    exactPhrases: [],
    notWords: [],
    from: [],
    to: [],
    isVerified: false,
    isRetweet: false,
    isQuote: false,
    isReply: false,
    excludeRetweets: false,
    excludeReplies: false,
  };
}

/**
 * Build search query string from state
 */
export function buildSearchQuery(query: SearchQueryState): string {
  const parts: string[] = [];

  // === BASIC OPERATORS ===

  // OR Groups (each group uses OR internally, AND between groups)
  if (query.orGroups && query.orGroups.length > 0) {
    const groupParts: string[] = [];
    query.orGroups.forEach((group) => {
      if (group.length === 1) {
        // Single word - add with quotes
        groupParts.push(`"${group[0]}"`);
      } else if (group.length > 1) {
        // Multiple words - OR within group
        const groupPart = `(${group.map((word) => `"${word}"`).join(" OR ")})`;
        groupParts.push(groupPart);
      }
    });
    // Join groups with explicit AND
    if (groupParts.length > 0) {
      parts.push(groupParts.join(" AND "));
    }
  }

  // Exact phrases
  if (query.exactPhrases.length > 0) {
    query.exactPhrases.forEach((phrase) => {
      parts.push(`"${phrase}"`);
    });
  }

  // NOT words (exclude)
  if (query.notWords.length > 0) {
    query.notWords.forEach((word) => {
      parts.push(`-${word}`);
    });
  }

  // === ACCOUNT OPERATORS ===

  // From accounts
  if (query.from.length > 0) {
    if (query.from.length === 1) {
      parts.push(`from:${removeAtSymbol(query.from[0])}`);
    } else {
      const fromPart = `(${query.from
        .map((user) => `from:${removeAtSymbol(user)}`)
        .join(" OR ")})`;
      parts.push(fromPart);
    }
  }

  // To accounts
  if (query.to.length > 0) {
    query.to.forEach((user) => {
      parts.push(`to:${removeAtSymbol(user)}`);
    });
  }

  // === CONTENT FILTERS ===

  if (query.isVerified) {
    parts.push("filter:blue_verified");
  }

  if (query.isRetweet) {
    parts.push("filter:retweets");
  }

  if (query.isQuote) {
    parts.push("filter:quote");
  }

  if (query.isReply) {
    parts.push("filter:replies");
  }

  if (query.excludeRetweets) {
    parts.push("-filter:retweets");
  }

  if (query.excludeReplies) {
    parts.push("-filter:replies");
  }

  // Join all parts with spaces
  return parts.join(" ").trim();
}

/**
 * Generate Twitter/X search URL
 */
export function generateSearchURL(query: string, sortBy: "live" | "top" | "latest" = "live"): string {
  const baseURL = "https://x.com/search";
  const params = new URLSearchParams({
    q: query,
    src: "typed_query",
    f: sortBy,
  });

  return `${baseURL}?${params.toString()}`;
}

/**
 * Validate query string
 */
export function validateQuery(query: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if query is empty
  if (!query || query.trim().length === 0) {
    errors.push("Query cannot be empty");
    return { isValid: false, errors, warnings };
  }

  // Check query length (Twitter has limits)
  if (query.length > 500) {
    warnings.push("Query is very long and may not work properly");
  }

  // Check for unmatched quotes
  const quoteCount = (query.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    errors.push("Unmatched quotes detected");
  }

  // Check for unmatched parentheses
  const openParen = (query.match(/\(/g) || []).length;
  const closeParen = (query.match(/\)/g) || []).length;
  if (openParen !== closeParen) {
    errors.push("Unmatched parentheses detected");
  }

  // Check for conflicting filters
  if (query.includes("filter:images") && query.includes("filter:videos")) {
    warnings.push("Using both images and videos filter - consider using filter:media instead");
  }

  const hasIncludeRetweets = /(?:^|\s)filter:retweets(?:\s|$)/.test(query);
  const hasExcludeRetweets = query.includes("-filter:retweets");
  if (hasIncludeRetweets && hasExcludeRetweets) {
    errors.push("Conflicting filters: cannot both include and exclude retweets");
  }

  const hasIncludeReplies = /(?:^|\s)filter:replies(?:\s|$)/.test(query);
  const hasExcludeReplies = query.includes("-filter:replies");
  if (hasIncludeReplies && hasExcludeReplies) {
    errors.push("Conflicting filters: cannot both include and exclude replies");
  }

  // Check date format
  const datePattern = /since:|until:/g;
  const dates = query.match(datePattern);
  if (dates) {
    // Basic check - more detailed validation would be needed
    const dateValues = query.match(/\d{4}-\d{2}-\d{2}/g);
    if (dateValues) {
      dateValues.forEach((date) => {
        const [year, month, day] = date.split("-").map(Number);
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          errors.push(`Invalid date format: ${date}`);
        }
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Count query complexity
 */
export function getQueryComplexity(query: SearchQueryState): {
  operatorCount: number;
  complexity: "simple" | "moderate" | "complex";
} {
  let count = 0;

  // Count active operators
  if (query.orGroups && query.orGroups.length > 0) count++;
  if (query.exactPhrases.length > 0) count++;
  if (query.notWords.length > 0) count++;
  if (query.from.length > 0) count++;
  if (query.to.length > 0) count++;
  if (query.isVerified) count++;
  if (query.isRetweet) count++;
  if (query.isQuote) count++;
  if (query.isReply) count++;
  if (query.excludeRetweets) count++;
  if (query.excludeReplies) count++;

  const complexity: "simple" | "moderate" | "complex" =
    count <= 3 ? "simple" : count <= 6 ? "moderate" : "complex";

  return { operatorCount: count, complexity };
}

/**
 * Helper: Remove @ symbol from username
 */
function removeAtSymbol(username: string): string {
  return username.startsWith("@") ? username.substring(1) : username;
}

/**
 * Export query as JSON
 */
export function exportQueryAsJSON(query: SearchQueryState): string {
  return JSON.stringify(query, null, 2);
}

/**
 * Import query from JSON
 */
export function importQueryFromJSON(json: string): SearchQueryState | null {
  try {
    const parsed = JSON.parse(json);
    // Validate it has the right structure
    const empty = createEmptyQuery();
    const merged = { ...empty, ...parsed };
    return merged;
  } catch (error) {
    return null;
  }
}
