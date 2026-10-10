import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../context/OrganizationContext';
import { Building2, ChevronDown, Check, Layers } from 'lucide-react';

export default function OrganizationSwitcher() {
  const { organizations, activeOrganization, switchOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!activeOrganization) {
    return null;
  }

  return (
    <div className="org-switcher-container" ref={dropdownRef}>
      <button
        type="button"
        className="org-switcher-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={`Workspace: ${activeOrganization.name}`}
      >
        <div className="org-switcher-icon-wrapper">
          <Building2 size={13} className="org-switcher-icon" />
        </div>
        <span className="org-switcher-name" title={activeOrganization.name}>
          {activeOrganization.name}
        </span>
        {activeOrganization.memberRole && (
          <span className="org-switcher-role-tag">
            {activeOrganization.memberRole}
          </span>
        )}
        <ChevronDown size={12} className={`org-switcher-chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="org-switcher-dropdown" role="listbox">
          <div className="org-switcher-header">
            <span className="org-switcher-header-title">Workspaces</span>
            <span className="org-switcher-header-count">{organizations.length}</span>
          </div>

          <div className="org-switcher-list">
            {organizations.map((org) => {
              const isSelected = org._id === activeOrganization._id;
              return (
                <button
                  key={org._id}
                  type="button"
                  className={`org-switcher-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    if (!isSelected) {
                      switchOrganization(org._id);
                    }
                    setIsOpen(false);
                  }}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="org-item-avatar">
                    <Layers size={13} />
                  </div>
                  <div className="org-item-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="org-item-name">{org.name}</span>
                      {org.memberRole && (
                        <span className="org-dropdown-role-tag">{org.memberRole}</span>
                      )}
                    </div>
                    <span className="org-item-sub">{org.slug}</span>
                  </div>
                  {isSelected && (
                    <div className="org-item-check">
                      <Check size={14} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
