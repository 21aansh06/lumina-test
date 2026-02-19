import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const newSocket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
      
      // Authenticate socket with user ID
      if (user?._id) {
        newSocket.emit('authenticate', user._id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?._id]);

  // Re-authenticate when user changes
  useEffect(() => {
    if (socket && user?._id && connected) {
      socket.emit('authenticate', user._id);
    }
  }, [socket, user?._id, connected]);

  const startTrip = (tripId) => {
    if (socket && user?._id) {
      socket.emit('start_trip', { userId: user._id, tripId });
    }
  };

  const endTrip = () => {
    if (socket && user?._id) {
      socket.emit('end_trip', { userId: user._id });
    }
  };

  const sendLocation = (lat, lng) => {
    if (socket && user?._id) {
      socket.emit('user_location_update', { userId: user._id, lat, lng });
    }
  };

  const respondToAlert = (response) => {
    if (socket && user?._id) {
      socket.emit('user_response', { userId: user._id, response });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      startTrip,
      endTrip,
      sendLocation,
      respondToAlert
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;