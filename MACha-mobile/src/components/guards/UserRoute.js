import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function UserRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigation.replace('Login');
        return;
      }

      // SECURITY: Chỉ cho phép USER và ORGANIZATION truy cập UI user
      // OWNER và ADMIN phải được redirect về dashboard của họ
      if (user?.role === 'owner') {
        // TODO: Navigate to Owner Dashboard when available
        navigation.replace('Home');
        return;
      }

      if (user?.role === 'admin') {
        // TODO: Navigate to Admin Dashboard when available
        navigation.replace('Home');
        return;
      }

      // Chỉ cho phép USER và ORGANIZATION
      if (user?.role !== 'user' && user?.role !== 'organization') {
        navigation.replace('Home');
        return;
      }
    }
  }, [user, isAuthenticated, loading, navigation]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (user?.role !== 'user' && user?.role !== 'organization') {
    return null; // Will redirect
  }

  return <>{children}</>;
}

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
};

