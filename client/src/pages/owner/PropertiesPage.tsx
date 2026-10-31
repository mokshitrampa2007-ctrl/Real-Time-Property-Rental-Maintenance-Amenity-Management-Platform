import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyApi } from '../../api/index.js';
import { Link } from 'react-router-dom';
import { Building2, Plus, Users, Sparkles, Wrench, Globe, ArrowRight } from 'lucide-react';
import { Modal } from '../../components/common/Modal.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createPropertySchema = z.object({
  name: z.string().min(2, 'Property name is required'),
  address: z.string().min(5, 'Address is required'),
  description: z.string().optional(),
  timeZone: z.string().min(1, 'Timezone is required'),
});

type PropertyFormData = z.infer<typeof createPropertySchema>;

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'UTC',
];

export const PropertiesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertyApi.getOwnerProperties(),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: {
      name: '',
      address: '',
      description: '',
      timeZone: 'America/Chicago',
    },
  });

  const createMutation = useMutation({
    mutationFn: (formData: PropertyFormData) => propertyApi.createProperty(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create property.');
    },
  });

  const onSubmit = (formData: PropertyFormData) => {
    setError(null);
    createMutation.mutate(formData);
  };

  const properties = data?.properties || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Properties & Portfolios</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your buildings, units, tenant rosters, and staff delegations.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Property
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">No properties created yet</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            Add your first property to start leasing units and configuring amenities.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add First Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {properties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">{property.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{property.address}</p>
                    </div>
                  </div>
                </div>

                {property.description && (
                  <p className="mt-4 text-xs text-slate-600 line-clamp-2">{property.description}</p>
                )}

                <div className="mt-6 grid grid-cols-3 gap-2 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="block text-base font-bold text-slate-900">
                      {property._count?.units || 0}
                    </span>
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Units</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-slate-900">
                      {property._count?.amenities || 0}
                    </span>
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Amenities</span>
                  </div>
                  <div>
                    <span className="block text-base font-bold text-slate-900">
                      {property._count?.staffMembers || 0}
                    </span>
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Staff</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center text-xs text-slate-500 font-medium">
                  <Globe className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {property.timeZone}
                </span>

                <Link
                  to={`/owner/properties/${property.id}`}
                  className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 group"
                >
                  Manage Property
                  <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Property Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Property">
        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Property Name</label>
            <input
              type="text"
              {...register('name')}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Grand Horizon Luxury Residences"
            />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Full Address</label>
            <input
              type="text"
              {...register('address')}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Street, City, State, ZIP"
            />
            {errors.address && <p className="mt-1 text-xs text-rose-600">{errors.address.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Time Zone (IANA)</label>
            <select
              {...register('timeZone')}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            {errors.timeZone && <p className="mt-1 text-xs text-rose-600">{errors.timeZone.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600">Description (Optional)</label>
            <textarea
              {...register('description')}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Brief description of property characteristics and residential rules..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Create Property'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
