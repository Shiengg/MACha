import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';
import { FORGOT_PASSWORD_ROUTE } from '../../constants/api';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '' });

  // Validation helper
  const validateForm = () => {
    const newErrors = { email: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email là bắt buộc';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setErrors({ email: '' });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.post(FORGOT_PASSWORD_ROUTE, { email });
      
      if (res.data.success) {
        Alert.alert(
          'Thành công',
          'Mật khẩu mới đã được gửi đến email của bạn',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ [ForgotPassword] Error:', error);
      
      const message = error?.response?.data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
      
      Alert.alert(
        'Lỗi',
        message,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.content}>
          <View style={styles.card}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Image
                source={require('../../../assets/images/charity_icon.png')}
                style={styles.headerImage}
                resizeMode="contain"
              />
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Forgot Password</Text>
              <Text style={styles.descriptionText}>
                Enter your email address and we'll send you instructions to reset your password.
              </Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  onSubmitEditing={handleResetPassword}
                />
                {errors.email ? (
                  <Text style={styles.errorText}>{errors.email}</Text>
                ) : null}
              </View>

              {/* Reset Password Button */}
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  loading && styles.resetButtonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : null}
                <Text style={styles.resetButtonText}>
                  {loading ? 'Đang gửi yêu cầu...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>

              {/* Back to Login Link */}
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.backLinkText}>← Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: scale(12),
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: verticalScale(4),
    },
    shadowOpacity: 0.25,
    shadowRadius: scale(12),
    elevation: 8,
    overflow: 'hidden',
  },
  headerSection: {
    paddingTop: verticalScale(16),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerImage: {
    width: scale(200),
    height: verticalScale(150),
  },
  formSection: {
    padding: scale(20),
  },
  formTitle: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: verticalScale(12),
  },
  descriptionText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: verticalScale(24),
    lineHeight: verticalScale(20),
  },
  inputContainer: {
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#111827',
    marginBottom: verticalScale(6),
  },
  input: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: scale(999),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(16),
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: moderateScale(12),
    marginTop: verticalScale(4),
  },
  resetButton: {
    backgroundColor: '#2563EB',
    borderRadius: scale(16),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: verticalScale(24),
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: verticalScale(2),
    },
    shadowOpacity: 0.2,
    shadowRadius: scale(4),
    elevation: 3,
  },
  resetButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: verticalScale(8),
  },
  backLinkText: {
    color: '#2563EB',
    fontSize: moderateScale(16),
    fontWeight: '500',
  },
});

