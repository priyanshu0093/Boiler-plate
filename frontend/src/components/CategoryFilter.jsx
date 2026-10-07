import React from 'react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Resources' },
  { id: 'SPACES', label: 'Spaces' },
  { id: 'AUDIO', label: 'Audio' },
  { id: 'TESTING_HARDWARE', label: 'Testing Hardware' },
  { id: 'DISPLAYS', label: 'Displays' },
  { id: 'OTHER', label: 'Other' }
];

const STATUSES = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'AVAILABLE', label: 'Available Only' },
  { id: 'IN_USE', label: 'In Use Only' },
  { id: 'MAINTENANCE', label: 'Maintenance' }
];

export default function CategoryFilter({
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus
}) {
  return (
    <div className="filter-groups-wrapper">
      <div className="category-chips" role="tablist" aria-label="Resource Categories">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`chip-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="status-filter-wrapper">
        <label htmlFor="status-select" className="status-label">
          Status:
        </label>
        <select
          id="status-select"
          className="status-select"
          value={selectedStatus}
          onChange={(e) => onSelectStatus(e.target.value)}
        >
          {STATUSES.map((st) => (
            <option key={st.id} value={st.id}>
              {st.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
