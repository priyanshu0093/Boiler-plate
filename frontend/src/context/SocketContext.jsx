import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useOrganization } from './OrganizationContext';

const SocketContext = createContext(null);

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:5000');

export function SocketProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const { activeOrgId } = useOrganization();

  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const prevOrgIdRef = useRef(null);

  const addToast = (message) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    // Only connect when both authentication AND active organization selection are ready
    if (!isAuthenticated || !token || !activeOrgId) {
      if (socketRef.current) {
        if (prevOrgIdRef.current) {
          socketRef.current.emit('leave:org', prevOrgIdRef.current);
          prevOrgIdRef.current = null;
        }
        if (socketRef.current.connected) {
          socketRef.current.disconnect();
        } else {
          socketRef.current.once('connect', () => {
            if (socketRef.current) socketRef.current.disconnect();
          });
        }
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // If socket is already established and activeOrgId changed, switch rooms smoothly
    if (socketRef.current) {
      if (prevOrgIdRef.current && prevOrgIdRef.current !== activeOrgId) {
        socketRef.current.emit('leave:org', prevOrgIdRef.current);
        socketRef.current.emit('join:org', { orgId: activeOrgId, token });
        prevOrgIdRef.current = activeOrgId;
      }
      return;
    }

    // Initialize new authenticated Socket.IO connection
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { token, orgId: activeOrgId }
    });

    socketRef.current = socket;
    setSocket(socket);
    prevOrgIdRef.current = activeOrgId;

    socket.on('connect', () => {
      setIsConnected(true);
      if (user?._id) {
        socket.emit('join:user', user._id);
      }
      // Join authorized active organization room
      socket.emit('join:org', { orgId: activeOrgId, token });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Real-time tenant-isolated activity listeners
    const handleStatusChanged = (data) => {
      if (data?.status) {
        addToast(`Resource status updated to ${data.status.replace('_', ' ')}`);
      }
    };

    const handleBookingCreated = () => {
      addToast('A new booking was reserved');
    };

    const handleBookingCheckedIn = () => {
      addToast('A booking was checked in');
    };

    const handleBookingCheckedOut = () => {
      addToast('A booking was checked out');
    };

    const handleBookingAutoReleased = () => {
      addToast('Unattended booking auto-released');
    };

    socket.on('resource:status_changed', handleStatusChanged);
    socket.on('booking:created', handleBookingCreated);
    socket.on('booking:checked_in', handleBookingCheckedIn);
    socket.on('booking:checked_out', handleBookingCheckedOut);
    socket.on('booking:auto_released', handleBookingAutoReleased);

    return () => {
      socket.off('resource:status_changed', handleStatusChanged);
      socket.off('booking:created', handleBookingCreated);
      socket.off('booking:checked_in', handleBookingCheckedIn);
      socket.off('booking:checked_out', handleBookingCheckedOut);
      socket.off('booking:auto_released', handleBookingAutoReleased);

      if (prevOrgIdRef.current) {
        socket.emit('leave:org', prevOrgIdRef.current);
        prevOrgIdRef.current = null;
      }

      // Safe disconnect handling to prevent WebSocket premature closure warning in StrictMode
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once('connect', () => {
          socket.disconnect();
        });
      }

      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, token, activeOrgId, user?._id]);

  const value = {
    socket,
    isConnected,
    toasts,
    addToast
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export default SocketContext;
