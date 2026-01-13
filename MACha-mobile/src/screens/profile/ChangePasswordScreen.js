import React, { useEffect, useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { SEND_OTP_ROUTE, VERIFY_OTP_ROUTE, CHANGE_PASSWORD_ROUTE } from '../../constants/api';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [passwordData, setPasswordData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Change Password

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOtp = async () => {
    if (!user?.email) {
      Alert.alert('Lỗi', 'Không tìm thấy email');
      return;
    }

    try {
      setOtpLoading(true);
      await apiClient.post(SEND_OTP_ROUTE, {});

      Alert.alert(
        'OTP đã được gửi!',
        `Mã OTP đã được gửi đến email ${user.email}`,
        [{ text: 'OK' }]
      );

      setOtpSent(true);
      setOtpVerified(false);
      setOtpTimer(600); // 10 minutes
      setStep(2);
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.';
      
      if (status && status >= 400 && status < 500) {
        Alert.alert('Gửi OTP thất bại', message);
      } else {
        console.error('Error sending OTP:', error);
        Alert.alert('Gửi OTP thất bại', message);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    // Nếu đã verify thành công rồi thì bỏ qua gọi API
    if (otpVerified) {
      setStep(3);
      return;
    }

    if (!otpSent) {
      Alert.alert('Lỗi', 'Vui lòng gửi mã OTP trước');
      return;
    }

    if (!passwordData.otp || passwordData.otp.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(VERIFY_OTP_ROUTE, { otp: passwordData.otp });

      Alert.alert(
        'Xác thực OTP thành công!',
        'Bạn có thể đặt mật khẩu mới.',
        [{ text: 'OK' }]
      );

      setOtpVerified(true);
      setStep(3);
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
      
      if (status && status >= 400 && status < 500) {
        Alert.alert('Xác thực OTP thất bại', message);
      } else {
        console.error('Error verifying OTP:', error);
        Alert.alert('Xác thực OTP thất bại', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (step < 3) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    try {
      setLoading(true);
      await apiClient.post(CHANGE_PASSWORD_ROUTE, {
        newPassword: passwordData.newPassword,
      });

      Alert.alert(
        'Đổi mật khẩu thành công!',
        'Mật khẩu của bạn đã được thay đổi',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn';
      
      if (status && status >= 400 && status < 500) {
        Alert.alert('Đổi mật khẩu thất bại', message);
      } else {
        console.error('Error changing password:', error);
        Alert.alert('Đổi mật khẩu thất bại', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      if (!otpSent) {
        navigation.goBack();
      } else {
        Alert.alert(
          'Xác nhận',
          'Bạn có chắc muốn quay lại? Tiến trình đổi mật khẩu sẽ bị hủy.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Có, quay lại',
              style: 'destructive',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } else {
      // Ở các bước khác: quay lại bước trước
      setStep((prev) => (prev > 1 ? prev - 1 : prev));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.subtitle}>
              Xác thực bằng mã OTP gửi về email và đặt mật khẩu mới cho tài khoản của bạn.
            </Text>

            {/* Step indicator */}
            <View style={styles.stepIndicator}>
              {/* Step 1 */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    step >= 1 && styles.stepCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      step >= 1 && styles.stepNumberActive,
                    ]}
                  >
                    1
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    step >= 1 && styles.stepLabelActive,
                  ]}
                >
                  Email
                </Text>
              </View>

              {/* Line */}
              <View
                style={[
                  styles.stepLine,
                  step >= 2 && styles.stepLineActive,
                ]}
              />

              {/* Step 2 */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    step >= 2 && styles.stepCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      step >= 2 && styles.stepNumberActive,
                    ]}
                  >
                    2
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    step >= 2 && styles.stepLabelActive,
                  ]}
                >
                  Nhập OTP
                </Text>
              </View>

              {/* Line */}
              <View
                style={[
                  styles.stepLine,
                  step === 3 && styles.stepLineActive,
                ]}
              />

              {/* Step 3 */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    step === 3 && styles.stepCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      step === 3 && styles.stepNumberActive,
                    ]}
                  >
                    3
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    step === 3 && styles.stepLabelActive,
                  ]}
                >
                  Mật khẩu mới
                </Text>
              </View>
            </View>

            {/* STEP 1 UI */}
            {step === 1 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Bước 1: Xác nhận email</Text>
                <Text style={styles.stepDescription}>
                  Chúng tôi sẽ gửi mã OTP đến địa chỉ email đã đăng ký để xác nhận danh tính của bạn.
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.emailInput}
                    value={user?.email || ''}
                    editable={false}
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendOtpButton,
                      (otpLoading || otpTimer > 0) && styles.sendOtpButtonDisabled,
                    ]}
                    onPress={handleSendOtp}
                    disabled={otpLoading || otpTimer > 0}
                  >
                    {otpLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : otpTimer > 0 ? (
                      <Text style={styles.sendOtpButtonText}>
                        Gửi lại ({formatTime(otpTimer)})
                      </Text>
                    ) : (
                      <Text style={styles.sendOtpButtonText}>Gửi mã OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
                {otpSent && (
                  <Text style={styles.successText}>
                    ✓ Mã OTP đã được gửi đến email của bạn
                  </Text>
                )}
              </View>
            )}

            {/* STEP 2 UI */}
            {step === 2 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Bước 2: Nhập mã OTP</Text>
                <Text style={styles.stepDescription}>
                  Nhập mã gồm 6 chữ số đã được gửi đến email{' '}
                  <Text style={styles.emailHighlight}>{user?.email}</Text>. Nhấn
                  <Text style={styles.boldText}> Tiếp tục</Text> để xác thực OTP.
                </Text>
                <View style={styles.otpContainer}>
                  <TextInput
                    style={styles.otpInput}
                    value={passwordData.otp}
                    onChangeText={(text) => {
                      setPasswordData({ ...passwordData, otp: text });
                      setOtpVerified(false);
                    }}
                    maxLength={6}
                    keyboardType="number-pad"
                    placeholder="000000"
                    placeholderTextColor="#D1D5DB"
                    editable={!otpVerified}
                  />
                  {otpVerified && (
                    <Text style={styles.successText}>✓ OTP đã xác thực</Text>
                  )}
                </View>
              </View>
            )}

            {/* STEP 3 UI */}
            {step === 3 && (
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Bước 3: Đặt mật khẩu mới</Text>
                <Text style={styles.stepDescription}>
                  Mật khẩu nên có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số để tăng độ bảo mật.
                </Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordData.newPassword}
                    onChangeText={(text) =>
                      setPasswordData({ ...passwordData, newPassword: text })
                    }
                    secureTextEntry
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
                  <TextInput
                    style={styles.passwordInput}
                    value={passwordData.confirmPassword}
                    onChangeText={(text) =>
                      setPasswordData({ ...passwordData, confirmPassword: text })
                    }
                    secureTextEntry
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.backButtonAction}
                onPress={handleBack}
                disabled={loading}
              >
                <Text style={styles.backButtonText}>Quay lại</Text>
              </TouchableOpacity>

              {step === 1 && (
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    (!otpSent || loading) && styles.continueButtonDisabled,
                  ]}
                  onPress={() => {
                    if (otpSent) {
                      setStep(2);
                    }
                  }}
                  disabled={!otpSent || loading}
                >
                  <Text style={styles.continueButtonText}>Tiếp tục</Text>
                </TouchableOpacity>
              )}

              {step === 2 && (
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    (loading || (!otpVerified && passwordData.otp.length !== 6)) &&
                      styles.continueButtonDisabled,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={
                    loading || (!otpVerified && passwordData.otp.length !== 6)
                  }
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : otpVerified ? (
                    <Text style={styles.continueButtonText}>Tiếp tục</Text>
                  ) : (
                    <Text style={styles.continueButtonText}>Tiếp tục</Text>
                  )}
                </TouchableOpacity>
              )}

              {step === 3 && (
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    loading && styles.continueButtonDisabled,
                  ]}
                  onPress={handlePasswordSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.continueButtonText}>Lưu mật khẩu mới</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepNumberActive: {
    color: '#10B981',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#10B981',
  },
  stepLine: {
    height: 2,
    width: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  // Step Content
  stepContent: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  emailHighlight: {
    fontWeight: '600',
    color: '#374151',
  },
  boldText: {
    fontWeight: '600',
  },
  // Inputs
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: 14,
    color: '#6B7280',
  },
  sendOtpButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  sendOtpButtonDisabled: {
    opacity: 0.6,
  },
  sendOtpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  otpContainer: {
    marginBottom: 8,
  },
  otpInput: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#fff',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#1F2937',
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#1F2937',
  },
  successText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '500',
    marginTop: 8,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  backButtonAction: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  backButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#62AC4A',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 140,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

