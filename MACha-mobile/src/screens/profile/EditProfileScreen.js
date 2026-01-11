import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../services/apiClient';
import { cloudinaryService } from '../../services/cloudinary.service';
import { useNavigation } from '@react-navigation/native';

const AUTH_ROUTE = 'api/auth';
const UPDATE_USER_ROUTE = (userId) => `${AUTH_ROUTE}/${userId}`;

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, login } = useAuth();
  const [loading, setLoading] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    fullname: '',
    email: '',
    bio: '',
    avatar: '',
  });
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        fullname: user.fullname || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
      });
      setAvatarPreview(user.avatar || '');
    }
  }, [user]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Quyền truy cập',
        'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleAvatarChange = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Check file size (5MB max)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            'Lỗi',
            'File quá lớn (tối đa 5MB)',
            [{ text: 'OK' }]
          );
          return;
        }

        setAvatarPreview(asset.uri);
        // Store the URI temporarily, will upload when saving
        setProfileData({ ...profileData, avatar: asset.uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Lỗi',
        'Không thể chọn ảnh. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  const removeAvatar = () => {
    setAvatarPreview('');
    setProfileData({ ...profileData, avatar: '' });
  };

  const handleProfileSubmit = async () => {
    if (!user?.id && !user?._id) {
      Alert.alert(
        'Lỗi',
        'Không tìm thấy thông tin người dùng',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoading(true);

      let avatarUrl = profileData.avatar;

      // If avatar is a local URI (newly selected), upload it
      if (avatarPreview && (avatarPreview.startsWith('file://') || avatarPreview.startsWith('content://'))) {
        const uploadResult = await cloudinaryService.uploadImage(avatarPreview, 'avatars');
        avatarUrl = uploadResult.secure_url;
      } else if (avatarPreview && !avatarPreview.startsWith('http')) {
        // If it's a local path but not file://, try uploading
        const uploadResult = await cloudinaryService.uploadImage(avatarPreview, 'avatars');
        avatarUrl = uploadResult.secure_url;
      } else if (!avatarPreview && !profileData.avatar) {
        // If avatar was removed, set to empty string
        avatarUrl = '';
      } else if (avatarPreview && avatarPreview.startsWith('http')) {
        // If it's already a URL, keep it
        avatarUrl = avatarPreview;
      }

      const userId = user.id || user._id;
      const updatePayload = {};
      if (profileData.fullname) updatePayload.fullname = profileData.fullname;
      if (profileData.email) updatePayload.email = profileData.email;
      if (profileData.bio !== undefined) updatePayload.bio = profileData.bio;
      if (avatarUrl !== undefined) updatePayload.avatar = avatarUrl;

      await apiClient.patch(UPDATE_USER_ROUTE(userId), updatePayload);

      // Refresh user data
      await login();

      Alert.alert(
        'Thành công',
        'Thông tin của bạn đã được cập nhật',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Cập nhật thất bại',
        error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cập nhật hồ sơ</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {avatarPreview ? (
                  <Image source={{ uri: avatarPreview }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                {avatarPreview && (
                  <TouchableOpacity style={styles.removeAvatarButton} onPress={removeAvatar}>
                    <MaterialCommunityIcons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.selectAvatarButton}
                onPress={handleAvatarChange}
                disabled={loading}
              >
                <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                <Text style={styles.selectAvatarButtonText}>Chọn ảnh đại diện</Text>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>
                Hỗ trợ file JPG, PNG. Kích thước tối đa 5MB.
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              {/* Fullname */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Họ và tên</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.fullname}
                  onChangeText={(text) => setProfileData({ ...profileData, fullname: text })}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={profileData.email}
                  onChangeText={(text) => setProfileData({ ...profileData, email: text })}
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Bio */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bio (Giới thiệu)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={profileData.bio}
                  onChangeText={(text) => setProfileData({ ...profileData, bio: text })}
                  placeholder="Giới thiệu ngắn về bản thân (tối đa 150 ký tự)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!loading}
                />
                <Text style={styles.hint}>
                  Giới thiệu sẽ hiển thị trên trang hồ sơ của bạn.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleProfileSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Lưu</Text>
                  </>
                )}
              </TouchableOpacity>
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
  keyboardAvoidingView: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  // Avatar Section
  avatarSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#62AC4A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  removeAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  selectAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7A1A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginBottom: 8,
  },
  selectAvatarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  avatarHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Form Section
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#62AC4A',
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A1A',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

