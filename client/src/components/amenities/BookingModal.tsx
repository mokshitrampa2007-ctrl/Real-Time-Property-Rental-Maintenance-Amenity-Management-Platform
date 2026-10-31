import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../../api/index.js';
import { Modal } from '../common/Modal.js';
import {
  CalendarDays,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Globe,
  Sparkles,
} from 'lucide-react';
import { Amenity } from '../../types/index.js';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  amenity: Amenity | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, amenity }) => {
  const queryClient = useQueryClient();

  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d.toISOString().split('T')[0];
  });

  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch real-time availability for this amenity
  const { data: availabilityData, isLoading: loadingAvailability } = useQuery({
    queryKey: ['availability', amenity?.id, date],
    queryFn: () => bookingApi.getAvailability(amenity!.id, `${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`),
    enabled: isOpen && !!amenity,
    refetchInterval: 10000, // live refresh
  });

  const bookingMutation = useMutation({
    mutationFn: () => {
      // Build ISO UTC datetime from date + time
      const startsAt = new Date(`${date}T${startTime}:00`);
      const endsAt = new Date(`${date}T${endTime}:00`);

      return bookingApi.createBooking({
        amenityId: amenity!.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        attendeeCount,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      const msg =
        res.booking.status === 'PENDING_APPROVAL'
          ? 'Booking requested! The slot is reserved and pending owner approval.'
          : 'Booking confirmed! Your reservation is scheduled.';
      setSuccessMessage(msg);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2500);
    },
    onError: (err: any) => {
      setConflictError(err.message || 'Booking conflict or validation error occurred.');
    },
  });

  if (!amenity) return null;

  const reservedSlots = availabilityData?.reservedSlots || [];
  const closures = availabilityData?.closures || [];
  const propertyTimeZone = availabilityData?.amenity?.timeZone || 'UTC';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);
    setSuccessMessage(null);
    bookingMutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Reserve: ${amenity.name}`} maxWidth="lg">
      {successMessage ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h4 className="text-lg font-bold text-slate-900">Reservation Successful</h4>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">{successMessage}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Timezone and Policy Notice */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center">
              <Globe className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Property Timezone: <strong className="ml-1 text-slate-800">{propertyTimeZone}</strong>
            </span>
            <span className="text-slate-500">Max capacity: {amenity.capacity} guests</span>
          </div>

          {amenity.approvalRequired && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Approval Required:</strong> This amenity reserves the slot immediately upon booking,
                protecting it from concurrent reservation attempts while the owner reviews your request.
              </span>
            </div>
          )}

          {conflictError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Reservation Conflict</p>
                <p className="mt-0.5">{conflictError}</p>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Booking Date</label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Reserved slots preview for selected date */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 block mb-1">
              Existing Reservations on this date ({reservedSlots.length}):
            </span>
            {loadingAvailability ? (
              <p className="text-slate-400 italic">Checking live availability...</p>
            ) : reservedSlots.length === 0 ? (
              <p className="text-emerald-700">✓ All hours currently free for booking.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {reservedSlots.map((slot) => (
                  <span
                    key={slot.id}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[11px]"
                  >
                    {new Date(slot.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                    -{' '}
                    {new Date(slot.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Time range selection */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold uppercase text-slate-600">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-600">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">
              Total Attendees (Max {amenity.capacity})
            </label>
            <input
              type="number"
              min={1}
              max={amenity.capacity}
              value={attendeeCount}
              onChange={(e) => setAttendeeCount(parseInt(e.target.value, 10) || 1)}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookingMutation.isPending}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
            >
              {bookingMutation.isPending ? 'Validating Availability...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
