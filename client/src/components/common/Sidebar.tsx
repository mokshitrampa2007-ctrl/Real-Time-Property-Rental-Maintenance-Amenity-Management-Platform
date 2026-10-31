import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import {
  Building2,
  LayoutDashboard,
  Wrench,
  CalendarDays,
  Sparkles,
  Bell,
  User,
  ShieldCheck,
  Home,
  CheckSquare,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  if (!user) return null;

  const ownerLinks = [
    { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/owner/properties', label: 'Properties & Units', icon: Building2 },
    { to: '/owner/maintenance', label: 'Maintenance Tasks', icon: Wrench },
    { to: '/owner/amenities', label: 'Amenities & Rules', icon: Sparkles },
    { to: '/owner/bookings', label: 'Bookings & Approvals', icon: CalendarDays },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'My Account', icon: User },
  ];

  const tenantLinks = [
    { to: '/tenant/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tenant/my-property', label: 'My Property & Unit', icon: Home },
    { to: '/tenant/maintenance', label: 'Maintenance Requests', icon: Wrench },
    { to: '/tenant/amenities', label: 'Amenities & Schedule', icon: Sparkles },
    { to: '/tenant/bookings', label: 'My Reservations', icon: CalendarDays },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'My Account', icon: User },
  ];

  const staffLinks = [
    { to: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/staff/requests', label: 'Assigned Work Orders', icon: CheckSquare },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'My Account', icon: User },
  ];

  let links = tenantLinks;
  if (user.role === 'OWNER') links = ownerLinks;
  if (user.role === 'STAFF') links = staffLinks;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white shadow-md shadow-emerald-900/50">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">EstateSync</span>
              <span className="block text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">
                Real-Time Ops
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Tag */}
        <div className="px-6 py-3 bg-slate-850/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {user.role} PORTAL
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  `flex items-center px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-500">
          <p className="font-medium text-slate-400 truncate">{user.name}</p>
          <p className="truncate text-[11px]">{user.email}</p>
        </div>
      </aside>
    </>
  );
};
