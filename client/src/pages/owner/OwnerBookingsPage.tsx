import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi, bookingApi } from '../../api/index.js';
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Users,
  Search,
} from 'lucide-react';
import { StatusBadge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';

export const OwnerBookingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'approvals' | 'all'>('approvals');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch properties
  const { data: propData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyApi.getOwnerProperties(),
  });

  const properties = propData?.properties || [];
  const activePropertyId = selectedPropertyId || (properties.length > 0 ? properties[0].id : '');

  // Fetch bookings for property
  const { data, isLoading } = useQuery({
    queryKey: ['bookings', activePropertyId],
    queryFn: () => bookingApi.getPropertyBookings(activePropertyId),
    enabled: !!activePropertyId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (bookingId: string) => bookingApi.approveBooking(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: () => bookingApi.rejectBooking(selectedBookingId!, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setRejectModalOpen(false);
      setSelectedBookingId(null);
      setRejectReason('');
    },
    onError: (err: any) => setModalError(err.message),
  });

  const bookings = data?.bookings || [];
  const pendingApprovals = bookings.filter((b: any) => b.status === 'PENDING_APPROVAL');

  return (
    <div className="space-y-6">
      {/* Header & Property Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Amenity Bookings & Approvals</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review reservation requests, monitor scheduled vs actual check-in/out, and prevent conflicts.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={activePropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`pb-3 border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'approvals'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Approvals Queue</span>
          {pendingApprovals.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
              {pendingApprovals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          All Reservations ({bookings.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'approvals' ? (
        /* TAB 1: APPROVALS QUEUE */
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Approvals Queue Clear</h3>
              <p className="text-xs text-slate-500 mt-1">
                All booking requests for this property have been reviewed or auto-confirmed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovals.map((b: any) => (
                <div
                  key={b.id}
                  className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Approval Required
                      </span>
                      <span className="text-xs text-slate-500">
                        Requested: {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900">{b.amenity?.name}</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Tenant: <span className="font-semibold">{b.tenant?.name}</span> ({b.tenant?.email})
                    </p>

                    <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs space-y-1 text-slate-700">
                      <p className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        <span>
                          {new Date(b.startsAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                          {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                      <p className="flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        <span>Attendees: {b.attendeeCount}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <button
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        setModalError(null);
                        setRejectModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approveMutation.mutate(b.id)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                    >
                      Approve Booking
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: ALL RESERVATIONS */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Amenity</th>
                  <th className="px-5 py-3">Tenant</th>
                  <th className="px-5 py-3">Scheduled Slot</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actual Check-In</th>
                  <th className="px-5 py-3">Actual Check-Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No reservations found.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{b.amenity?.name}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{b.tenant?.name}</p>
                        <p className="text-[11px] text-slate-500">{b.tenant?.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">
                          {new Date(b.startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={b.status} />
                        {b.isOverdueCheckOut && (
                          <span className="block mt-1 text-[10px] font-bold text-rose-600">
                            ⚠ Overdue Check-Out
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {b.actualCheckInAt
                          ? new Date(b.actualCheckInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {b.actualCheckOutAt
                          ? new Date(b.actualCheckOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Booking Request">
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {modalError}
          </div>
        )}
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Please provide a reason for rejecting this reservation. The time slot will immediately be
            released for other tenants to book:
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Reason</label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Amenity reserved for building general meeting"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending || !rejectReason}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
