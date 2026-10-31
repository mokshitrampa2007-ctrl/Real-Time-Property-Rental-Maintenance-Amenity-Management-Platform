import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi, amenityApi } from '../../api/index.js';
import {
  Sparkles,
  Plus,
  Clock,
  Calendar,
  Users,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createAmenityFormSchema = z.object({
  propertyId: z.string().min(1, 'Please select a property'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().optional(),
  description: z.string().optional(),
  capacity: z.number().int().positive().default(10),
  approvalRequired: z.boolean().default(false),
  slotDurationMinutes: z.number().int().positive().default(60),
  minimumBookingMinutes: z.number().int().positive().default(30),
  maximumBookingMinutes: z.number().int().positive().default(120),
  advanceBookingDays: z.number().int().positive().default(14),
  cancellationCutoffMinutes: z.number().int().nonnegative().default(60),
  checkInGraceMinutes: z.number().int().positive().default(15),
  openingTime: z.string().default('08:00'),
  closingTime: z.string().default('22:00'),
});

type AmenityFormValues = z.infer<typeof createAmenityFormSchema>;

export const OwnerAmenitiesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClosureModalOpen, setIsClosureModalOpen] = useState(false);
  const [targetAmenityId, setTargetAmenityId] = useState<string | null>(null);

  // Closure form
  const [closureStart, setClosureStart] = useState('');
  const [closureEnd, setClosureEnd] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [closureError, setClosureError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch properties
  const { data: propData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyApi.getOwnerProperties(),
  });

  const properties = propData?.properties || [];
  const activePropertyId = selectedPropertyId || (properties.length > 0 ? properties[0].id : '');

  // Fetch amenities for active property
  const { data: amenityData, isLoading } = useQuery({
    queryKey: ['amenities', activePropertyId],
    queryFn: () => amenityApi.getByProperty(activePropertyId),
    enabled: !!activePropertyId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AmenityFormValues>({
    resolver: zodResolver(createAmenityFormSchema),
    defaultValues: {
      propertyId: activePropertyId,
      name: '',
      location: '',
      description: '',
      capacity: 10,
      approvalRequired: false,
      slotDurationMinutes: 60,
      minimumBookingMinutes: 30,
      maximumBookingMinutes: 120,
      advanceBookingDays: 14,
      cancellationCutoffMinutes: 60,
      checkInGraceMinutes: 15,
      openingTime: '08:00',
      closingTime: '22:00',
    },
  });

  // Create amenity mutation
  const createAmenityMutation = useMutation({
    mutationFn: (values: AmenityFormValues) => {
      const operatingHours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
        weekday,
        openingTime: values.openingTime,
        closingTime: values.closingTime,
      }));

      return amenityApi.create({
        ...values,
        operatingHours,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenities', activePropertyId] });
      setIsAddModalOpen(false);
      reset();
    },
    onError: (err: any) => setFormError(err.message),
  });

  // Add closure mutation
  const addClosureMutation = useMutation({
    mutationFn: () =>
      amenityApi.addClosure(targetAmenityId!, {
        startsAt: new Date(closureStart).toISOString(),
        endsAt: new Date(closureEnd).toISOString(),
        reason: closureReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenities', activePropertyId] });
      setIsClosureModalOpen(false);
      setClosureStart('');
      setClosureEnd('');
      setClosureReason('');
    },
    onError: (err: any) => setClosureError(err.message),
  });

  // Remove closure mutation
  const removeClosureMutation = useMutation({
    mutationFn: ({ amenityId, closureId }: { amenityId: string; closureId: string }) =>
      amenityApi.removeClosure(amenityId, closureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['amenities', activePropertyId] });
    },
  });

  const amenities = amenityData?.amenities || [];

  return (
    <div className="space-y-6">
      {/* Header & Property Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shared Amenities & Rules</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure reservation rules, operating hours, and scheduled maintenance closures.
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

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center px-3.5 py-1.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Amenity
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : amenities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No amenities configured</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Add community facilities like fitness centers, pools, or banquet halls for this property.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Amenity
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {amenities.map((am) => (
            <div
              key={am.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{am.name}</h3>
                      {am.location && (
                        <p className="text-xs text-slate-500 flex items-center mt-0.5">
                          <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                          {am.location}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {am.approvalRequired ? (
                      <Badge variant="warning">Approval Required</Badge>
                    ) : (
                      <Badge variant="success">Instant Booking</Badge>
                    )}
                  </div>
                </div>

                {am.description && (
                  <p className="text-xs text-slate-600 mt-3">{am.description}</p>
                )}

                {/* Operating hours & rules */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Capacity</span>
                    <span className="font-bold text-slate-800">{am.capacity} people</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Duration</span>
                    <span className="font-bold text-slate-800">
                      {am.minimumBookingMinutes}-{am.maximumBookingMinutes}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Advance Limit</span>
                    <span className="font-bold text-slate-800">{am.advanceBookingDays} days</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Check-in Grace</span>
                    <span className="font-bold text-slate-800">{am.checkInGraceMinutes} mins</span>
                  </div>
                </div>

                {/* Operating Hours preview */}
                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Operating Hours:{' '}
                    <span className="font-semibold text-slate-800">
                      {am.operatingHours?.[0]?.openingTime || '08:00'} -{' '}
                      {am.operatingHours?.[0]?.closingTime || '22:00'}
                    </span>{' '}
                    ({am.property?.timeZone})
                  </span>
                </div>

                {/* Scheduled Closures */}
                {am.closures && am.closures.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-bold text-amber-900 flex items-center mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Active Maintenance Closures ({am.closures.length}):
                    </p>
                    <div className="space-y-1">
                      {am.closures.map((cl) => (
                        <div
                          key={cl.id}
                          className="flex items-center justify-between text-[11px] text-amber-800"
                        >
                          <span>
                            {cl.reason} (
                            {new Date(cl.startsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                            - {new Date(cl.endsAt).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                          </span>
                          <button
                            onClick={() =>
                              removeClosureMutation.mutate({ amenityId: am.id, closureId: cl.id })
                            }
                            className="text-amber-700 hover:text-rose-700 p-0.5"
                            title="Remove closure block"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Exclusive full-reservation policy</span>
                <button
                  onClick={() => {
                    setTargetAmenityId(am.id);
                    setClosureError(null);
                    setIsClosureModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition"
                >
                  Schedule Closure
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Amenity Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Community Amenity" maxWidth="lg">
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {formError}
          </div>
        )}
        <form onSubmit={handleSubmit((d) => createAmenityMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Amenity Name</label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Rooftop Tennis Court"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600">Location / Room</label>
              <input
                type="text"
                {...register('location')}
                placeholder="e.g. 5th Floor Terrace"
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Description</label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Description of facility and equipment..."
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold uppercase text-slate-600">Max Capacity</label>
              <input
                type="number"
                {...register('capacity', { valueAsNumber: true })}
                className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-600">Min Minutes</label>
              <input
                type="number"
                {...register('minimumBookingMinutes', { valueAsNumber: true })}
                className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-600">Max Minutes</label>
              <input
                type="number"
                {...register('maximumBookingMinutes', { valueAsNumber: true })}
                className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-600">Advance Days</label>
              <input
                type="number"
                {...register('advanceBookingDays', { valueAsNumber: true })}
                className="mt-1 block w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-slate-600">Daily Opening Time</label>
              <input
                type="time"
                {...register('openingTime')}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-600">Daily Closing Time</label>
              <input
                type="time"
                {...register('closingTime')}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="approvalRequired"
              {...register('approvalRequired')}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="approvalRequired" className="text-xs font-semibold text-slate-700">
              Require Owner Approval before confirming bookings
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Create Amenity'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Closure Modal */}
      <Modal isOpen={isClosureModalOpen} onClose={() => setIsClosureModalOpen(false)} title="Schedule Amenity Closure">
        {closureError && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {closureError}
          </div>
        )}
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Schedule a maintenance or seasonal closure block. The system validates against existing confirmed
            reservations to ensure no bookings are silently invalidated.
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Closure Reason</label>
            <input
              type="text"
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              placeholder="e.g. Deep cleaning and filter replacement"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold uppercase text-slate-600">Starts At</label>
              <input
                type="datetime-local"
                value={closureStart}
                onChange={(e) => setClosureStart(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-600">Ends At</label>
              <input
                type="datetime-local"
                value={closureEnd}
                onChange={(e) => setClosureEnd(e.target.value)}
                className="mt-1 block w-full px-3 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={() => setIsClosureModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => addClosureMutation.mutate()}
              disabled={addClosureMutation.isPending || !closureStart || !closureEnd || !closureReason}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {addClosureMutation.isPending ? 'Scheduling...' : 'Schedule Closure'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
