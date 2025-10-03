/**
 * Twitter/X Search Operators Definitions
 * Complete list of all available search operators for building advanced queries
 */

export type OperatorCategory =
  | "basic"
  | "account"
  | "content";

export interface SearchOperator {
  id: string;
  name: string;
  category: OperatorCategory;
  syntax: string;
  description: string;
  example: string;
  inputType: "text" | "tags" | "number" | "date" | "time" | "checkbox" | "select" | "boolean";
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  tooltip?: string;
}

export const SEARCH_OPERATORS: SearchOperator[] = [
  // ==================== BASIC OPERATORS ====================
  {
    id: "keywords",
    name: "Keywords",
    category: "basic",
    syntax: "",
    description: "Search for keywords in post body",
    example: "crypto blockchain",
    inputType: "tags",
    placeholder: "Enter keywords...",
    tooltip: "Matches any of these keywords in the post text",
  },
  {
    id: "exactPhrase",
    name: "Exact Phrase",
    category: "basic",
    syntax: '"..."',
    description: "Match exact phrase",
    example: '"crypto wallet"',
    inputType: "tags",
    placeholder: "Enter exact phrases...",
    tooltip: "Wrap phrases in quotes to match them exactly",
  },
  {
    id: "orWords",
    name: "ANY of these words (OR)",
    category: "basic",
    syntax: "(word1 OR word2)",
    description: "Match any of these words",
    example: "(bitcoin OR ethereum OR solana)",
    inputType: "tags",
    placeholder: "Add words for OR condition...",
    tooltip: "Posts must contain at least one of these words",
  },
  {
    id: "notWords",
    name: "Exclude words (NOT)",
    category: "basic",
    syntax: "-word",
    description: "Exclude posts containing these words",
    example: "-scam -spam",
    inputType: "tags",
    placeholder: "Words to exclude...",
    tooltip: "Posts will NOT contain any of these words",
  },
  {
    id: "hashtags",
    name: "Hashtags",
    category: "basic",
    syntax: "#hashtag",
    description: "Search for specific hashtags",
    example: "#bitcoin #crypto",
    inputType: "tags",
    placeholder: "Enter hashtags (with or without #)...",
    tooltip: "Match posts with these hashtags",
  },
  {
    id: "cashtags",
    name: "Cashtags",
    category: "basic",
    syntax: "$cashtag",
    description: "Search for stock/crypto ticker symbols",
    example: "$TSLA $BTC",
    inputType: "tags",
    placeholder: "Enter cashtags (with or without $)...",
    tooltip: "Match posts mentioning these ticker symbols",
  },

  // ==================== ACCOUNT OPERATORS ====================
  {
    id: "from",
    name: "From Account",
    category: "account",
    syntax: "from:",
    description: "Posts from specific accounts",
    example: "from:XDevelopers",
    inputType: "tags",
    placeholder: "Enter usernames (with or without @)...",
    tooltip: "Match posts from these specific accounts",
  },
  {
    id: "to",
    name: "To Account (Replies)",
    category: "account",
    syntax: "to:",
    description: "Replies to specific accounts",
    example: "to:elonmusk",
    inputType: "tags",
    placeholder: "Enter usernames...",
    tooltip: "Match replies directed to these accounts",
  },
  {
    id: "conversationId",
    name: "Conversation ID",
    category: "account",
    syntax: "conversation_id:",
    description: "Posts in same conversation thread",
    example: "conversation_id:1334987486343299072",
    inputType: "text",
    placeholder: "Enter conversation ID...",
    tooltip: "Match posts in a specific conversation thread",
  },

  // ==================== CONTENT FILTERS ====================
  {
    id: "isVerified",
    name: "Verified Users Only",
    category: "content",
    syntax: "filter:verified",
    description: "Posts from verified accounts",
    example: "filter:verified",
    inputType: "checkbox",
    tooltip: "Only show posts from verified accounts",
  },
  {
    id: "isRetweet",
    name: "Is Retweet",
    category: "content",
    syntax: "filter:retweets",
    description: "Only retweets",
    example: "filter:retweets",
    inputType: "checkbox",
    tooltip: "Only show retweets",
  },
  {
    id: "isQuote",
    name: "Is Quote Tweet",
    category: "content",
    syntax: "filter:quote",
    description: "Only quote tweets",
    example: "filter:quote",
    inputType: "checkbox",
    tooltip: "Only show quote tweets",
  },
  {
    id: "isReply",
    name: "Is Reply",
    category: "content",
    syntax: "filter:replies",
    description: "Only replies",
    example: "filter:replies",
    inputType: "checkbox",
    tooltip: "Only show replies",
  },
  {
    id: "hasEngagement",
    name: "Has Engagement",
    category: "content",
    syntax: "filter:has_engagement",
    description: "Posts with any engagement",
    example: "filter:has_engagement",
    inputType: "checkbox",
    tooltip: "Only show posts with likes, retweets, or replies",
  },
  {
    id: "safeSearch",
    name: "Safe Search",
    category: "content",
    syntax: "filter:safe",
    description: "Filter sensitive content",
    example: "filter:safe",
    inputType: "checkbox",
    tooltip: "Filter out potentially sensitive content",
  },
  {
    id: "excludeRetweets",
    name: "Exclude Retweets",
    category: "content",
    syntax: "-filter:retweets",
    description: "Exclude retweets",
    example: "-filter:retweets",
    inputType: "checkbox",
    tooltip: "Hide retweets from results",
  },
  {
    id: "excludeReplies",
    name: "Exclude Replies",
    category: "content",
    syntax: "-filter:replies",
    description: "Exclude replies",
    example: "-filter:replies",
    inputType: "checkbox",
    tooltip: "Hide replies from results",
  },

];

// Group operators by category
export const OPERATORS_BY_CATEGORY = SEARCH_OPERATORS.reduce((acc, op) => {
  if (!acc[op.category]) {
    acc[op.category] = [];
  }
  acc[op.category].push(op);
  return acc;
}, {} as Record<OperatorCategory, SearchOperator[]>);

// Category display names
export const OPERATOR_CATEGORIES: Record<OperatorCategory, string> = {
  basic: "Basic Search",
  account: "Accounts & Users",
  content: "Content Filters",
};

// Example queries
export interface ExampleQuery {
  title: string;
  description: string;
  query: string;
  operators: string[];
}

export const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    title: "Trending Crypto Tweets",
    description: "Crypto tweets from specific accounts",
    query: "(from:MrPicule OR from:GM) (crypto OR bitcoin) -filter:retweets",
    operators: ["from", "orWords", "excludeRetweets"],
  },
  {
    title: "Verified Users Discussion",
    description: "Conversation about AI from verified accounts",
    query: '"artificial intelligence" filter:verified',
    operators: ["exactPhrase", "isVerified"],
  },
  {
    title: "Complex Boolean Query",
    description: "Advanced search with multiple conditions",
    query: '(from:elonmusk OR from:BillGates) ("climate change" OR "renewable energy") -politics',
    operators: ["from", "exactPhrase", "orWords", "notWords"],
  },
  {
    title: "Original Content Only",
    description: "No retweets or replies",
    query: "crypto -filter:retweets -filter:replies filter:has_engagement",
    operators: ["keywords", "excludeRetweets", "excludeReplies", "hasEngagement"],
  },
];
