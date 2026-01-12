import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import VNPTKYCForm from '../../components/kyc/VNPTKYCForm';
import { scale, moderateScale } from '../../utils/responsive';

export default function KYCScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (!user) {
      setCheckingStatus(true);
      return;
    }

    setCheckingStatus(false);

    if (user.kyc_status === 'verified') {
      Alert.alert(
        'Đã xác thực',
        'Tài khoản của bạn đã được xác thực',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else if (user.kyc_status === 'pending') {
      Alert.alert(
        'Đang chờ duyệt',
        'KYC của bạn đang được xem xét. Vui lòng chờ thông báo.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [user, navigation]);

  if (checkingStatus) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Đang kiểm tra trạng thái KYC...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <VNPTKYCForm onBack={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
});

