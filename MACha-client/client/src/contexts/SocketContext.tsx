'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Chỉ connect khi user đã login
    if (!isAuthenticated || !user) {
      console.log('⏳ Waiting for authentication...');
      return;
    }

    console.log('🔌 Initializing Socket.IO connection...');
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    // Socket.IO sẽ TỰ ĐỘNG gửi cookie (bao gồm jwt) lên server
    // vì withCredentials: true
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true, // Tự động gửi cookie httpOnly
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('room-joined', (data) => {
      console.log('🏠 Joined room:', data.room);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup khi component unmount hoặc user logout
    return () => {
      console.log('🔌 Disconnecting Socket.IO...');
      socketInstance.disconnect();
    };
  }, [user, isAuthenticated]); // Re-connect khi user thay đổi

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

