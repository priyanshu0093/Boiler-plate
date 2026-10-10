const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Core HTTP client for DeskDrop API
 * Attaches token and active tenant organization header dynamically from storage on every request
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('deskdrop_token');
  const orgId = localStorage.getItem('deskdrop_org_id');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { 'x-organization-id': orgId } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // If token expired / unauthorized, clear token and organization state
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('deskdrop_token');
      localStorage.removeItem('deskdrop_user');
      localStorage.removeItem('deskdrop_org_id');
      window.dispatchEvent(new Event('deskdrop_auth_expired'));
    }

    const error = new Error(data.message || `HTTP error ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// Tenant Organization API
export const getUserOrganizations = async () => {
  return await request('/organizations');
};

export const getCurrentOrganization = async () => {
  return await request('/organizations/current');
};

export const createOrganization = async (orgData) => {
  return await request('/organizations', {
    method: 'POST',
    body: orgData
  });
};

export const updateCurrentOrganization = async (data) => {
  return await request('/organizations/current', {
    method: 'PATCH',
    body: data
  });
};

export const getOrganizationMembers = async () => {
  return await request('/organizations/current/members');
};

export const addOrganizationMember = async (memberData) => {
  return await request('/organizations/current/members', {
    method: 'POST',
    body: memberData
  });
};

export const updateOrganizationMemberRole = async (memberId, role) => {
  return await request(`/organizations/current/members/${memberId}`, {
    method: 'PATCH',
    body: { role }
  });
};

export const removeOrganizationMember = async (memberId) => {
  return await request(`/organizations/current/members/${memberId}`, {
    method: 'DELETE'
  });
};

// Workspace Invitations API
export const getOrganizationInvitations = async () => {
  return await request('/organizations/current/invitations');
};

export const createOrganizationInvitation = async ({ email, role }) => {
  return await request('/organizations/current/invitations', {
    method: 'POST',
    body: { email, role }
  });
};

export const revokeOrganizationInvitation = async (invitationId) => {
  return await request(`/organizations/current/invitations/${invitationId}`, {
    method: 'DELETE'
  });
};

export const verifyInvitationToken = async (token, email) => {
  const params = new URLSearchParams({ token });
  if (email) params.append('email', email);
  return await request(`/invitations/verify?${params.toString()}`);
};

export const acceptInvitation = async (payload) => {
  return await request('/invitations/accept', {
    method: 'POST',
    body: payload
  });
};

// Authentication API
export const authLogin = async (email, password) => {
  return await request('/auth/login', {
    method: 'POST',
    body: { email, password }
  });
};

export const authRegister = async ({ name, email, password, confirmPassword, organizationName }) => {
  return await request('/auth/register', {
    method: 'POST',
    body: { name, email, password, confirmPassword, organizationName }
  });
};

export const getCurrentUser = async () => {
  return await request('/auth/me');
};

export const updateProfile = async ({ name, phone, department }) => {
  return await request('/auth/profile', {
    method: 'PATCH',
    body: { name, phone, department }
  });
};

// Resource Catalog API
export const getResources = async (filters = {}) => {
  const queryParams = new URLSearchParams();

  if (filters.category && filters.category !== 'ALL') {
    queryParams.append('category', filters.category);
  }

  if (filters.status && filters.status !== 'ALL') {
    queryParams.append('status', filters.status);
  }

  if (filters.search && filters.search.trim()) {
    queryParams.append('search', filters.search.trim());
  }

  const queryString = queryParams.toString();
  const endpoint = `/resources${queryString ? `?${queryString}` : ''}`;

  return await request(endpoint);
};

export const getResourceById = async (id) => {
  return await request(`/resources/${id}`);
};

export const checkAvailability = async ({ resourceId, startTime, endTime }) => {
  const query = new URLSearchParams({
    resourceId,
    startTime,
    endTime
  }).toString();
  return await request(`/bookings/availability?${query}`);
};

export const createBooking = async ({ resourceId, startTime, endTime, purpose }) => {
  return await request('/bookings', {
    method: 'POST',
    body: { resourceId, startTime, endTime, purpose }
  });
};

export const getMyBookings = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.upcoming) queryParams.append('upcoming', 'true');
  const qs = queryParams.toString();
  return await request(`/bookings${qs ? `?${qs}` : ''}`);
};

export const checkInBooking = async (id) => {
  return await request(`/bookings/${id}/check-in`, {
    method: 'PATCH'
  });
};

export const checkOutBooking = async (id) => {
  return await request(`/bookings/${id}/check-out`, {
    method: 'PATCH'
  });
};

export const cancelBooking = async (id) => {
  return await request(`/bookings/${id}/cancel`, {
    method: 'PATCH'
  });
};

export const createResource = async (resourceData) => {
  return await request('/resources', {
    method: 'POST',
    body: resourceData
  });
};

export const updateResource = async (id, updateData) => {
  return await request(`/resources/${id}`, {
    method: 'PATCH',
    body: updateData
  });
};

export const deleteResource = async (id) => {
  return await request(`/resources/${id}`, {
    method: 'DELETE'
  });
};

export const getAllBookingsAdmin = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.resourceId) queryParams.append('resourceId', filters.resourceId);
  const qs = queryParams.toString();
  return await request(`/bookings/admin${qs ? `?${qs}` : ''}`);
};

export const updateBookingAdmin = async (id, updateData) => {
  return await request(`/bookings/${id}/admin`, {
    method: 'PATCH',
    body: updateData
  });
};

export const getAdminAnalytics = async () => {
  return await request('/bookings/admin/analytics');
};

// Notification API
export const getNotifications = async () => {
  return await request('/notifications');
};

export const markNotificationAsRead = async (id) => {
  return await request(`/notifications/${id}/read`, {
    method: 'PATCH'
  });
};

export const markAllNotificationsAsRead = async () => {
  return await request('/notifications/read-all', {
    method: 'PATCH'
  });
};

// Platform Super Admin API
export const getPlatformMetrics = async () => {
  return await request('/platform/metrics');
};

export const getPlatformOrganizations = async () => {
  return await request('/platform/organizations');
};

export const getPlatformOrganizationDetails = async (id) => {
  return await request(`/platform/organizations/${id}`);
};

export const updatePlatformOrganizationStatus = async (id, status) => {
  return await request(`/platform/organizations/${id}/status`, {
    method: 'PATCH',
    body: { status }
  });
};

export default {
  getUserOrganizations,
  getCurrentOrganization,
  createOrganization,
  updateCurrentOrganization,
  getOrganizationMembers,
  addOrganizationMember,
  authLogin,
  authRegister,
  getCurrentUser,
  updateProfile,
  getResources,
  getResourceById,
  checkAvailability,
  createBooking,
  getMyBookings,
  checkInBooking,
  checkOutBooking,
  cancelBooking,
  createResource,
  updateResource,
  deleteResource,
  getAllBookingsAdmin,
  updateBookingAdmin,
  getAdminAnalytics,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
