import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Building2,
  ShieldCheck,
  CalendarDays,
  Wrench,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (email: string) => {
    try {
      const loggedUser = await login({ email, password: 'Password123!' });
      if (loggedUser.role === 'OWNER') navigate('/owner/dashboard');
      else if (loggedUser.role === 'TENANT') navigate('/tenant/dashboard');
      else if (loggedUser.role === 'STAFF') navigate('/staff/dashboard');
    } catch (err) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">EstateSync</span>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <Link
                to={
                  user.role === 'OWNER'
                    ? '/owner/dashboard'
                    : user.role === 'TENANT'
                    ? '/tenant/dashboard'
                    : '/staff/dashboard'
                }
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-sm"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register-owner"
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-sm"
                >
                  Register Property
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Real-Time Property & Amenity Management</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
            Seamless coordination for owners, tenants, and maintenance teams.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate double bookings with database-level PostgreSQL exclusion constraints, streamline
            maintenance from dispatch to completion, and track occupancy metrics live.
          </p>

          {/* Quick Demo Login Cards */}
          <div className="mt-12 bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 max-w-3xl mx-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Project Review & Demo Accounts</h3>
                <p className="text-xs text-slate-500">
                  Password: <span className="font-mono font-semibold text-slate-700">Password123!</span> (or click to sign in directly)
                </p>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => handleQuickLogin('owner@example.com')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Owner
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="font-semibold text-sm text-slate-900">Victoria Sterling</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">owner@example.com</p>
                <span className="block mt-3 text-xs font-medium text-emerald-600">Login as Owner →</span>
              </button>

              <button
                onClick={() => handleQuickLogin('tenant1@example.com')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-100 px-2 py-0.5 rounded">
                    Tenant
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="font-semibold text-sm text-slate-900">Alex Rivera (Unit 101)</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">tenant1@example.com</p>
                <span className="block mt-3 text-xs font-medium text-teal-600">Login as Tenant →</span>
              </button>

              <button
                onClick={() => handleQuickLogin('staff@example.com')}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Staff
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="font-semibold text-sm text-slate-900">Marcus Vance</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">staff@example.com</p>
                <span className="block mt-3 text-xs font-medium text-amber-600">Login as Staff →</span>
              </button>
            </div>
          </div>

          {/* Key Feature Highlights */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Conflict-Free Amenity Booking</h4>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                PostgreSQL GiST exclusion constraint guarantees zero overlapping reservations at the
                database engine layer, handling simultaneous writes and cancellation slots safely.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-4">
                <Wrench className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Real-Time Maintenance Workflow</h4>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Tenants report issues with photos, owners assign staff, and technicians log updates
                live over Socket.IO. 48-hour SLA overdue alerts ensure rapid resolution.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Granular Role-Based Access</h4>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Strict multi-tenant boundaries enforced on every endpoint. Secure HttpOnly cookies,
                rate limiting, and single-use expiring invitation tokens for staff and tenants.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 EstateSync. Real-Time Property Rental, Maintenance & Amenity Management.</p>
          <p className="mt-2 sm:mt-0">Built with Node.js, Express, Socket.IO, PostgreSQL, and React.</p>
        </div>
      </footer>
    </div>
  );
};
