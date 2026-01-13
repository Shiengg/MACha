import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { eventService } from '../../services/event.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function CreateEventModal({ isOpen, onClose, onEventCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    banner_image: '',
    gallery_images: [],
    start_date: '',
    end_date: '',
    timezone: 'Asia/Ho_Chi_Minh',
    location_name: '',
    category: 'charity_event',
    capacity: '',
  });

  const [bannerPreview, setBannerPreview] = useState('');
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [bannerUri, setBannerUri] = useState('');
  const [galleryUris, setGalleryUris] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const categories = [
    { value: 'volunteering', label: 'Tình nguyện' },
    { value: 'fundraising', label: 'Gây quỹ' },
    { value: 'charity_event', label: 'Sự kiện từ thiện' },
    { value: 'donation_drive', label: 'Tập hợp đóng góp' },
  ];

  const resetForm = () => {
    const now = new Date();
    setFormData({
      title: '',
      description: '',
      banner_image: '',
      gallery_images: [],
      start_date: '',
      end_date: '',
      timezone: 'Asia/Ho_Chi_Minh',
      location_name: '',
      category: 'charity_event',
      capacity: '',
    });
    setBannerPreview('');
    setGalleryPreviews([]);
    setBannerUri('');
    setGalleryUris([]);
    setError('');
    setStartDate(now);
    setEndDate(now);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Quyền truy cập',
        'Cần quyền truy cập thư viện ảnh để chọn ảnh',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleBannerSelect = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'File quá lớn (tối đa 5MB)', [{ text: 'OK' }]);
          return;
        }
        setBannerUri(asset.uri);
        setBannerPreview(asset.uri);
      }
    } catch (error) {
      console.error('Error picking banner image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.', [{ text: 'OK' }]);
    }
  };

  const handleGallerySelect = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets
          .filter(asset => !asset.fileSize || asset.fileSize <= 5 * 1024 * 1024)
          .map(asset => asset.uri);
        
        if (newUris.length !== result.assets.length) {
          Alert.alert('Lưu ý', 'Một số ảnh quá lớn (tối đa 5MB) đã bị bỏ qua', [{ text: 'OK' }]);
        }

        if (galleryUris.length + newUris.length > 6) {
          Alert.alert('Lỗi', 'Tối đa 6 ảnh gallery', [{ text: 'OK' }]);
          return;
        }

        setGalleryUris([...galleryUris, ...newUris]);
        setGalleryPreviews([...galleryPreviews, ...newUris]);
      }
    } catch (error) {
      console.error('Error picking gallery images:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.', [{ text: 'OK' }]);
    }
  };

  const handleRemoveBanner = () => {
    setBannerUri('');
    setBannerPreview('');
    setFormData({ ...formData, banner_image: '' });
  };

  const handleRemoveGalleryImage = (index) => {
    const newUris = galleryUris.filter((_, i) => i !== index);
    const newPreviews = galleryPreviews.filter((_, i) => i !== index);
    setGalleryUris(newUris);
    setGalleryPreviews(newPreviews);
  };

  const uploadImages = async () => {
    setIsUploading(true);
    try {
      // Upload banner
      if (bannerUri) {
        const bannerResult = await cloudinaryService.uploadImage(bannerUri, 'events');
        formData.banner_image = bannerResult.secure_url;
      }

      // Upload gallery images
      if (galleryUris.length > 0) {
        const galleryResults = await cloudinaryService.uploadMultipleImages(galleryUris, 'events');
        formData.gallery_images = galleryResults.map((r) => r.secure_url);
      }
    } catch (err) {
      console.error('Error uploading images:', err);
      throw new Error('Không thể tải lên hình ảnh. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!formData.title.trim()) {
      setError('Vui lòng nhập tiêu đề sự kiện');
      return;
    }

    if (!bannerUri && !formData.banner_image) {
      setError('Vui lòng chọn ảnh banner cho sự kiện');
      return;
    }

    if (!formData.start_date) {
      setError('Vui lòng chọn ngày bắt đầu');
      return;
    }

    if (!formData.location_name || !formData.location_name.trim()) {
      setError('Vui lòng nhập vị trí sự kiện (cho bản đồ)');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload images first
      if (bannerUri || galleryUris.length > 0) {
        await uploadImages();
      }

      // Create event with pending status for admin approval
      const payload = {
        ...formData,
        location_name: formData.location_name.trim(),
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        status: 'pending',
      };

      await eventService.createEvent(payload);

      Alert.alert(
        'Thành công',
        'Sự kiện đã được tạo và đang chờ duyệt',
        [{ text: 'OK', onPress: () => {
          resetForm();
          onEventCreated?.();
          onClose();
        }}]
      );
    } catch (err) {
      console.error('Error creating event:', err);
      const errorMessage = err.response?.data?.message || 'Không thể tạo sự kiện. Vui lòng thử lại.';
      setError(errorMessage);
      Alert.alert('Lỗi', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Format date for display (Vietnamese locale)
  const formatDateForDisplay = (date) => {
    if (!date) return 'Chưa chọn';
    try {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Chưa chọn';
    }
  };

  // Handle start date picker
  const handleStartDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      setFormData({ ...formData, start_date: selectedDate.toISOString() });
      if (Platform.OS === 'ios') {
        // On iOS, picker stays open
      }
    }
  };

  // Handle end date picker
  const handleEndDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
      setFormData({ ...formData, end_date: selectedDate.toISOString() });
      if (Platform.OS === 'ios') {
        // On iOS, picker stays open
      }
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Tạo sự kiện mới</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tiêu đề sự kiện <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  placeholder="Ví dụ: Tập hợp đóng góp mì gói cho miền Trung"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Mô tả chi tiết về sự kiện..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Danh mục <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.categoryContainer}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryOption,
                        formData.category === cat.value && styles.categoryOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category: cat.value })}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          formData.category === cat.value && styles.categoryOptionTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Banner Image */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Ảnh banner <Text style={styles.required}>*</Text>
                </Text>
                {bannerPreview ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: bannerPreview }} style={styles.bannerPreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={handleRemoveBanner}
                    >
                      <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={handleBannerSelect}
                  >
                    <MaterialCommunityIcons name="image-plus" size={32} color="#9CA3AF" />
                    <Text style={styles.imagePickerText}>Chọn ảnh banner</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Gallery Images */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ảnh gallery (tùy chọn, tối đa 6)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.galleryContainer}>
                    {galleryPreviews.map((preview, index) => (
                      <View key={index} style={styles.galleryItem}>
                        <Image source={{ uri: preview }} style={styles.galleryImage} />
                        <TouchableOpacity
                          style={styles.galleryRemoveButton}
                          onPress={() => handleRemoveGalleryImage(index)}
                        >
                          <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {galleryPreviews.length < 6 && (
                      <TouchableOpacity
                        style={styles.galleryAddButton}
                        onPress={handleGallerySelect}
                      >
                        <MaterialCommunityIcons name="plus" size={24} color="#9CA3AF" />
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Date and Time */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Ngày bắt đầu <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateInputText, !formData.start_date && styles.dateInputPlaceholder]}>
                    {formData.start_date ? formatDateForDisplay(new Date(formData.start_date)) : 'Chọn ngày và giờ bắt đầu'}
                  </Text>
                  <MaterialCommunityIcons name="calendar-clock" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                {Platform.OS === 'ios' && showStartDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerActions}>
                      <TouchableOpacity
                        onPress={() => setShowStartDatePicker(false)}
                        style={styles.datePickerButton}
                      >
                        <Text style={styles.datePickerButtonText}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setFormData({ ...formData, start_date: startDate.toISOString() });
                          setShowStartDatePicker(false);
                        }}
                        style={styles.datePickerButton}
                      >
                        <Text style={[styles.datePickerButtonText, styles.datePickerButtonTextPrimary]}>Xong</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={startDate}
                      mode="datetime"
                      display="spinner"
                      onChange={handleStartDateChange}
                      minimumDate={new Date()}
                    />
                  </View>
                )}
                {Platform.OS === 'android' && showStartDatePicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="datetime"
                    display="default"
                    onChange={handleStartDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ngày kết thúc (tùy chọn)</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dateInputText, !formData.end_date && styles.dateInputPlaceholder]}>
                    {formData.end_date ? formatDateForDisplay(new Date(formData.end_date)) : 'Chọn ngày và giờ kết thúc'}
                  </Text>
                  <MaterialCommunityIcons name="calendar-clock" size={20} color="#9CA3AF" />
                </TouchableOpacity>
                {Platform.OS === 'ios' && showEndDatePicker && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerActions}>
                      <TouchableOpacity
                        onPress={() => setShowEndDatePicker(false)}
                        style={styles.datePickerButton}
                      >
                        <Text style={styles.datePickerButtonText}>Hủy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setFormData({ ...formData, end_date: endDate.toISOString() });
                          setShowEndDatePicker(false);
                        }}
                        style={styles.datePickerButton}
                      >
                        <Text style={[styles.datePickerButtonText, styles.datePickerButtonTextPrimary]}>Xong</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={endDate}
                      mode="datetime"
                      display="spinner"
                      onChange={handleEndDateChange}
                      minimumDate={formData.start_date ? new Date(formData.start_date) : new Date()}
                    />
                  </View>
                )}
                {Platform.OS === 'android' && showEndDatePicker && (
                  <DateTimePicker
                    value={endDate}
                    mode="datetime"
                    display="default"
                    onChange={handleEndDateChange}
                    minimumDate={formData.start_date ? new Date(formData.start_date) : new Date()}
                  />
                )}
              </View>

              {/* Location */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#F97E2C" />{' '}
                  Vị trí sự kiện (cho bản đồ) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.location_name}
                  onChangeText={(text) => setFormData({ ...formData, location_name: text })}
                  placeholder="VD: Hốc Môn, HCM hoặc Quận 1, TP.HCM"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.helperText}>
                  Nhập tên địa điểm nơi sự kiện diễn ra. Hệ thống sẽ tự động xác định tọa độ để hiển thị trên bản đồ.
                </Text>
              </View>

              {/* Capacity */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  <MaterialCommunityIcons name="account-group" size={16} color="#F97E2C" />{' '}
                  Số lượng người tham gia tối đa (tùy chọn)
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.capacity}
                  onChangeText={(text) => setFormData({ ...formData, capacity: text })}
                  placeholder="Để trống nếu không giới hạn"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isSubmitting || isUploading}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={isSubmitting || isUploading}
              >
                {isSubmitting || isUploading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Tạo sự kiện</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  safeArea: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: verticalScale(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: scale(4),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(20),
    paddingBottom: verticalScale(20),
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: scale(12),
    marginBottom: verticalScale(16),
  },
  errorText: {
    color: '#DC2626',
    fontSize: moderateScale(14),
  },
  formGroup: {
    marginBottom: verticalScale(20),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: verticalScale(8),
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    fontSize: moderateScale(14),
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: verticalScale(100),
    paddingTop: verticalScale(12),
  },
  helperText: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: verticalScale(4),
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  categoryOption: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  categoryOptionActive: {
    backgroundColor: '#F97E2C',
    borderColor: '#F97E2C',
  },
  categoryOptionText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: verticalScale(150),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  imagePickerText: {
    fontSize: moderateScale(14),
    color: '#9CA3AF',
    marginTop: verticalScale(8),
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bannerPreview: {
    width: '100%',
    height: verticalScale(150),
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  galleryContainer: {
    flexDirection: 'row',
    gap: scale(12),
  },
  galleryItem: {
    position: 'relative',
    width: scale(100),
    height: scale(100),
    borderRadius: 8,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryRemoveButton: {
    position: 'absolute',
    top: scale(4),
    right: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
  },
  galleryAddButton: {
    width: scale(100),
    height: scale(100),
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    backgroundColor: '#FFFFFF',
  },
  dateInputText: {
    fontSize: moderateScale(14),
    color: '#1F2937',
    flex: 1,
  },
  dateInputPlaceholder: {
    color: '#9CA3AF',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: verticalScale(8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: scale(16),
  },
  datePickerButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
  },
  datePickerButtonText: {
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
  datePickerButtonTextPrimary: {
    color: '#F97E2C',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: scale(12),
  },
  button: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#F97E2C',
  },
  submitButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

