/**
 * Twitter/X Search Operators Definitions
 * Complete list of all available search operators for building advanced queries
 */

export type OperatorCategory =
  | "basic"
  | "account"
  | "content";

export type InputType =
  | "text"
  | "tags"
  | "number"
  | "date"
  | "time"
  | "checkbox"
  | "select"
  | "boolean"
  | "orGroups";

export interface SearchOperator {
  id: string;
  name: string;
  category: OperatorCategory;
  syntax: string;
  description: string;
  example: string;
  inputType: InputType;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  tooltip?: string;
}

export const SEARCH_OPERATORS: SearchOperator[] = [
  // ==================== BASIC OPERATORS ====================
  {
    id: "orGroups",
    name: "Keywords (OR Groups with AND)",
    category: "basic",
    syntax: '("word1" OR "word2") ("word3" OR "word4")',
    description: "Create OR groups that work with AND logic between them",
    example: '("GM" OR "gm") (web3 OR crypto)',
    inputType: "orGroups",
    placeholder: "Create OR groups...",
    tooltip: "Each group uses OR logic internally, groups are combined with AND",
  },
  {
    id: "exactPhrases",
    name: "Exact Phrases",
    category: "basic",
    syntax: '"..."',
    description: "Match exact phrases",
    example: '"crypto wallet"',
    inputType: "tags",
    placeholder: "Enter exact phrases...",
    tooltip: "Wrap phrases in quotes to match them exactly",
  },
  {
    id: "notWords",
    name: "Exclude words (NOT)",
    category: "basic",
    syntax: "-word",
    description: "Exclude posts containing these words (minus automatically added)",
    example: "scam spam",
    inputType: "tags",
    placeholder: "Enter words to exclude...",
    tooltip: "Posts will NOT contain any of these words. Just type the words, minus sign will be added automatically",
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

  // ==================== CONTENT FILTERS ====================
  {
    id: "isVerified",
    name: "Verified Users Only",
    category: "content",
    syntax: "filter:blue_verified",
    description: "Posts from blue verified accounts",
    example: "filter:blue_verified",
    inputType: "checkbox",
    tooltip: "Only show posts from blue verified accounts",
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
