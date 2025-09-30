/**
 * QueryPreview Component
 * Shows live preview of generated search query with syntax highlighting
 */

import React from "react";
import { validateQuery } from "./utils/queryBuilder";
import "./QueryPreview.css";

interface QueryPreviewProps {
  query: string;
  url: string;
}

export const QueryPreview: React.FC<QueryPreviewProps> = ({ query, url }) => {
  const validation = validateQuery(query);

  /**
   * Syntax highlight the query
   */
  const highlightSyntax = (text: string): JSX.Element[] => {
    if (!text) return [];

    const elements: JSX.Element[] = [];
    const operatorPattern =
      /(from:|to:|lang:|min_replies:|min_faves:|min_retweets:|min_quotes:|since:|until:|filter:|bio:|bio_name:|bio_location:|place:|near:|within:|geocode:|retweets_of:|conversation_id:|url:|entity:|context:|source:|place_country:|point_radius:|bounding_box:|since_time:|until_time:)/g;
    const booleanPattern = /\b(AND|OR|NOT)\b/g;
    const quotePattern = /"[^"]*"/g;
    const hashtagPattern = /#\w+/g;
    const mentionPattern = /@\w+/g;
    const cashtagPattern = /\$\w+/g;

    let lastIndex = 0;
    const matches: Array<{ index: number; length: number; type: string }> = [];

    // Find all matches
    let match;

    // Operators
    while ((match = operatorPattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "operator",
      });
    }

    // Boolean operators
    operatorPattern.lastIndex = 0;
    while ((match = booleanPattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "boolean",
      });
    }

    // Quotes
    booleanPattern.lastIndex = 0;
    while ((match = quotePattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "quote",
      });
    }

    // Hashtags
    quotePattern.lastIndex = 0;
    while ((match = hashtagPattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "hashtag",
      });
    }

    // Mentions
    hashtagPattern.lastIndex = 0;
    while ((match = mentionPattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "mention",
      });
    }

    // Cashtags
    mentionPattern.lastIndex = 0;
    while ((match = cashtagPattern.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "cashtag",
      });
    }

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Build highlighted output
    matches.forEach((m, idx) => {
      // Add text before match
      if (m.index > lastIndex) {
        elements.push(
          <span key={`text-${idx}`} className="query-preview-text">
            {text.substring(lastIndex, m.index)}
          </span>
        );
      }

      // Add highlighted match
      elements.push(
        <span key={`highlight-${idx}`} className={`query-preview-${m.type}`}>
          {text.substring(m.index, m.index + m.length)}
        </span>
      );

      lastIndex = m.index + m.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end" className="query-preview-text">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="query-preview">
      <div className="query-preview-section">
        <h4 className="query-preview-title">📋 Query Preview</h4>
        <div className="query-preview-box">
          {query ? (
            <pre className="query-preview-code">{highlightSyntax(query)}</pre>
          ) : (
            <span className="query-preview-empty">
              No query built yet. Start adding search criteria above.
            </span>
          )}
        </div>

        {/* Character count */}
        {query && (
          <div className="query-preview-stats">
            <span className="query-preview-char-count">
              {query.length} characters
            </span>
            {query.length > 400 && (
              <span className="query-preview-warning">
                ⚠️ Query is getting long
              </span>
            )}
          </div>
        )}

        {/* Validation messages */}
        {query && validation.errors.length > 0 && (
          <div className="query-preview-errors">
            {validation.errors.map((error, idx) => (
              <div key={idx} className="query-preview-error">
                ❌ {error}
              </div>
            ))}
          </div>
        )}

        {query && validation.warnings.length > 0 && (
          <div className="query-preview-warnings">
            {validation.warnings.map((warning, idx) => (
              <div key={idx} className="query-preview-warning-item">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="query-preview-section">
        <h4 className="query-preview-title">🔗 Generated URL</h4>
        <div className="query-preview-url-box">
          {url ? (
            <div className="query-preview-url">{url}</div>
          ) : (
            <span className="query-preview-empty">
              URL will appear here once you add search criteria
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
