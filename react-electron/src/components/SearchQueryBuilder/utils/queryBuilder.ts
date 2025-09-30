/**
 * Query Builder Utility Functions
 * Core logic for building Twitter/X search queries
 */

export interface SearchQueryState {
  // Basic
  keywords: string[];
  exactPhrases: string[];
  orWords: string[];
  notWords: string[];
  hashtags: string[];
  cashtags: string[];
  emoji: string;
  proximity: string;

  // Account
  from: string[];
  to: string[];
  mentions: string[];
  retweetsOf: string[];
  conversationId: string;
  bio: string;
  bioName: string;
  bioLocation: string;

  // Engagement
  minReplies: number | null;
  minFaves: number | null;
  minRetweets: number | null;
  minQuotes: number | null;

  // Date/Time
  since: string;
  until: string;
  sinceTime: string;
  untilTime: string;

  // Content Filters
  hasImages: boolean;
  hasVideos: boolean;
  hasMedia: boolean;
  hasLinks: boolean;
  url: string;
  hasPolls: boolean;
  isVerified: boolean;
  isRetweet: boolean;
  isQuote: boolean;
  isReply: boolean;
  hasEngagement: boolean;
  safeSearch: boolean;
  excludeRetweets: boolean;
  excludeReplies: boolean;

  // Location
  near: string;
  within: string;
  geocode: string;
  place: string;
  placeCountry: string;
  pointRadius: string;
  boundingBox: string;

  // Advanced
  language: string;
  source: string;
  entity: string;
  context: string;
}

/**
 * Initialize empty query state
 */
export function createEmptyQuery(): SearchQueryState {
  return {
    keywords: [],
    exactPhrases: [],
    orWords: [],
    notWords: [],
    hashtags: [],
    cashtags: [],
    emoji: "",
    proximity: "",
    from: [],
    to: [],
    mentions: [],
    retweetsOf: [],
    conversationId: "",
    bio: "",
    bioName: "",
    bioLocation: "",
    minReplies: null,
    minFaves: null,
    minRetweets: null,
    minQuotes: null,
    since: "",
    until: "",
    sinceTime: "",
    untilTime: "",
    hasImages: false,
    hasVideos: false,
    hasMedia: false,
    hasLinks: false,
    url: "",
    hasPolls: false,
    isVerified: false,
    isRetweet: false,
    isQuote: false,
    isReply: false,
    hasEngagement: false,
    safeSearch: false,
    excludeRetweets: false,
    excludeReplies: false,
    near: "",
    within: "",
    geocode: "",
    place: "",
    placeCountry: "",
    pointRadius: "",
    boundingBox: "",
    language: "",
    source: "",
    entity: "",
    context: "",
  };
}

/**
 * Build search query string from state
 */
