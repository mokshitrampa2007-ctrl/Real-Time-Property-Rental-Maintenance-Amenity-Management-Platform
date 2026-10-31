import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '../../api/index.js';
import { Link } from 'react-router-dom';
import { Wrench, Search, CheckCircle, Clock, ArrowRight, Play, Check } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge.js';
import { MaintenanceStatus } from '../../types/index.js';

export const StaffRequestsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', 'staff', selectedStatus, search],
    queryFn: () =>
      maintenanceApi.getRequests({
        status: (selectedStatus as any) || undefined,
        search: search || undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: MaintenanceStatus; notes?: string }) =>
      maintenanceApi.updateStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const requests = data?.requests || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tasks dispatched to you across your assigned properties.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <option value="PENDING">Pending (Not Started)</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Issue Title & Location</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Resident</th>
                <th className="px-5 py-3 text-right">Update Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    Loading work orders...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No work orders found</p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 max-w-xs">
                      <Link
                        to={`/maintenance/${req.id}`}
                        className="font-bold text-slate-900 hover:text-emerald-600 transition block truncate"
                      >
                        {req.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {req.property?.name} • Unit {req.unit?.unitNumber}
                      </p>
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-700 capitalize">
                      {req.category.toLowerCase().replace('_', ' ')}
                    </td>

                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={req.priority} />
                    </td>

                    <td className="px-5 py-3.5">
                      <StatusBadge status={req.status} isOverdue={req.isOverdue} />
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{req.tenant?.name}</p>
                      <p className="text-[11px] text-slate-500">{req.tenant?.phone || req.tenant?.email}</p>
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: req.id,
                              status: 'IN_PROGRESS',
                              notes: 'Staff started working on issue',
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200 transition"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start Work
                        </button>
                      )}

                      {req.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: req.id,
                              status: 'COMPLETED',
                              notes: 'Work completed by technician',
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm transition"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Mark Completed
                        </button>
                      )}

                      <Link
                        to={`/maintenance/${req.id}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition"
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
