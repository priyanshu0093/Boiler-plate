import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUserOrganizations } from '../api/client';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Fetch and validate organizations for the authenticated user
  const fetchOrganizations = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setOrganizations([]);
      setActiveOrganization(null);
      localStorage.removeItem('deskdrop_org_id');
      setLoadingOrgs(false);
      return;
    }

    try {
      setLoadingOrgs(true);
      const res = await getUserOrganizations();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const fetchedOrgs = res.data;
        setOrganizations(fetchedOrgs);

        // Validate stored organization against authorized memberships
        const storedOrgId = localStorage.getItem('deskdrop_org_id');
        let selected = fetchedOrgs.find((o) => o._id === storedOrgId);

        // If stored org is invalid, not found, or missing, select the first authorized org
        if (!selected) {
          selected = fetchedOrgs[0];
        }

        setActiveOrganization(selected);
        localStorage.setItem('deskdrop_org_id', selected._id);
      } else {
        setOrganizations([]);
        setActiveOrganization(null);
        localStorage.removeItem('deskdrop_org_id');
      }
    } catch (err) {
      console.error('[OrganizationContext] Failed to fetch organizations:', err);
      setOrganizations([]);
      setActiveOrganization(null);
      localStorage.removeItem('deskdrop_org_id');
    } finally {
      setLoadingOrgs(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Handle explicit organization switch
  const switchOrganization = useCallback(
    (newOrgId) => {
      if (!newOrgId) return;

      const target = organizations.find((o) => o._id === newOrgId);
      if (!target) {
        console.warn('[OrganizationContext] Cannot switch to unauthorized organization ID:', newOrgId);
        return;
      }

      // Immediately persist validated organization ID for all subsequent API requests
      localStorage.setItem('deskdrop_org_id', target._id);
      setActiveOrganization(target);

      // Dispatch event to notify consumers to immediately refresh data
      window.dispatchEvent(
        new CustomEvent('deskdrop_org_changed', { detail: { organizationId: target._id } })
      );
    },
    [organizations]
  );

  const value = {
    organizations,
    activeOrganization,
    activeOrgId: activeOrganization?._id || null,
    loadingOrgs,
    switchOrganization,
    refreshOrganizations: fetchOrganizations
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export default OrganizationContext;
