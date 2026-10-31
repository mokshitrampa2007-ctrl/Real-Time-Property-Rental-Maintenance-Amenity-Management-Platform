import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-teal-50 text-teal-700 border-teal-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; isOverdue?: boolean }> = ({ status, isOverdue }) => {
  if (isOverdue) {
    return <Badge variant="danger">Overdue</Badge>;
  }

  switch (status) {
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return <Badge variant="warning">{status === 'PENDING_APPROVAL' ? 'Pending Approval' : 'Pending'}</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="info">In Progress</Badge>;
    case 'CONFIRMED':
      return <Badge variant="success">Confirmed</Badge>;
    case 'CHECKED_IN':
      return <Badge variant="purple">Checked In</Badge>;
    case 'COMPLETED':
      return <Badge variant="success">Completed</Badge>;
    case 'REJECTED':
      return <Badge variant="danger">Rejected</Badge>;
    case 'CANCELLED':
      return <Badge variant="neutral">Cancelled</Badge>;
    case 'NO_SHOW':
      return <Badge variant="danger">No Show</Badge>;
    case 'ACTIVE':
      return <Badge variant="success">Active</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  switch (priority) {
    case 'URGENT':
      return <Badge variant="danger">Urgent</Badge>;
    case 'HIGH':
      return <Badge variant="warning">High</Badge>;
    case 'MEDIUM':
      return <Badge variant="info">Medium</Badge>;
    case 'LOW':
      return <Badge variant="neutral">Low</Badge>;
    default:
      return <Badge variant="neutral">{priority}</Badge>;
  }
};
