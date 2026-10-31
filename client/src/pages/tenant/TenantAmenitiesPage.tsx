import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { propertyApi, amenityApi } from '../../api/index.js';
import { Sparkles, Clock, Users, MapPin, CalendarDays, AlertTriangle } from 'lucide-react';
import { Badge } from '../../components/common/Badge.js';
import { BookingModal } from '../../components/amenities/BookingModal.js';
import { Amenity } from '../../types/index.js';

export const TenantAmenitiesPage: React.FC = () => {
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch tenant lease to get propertyId
  const { data: tenancyData, isLoading: loadingTenancy } = useQuery({
    queryKey: ['my-tenancy'],
    queryFn: () => propertyApi.getTenantTenancy(),
  });

  const propertyId = tenancyData?.tenancy?.propertyId;

  // Fetch amenities
  const { data: amenityData, isLoading: loadingAmenities } = useQuery({
    queryKey: ['amenities', propertyId],
    queryFn: () => amenityApi.getByProperty(propertyId!),
    enabled: !!propertyId,
  });

  const amenities = amenityData?.amenities || [];
  const property = tenancyData?.tenancy?.property;

  const handleOpenBooking = (amenity: Amenity) => {
    setSelectedAmenity(amenity);
    setIsModalOpen(true);
  };

  if (loadingTenancy || loadingAmenities) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Community Amenities</h1>
        <p className="text-sm text-slate-500 mt-1">
          Exclusive resident facilities at <span className="font-semibold text-slate-800">{property?.name}</span>.
          Book conflict-free time slots in real time.
        </p>
      </div>

      {amenities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Amenities Available</h3>
          <p className="text-xs text-slate-500 mt-1">
            There are currently no active amenities configured for this property.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {amenities.map((am) => (
            <div
              key={am.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
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
                      <Badge variant="success">Instant Confirmation</Badge>
                    )}
                  </div>
                </div>

                {am.description && (
                  <p className="text-xs text-slate-600 mt-3">{am.description}</p>
                )}

                {/* Operating hours & rules grid */}
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 px-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Capacity</span>
                    <span className="font-bold text-slate-800">{am.capacity} people</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Slot Window</span>
                    <span className="font-bold text-slate-800">
                      {am.minimumBookingMinutes}-{am.maximumBookingMinutes}m
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Advance Limit</span>
                    <span className="font-bold text-slate-800">{am.advanceBookingDays} days</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Check-in Window</span>
                    <span className="font-bold text-slate-800">&plusmn;{am.checkInGraceMinutes}m</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center space-x-2 text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Daily Hours:{' '}
                    <span className="font-semibold text-slate-800">
                      {am.operatingHours?.[0]?.openingTime || '08:00'} -{' '}
                      {am.operatingHours?.[0]?.closingTime || '22:00'}
                    </span>{' '}
                    ({property?.timeZone})
                  </span>
                </div>

                {/* Closures */}
                {am.closures && am.closures.length > 0 && (
                  <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-center space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Upcoming maintenance closure: {am.closures[0].reason}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">Exclusive full reservation</span>
                <button
                  onClick={() => handleOpenBooking(am)}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                >
                  <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                  Reserve Slot
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        amenity={selectedAmenity}
      />
    </div>
  );
};
