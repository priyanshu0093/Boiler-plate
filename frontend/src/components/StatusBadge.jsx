import React from 'react';

export default function StatusBadge({ status }) {
  const normalizedStatus = (status || 'AVAILABLE').toUpperCase();
  
  let label = 'Available';
  let className = 'available';

  switch (normalizedStatus) {
    case 'IN_USE':
      label = 'In Use';
      className = 'in_use';
      break;
    case 'ACTIVE':
      label = 'Active';
      className = 'in_use';
      break;
    case 'CONFIRMED':
      label = 'Confirmed';
      className = 'confirmed';
      break;
    case 'COMPLETED':
      label = 'Completed';
      className = 'available';
      break;
    case 'CANCELLED':
      label = 'Cancelled';
      className = 'cancelled';
      break;
    case 'AUTO_RELEASED':
      label = 'Auto Released';
      className = 'auto_released';
      break;
    case 'MAINTENANCE':
      label = 'Maintenance';
      className = 'maintenance';
      break;
    default:
      label = 'Available';
      className = 'available';
  }

  return (
    <span className={`status-badge ${className}`}>
      <span className="status-badge-dot" />
      {label}
    </span>
  );
}
