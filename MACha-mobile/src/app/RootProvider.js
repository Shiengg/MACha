import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import AppNavigator from '../navigation';

export default function RootProvider() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SocketProvider>
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

