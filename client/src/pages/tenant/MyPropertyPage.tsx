import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../../api/index.js';
import { Building2, Home, User, Mail, Phone, Sparkles, MapPin, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyPropertyPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-tenancy'],
    queryFn: () => propertyApi.getTenantTenancy(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tenancy = data?.tenancy;
  if (!tenancy) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
        <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Active Lease Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          You are not currently linked to an active tenancy. Please contact your property owner.
        </p>
      </div>
    );
  }

  const property = tenancy.property;
  const unit = tenancy.unit;
  const staffMembers = property.staffMembers || [];
  const amenities = property.amenities || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Property & Lease Details</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your residence details, building contacts, and shared amenities.
        </p>
      </div>

      {/* Residence Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{property.name}</h2>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {property.address}
              </p>
              <span className="inline-flex items-center text-xs text-slate-500 mt-2 bg-slate-100 px-2 py-0.5 rounded">
                <Globe className="w-3 h-3 mr-1" />
                Timezone: {property.timeZone}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-950 text-right md:min-w-[200px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">
              Assigned Unit
            </span>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">Unit {unit.unitNumber}</p>
            <p className="text-xs text-slate-500 font-medium">Floor {unit.floor}</p>
          </div>
        </div>

        {/* Contact info grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Owner Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Property Management / Owner
            </h4>
            <p className="font-semibold text-slate-900 text-sm">{property.owner?.name}</p>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <p className="flex items-center">
                <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {property.owner?.email}
              </p>
              {property.owner?.phone && (
                <p className="flex items-center">
                  <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                  {property.owner?.phone}
                </p>
              )}
            </div>
          </div>

          {/* Lease Details */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Lease Terms
            </h4>
            <div className="space-y-1 text-xs text-slate-700">
              <p>
                <span className="text-slate-500 font-medium">Start Date:</span>{' '}
                {new Date(tenancy.startDate).toLocaleDateString()}
              </p>
              <p>
                <span className="text-slate-500 font-medium">End Date:</span>{' '}
                {tenancy.endDate ? new Date(tenancy.endDate).toLocaleDateString() : 'Open-ended'}
              </p>
              <p>
                <span className="text-slate-500 font-medium">Status:</span>{' '}
                <span className="font-semibold text-emerald-600 uppercase">{tenancy.status}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Building Maintenance Staff */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-slate-900 mb-4">On-Site Maintenance Staff</h3>
        {staffMembers.length === 0 ? (
          <p className="text-xs text-slate-400">No staff currently listed.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {staffMembers.map((sm: any) => (
              <div key={sm.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <p className="font-bold text-slate-900">{sm.staff?.name}</p>
                <p className="text-emerald-700 font-medium mt-0.5">{sm.roleTitle || 'Maintenance Staff'}</p>
                <p className="text-slate-500 mt-1">{sm.staff?.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amenities Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Available Amenities ({amenities.length})</h3>
          <Link to="/tenant/amenities" className="text-xs font-semibold text-emerald-600 hover:underline">
            Book slots →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {amenities.map((am: any) => (
            <div key={am.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-600 mb-1" />
              <p className="font-bold text-slate-900">{am.name}</p>
              <p className="text-[11px] text-slate-500">{am.location || 'Building Facility'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
