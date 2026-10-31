import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { maintenanceApi } from '../../api/index.js';
import { Link } from 'react-router-dom';
import { Wrench, Plus, Search, Filter, AlertTriangle, ArrowRight } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge.js';

export const TenantMaintenancePage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', selectedStatus, selectedCategory, search],
    queryFn: () =>
      maintenanceApi.getRequests({
        status: (selectedStatus as any) || undefined,
        category: (selectedCategory as any) || undefined,
        search: search || undefined,
      }),
  });

  const requests = data?.requests || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Maintenance Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit repair issues, upload photos, track technician progress, and chat with staff.
          </p>
        </div>

        <Link
          to="/tenant/maintenance/new"
          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Report New Issue
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            <option value="PLUMBING">Plumbing</option>
            <option value="ELECTRICAL">Electrical</option>
            <option value="HVAC">HVAC</option>
            <option value="APPLIANCE">Appliance</option>
            <option value="STRUCTURAL">Structural</option>
            <option value="PEST_CONTROL">Pest Control</option>
            <option value="GENERAL">General</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Issue Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned Staff</th>
                <th className="px-5 py-3">Submitted</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading maintenance requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No requests found</p>
                    <p className="text-xs mt-0.5">Need a repair? Click "Report New Issue" above.</p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 max-w-xs font-bold text-slate-900">
                      <Link to={`/maintenance/${req.id}`} className="hover:text-emerald-600 truncate block">
                        {req.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium text-slate-600">
                      {req.category.toLowerCase().replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={req.status} isOverdue={req.isOverdue} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {req.assignedStaff ? req.assignedStaff.name : <span className="italic text-slate-400">Pending assignment</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/maintenance/${req.id}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition"
                      >
                        Details
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
