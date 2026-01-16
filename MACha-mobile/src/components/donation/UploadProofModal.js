import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { cloudinaryService } from '../../services/cloudinary.service';
import apiClient from '../../services/apiClient';
import { UPLOAD_DONATION_PROOF_ROUTE } from '../../constants/api';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadProofModal({ visible, onClose, donationId, onSuccess }) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleImageSelect = async () => {
    if (selectedImages.length >= MAX_FILES) {
      Alert.alert('Lỗi', `Tối đa ${MAX_FILES} ảnh được phép tải lên`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: MAX_FILES - selectedImages.length,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Validate file sizes
        const validImages = [];
        const invalidImages = [];

        result.assets.forEach((asset) => {
          // Note: ImagePicker in Expo doesn't always provide file size, so we skip validation for now
          // In production, you might want to add additional validation
          validImages.push(asset);
        });

        if (invalidImages.length > 0) {
          const errorMessages = invalidImages.map(
            (img) => `${img.fileName || 'Ảnh'}: Kích thước file vượt quá 5MB`
          );
          setError(errorMessages.join('\n'));
        }

        if (validImages.length > 0) {
          setSelectedImages((prev) => [...prev, ...validImages]);
          setError(null);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      setError('Vui lòng chọn ít nhất một ảnh');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Upload images to Cloudinary
      const imageUris = selectedImages.map((img) => img.uri);
      const uploadResults = await cloudinaryService.uploadMultipleImages(
        imageUris,
        'donations/proofs'
      );

      const imageUrls = uploadResults.map((result) => result.secure_url);

      // Upload proof to backend
      await apiClient.post(UPLOAD_DONATION_PROOF_ROUTE(donationId), {
        proof_images: imageUrls,
      });

      // Reset state
      setSelectedImages([]);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
      Alert.alert('Thành công', 'Minh chứng đã được tải lên thành công');
    } catch (err) {
      console.error('Error uploading proof:', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Có lỗi xảy ra khi upload minh chứng. Vui lòng thử lại.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedImages([]);
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cập nhật minh chứng giao dịch</Text>
            <TouchableOpacity onPress={handleClose} disabled={uploading}>
              <MaterialCommunityIcons name="close" size={scale(24)} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.modalBody}>
            <Text style={styles.description}>
              Ảnh minh chứng sẽ được sử dụng để xác minh giao dịch trong trường hợp phát sinh tranh chấp.
            </Text>

            {/* Image Select Button */}
            <TouchableOpacity
              onPress={handleImageSelect}
              disabled={uploading || selectedImages.length >= MAX_FILES}
              style={[
                styles.imageSelectButton,
                (uploading || selectedImages.length >= MAX_FILES) && styles.imageSelectButtonDisabled,
              ]}
            >
              <MaterialCommunityIcons
                name="image-plus"
                size={scale(32)}
                color={uploading || selectedImages.length >= MAX_FILES ? '#9CA3AF' : '#F97E2C'}
              />
              <Text
                style={[
                  styles.imageSelectButtonText,
                  (uploading || selectedImages.length >= MAX_FILES) && styles.imageSelectButtonTextDisabled,
                ]}
              >
                {selectedImages.length >= MAX_FILES
                  ? `Đã đạt tối đa ${MAX_FILES} ảnh`
                  : `Chọn ảnh (JPG/PNG, tối đa 5MB/ảnh, tối đa ${MAX_FILES} ảnh)`}
              </Text>
            </TouchableOpacity>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={scale(20)} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Preview Images */}
            {selectedImages.length > 0 && (
              <View style={styles.imagePreviewGrid}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                    <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      onPress={() => removeImage(index)}
                      disabled={uploading}
                      style={styles.removeImageButton}
                    >
                      <MaterialCommunityIcons name="close-circle" size={scale(24)} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={handleClose}
              disabled={uploading}
              style={[styles.cancelButton, uploading && styles.buttonDisabled]}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading || selectedImages.length === 0}
              style={[
                styles.uploadButton,
                (uploading || selectedImages.length === 0) && styles.buttonDisabled,
              ]}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="upload" size={scale(20)} color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Tải lên ngay</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  modalBody: {
    padding: scale(16),
    maxHeight: verticalScale(400),
  },
  description: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(16),
  },
  imageSelectButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: scale(12),
    padding: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: scale(16),
  },
  imageSelectButtonDisabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  imageSelectButtonText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginTop: scale(8),
    textAlign: 'center',
  },
  imageSelectButtonTextDisabled: {
    color: '#9CA3AF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: scale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: scale(16),
  },
  errorText: {
    fontSize: moderateScale(14),
    color: '#EF4444',
    marginLeft: scale(8),
    flex: 1,
  },
  imagePreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  imagePreviewContainer: {
    position: 'relative',
    width: scale(100),
    height: scale(100),
    borderRadius: scale(8),
    overflow: 'hidden',
    marginBottom: scale(12),
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: scale(12),
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  cancelButton: {
    paddingVertical: scale(12),
    paddingHorizontal: scale(24),
    borderRadius: scale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(24),
    borderRadius: scale(8),
    backgroundColor: '#F97E2C',
    gap: scale(8),
  },
  uploadButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

