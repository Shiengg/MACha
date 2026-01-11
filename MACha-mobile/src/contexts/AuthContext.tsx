import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/apiClient';
import { GET_CURRENT_USER_ROUTE, LOGOUT_ROUTE } from '../constants/api';

interface User {
  _id?: string;
  id?: string;
  email: string;
  username?: string;
  role?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await apiClient.get(GET_CURRENT_USER_ROUTE);
      if (res.data?.user) {
        const rawUser = res.data.user as any;
        const normalizedUser: User = {
          id: rawUser.id || rawUser._id,
          ...rawUser,
        };
        setUser(normalizedUser);
        return true;
      }
      return false;
    } catch (error: any) {
      if (error?.response?.status === 403 && 
          (error?.response?.data?.message?.toLowerCase().includes('ban') || 
           error?.response?.data?.message?.toLowerCase().includes('khóa'))) {
        setUser(null);
        const banReason = error?.response?.data?.ban_reason || 'Tài khoản bị khóa bởi quản trị viên';
        
        Alert.alert(
          'Tài khoản bị khóa!',
          `${error?.response?.data?.message || 'Tài khoản của bạn đã bị khóa (ban).'}\n\nLý do: ${banReason}`,
          [{ text: 'OK', style: 'destructive' }]
        );
        
        // Clear token
        try {
          await AsyncStorage.removeItem('auth_token');
        } catch (storageError) {
          console.error('Error removing token:', storageError);
        }
        
        return false;
      }
      
      if (error?.response?.status !== 401) {
        console.error('Failed to fetch user:', error);
      }
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    fetchCurrentUser().finally(() => setLoading(false));
  }, []);

  const login = async () => {
    await fetchCurrentUser();
  };

  const logout = async () => {
    try {
      await apiClient.post(LOGOUT_ROUTE, {});
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Always clear user and token, even if API call fails
      setUser(null);
      try {
        await AsyncStorage.removeItem('auth_token');
      } catch (storageError) {
        console.error('Error removing token:', storageError);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook để sử dụng AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

