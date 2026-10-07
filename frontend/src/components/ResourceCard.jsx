import React from 'react';
import StatusBadge from './StatusBadge';
import { MapPin, ArrowRight } from 'lucide-react';

export default function ResourceCard({ resource, onSelect, onBook }) {
  const { name, category, location, image, description, status, specifications } = resource;

  const specEntries = specifications && typeof specifications === 'object'
    ? Object.entries(specifications).slice(0, 3)
    : [];

  return (
    <article
      className="resource-card"
      onClick={() => onSelect(resource)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(resource);
        }
      }}
      aria-label={`View details for ${name}`}
    >
      <div className="resource-card-media">
        {image ? (
          <img
            src={image}
            alt={name}
            className="resource-image"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="resource-image-fallback"
          style={{ display: image ? 'none' : 'flex' }}
        >
          {name}
        </div>
        <span className="card-category-badge">{category.replace('_', ' ')}</span>
      </div>

      <div className="resource-card-body">
        <div className="card-title-row">
          <h3 className="card-resource-name">{name}</h3>
          <StatusBadge status={status} />
        </div>

        <div className="card-meta-line">
          <MapPin size={13} style={{ flexShrink: 0 }} />
          <span>{location}</span>
        </div>

        <p className="card-description">{description}</p>

        {specEntries.length > 0 && (
          <div className="card-specs-row">
            {specEntries.map(([key, val]) => (
              <span key={key} className="spec-pill">
                {val}
              </span>
            ))}
          </div>
        )}

        <div className="card-footer">
          <span className="view-details-btn">
            View Details <ArrowRight size={13} />
          </span>
          {onBook && (
            <button
              type="button"
              className="card-book-btn"
              disabled={status === 'MAINTENANCE'}
              onClick={(e) => {
                e.stopPropagation();
                onBook(resource);
              }}
              aria-label={`Book ${name}`}
            >
              Book
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
