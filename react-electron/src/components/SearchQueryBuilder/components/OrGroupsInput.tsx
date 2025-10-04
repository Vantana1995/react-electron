/**
 * OrGroupsInput Component
 * Manages multiple OR groups with AND logic between them
 * Each group contains words combined with OR, groups are combined with AND
 */

import React from "react";
import { TagInput } from "./TagInput";
import "../SearchQueryBuilder.css";

interface OrGroupsInputProps {
  orGroups: string[][];
  onChange: (orGroups: string[][]) => void;
}

export const OrGroupsInput: React.FC<OrGroupsInputProps> = ({
  orGroups,
  onChange,
}) => {
  // Add new empty OR group
  const handleAddGroup = () => {
    onChange([...orGroups, []]);
  };

  // Remove OR group by index
  const handleRemoveGroup = (index: number) => {
    const newGroups = orGroups.filter((_, i) => i !== index);
    onChange(newGroups);
  };

  // Update specific group's words
  const handleGroupChange = (index: number, newWords: string[]) => {
    const newGroups = [...orGroups];
    newGroups[index] = newWords;
    onChange(newGroups);
  };

  return (
    <div className="or-groups-container">
      {orGroups.length === 0 ? (
        <div className="or-groups-empty">
          <p>No OR groups added yet.</p>
          <p className="or-groups-hint">
            Click "+ Add OR Group" to create groups of words combined with OR logic.
            Multiple groups will be combined with AND.
          </p>
        </div>
      ) : (
        <div className="or-groups-list">
          {orGroups.map((group, index) => (
            <div key={index} className="or-group-item">
              <div className="or-group-header">
                <span className="or-group-label">
                  OR Group {index + 1}
                  <span className="or-group-hint-inline">
                    (words inside use OR logic)
                  </span>
                </span>
                <button
                  type="button"
                  className="or-group-remove-btn"
                  onClick={() => handleRemoveGroup(index)}
                  title="Remove this OR group"
                >
                  ×
                </button>
              </div>

              <TagInput
                tags={group}
                onChange={(newWords) => handleGroupChange(index, newWords)}
                placeholder="Add words to this OR group..."
              />

              {/* Show AND separator except for the last group */}
              {index < orGroups.length - 1 && (
                <div className="or-group-separator">
                  <span className="or-group-separator-text">AND</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="or-group-add-btn"
        onClick={handleAddGroup}
      >
        + Add OR Group
      </button>

      {orGroups.length > 0 && (
        <div className="or-groups-example">
          <strong>Example result:</strong>{" "}
          {orGroups
            .filter((group) => group.length > 0)
            .map((group, index) => (
              <span key={index}>
                {group.length === 1 ? (
                  <code>"{group[0]}"</code>
                ) : (
                  <code>({group.map((w) => `"${w}"`).join(" OR ")})</code>
                )}
                {index < orGroups.filter((g) => g.length > 0).length - 1 && (
                  <span style={{ margin: "0 4px" }}>AND</span>
                )}
              </span>
            ))}
        </div>
      )}
    </div>
  );
};
