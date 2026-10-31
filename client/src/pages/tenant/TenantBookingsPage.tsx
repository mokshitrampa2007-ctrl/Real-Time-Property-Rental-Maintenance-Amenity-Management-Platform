import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../../api/index.js';
import {
  CalendarDays,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  DoorOpen,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { StatusBadge } from '../../components/common/Badge.js';
import { ConfirmModal } from '../../components/common/ConfirmModal.js';

export const TenantBookingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', 'my-bookings'],
    queryFn: () => bookingApi.getTenantBookings(),
    refetchInterval: 15000,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (id: string) => bookingApi.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: (id: string) => bookingApi.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (id: string) => bookingApi.cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCancelModalOpen(false);
      setSelectedBookingId(null);
    },
  });

  const bookings = data?.bookings || [];
  const now = new Date();

  const upcomingBookings = bookings.filter((b) => {
    return new Date(b.endsAt) >= now && !['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.status);
  });

  const pastBookings = bookings.filter((b) => {
    return new Date(b.endsAt) < now || ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.status);
  });

  const displayBookings = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Amenity Reservations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your booked time slots, check in on arrival, and view past attendance records.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'upcoming'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Active & Upcoming</span>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
            {upcomingBookings.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'past'
              ? 'border-emerald-600 text-emerald-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          History & Past ({pastBookings.length})
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No {activeTab} reservations</h3>
          <p className="text-xs text-slate-500 mt-1">
            {activeTab === 'upcoming'
              ? 'You do not have any active or upcoming reservations scheduled.'
              : 'No past booking records found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayBookings.map((b) => (
            <div
              key={b.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <StatusBadge status={b.status} />
                  <span className="text-xs text-slate-500">
                    Booked {new Date(b.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="text-lg font-bold text-slate-900">{b.amenity?.name}</h4>
                {b.amenity?.location && (
                  <p className="text-xs text-slate-500 mt-0.5">{b.amenity.location}</p>
                )}

                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-100 text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center text-slate-500">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Date & Time:
                    </span>
                    <span className="font-semibold text-slate-900">
                      {new Date(b.startsAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                      • {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center text-slate-500">
                      <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Party Size:
                    </span>
                    <span className="font-semibold text-slate-900">{b.attendeeCount} guests</span>
                  </div>

                  {b.actualCheckInAt && (
                    <div className="flex items-center justify-between text-emerald-800">
                      <span>Checked-In:</span>
                      <span className="font-mono">
                        {new Date(b.actualCheckInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {b.actualCheckOutAt && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Checked-Out:</span>
                      <span className="font-mono">
                        {new Date(b.actualCheckOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {b.rejectionReason && (
                    <div className="p-2 bg-rose-50 rounded text-rose-700">
                      <strong>Rejection Reason:</strong> {b.rejectionReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {activeTab === 'upcoming' && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  {b.canCancel && (
                    <button
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        setCancelModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    >
                      Cancel Reservation
                    </button>
                  )}

                  {b.canCheckIn && (
                    <button
                      onClick={() => checkInMutation.mutate(b.id)}
                      disabled={checkInMutation.isPending}
                      className="inline-flex items-center px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      <DoorOpen className="w-3.5 h-3.5 mr-1.5" />
                      {checkInMutation.isPending ? 'Verifying...' : 'Check In Now'}
                    </button>
                  )}

                  {b.canCheckOut && (
                    <button
                      onClick={() => checkOutMutation.mutate(b.id)}
                      disabled={checkOutMutation.isPending}
                      className="inline-flex items-center px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition disabled:opacity-50"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                      {checkOutMutation.isPending ? 'Processing...' : 'Check Out'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={() => cancelMutation.mutate(selectedBookingId!)}
        title="Cancel Reservation"
        message="Are you sure you want to cancel this booking? The time slot will immediately be made available for other residents to reserve."
        confirmLabel="Yes, Cancel Booking"
        confirmVariant="danger"
        loading={cancelMutation.isPending}
      />
    </div>
  );
};
