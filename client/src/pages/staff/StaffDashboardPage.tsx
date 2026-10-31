import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/index.js';
import { Link } from 'react-router-dom';
import { Wrench, CheckCircle, Clock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge.js';

export const StaffDashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'staff'],
    queryFn: () => dashboardApi.getStaffDashboard(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const activeTasks = data?.activeTasks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance Staff Dispatch</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review assignments, update task statuses, and fulfill resident work orders.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned Pending</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.assignedPending || 0}</p>
          <span className="text-xs text-slate-400 mt-1 block">Awaiting start</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.assignedInProgress || 0}</p>
          <span className="text-xs text-slate-400 mt-1 block">Currently working</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{summary.assignedCompleted || 0}</p>
          <span className="text-xs text-slate-400 mt-1 block">Resolved total</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue (&gt;48h)</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-rose-600">{summary.assignedOverdue || 0}</p>
          <span className="text-xs text-slate-400 mt-1 block">Requires immediate attention</span>
        </div>
      </div>

      {/* Active Work Orders */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Priority Assigned Work Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ordered by urgency level</p>
          </div>
          <Link to="/staff/requests" className="text-xs font-semibold text-emerald-600 hover:underline">
            View All ({activeTasks.length})
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {activeTasks.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No active tickets assigned!</p>
              <p className="text-xs mt-0.5">All assigned maintenance tasks are currently resolved.</p>
            </div>
          ) : (
            activeTasks.map((t: any) => (
              <div key={t.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50">
                <div className="max-w-md">
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/maintenance/${t.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition"
                    >
                      {t.title}
                    </Link>
                    {t.isOverdue && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.property?.name} • Unit {t.unit?.unitNumber} • Resident: {t.tenant?.name} ({t.tenant?.phone || 'No phone'})
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} isOverdue={t.isOverdue} />
                  <Link
                    to={`/maintenance/${t.id}`}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                  >
                    Open Ticket
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
