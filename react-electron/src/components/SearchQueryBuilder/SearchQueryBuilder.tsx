/**
 * SearchQueryBuilder Component
 * Visual builder for Twitter/X advanced search queries
 */

import React, { useState } from "react";
import { SearchQueryBuilderProps } from "../../types";
import {
  SearchOperator,
  SEARCH_OPERATORS,
  OPERATOR_CATEGORIES,
} from "./SearchOperators";
import {
  SearchQueryState,
  createEmptyQuery,
  buildSearchQuery,
  generateSearchURL,
  validateQuery,
} from "./utils/queryBuilder";
import { TagInput } from "./components/TagInput";
import { OrGroupsInput } from "./components/OrGroupsInput";
import { QueryPreview } from "./QueryPreview";
import { ExampleQueries } from "./ExampleQueries";
import "./SearchQueryBuilder.css";

export const SearchQueryBuilder: React.FC<SearchQueryBuilderProps> = ({
  onUseInScript,
  profileContext,
}) => {
  const [query, setQuery] = useState<SearchQueryState>(createEmptyQuery());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basic"])
  );
  const [sortBy, setSortBy] = useState<"live" | "top" | "latest">("live");

  // Build query string and URL
  const queryString = buildSearchQuery(query);
  const searchURL = generateSearchURL(queryString, sortBy);
  const validation = validateQuery(queryString);

  // Toggle section expansion
  const toggleSection = (category: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedSections(newExpanded);
  };

  // Update query field
  const updateQuery = (field: keyof SearchQueryState, value: any) => {
    setQuery((prev) => {
      const newQuery = { ...prev, [field]: value };

      // Mutual exclusion logic for retweets
      if (field === "isRetweet" && value === true) {
        newQuery.excludeRetweets = false;
      } else if (field === "excludeRetweets" && value === true) {
        newQuery.isRetweet = false;
      }

      // Mutual exclusion logic for replies
      if (field === "isReply" && value === true) {
        newQuery.excludeReplies = false;
      } else if (field === "excludeReplies" && value === true) {
        newQuery.isReply = false;
      }

      return newQuery;
    });
  };

  // Handle example query load
  const handleLoadExample = (exampleQuery: string) => {
    // For now, we'll just set keywords from the example
    // In a full implementation, we'd parse the query string
    setQuery(createEmptyQuery());
    setExpandedSections(new Set(["basic"]));
  };

  // Handle actions
  const handleCopyURL = () => {
    navigator.clipboard.writeText(searchURL);
    alert("Search URL copied to clipboard!");
  };

  const handleOpenSearch = () => {
    window.open(searchURL, "_blank");
  };

  const handleUseInScript = () => {
    console.log("🔍 Using search URL in script:");
    console.log("  Query String:", queryString);
    console.log("  Search URL:", searchURL);

    if (queryString.trim().length === 0) {
      alert("Please add at least one search criteria before using in script.");
      return;
    }

    if (onUseInScript) {
      onUseInScript(searchURL);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all fields?")) {
      setQuery(createEmptyQuery());
      setExpandedSections(new Set(["basic"]));
      setSortBy("live");
    }
  };

  // Render input for operator
  const renderOperatorInput = (operator: SearchOperator) => {
    const fieldName = operator.id as keyof SearchQueryState;

    switch (operator.inputType) {
      case "orGroups":
        return (
          <OrGroupsInput
            orGroups={query.orGroups || []}
            onChange={(orGroups) => updateQuery("orGroups", orGroups)}
          />
        );

      case "tags":
        return (
          <TagInput
            tags={(query[fieldName] as string[]) || []}
            onChange={(tags) => updateQuery(fieldName, tags)}
            placeholder={operator.placeholder}
            prefix={
              operator.syntax?.startsWith("#")
                ? "#"
                : operator.syntax?.startsWith("@")
                ? "@"
                : ""
            }
          />
        );

      case "text":
        return (
          <input
            type="text"
            className="sqb-input"
            placeholder={operator.placeholder}
            value={(query[fieldName] as string) || ""}
            onChange={(e) => updateQuery(fieldName, e.target.value)}
          />
        );

      case "number":
        return (
          <input
            type="number"
            className="sqb-input"
            placeholder={operator.placeholder}
            value={(query[fieldName] as number | null) ?? ""}
            onChange={(e) =>
              updateQuery(
                fieldName,
                e.target.value ? parseInt(e.target.value) : null
              )
            }
            min={0}
          />
        );

      case "date":
        return (
          <input
            type="date"
            className="sqb-input"
            value={(query[fieldName] as string) || ""}
            onChange={(e) => updateQuery(fieldName, e.target.value)}
          />
        );

      case "checkbox":
        return (
          <label className="sqb-checkbox-label">
            <input
              type="checkbox"
              checked={(query[fieldName] as boolean) || false}
              onChange={(e) => updateQuery(fieldName, e.target.checked)}
            />
            <span>Include in search</span>
          </label>
        );

      case "select":
        return (
          <select
            className="sqb-select"
            value={(query[fieldName] as string) || ""}
            onChange={(e) => updateQuery(fieldName, e.target.value)}
          >
            <option value="">Any</option>
            {operator.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  // Render operator category section
  const renderCategory = (category: string) => {
    const operators = SEARCH_OPERATORS.filter((op) => op.category === category);
    const isExpanded = expandedSections.has(category);
    const categoryName = OPERATOR_CATEGORIES[category] || category;

    return (
      <div key={category} className="sqb-category">
        <button
          className="sqb-category-header"
          onClick={() => toggleSection(category)}
          type="button"
        >
          <span className="sqb-category-icon">{isExpanded ? "▼" : "▶"}</span>
          <span className="sqb-category-name">{categoryName}</span>
          <span className="sqb-category-count">({operators.length})</span>
        </button>

        {isExpanded && (
          <div className="sqb-category-content">
            <div className="sqb-operators-grid">
              {operators.map((operator) => (
                <div key={operator.id} className="sqb-operator">
                  <label className="sqb-operator-label">
                    <span className="sqb-operator-name">{operator.name}</span>
                    {operator.tooltip && (
                      <span
                        className="sqb-operator-tooltip"
                        title={operator.tooltip}
                      >
                        Info
                      </span>
                    )}
                  </label>
                  {operator.description && (
                    <p className="sqb-operator-description">
                      {operator.description}
                    </p>
                  )}
                  {renderOperatorInput(operator)}
                  {operator.example && (
                    <p className="sqb-operator-example">
                      Example: <code>{operator.example}</code>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="search-query-builder">
      <div className="sqb-header">
        <h2>
          {profileContext
            ? `Build Query for Profile: ${profileContext.profileName}`
            : "Twitter/X Advanced Search Builder"}
        </h2>
        <p className="sqb-subtitle">
          {profileContext
            ? `Configure search query for profile "${profileContext.profileName}"`
            : "Build complex search queries visually - no syntax knowledge required"}
        </p>
        {queryString.trim().length === 0 && (
          <div className="sqb-empty-hint">
            <strong>Get started:</strong> Fill in search criteria below
            (keywords, accounts, dates, etc.), then click "Use in Script" to
            apply the search URL.
          </div>
        )}
      </div>

      <div className="sqb-main">
        <div className="sqb-form-section">
          <div className="sqb-categories">
            {Object.keys(OPERATOR_CATEGORIES).map(renderCategory)}
          </div>

          <div className="sqb-sort-section">
            <label className="sqb-sort-label">
              <span>Sort Results By:</span>
              <select
                className="sqb-select"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "live" | "top" | "latest")
                }
              >
                <option value="live">Live (Real-time)</option>
                <option value="top">Top (Most popular)</option>
                <option value="latest">Latest (Most recent)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="sqb-preview-section">
          <QueryPreview query={queryString} url={searchURL} />

          <div className="sqb-actions">
            <button
              className="sqb-btn sqb-btn-primary"
              onClick={handleUseInScript}
              disabled={!validation.isValid || queryString.trim().length === 0}
              title={
                !validation.isValid
                  ? "Fix errors before using"
                  : "Use this URL in script"
              }
            >
              Use in Script
            </button>
            <button
              className="sqb-btn sqb-btn-secondary"
              onClick={handleCopyURL}
              disabled={queryString.trim().length === 0}
            >
              Copy URL
            </button>
            <button
              className="sqb-btn sqb-btn-secondary"
              onClick={handleOpenSearch}
              disabled={queryString.trim().length === 0}
            >
              Open in Twitter
            </button>
            <button className="sqb-btn sqb-btn-danger" onClick={handleReset}>
              Reset All
            </button>
          </div>
        </div>
      </div>

      <ExampleQueries onLoadExample={handleLoadExample} />
    </div>
  );
};
