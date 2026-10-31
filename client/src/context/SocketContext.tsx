import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext.js';

type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface SocketContextType {
  socket: Socket | null;
  connectionState: ConnectionState;
  joinPropertyRoom: (propertyId: string) => void;
  leavePropertyRoom: (propertyId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connectionState: 'disconnected',
  joinPropertyRoom: () => {},
  leavePropertyRoom: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');

    // Connect to same origin or port 4000
    const socket = io({
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');

      // Auto-join user's relevant property rooms if available
      if (user.role === 'TENANT' && user.tenancies && user.tenancies.length > 0) {
        user.tenancies.forEach(t => {
          if (t.propertyId) socket.emit('property:join', t.propertyId);
        });
      } else if (user.role === 'OWNER' && user.ownedProperties) {
        user.ownedProperties.forEach(p => socket.emit('property:join', p.id));
      } else if (user.role === 'STAFF' && user.staffMemberships) {
        user.staffMemberships.forEach(sm => socket.emit('property:join', sm.propertyId));
      }
    });

    socket.on('reconnect', () => {
      setConnectionState('connected');
      // Invalidate queries to fetch authoritative fresh data
      queryClient.invalidateQueries();
    });

    socket.on('reconnecting', () => {
      setConnectionState('reconnecting');
    });

    socket.on('disconnect', () => {
      setConnectionState('disconnected');
    });

    // Real-time event listeners
    socket.on('maintenance:created', () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('maintenance:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('maintenance:comment', () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    });

    socket.on('booking:created', () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('booking:status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    socket.on('notification:new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('dashboard:refresh', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient]);

  const joinPropertyRoom = (propertyId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('property:join', propertyId);
    }
  };

  const leavePropertyRoom = (propertyId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('property:leave', propertyId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connectionState,
        joinPropertyRoom,
        leavePropertyRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
