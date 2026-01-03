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
      reconnection: true, // Tự động reconnect khi bị disconnect
      reconnectionDelay: 1000, // Đợi 1s trước khi reconnect
      reconnectionDelayMax: 5000, // Tối đa 5s giữa các lần reconnect
      reconnectionAttempts: Infinity, // Reconnect vô hạn
      timeout: 60000, // Timeout cho connection attempt (60s)
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('room-joined', (data) => {
      console.log('🏠 Joined room:', data.room);
    });

    socketInstance.on('event:join-room', (data: { eventId: string; room: string }) => {
      console.log('📢 Server requested to join event room:', data.room);
      socketInstance.emit('join-room', data.room);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setIsConnected(false);
      // Nếu disconnect không phải do client tự ngắt, sẽ tự động reconnect
      if (reason === 'io server disconnect') {
        // Server đã force disconnect, cần reconnect thủ công
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
      setIsConnected(false);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnect attempt:', attemptNumber);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('❌ Socket.IO reconnect failed');
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

