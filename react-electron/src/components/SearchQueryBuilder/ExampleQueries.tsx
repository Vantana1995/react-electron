/**
 * ExampleQueries Component
 * Showcases example search queries that users can load
 */

import React from "react";
import { EXAMPLE_QUERIES, ExampleQuery } from "./SearchOperators";
import "./ExampleQueries.css";

interface ExampleQueriesProps {
  onLoadExample: (query: string) => void;
}

export const ExampleQueries: React.FC<ExampleQueriesProps> = ({
  onLoadExample,
}) => {
  return (
    <div className="example-queries">
      <h3 className="example-queries-title">💡 Example Queries</h3>
      <p className="example-queries-subtitle">
        Click any example to load it into the builder and see how it works
      </p>

      <div className="example-queries-grid">
        {EXAMPLE_QUERIES.map((example, index) => (
          <ExampleQueryCard
            key={index}
            example={example}
            onLoad={() => onLoadExample(example.query)}
          />
        ))}
      </div>

      <div className="example-queries-tips">
        <h4>📚 Quick Tips</h4>
        <ul>
          <li>
            <strong>OR operator:</strong> Use parentheses for (word1 OR word2)
            to match either
          </li>
          <li>
            <strong>Exact phrases:</strong> Wrap in quotes "exact phrase" for
            precise matches
          </li>
          <li>
            <strong>Exclude words:</strong> Use -word or -"phrase" to exclude
            content
          </li>
          <li>
            <strong>Combine operators:</strong> Mix engagement filters, dates,
            and accounts for targeted searches
          </li>
          <li>
            <strong>Multiple accounts:</strong> Use (from:user1 OR from:user2)
            to search from multiple users
          </li>
        </ul>
      </div>
    </div>
  );
};

interface ExampleQueryCardProps {
  example: ExampleQuery;
  onLoad: () => void;
}

const ExampleQueryCard: React.FC<ExampleQueryCardProps> = ({
  example,
  onLoad,
}) => {
  return (
    <div className="example-query-card">
      <div className="example-query-card-header">
        <h4 className="example-query-card-title">{example.title}</h4>
      </div>

      <p className="example-query-card-description">{example.description}</p>

      <div className="example-query-card-query">
        <code>{example.query}</code>
      </div>

      <div className="example-query-card-operators">
        {example.operators.slice(0, 3).map((op, idx) => (
          <span key={idx} className="example-query-operator-tag">
            {op}
          </span>
        ))}
        {example.operators.length > 3 && (
          <span className="example-query-operator-more">
            +{example.operators.length - 3} more
          </span>
        )}
      </div>

      <button className="example-query-load-btn" onClick={onLoad}>
        ▶ Load Example
      </button>
    </div>
  );
};
