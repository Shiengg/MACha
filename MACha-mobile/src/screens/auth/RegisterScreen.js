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
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { SIGNUP_ROUTE, SIGNUP_ORGANIZATION_ROUTE, VERIFY_SIGNUP_OTP_ROUTE } from '../../constants/api';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [isOrganization, setIsOrganization] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    organizationName: '',
    password: '',
    confirmPassword: '',
  });
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [userId, setUserId] = useState(null);

  // Validation helper
  const validateForm = () => {
    const newErrors = {
      username: '',
      email: '',
      organizationName: '',
      password: '',
      confirmPassword: '',
    };
    let isValid = true;

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username là bắt buộc';
      isValid = false;
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username phải có ít nhất 3 ký tự';
      isValid = false;
    } else if (username.trim().length > 30) {
      newErrors.username = 'Username không được vượt quá 30 ký tự';
      isValid = false;
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      newErrors.username = 'Username chỉ được chứa chữ cái, số và dấu gạch dưới';
      isValid = false;
    }

    // Organization name validation (only for organization)
    if (isOrganization) {
      if (!organizationName.trim()) {
        newErrors.organizationName = 'Tên tổ chức là bắt buộc';
        isValid = false;
      } else if (organizationName.trim().length < 3) {
        newErrors.organizationName = 'Tên tổ chức phải có ít nhất 3 ký tự';
        isValid = false;
      }
    }

    // Email validation (required for individual, optional for organization)
    if (!isOrganization) {
      if (!email.trim()) {
        newErrors.email = 'Email là bắt buộc';
        isValid = false;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors.email = 'Email không hợp lệ';
        isValid = false;
      }
    } else if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      isValid = false;
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Mật khẩu phải có ít nhất 1 ký tự in hoa';
      isValid = false;
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Mật khẩu phải có ít nhất 1 ký tự thường';
      isValid = false;
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Mật khẩu phải có ít nhất 1 số';
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu là bắt buộc';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu không khớp';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    // Clear previous errors
    setErrors({
      username: '',
      email: '',
      organizationName: '',
      password: '',
      confirmPassword: '',
    });

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isOrganization) {
        // Organization signup - no OTP needed
        const signupData = {
          organization_name: organizationName.trim(),
          username: username.trim(),
          password,
          confirm_password: confirmPassword,
          email: email.trim() || undefined,
        };

        const res = await apiClient.post(SIGNUP_ORGANIZATION_ROUTE, signupData);

        // Auto login after organization signup
        await login();

        Alert.alert(
          'Đăng ký tổ chức thành công!',
          'Tài khoản tổ chức của bạn đã được tạo thành công.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.replace('MainTabs');
              },
            },
          ]
        );
      } else {
        // Individual signup - requires OTP
        const { confirmPassword: _, ...signupData } = {
          username: username.trim(),
          email: email.trim(),
          password,
        };

        const res = await apiClient.post(SIGNUP_ROUTE, signupData);
        const userId = res.data.user?.id;

        if (!userId) {
          throw new Error('Không lấy được thông tin tài khoản vừa đăng ký.');
        }

        setUserId(userId);
        setShowOtpModal(true);
      }
    } catch (error) {
      console.error('❌ [Register] Signup error:', error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Đăng ký thất bại. Vui lòng thử lại.';

      Alert.alert('Thao tác thất bại!', message, [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError('');

    if (!otp.trim()) {
      setOtpError('Vui lòng nhập mã OTP');
      return;
    }

    setVerifyingOtp(true);

    try {
      await apiClient.post(VERIFY_SIGNUP_OTP_ROUTE, {
        userId,
        otp: otp.trim(),
      });

      // Login after successful verification
      await login();

      setShowOtpModal(false);
      setOtp('');

      Alert.alert(
        'Đăng ký & xác thực thành công!',
        'Tài khoản của bạn đã được xác thực thành công.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('MainTabs');
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ [Register] Verify OTP error:', error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Xác thực thất bại. Vui lòng thử lại.';

      setOtpError(message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancelOtp = () => {
    setShowOtpModal(false);
    setOtp('');
    setOtpError('');
    setUserId(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Image
                source={require('../../../assets/images/charity_signup.png')}
                style={styles.headerImage}
                resizeMode="contain"
              />
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Đăng ký</Text>
              <Text style={styles.descriptionText}>
                Đã có tài khoản?{' '}
                <Text
                  style={styles.linkText}
                  onPress={() => navigation.navigate('Login')}
                >
                  Đăng nhập
                </Text>
              </Text>

              {/* Toggle between Individual and Organization */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    !isOrganization && styles.toggleButtonActive,
                  ]}
                  onPress={() => {
                    setIsOrganization(false);
                    setErrors({
                      username: '',
                      email: '',
                      organizationName: '',
                      password: '',
                      confirmPassword: '',
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      !isOrganization && styles.toggleButtonTextActive,
                    ]}
                  >
                    Cá nhân
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    isOrganization && styles.toggleButtonActive,
                  ]}
                  onPress={() => {
                    setIsOrganization(true);
                    setErrors({
                      username: '',
                      email: '',
                      organizationName: '',
                      password: '',
                      confirmPassword: '',
                    });
                  }}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      isOrganization && styles.toggleButtonTextActive,
                    ]}
                  >
                    Tổ chức
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Organization Name Input (only for organization) */}
              {isOrganization && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Tên tổ chức</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.organizationName && styles.inputError,
                    ]}
                    placeholder="Tên tổ chức"
                    placeholderTextColor="#9CA3AF"
                    value={organizationName}
                    onChangeText={(text) => {
                      setOrganizationName(text);
                      if (errors.organizationName)
                        setErrors({ ...errors, organizationName: '' });
                    }}
                    editable={!isSubmitting}
                  />
                  {errors.organizationName ? (
                    <Text style={styles.errorText}>
                      {errors.organizationName}
                    </Text>
                  ) : null}
                </View>
              )}

              {/* Username Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (errors.username) setErrors({ ...errors, username: '' });
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
                {errors.username ? (
                  <Text style={styles.errorText}>{errors.username}</Text>
                ) : null}
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Email {isOrganization && '(Tùy chọn)'}
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder={isOrganization ? 'Email (Tùy chọn)' : 'Email'}
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
                  style={[styles.input, errors.password && styles.inputError]}
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword)
                      setErrors({ ...errors, confirmPassword: '' });
                  }}
                  secureTextEntry
                  editable={!isSubmitting}
                />
                {errors.confirmPassword ? (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                ) : null}
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  isSubmitting && styles.signupButtonDisabled,
                ]}
                onPress={handleSignup}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : null}
                <Text style={styles.signupButtonText}>
                  {isSubmitting
                    ? 'Đang tạo tài khoản...'
                    : isOrganization
                    ? 'Tạo tài khoản tổ chức'
                    : 'Tạo tài khoản'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Verification Modal */}
      <Modal
        visible={showOtpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelOtp}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xác thực tài khoản</Text>
            <Text style={styles.modalDescription}>
              Vui lòng nhập mã OTP đã được gửi đến email của bạn để hoàn tất
              đăng ký.
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, otpError && styles.inputError]}
                placeholder="Nhập mã OTP"
                placeholderTextColor="#9CA3AF"
                value={otp}
                onChangeText={(text) => {
                  setOtp(text);
                  if (otpError) setOtpError('');
                }}
                keyboardType="number-pad"
                editable={!verifyingOtp}
                autoFocus
              />
              {otpError ? (
                <Text style={styles.errorText}>{otpError}</Text>
              ) : null}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelOtp}
                disabled={verifyingOtp}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.verifyButton,
                  verifyingOtp && styles.verifyButtonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={verifyingOtp}
              >
                {verifyingOtp ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyButtonText}>Xác thực</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
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
    marginBottom: verticalScale(8),
  },
  descriptionText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: verticalScale(24),
    lineHeight: verticalScale(20),
  },
  linkText: {
    color: '#2563EB',
    fontWeight: '500',
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
  signupButton: {
    backgroundColor: '#2563EB',
    borderRadius: scale(16),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scale(8),
    marginTop: verticalScale(8),
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: verticalScale(2),
    },
    shadowOpacity: 0.2,
    shadowRadius: scale(4),
    elevation: 3,
  },
  signupButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(24),
    padding: scale(24),
    width: '100%',
    maxWidth: scale(400),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: verticalScale(4),
    },
    shadowOpacity: 0.25,
    shadowRadius: scale(12),
    elevation: 8,
  },
  modalTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: verticalScale(12),
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: verticalScale(24),
    textAlign: 'center',
    lineHeight: verticalScale(20),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: verticalScale(8),
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: '#2563EB',
  },
  verifyButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: verticalScale(20),
    backgroundColor: '#F3F4F6',
    borderRadius: scale(12),
    padding: scale(4),
  },
  toggleButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#2563EB',
  },
  toggleButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
});

