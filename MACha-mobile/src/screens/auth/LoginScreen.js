import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { LOGIN_ROUTE } from '../../constants/api';

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
              // Navigate to HomeScreen
              navigation.replace('Home');
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
      <View style={styles.content}>
        <Text style={styles.title}>Đăng nhập</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="Email"
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
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="Mật khẩu"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors({ ...errors, password: '' });
            }}
            secureTextEntry
            editable={!isSubmitting}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Đăng nhập</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
