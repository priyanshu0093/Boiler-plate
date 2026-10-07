import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search resources by name, location...' }) {
  return (
    <div className="search-input-wrapper">
      <Search size={16} className="search-icon" aria-hidden="true" />
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search resources"
      />
      {value && (
        <button
          type="button"
          className="search-clear-btn"
          onClick={() => onChange('')}
          aria-label="Clear search text"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
