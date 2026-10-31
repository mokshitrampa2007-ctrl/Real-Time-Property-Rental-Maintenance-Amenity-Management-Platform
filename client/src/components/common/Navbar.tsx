import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { ConnectionBanner } from './ConnectionBanner.js';
import { Bell, Menu, UserCircle, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../../api/index.js';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list(),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const unreadCount = data?.unreadCount || 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 rounded-lg lg:hidden hover:bg-slate-100 focus:outline-none"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-slate-800 hidden sm:inline-block">
          EstateSync Platform
        </span>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Real-time connection state indicator */}
        <ConnectionBanner />

        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 text-slate-500 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User profile dropdown info */}
        <div className="flex items-center space-x-3 pl-2 sm:pl-3 border-l border-slate-200">
          <Link to="/profile" className="flex items-center space-x-2 text-slate-700 hover:text-emerald-600">
            <UserCircle className="w-7 h-7 text-slate-400" />
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-slate-500 capitalize">{user?.role.toLowerCase()}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
