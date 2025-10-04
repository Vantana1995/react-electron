/**
 * TagInput Component
 * Reusable tag input for keywords, hashtags, usernames, etc.
 */

import React, { useState, useRef, KeyboardEvent } from "react";
import { TagInputProps } from "../../../types";
import "./TagInput.css";

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = "Add item...",
  prefix = "",
  maxTags,
  allowDuplicates = false,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Check duplicates
    if (!allowDuplicates && tags.includes(trimmed)) {
      setInputValue("");
      return;
    }

    // Check max tags
    if (maxTags && tags.length >= maxTags) {
      alert(`Maximum ${maxTags} items allowed`);
      return;
    }

    onChange([...tags, trimmed]);
    setInputValue("");
  };

  const handleRemoveTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      // Remove last tag on backspace if input is empty
      handleRemoveTag(tags.length - 1);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={`tag-input-container ${className}`}
      onClick={handleContainerClick}
    >
      <div className="tag-input-tags">
        {tags.map((tag, index) => (
          <span key={index} className="tag-input-tag">
            {prefix}
            {tag}
            <button
              className="tag-input-remove"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(index);
              }}
              type="button"
              aria-label="Remove tag"
            >
              x
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="tag-input-field"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddTag}
          placeholder={tags.length === 0 ? placeholder : ""}
        />
      </div>
      {maxTags && (
        <small className="tag-input-count">
          {tags.length} / {maxTags}
        </small>
      )}
    </div>
  );
};
