import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, propertyApi } from '../../api/index.js';
import { Link } from 'react-router-dom';
import { Wrench, Search, Filter, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';

export const OwnerMaintenancePage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');

  // Assign staff modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetRequestId, setTargetRequestId] = useState<string | null>(null);
  const [targetPropertyId, setTargetPropertyId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch properties for filter
  const { data: propData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyApi.getOwnerProperties(),
  });

  // Fetch requests
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance', selectedPropertyId, selectedStatus, selectedPriority, selectedCategory, search],
    queryFn: () =>
      maintenanceApi.getRequests({
        propertyId: selectedPropertyId || undefined,
        status: (selectedStatus as any) || undefined,
        priority: (selectedPriority as any) || undefined,
        category: (selectedCategory as any) || undefined,
        search: search || undefined,
      }),
  });

  // Fetch property details for staff list when modal opens
  const { data: propertyDetails } = useQuery({
    queryKey: ['properties', targetPropertyId],
    queryFn: () => propertyApi.getPropertyDetails(targetPropertyId!),
    enabled: !!targetPropertyId,
  });

  const assignMutation = useMutation({
    mutationFn: () => maintenanceApi.assignStaff(targetRequestId!, selectedStaffId || null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsAssignModalOpen(false);
      setTargetRequestId(null);
    },
    onError: (err: any) => setModalError(err.message),
  });

  const properties = propData?.properties || [];
  const requests = data?.requests || [];
  const staffMembers = propertyDetails?.property?.staffMembers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance Dispatch & Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track reported issues, monitor 48-hour resolution SLAs, and assign qualified technicians.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
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

          {/* Property Filter */}
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
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

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Category Filter */}
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

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Issue Title & Unit</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned Staff</th>
                <th className="px-5 py-3">Logged Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No maintenance requests match the current filters.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/maintenance/${req.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-600 transition truncate"
                        >
                          {req.title}
                        </Link>
                        {req.isOverdue && (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            Overdue
                          </span>
                        )}
                      </div>
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
                      {req.assignedStaff ? (
                        <span className="font-semibold text-slate-800">{req.assignedStaff.name}</span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                      {req.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setTargetRequestId(req.id);
                            setTargetPropertyId(req.propertyId);
                            setSelectedStaffId(req.assignedStaffId || '');
                            setModalError(null);
                            setIsAssignModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition"
                        >
                          Assign Staff
                        </button>
                      )}
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

      {/* Assign Staff Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Maintenance Staff">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {modalError}
          </div>
        )}
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select an authorized technician for this property to handle the maintenance request:
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Technician</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Unassigned</option>
              {staffMembers.map((sm: any) => (
                <option key={sm.staff.id} value={sm.staff.id}>
                  {sm.staff.name} ({sm.roleTitle || 'Technician'})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Saving...' : 'Update Assignment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
