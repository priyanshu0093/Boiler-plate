import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_SERVER_URL = 'http://localhost:5000';

export function SocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const socketRef = useRef(null);

  const addToast = (message) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Global toast listener for live activity
    socket.on('resource:status_changed', (data) => {
      addToast(`Resource status updated to ${data.status.replace('_', ' ')}`);
    });

    socket.on('booking:created', (data) => {
      addToast('A new booking was just reserved');
    });

    socket.on('booking:checked_in', () => {
      addToast('A booking was just checked in');
    });

    socket.on('booking:checked_out', () => {
      addToast('A booking was just checked out');
    });

    socket.on('booking:auto_released', (data) => {
      addToast(`Unattended booking released`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const value = {
    socket: socketRef.current,
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
