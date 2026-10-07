import React from 'react';
import ResourceCard from './ResourceCard';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ResourceGrid({
  resources,
  loading,
  error,
  onSelectResource,
  onBookResource,
  onRetry
}) {
  if (loading) {
    return (
      <div className="resource-grid" aria-busy="true" aria-label="Loading resources">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <AlertCircle size={32} style={{ color: '#D97706', marginBottom: 12 }} />
        <h3 className="empty-state-title">Unable to load resources</h3>
        <p className="empty-state-desc">{error}</p>
        <button type="button" className="btn-primary" onClick={onRetry}>
          <RotateCcw size={14} /> Try Again
        </button>
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">No resources found</h3>
        <p className="empty-state-desc">
          No office equipment or rooms match your current filters. Try selecting a different category or clearing your search term.
        </p>
      </div>
    );
  }

  return (
    <div className="resource-grid">
      {resources.map((resource) => (
        <ResourceCard
          key={resource._id}
          resource={resource}
          onSelect={onSelectResource}
          onBook={onBookResource}
        />
      ))}
    </div>
  );
}
