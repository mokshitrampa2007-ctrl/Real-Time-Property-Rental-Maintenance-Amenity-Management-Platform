import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../api/index.js';
import {
  Building2,
  Users,
  Wrench,
  Sparkles,
  CalendarDays,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../../components/common/Badge.js';

const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];

export const OwnerDashboardPage: React.FC = () => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'owner', selectedPropertyId],
    queryFn: () => dashboardApi.getOwnerDashboard(selectedPropertyId || undefined),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const properties = data?.properties || [];
  const maintenanceByStatus = data?.maintenanceByStatus || [];
  const maintenanceByCategory = data?.maintenanceByCategory || [];
  const upcomingBookings = data?.upcomingBookings || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Property Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Executive Property Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time occupancy metrics, maintenance health, and amenity utilization.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Property:
          </label>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Properties ({properties.length})</option>
            {properties.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Occupancy Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Unit Occupancy</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary.occupancyRate !== null ? `${summary.occupancyRate}%` : 'No data'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({summary.occupiedUnits} / {summary.totalUnits} occupied)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Vacant units available: <span className="font-semibold text-slate-700">{summary.vacantUnits}</span>
          </p>
        </div>

        {/* Maintenance Status Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Open Maintenance</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary.pendingMaintenance + summary.inProgressMaintenance}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({summary.pendingMaintenance} Pending, {summary.inProgressMaintenance} Active)
            </span>
          </div>
          <div className="mt-2 flex items-center space-x-1.5">
            {summary.overdueMaintenance > 0 ? (
              <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {summary.overdueMaintenance} Overdue (&gt;48h)
              </span>
            ) : (
              <span className="text-xs font-medium text-emerald-600">✓ No overdue tickets</span>
            )}
          </div>
        </div>

        {/* Resolution Time & Completion */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Resolution Time</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary.avgResolutionHours !== null ? `${summary.avgResolutionHours} hrs` : 'No data'}
            </span>
            <span className="text-xs text-slate-400">Target: ≤ 48h</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Completion Rate:{' '}
            <span className="font-semibold text-slate-700">
              {summary.completionRate !== null ? `${summary.completionRate}% (Target: ≥90%)` : 'No data'}
            </span>
          </p>
        </div>

        {/* Amenity Utilization Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Amenity Utilization</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary.amenityUtilizationPercent !== null ? `${summary.amenityUtilizationPercent}%` : 'No data'}
            </span>
            <span className="text-xs text-slate-400">7-Day Window</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Upcoming Bookings:</span>
            <span className="font-semibold text-slate-700">{summary.upcomingBookingsCount}</span>
          </div>
        </div>
      </div>

      {/* Actionable Banner for Pending Approvals if any */}
      {summary.pendingApprovalBookingsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm font-medium">
              You have <span className="font-bold">{summary.pendingApprovalBookingsCount}</span> amenity
              booking request(s) awaiting approval.
            </p>
          </div>
          <Link
            to="/owner/bookings"
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200/80 rounded-lg hover:bg-amber-300 transition"
          >
            Review Approvals Queue →
          </Link>
        </div>
      )}

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance by Status Bar Chart */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Maintenance Tasks by Status</span>
            <Link to="/owner/maintenance" className="text-xs text-emerald-600 hover:underline">
              View all
            </Link>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maintenanceByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Maintenance by Category Pie Chart */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Maintenance by Category</h3>
          <div className="h-64 flex items-center justify-center">
            {maintenanceByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={maintenanceByCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {maintenanceByCategory.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400">No maintenance category data logged yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Upcoming Bookings & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings Table */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800">Upcoming Amenity Reservations</h3>
            <Link to="/owner/bookings" className="text-xs text-emerald-600 hover:underline">
              View Calendar
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No upcoming bookings scheduled.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingBookings.map((b: any) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{b.amenity?.name}</p>
                    <p className="text-xs text-slate-500">
                      Tenant: {b.tenant?.name} •{' '}
                      {new Date(b.startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Audit Log */}
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Recent Operational Audit Trail</span>
            </h3>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No recent audit activity.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-start space-x-3 text-xs text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-slate-800">
                      <span className="font-semibold text-slate-900">
                        {log.actor?.name || 'System'}
                      </span>{' '}
                      performed <span className="font-mono text-emerald-700">{log.action}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
