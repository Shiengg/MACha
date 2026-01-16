import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigation.replace('Login', { redirect: 'AdminDashboard' });
        return;
      }

      if (user?.role !== 'admin') {
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

  if (!isAuthenticated || user?.role !== 'admin') {
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