export function buildSearchQuery(query: SearchQueryState): string {
  const parts: string[] = [];

  // === BASIC OPERATORS ===

  // Keywords (AND logic - all must match)
  if (query.keywords.length > 0) {
    query.keywords.forEach((keyword) => {
      parts.push(keyword);
    });
  }

  // Exact phrases
  if (query.exactPhrases.length > 0) {
    query.exactPhrases.forEach((phrase) => {
      parts.push(`"${phrase}"`);
    });
  }

  // OR words (any must match)
  if (query.orWords.length > 0) {
    const orPart = `(${query.orWords.join(" OR ")})`;
    parts.push(orPart);
  }

  // NOT words (exclude)
  if (query.notWords.length > 0) {
    query.notWords.forEach((word) => {
      parts.push(`-${word}`);
    });
  }

  // Hashtags
  if (query.hashtags.length > 0) {
    query.hashtags.forEach((tag) => {
      const hashtag = tag.startsWith("#") ? tag : `#${tag}`;
      parts.push(hashtag);
    });
  }

  // Cashtags
  if (query.cashtags.length > 0) {
    query.cashtags.forEach((tag) => {
      const cashtag = tag.startsWith("$") ? tag : `$${tag}`;
      parts.push(cashtag);
    });
  }

  // Emoji
  if (query.emoji.trim()) {
    parts.push(query.emoji.trim());
  }

  // Proximity search
  if (query.proximity.trim()) {
    parts.push(query.proximity.trim());
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

  // Mentions
  if (query.mentions.length > 0) {
    query.mentions.forEach((user) => {
      const mention = user.startsWith("@") ? user : `@${user}`;
      parts.push(mention);
    });
  }

  // Retweets of
  if (query.retweetsOf.length > 0) {
    query.retweetsOf.forEach((user) => {
      parts.push(`retweets_of:${removeAtSymbol(user)}`);
    });
  }

  // Conversation ID
  if (query.conversationId.trim()) {
    parts.push(`conversation_id:${query.conversationId.trim()}`);
  }

  // Bio search
  if (query.bio.trim()) {
    parts.push(`bio:"${query.bio.trim()}"`);
  }

  // Bio name
  if (query.bioName.trim()) {
    parts.push(`bio_name:${query.bioName.trim()}`);
  }

  // Bio location
  if (query.bioLocation.trim()) {
    parts.push(`bio_location:"${query.bioLocation.trim()}"`);
  }

  // === ENGAGEMENT OPERATORS ===

  if (query.minReplies !== null && query.minReplies > 0) {
    parts.push(`min_replies:${query.minReplies}`);
  }

  if (query.minFaves !== null && query.minFaves > 0) {
    parts.push(`min_faves:${query.minFaves}`);
  }

  if (query.minRetweets !== null && query.minRetweets > 0) {
    parts.push(`min_retweets:${query.minRetweets}`);
  }

  if (query.minQuotes !== null && query.minQuotes > 0) {
    parts.push(`min_quotes:${query.minQuotes}`);
  }

  // === DATE/TIME OPERATORS ===

  if (query.since) {
    parts.push(`since:${query.since}`);
  }

  if (query.until) {
    parts.push(`until:${query.until}`);
  }

  if (query.sinceTime) {
    parts.push(`since_time:${query.sinceTime}`);
  }

  if (query.untilTime) {
    parts.push(`until_time:${query.untilTime}`);
  }

  // === CONTENT FILTERS ===

  if (query.hasImages) {
    parts.push("filter:images");
  }

  if (query.hasVideos) {
    parts.push("filter:videos");
  }

  if (query.hasMedia) {
    parts.push("filter:media");
  }

  if (query.hasLinks) {
    parts.push("filter:links");
  }

  if (query.url.trim()) {
    parts.push(`url:"${query.url.trim()}"`);
  }

  if (query.hasPolls) {
    parts.push("filter:polls");
  }

  if (query.isVerified) {
    parts.push("filter:verified");
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

  if (query.hasEngagement) {
    parts.push("filter:has_engagement");
  }

  if (query.safeSearch) {
    parts.push("filter:safe");
  }

  if (query.excludeRetweets) {
    parts.push("-filter:retweets");
  }

  if (query.excludeReplies) {
    parts.push("-filter:replies");
  }

  // === LOCATION OPERATORS ===

  if (query.near.trim()) {
    parts.push(`near:"${query.near.trim()}"`);
  }

  if (query.within.trim()) {
    parts.push(`within:${query.within.trim()}`);
  }

  if (query.geocode.trim()) {
    parts.push(`geocode:${query.geocode.trim()}`);
  }

  if (query.place.trim()) {
    parts.push(`place:${query.place.trim()}`);
  }

  if (query.placeCountry) {
    parts.push(`place_country:${query.placeCountry}`);
  }

  if (query.pointRadius.trim()) {
    parts.push(`point_radius:${query.pointRadius.trim()}`);
  }

  if (query.boundingBox.trim()) {
    parts.push(`bounding_box:${query.boundingBox.trim()}`);
  }

  // === ADVANCED OPERATORS ===

  if (query.language) {
    parts.push(`lang:${query.language}`);
  }

  if (query.source) {
    parts.push(`source:${query.source}`);
  }

  if (query.entity.trim()) {
    parts.push(`entity:"${query.entity.trim()}"`);
  }

  if (query.context.trim()) {
    parts.push(`context:${query.context.trim()}`);
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

  if (query.includes("filter:retweets") && query.includes("-filter:retweets")) {
    errors.push("Conflicting filters: cannot both include and exclude retweets");
  }

  if (query.includes("filter:replies") && query.includes("-filter:replies")) {
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
  if (query.keywords.length > 0) count++;
  if (query.exactPhrases.length > 0) count++;
  if (query.orWords.length > 0) count++;
  if (query.notWords.length > 0) count++;
  if (query.hashtags.length > 0) count++;
  if (query.cashtags.length > 0) count++;
  if (query.from.length > 0) count++;
  if (query.to.length > 0) count++;
  if (query.mentions.length > 0) count++;
  if (query.minReplies !== null) count++;
  if (query.minFaves !== null) count++;
  if (query.minRetweets !== null) count++;
  if (query.since) count++;
  if (query.until) count++;
  if (query.hasImages) count++;
  if (query.hasVideos) count++;
  if (query.language) count++;
  // ... count other operators

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
 * Parse existing search URL back to query state (optional utility)
 */
export function parseSearchURL(url: string): Partial<SearchQueryState> | null {
  try {
    const urlObj = new URL(url);
    const queryParam = urlObj.searchParams.get("q");

    if (!queryParam) return null;

    // This is a simplified parser - full implementation would be complex
    const state: Partial<SearchQueryState> = {};

    // Parse basic patterns
    const fromMatches = queryParam.match(/from:(\w+)/g);
    if (fromMatches) {
      state.from = fromMatches.map((m) => m.replace("from:", ""));
    }

    const sinceMatch = queryParam.match(/since:(\d{4}-\d{2}-\d{2})/);
    if (sinceMatch) {
      state.since = sinceMatch[1];
    }

    // More parsing logic would go here...

    return state;
  } catch (error) {
    return null;
  }
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
