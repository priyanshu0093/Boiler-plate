/**
 * Centralized Free Plan Quotas and Policy Configuration
 * Agreed demo limits applied across frontend and backend
 */
const PLAN_LIMITS = {
  FREE: {
    name: 'Free Plan',
    maxResources: 10,
    maxMembers: 15,
    maxBookingAdvanceDays: 7,
    allowGuestBookings: false
  }
};

const getPlanLimits = (plan = 'FREE') => {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
};

module.exports = {
  PLAN_LIMITS,
  getPlanLimits
};
