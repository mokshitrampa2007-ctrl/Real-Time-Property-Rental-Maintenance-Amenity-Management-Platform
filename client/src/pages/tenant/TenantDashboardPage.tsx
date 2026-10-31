import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, bookingApi } from '../../api/index.js';
import { Link } from 'react-router-dom';
import {
  Home,
  Wrench,
  CalendarDays,
  Sparkles,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  DoorOpen,
  LogOut,
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge.js';

export const TenantDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'tenant'],
    queryFn: () => dashboardApi.getTenantDashboard(),
    refetchInterval: 30000,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) => bookingApi.checkIn(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: (bookingId: string) => bookingApi.checkOut(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeTenancy = data?.activeTenancy;
  const activeMaintenance = data?.activeMaintenance || [];
  const activeMaintenanceCount = data?.activeMaintenanceCount || 0;
  const completedMaintenanceCount = data?.completedMaintenanceCount || 0;
  const upcomingBookings = data?.upcomingBookings || [];
  const checkInStatusInfo = data?.checkInStatusInfo;
  const recentNotifications = data?.recentNotifications || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tenant Resident Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          {activeTenancy ? (
            <>
              Residing at <span className="font-semibold text-slate-800">{activeTenancy.property?.name}</span> • Unit{' '}
              <span className="font-semibold text-slate-800">{activeTenancy.unit?.unitNumber}</span>
            </>
          ) : (
            'Welcome to EstateSync Resident Portal'
          )}
        </p>
      </div>

      {/* Live Check-in / Check-out Banner if active booking is happening now */}
      {checkInStatusInfo?.hasActiveBooking && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3 text-emerald-950">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                Live Amenity Session
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                {checkInStatusInfo.amenityName}
              </h3>
              <p className="text-xs text-slate-600">
                Status: <span className="font-semibold text-emerald-700">{checkInStatusInfo.status}</span> •
                Scheduled until{' '}
                {checkInStatusInfo.endsAt
                  ? new Date(checkInStatusInfo.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {checkInStatusInfo.canCheckIn && (
              <button
                onClick={() => checkInMutation.mutate(checkInStatusInfo.bookingId!)}
                disabled={checkInMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
              >
                {checkInMutation.isPending ? 'Verifying...' : 'Check In Now'}
              </button>
            )}

            {checkInStatusInfo.canCheckOut && (
              <button
                onClick={() => checkOutMutation.mutate(checkInStatusInfo.bookingId!)}
                disabled={checkOutMutation.isPending}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{checkOutMutation.isPending ? 'Processing...' : 'Check Out'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Requests</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{activeMaintenanceCount}</p>
          <Link
            to="/tenant/maintenance/new"
            className="inline-block mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            + Report New Issue →
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Resolved Requests</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{completedMaintenanceCount}</p>
          <Link
            to="/tenant/maintenance"
            className="inline-block mt-3 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            View history →
          </Link>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Upcoming Bookings</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{upcomingBookings.length}</p>
          <Link
            to="/tenant/amenities"
            className="inline-block mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Explore Amenities →
          </Link>
        </div>
      </div>

      {/* Main Grid: Maintenance & Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Maintenance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800">Current Maintenance Requests</h3>
            <Link to="/tenant/maintenance" className="text-xs text-emerald-600 hover:underline">
              View All
            </Link>
          </div>

          {activeMaintenance.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs">No active maintenance requests. Everything is running smoothly!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activeMaintenance.map((req: any) => (
                <div key={req.id} className="py-3 flex items-center justify-between">
                  <div>
                    <Link
                      to={`/maintenance/${req.id}`}
                      className="text-sm font-semibold text-slate-800 hover:text-emerald-600 transition"
                    >
                      {req.title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} •{' '}
                      {req.assignedStaff ? `Assigned to ${req.assignedStaff.name}` : 'Awaiting assignment'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <PriorityBadge priority={req.priority} />
                    <StatusBadge status={req.status} isOverdue={req.isOverdue} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-800">Upcoming Amenity Reservations</h3>
            <Link to="/tenant/bookings" className="text-xs text-emerald-600 hover:underline">
              My Bookings
            </Link>
          </div>

          {upcomingBookings.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs">No upcoming reservations.</p>
              <Link
                to="/tenant/amenities"
                className="mt-3 inline-block text-xs font-semibold text-emerald-600 hover:underline"
              >
                Book a gym slot, pool cabana, or court →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingBookings.map((b: any) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{b.amenity?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(b.startsAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}{' '}
                      {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
