import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { LOGIN_ROUTE } from '../../constants/api';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function LoginScreen({ navigation }) {
  const { login: refreshUser, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  // Validation helper
  const validateForm = () => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'Email là bắt buộc';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    // Clear previous errors
    setErrors({ email: '', password: '' });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    console.log('🔐 [Login] Starting login process...');

    try {
      console.log('📤 [Login] Sending login request to:', LOGIN_ROUTE);
      const res = await apiClient.post(LOGIN_ROUTE, {
        email: email.trim(),
        password,
      });
      console.log('✅ [Login] Login response received:', res.status);

      if (res.data.success || res.data.user?.id) {
        // Store token in AsyncStorage
        if (res.data.token) {
          await AsyncStorage.setItem('auth_token', res.data.token);
        }

        // Set user state directly from login response to avoid race condition
        if (res.data.user && setUser) {
          setUser({
            id: res.data.user.id,
            _id: res.data.user.id,
            ...res.data.user,
          });
        }

        // Fetch full user data to ensure authentication is working
        try {
          await refreshUser();
        } catch (err) {
          console.error('Failed to verify login:', err);
          // If this fails, token might be invalid - clear it
          await AsyncStorage.removeItem('auth_token');
          Alert.alert('Lỗi', 'Đăng nhập thất bại. Vui lòng thử lại.');
          setIsSubmitting(false);
          return;
        }

        Alert.alert('Thành công', 'Bạn đã đăng nhập thành công', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to MainTabs
              navigation.replace('MainTabs');
            },
          },
        ]);
      }
    } catch (error) {
      console.error('❌ [Login] Login error:', error);
      console.error('❌ [Login] Error details:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
        request: error?.request ? 'Request sent but no response' : 'No request sent',
      });

      const message = error?.response?.data?.message || error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      const banReason = error?.response?.data?.ban_reason;
      const isBanned = error?.response?.data?.is_banned;
      const status = error?.response?.status;

      if (status === 403 && isBanned) {
        // User is banned
        Alert.alert(
          'Tài khoản bị khóa!',
          `${message}${banReason ? `\n\nLý do: ${banReason}` : ''}`,
          [{ text: 'OK', style: 'destructive' }]
        );
      } else if (status === 429) {
        // Account locked due to too many failed attempts
        Alert.alert('Tài khoản tạm thời bị khóa', message, [{ text: 'OK' }]);
      } else {
        // Other errors (invalid credentials, etc.)
        Alert.alert('Đăng nhập thất bại', message, [{ text: 'OK' }]);
      }
    } finally {
      setIsSubmitting(false);
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
              <Text style={styles.formTitle}>Đăng nhập</Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.email && styles.inputError,
                  ]}
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
                  editable={!isSubmitting}
                />
                {errors.email ? (
                  <Text style={styles.errorText}>{errors.email}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.password && styles.inputError,
                  ]}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  secureTextEntry
                  editable={!isSubmitting}
                />
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={() => {
                  navigation.navigate('ForgotPassword');
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu ?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isSubmitting && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : null}
                <Text style={styles.loginButtonText}>
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Text>
              </TouchableOpacity>

              {/* Sign Up Section */}
              <View style={styles.signupSection}>
                <Text style={styles.signupTitle}>Đăng ký</Text>
                <Text style={styles.signupText}>Không có tài khoản ? Đăng ký</Text>
                <TouchableOpacity
                  style={styles.signupButton}
                  onPress={() => {
                    navigation.navigate('Register');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.signupButtonText}>Đăng ký</Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: verticalScale(20),
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
  forgotPasswordLink: {
    alignSelf: 'flex-start',
    marginBottom: verticalScale(16),
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: moderateScale(14),
  },
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  signupSection: {
    width: '100%',
  },
  signupTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: verticalScale(8),
  },
  signupText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: verticalScale(16),
  },
  signupButton: {
    borderWidth: 2,
    borderColor: '#2563EB',
    borderRadius: scale(16),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  signupButtonText: {
    color: '#2563EB',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
});
