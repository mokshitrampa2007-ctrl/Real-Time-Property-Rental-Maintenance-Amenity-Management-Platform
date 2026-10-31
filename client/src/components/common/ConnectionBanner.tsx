import React from 'react';
import { useSocket } from '../../context/SocketContext.js';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const ConnectionBanner: React.FC = () => {
  const { connectionState } = useSocket();

  if (connectionState === 'connected') {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Realtime Live</span>
      </div>
    );
  }

  if (connectionState === 'connecting' || connectionState === 'reconnecting') {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-200">
        <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full border border-slate-200">
      <WifiOff className="w-3 h-3 text-slate-400" />
      <span>Offline Mode</span>
    </div>
  );
};
