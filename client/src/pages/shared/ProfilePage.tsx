import React from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { User, Mail, Phone, ShieldCheck, LogOut, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/common/Badge.js';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your credentials, authorized role, and session state.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl shadow-sm">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={user.role === 'OWNER' ? 'purple' : user.role === 'STAFF' ? 'warning' : 'info'}>
                Role: {user.role}
              </Badge>
              <span className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5 space-y-4 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-slate-400" />
              Email Address
            </span>
            <span className="font-semibold text-slate-900">{user.email}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500 flex items-center">
              <Phone className="w-4 h-4 mr-2 text-slate-400" />
              Phone Number
            </span>
            <span className="font-semibold text-slate-900">{user.phone || 'Not provided'}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500 flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2 text-slate-400" />
              Session Authentication
            </span>
            <span className="font-semibold text-emerald-600">Secure HttpOnly Cookie</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out of EstateSync
          </button>
        </div>
      </div>
    </div>
  );
};
