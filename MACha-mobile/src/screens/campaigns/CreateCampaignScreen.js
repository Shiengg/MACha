import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { campaignService } from '../../services/campaign.service';
import { kycService } from '../../services/kyc.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const CATEGORIES = [
  { value: 'children', label: 'Trẻ em' },
  { value: 'elderly', label: 'Người già' },
  { value: 'poverty', label: 'Người nghèo' },
  { value: 'disaster', label: 'Thiên tai' },
  { value: 'medical', label: 'Y tế' },
  { value: 'hardship', label: 'Hoàn cảnh khó khăn' },
  { value: 'education', label: 'Giáo dục' },
  { value: 'disability', label: 'Người khuyết tật' },
  { value: 'animal', label: 'Động vật' },
  { value: 'environment', label: 'Môi trường' },
  { value: 'community', label: 'Cộng đồng' },
  { value: 'other', label: 'Khác' },
];

const STEPS = [
  { number: 1, title: 'Thông tin liên hệ' },
  { number: 2, title: 'Thông tin chiến dịch' },
  { number: 3, title: 'Cam kết & Tài liệu' },
  { number: 4, title: 'Xem lại và gửi' },
];

export default function CreateCampaignScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingKYC, setIsCheckingKYC] = useState(true);
  const [kycStatus, setKycStatus] = useState('');
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    // Step 1: Contact Information
    fullname: user?.fullname || '',
    phone: '',
    email: user?.email || '',
    facebook: '',
    instagram: '',
    twitter: '',
    website: '',
    address: '',
    location_name: '',
    // Step 2: Campaign Information
    title: '',
    category: '',
    goal_amount: '',
    start_date: '',
    end_date: '',
    description: '',
    story: '',
    hashtag: '',
    // Step 3: Commitment & Documents
    milestones: [
      { percentage: 100, commitment_days: 0, commitment_description: '' }
    ],
    expected_timeline: [],
    commitment: '',
    proof_documents: [],
    banner_image: null,
    gallery_images: [],
  });

  const [previewUris, setPreviewUris] = useState({
    proof_documents: [],
    banner_image: null,
    gallery_images: [],
  });

  const [datePickers, setDatePickers] = useState({
    showStartDate: false,
    showEndDate: false,
  });

  useEffect(() => {
    checkKYCStatus();
  }, []);

  const checkKYCStatus = async () => {
    try {
      setIsCheckingKYC(true);
      const status = await kycService.getKYCStatus();
      setKycStatus(status.kyc_status);

      if (status.kyc_status !== 'verified') {
        let message = '';
        let title = 'Không thể tạo chiến dịch';

        switch (status.kyc_status) {
          case 'unverified':
            message = 'Bạn cần xác thực danh tính (KYC) trước khi tạo chiến dịch.';
            break;
          case 'pending':
            message = 'KYC của bạn đang được xét duyệt. Vui lòng đợi admin phê duyệt.';
            break;
          case 'rejected':
            message = `KYC của bạn đã bị từ chối. Lý do: ${status.kyc_rejection_reason || 'Không rõ'}`;
            break;
        }

        Alert.alert(
          title,
          message,
          [
            {
              text: status.kyc_status === 'unverified' ? 'Đi đến KYC' : 'Đóng',
              onPress: () => {
                if (status.kyc_status === 'unverified') {
                  // Navigate to KYC screen if exists
                  navigation.navigate('MainTabs');
                } else {
                  navigation.goBack();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error checking KYC:', error);
      Alert.alert(
        'Lỗi',
        'Không thể kiểm tra trạng thái KYC. Vui lòng thử lại.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setIsCheckingKYC(false);
    }
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'File quá lớn (tối đa 5MB)', [{ text: 'OK' }]);
          return;
        }
        setFormData(prev => ({ ...prev, banner_image: asset.uri }));
        setPreviewUris(prev => ({ ...prev, banner_image: asset.uri }));
      }
    } catch (error) {
      console.error('Error picking banner:', error);
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

        setFormData(prev => ({
          ...prev,
          gallery_images: [...prev.gallery_images, ...newUris],
        }));
        setPreviewUris(prev => ({
          ...prev,
          gallery_images: [...prev.gallery_images, ...newUris],
        }));
      }
    } catch (error) {
      console.error('Error picking gallery:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.', [{ text: 'OK' }]);
    }
  };

  const handleProofDocumentsSelect = async () => {
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

        setFormData(prev => ({
          ...prev,
          proof_documents: [...prev.proof_documents, ...newUris],
        }));
        setPreviewUris(prev => ({
          ...prev,
          proof_documents: [...prev.proof_documents, ...newUris],
        }));
      }
    } catch (error) {
      console.error('Error picking proof documents:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.', [{ text: 'OK' }]);
    }
  };

  const removeBanner = () => {
    setFormData(prev => ({ ...prev, banner_image: null }));
    setPreviewUris(prev => ({ ...prev, banner_image: null }));
  };

  const removeGalleryImage = (index) => {
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index),
    }));
    setPreviewUris(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index),
    }));
  };

  const removeProofDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      proof_documents: prev.proof_documents.filter((_, i) => i !== index),
    }));
    setPreviewUris(prev => ({
      ...prev,
      proof_documents: prev.proof_documents.filter((_, i) => i !== index),
    }));
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { percentage: 0, commitment_days: 0, commitment_description: '' }
      ]
    }));
  };

  const removeMilestone = (index) => {
    const milestoneToRemove = formData.milestones[index];
    if (milestoneToRemove.percentage === 100) {
      Alert.alert('Không thể xóa', 'Mốc 100% là bắt buộc và không thể xóa');
      return;
    }
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const updateMilestone = (index, field, value) => {
    setFormData(prev => {
      const updatedMilestones = prev.milestones.map((milestone, i) => {
        if (i === index) {
          if (field === 'percentage' && milestone.percentage === 100) {
            Alert.alert('Không thể thay đổi', 'Mốc 100% là cố định và không thể thay đổi phần trăm');
            return milestone;
          }
          if (field === 'percentage') {
            const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
            if (isNaN(numValue) || numValue < 0 || numValue > 100) {
              Alert.alert('Giá trị không hợp lệ', 'Phần trăm phải nằm trong khoảng 0-100');
              return milestone;
            }
            if (numValue === 100) {
              const has100Percent = prev.milestones.some((m, idx) => idx !== index && m.percentage === 100);
              if (has100Percent) {
                Alert.alert('Không hợp lệ', 'Đã có mốc 100% rồi, không thể thêm mốc 100% khác');
                return milestone;
              }
            }
            return { ...milestone, [field]: numValue };
          }
          return { ...milestone, [field]: value };
        }
        return milestone;
      });
      return { ...prev, milestones: updatedMilestones };
    });
  };

  const addTimelineItem = () => {
    setFormData(prev => ({
      ...prev,
      expected_timeline: [
        ...prev.expected_timeline,
        { month: '', description: '' }
      ]
    }));
  };

  const removeTimelineItem = (index) => {
    setFormData(prev => ({
      ...prev,
      expected_timeline: prev.expected_timeline.filter((_, i) => i !== index)
    }));
  };

  const updateTimelineItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      expected_timeline: prev.expected_timeline.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.fullname.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên');
          return false;
        }
        if (!formData.phone.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại');
          return false;
        }
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
          Alert.alert('Số điện thoại không hợp lệ', 'Vui lòng nhập số điện thoại hợp lệ (10-11 số)');
          return false;
        }
        if (!formData.email.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập email');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          Alert.alert('Email không hợp lệ', 'Vui lòng nhập email hợp lệ');
          return false;
        }
        if (!formData.address.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập địa chỉ');
          return false;
        }
        if (!formData.location_name.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập vị trí chiến dịch (cho bản đồ)');
          return false;
        }
        return true;

      case 2:
        if (!formData.title.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề chiến dịch');
          return false;
        }
        if (!formData.category) {
          Alert.alert('Thiếu thông tin', 'Vui lòng chọn danh mục');
          return false;
        }
        if (!formData.goal_amount || parseInt(formData.goal_amount, 10) <= 0) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập mục tiêu quyên góp hợp lệ');
          return false;
        }
        if (!formData.start_date) {
          Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày bắt đầu');
          return false;
        }
        if (!formData.end_date) {
          Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngày kết thúc');
          return false;
        }
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (startDate < today) {
          Alert.alert('Ngày không hợp lệ', 'Ngày bắt đầu không thể trước ngày hôm nay');
          return false;
        }
        if (endDate <= startDate) {
          Alert.alert('Ngày không hợp lệ', 'Ngày kết thúc phải sau ngày bắt đầu');
          return false;
        }
        if (!formData.description.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập mô tả ngắn');
          return false;
        }
        if (formData.description.length < 50) {
          Alert.alert('Mô tả quá ngắn', 'Mô tả phải có ít nhất 50 ký tự');
          return false;
        }
        if (!formData.story.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập câu chuyện chi tiết');
          return false;
        }
        if (formData.story.length < 100) {
          Alert.alert('Câu chuyện quá ngắn', 'Câu chuyện phải có ít nhất 100 ký tự');
          return false;
        }

        if (formData.expected_timeline.length > 0) {
          for (let i = 0; i < formData.expected_timeline.length; i++) {
            const item = formData.expected_timeline[i];
            if (!item.month.trim()) {
              Alert.alert('Thiếu thông tin', `Mốc ${i + 1}: Vui lòng nhập tháng/năm`);
              return false;
            }
            if (!item.description.trim()) {
              Alert.alert('Thiếu thông tin', `Mốc ${i + 1}: Vui lòng nhập mô tả`);
              return false;
            }
          }
        }
        return true;

      case 3:
        if (formData.milestones.length === 0) {
          Alert.alert('Thiếu thông tin', 'Vui lòng thêm ít nhất một mốc milestone');
          return false;
        }

        const has100Percent = formData.milestones.some(m => m.percentage === 100);
        if (!has100Percent) {
          Alert.alert('Thiếu mốc bắt buộc', 'Mốc 100% là bắt buộc. Vui lòng đảm bảo có mốc 100%');
          return false;
        }

        for (let i = 0; i < formData.milestones.length; i++) {
          const milestone = formData.milestones[i];
          if (!milestone.percentage || milestone.percentage < 1 || milestone.percentage > 100) {
            Alert.alert('Mốc không hợp lệ', `Mốc ${i + 1}: Phần trăm phải từ 1 đến 100`);
            return false;
          }
          if (!milestone.commitment_days || milestone.commitment_days < 1) {
            Alert.alert('Mốc không hợp lệ', `Mốc ${i + 1}: Số ngày cam kết phải lớn hơn 0`);
            return false;
          }
          if (!milestone.commitment_description.trim()) {
            Alert.alert('Mốc không hợp lệ', `Mốc ${i + 1}: Vui lòng nhập mô tả cam kết`);
            return false;
          }
        }

        const percentages = formData.milestones.map(m => m.percentage);
        const uniquePercentages = new Set(percentages);
        if (percentages.length !== uniquePercentages.size) {
          Alert.alert('Mốc trùng lặp', 'Các mốc không được có cùng phần trăm');
          return false;
        }

        if (!formData.commitment.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng nhập cam kết sử dụng');
          return false;
        }
        if (formData.commitment.length < 50) {
          Alert.alert('Cam kết quá ngắn', 'Cam kết phải có ít nhất 50 ký tự');
          return false;
        }
        if (formData.proof_documents.length === 0) {
          Alert.alert('Thiếu tài liệu', 'Vui lòng upload ít nhất 1 tài liệu chứng minh');
          return false;
        }
        if (!formData.banner_image) {
          Alert.alert('Thiếu ảnh banner', 'Vui lòng upload ảnh banner cho chiến dịch');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCancel = () => {
    Alert.alert(
      'Hủy tạo chiến dịch?',
      'Tất cả thông tin bạn đã nhập sẽ bị mất. Bạn có chắc chắn muốn hủy?',
      [
        { text: 'Không, tiếp tục', style: 'cancel' },
        {
          text: 'Có, hủy tạo',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    Alert.alert(
      'Xác nhận gửi chiến dịch?',
      `Tiêu đề: ${formData.title}\nMục tiêu: ${parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')} VNĐ\n\nChiến dịch sẽ được gửi đến admin để xét duyệt.`,
      [
        { text: 'Kiểm tra lại', style: 'cancel' },
        {
          text: 'Gửi chiến dịch',
          onPress: async () => {
            try {
              setIsSubmitting(true);

              // Upload proof documents
              if (formData.proof_documents.length === 0) {
                throw new Error('Vui lòng upload tài liệu chứng minh');
              }
              const proofResults = await cloudinaryService.uploadMultipleImages(
                formData.proof_documents,
                'campaigns/proofs'
              );
              const proofDocUrl = proofResults[0].secure_url;

              // Upload banner image
              if (!formData.banner_image) {
                throw new Error('Vui lòng upload ảnh banner');
              }
              const bannerResult = await cloudinaryService.uploadImage(
                formData.banner_image,
                'campaigns/banners'
              );
              const bannerImage = bannerResult.secure_url;

              // Upload gallery images
              let galleryImages = [];
              if (formData.gallery_images.length > 0) {
                const galleryResults = await cloudinaryService.uploadMultipleImages(
                  formData.gallery_images,
                  'campaigns/gallery'
                );
                galleryImages = galleryResults.map(r => r.secure_url);
              }

              const fullDescription = `${formData.description}\n\n--- Câu chuyện ---\n${formData.story}\n\n--- Cam kết ---\n${formData.commitment}`;

              const payload = {
                contact_info: {
                  fullname: formData.fullname,
                  phone: formData.phone,
                  email: formData.email,
                  social_links: {
                    ...(formData.facebook && { facebook: formData.facebook }),
                    ...(formData.instagram && { instagram: formData.instagram }),
                    ...(formData.twitter && { twitter: formData.twitter }),
                    ...(formData.website && { website: formData.website }),
                  },
                  address: formData.address,
                },
                title: formData.title,
                description: fullDescription,
                goal_amount: parseInt(formData.goal_amount || '0', 10),
                start_date: new Date(formData.start_date).toISOString(),
                end_date: new Date(formData.end_date).toISOString(),
                category: formData.category,
                banner_image: bannerImage,
                ...(galleryImages.length > 0 && { gallery_images: galleryImages }),
                proof_documents_url: proofDocUrl,
                milestones: formData.milestones,
                ...(formData.expected_timeline.length > 0 && { expected_timeline: formData.expected_timeline }),
                ...(formData.hashtag.trim() && { hashtag: formData.hashtag.trim() }),
                ...(formData.location_name.trim() && { location_name: formData.location_name.trim() }),
              };

              await campaignService.createCampaign(payload);

              Alert.alert(
                'Thành công!',
                'Chiến dịch của bạn đã được gửi thành công! Admin sẽ xem xét và phê duyệt trong thời gian sớm nhất.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              console.error('Error creating campaign:', error);
              Alert.alert(
                'Lỗi',
                error.response?.data?.message || 'Có lỗi xảy ra khi tạo chiến dịch. Vui lòng thử lại.'
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (isCheckingKYC) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Đang kiểm tra trạng thái KYC...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (kycStatus !== 'verified') {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <MaterialCommunityIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo chiến dịch</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <React.Fragment key={step.number}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    currentStep === step.number && styles.stepCircleActive,
                    currentStep > step.number && styles.stepCircleCompleted,
                  ]}
                >
                  {currentStep > step.number ? (
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        currentStep === step.number && styles.stepNumberActive,
                      ]}
                    >
                      {step.number}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepTitle,
                    currentStep === step.number && styles.stepTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </View>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    currentStep > step.number && styles.stepLineCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Contact Information */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeader}>Bước 1: Thông tin liên hệ</Text>
              <Text style={styles.stepDescription}>
                Thông tin này sẽ được sử dụng để liên hệ với bạn về chiến dịch
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Họ và tên <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.fullname}
                  onChangeText={(value) => handleInputChange('fullname', value)}
                  placeholder="VD: Nguyễn Văn A"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Số điện thoại <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  placeholder="VD: 0901234567"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="VD: example@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Địa chỉ <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(value) => handleInputChange('address', value)}
                  placeholder="VD: 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Vị trí chiến dịch (cho bản đồ) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.location_name}
                  onChangeText={(value) => handleInputChange('location_name', value)}
                  placeholder="VD: Hốc Môn, HCM hoặc Quận 1, TP.HCM"
                />
                <Text style={styles.helperText}>
                  Nhập tên địa điểm nơi chiến dịch diễn ra. Hệ thống sẽ tự động xác định tọa độ để hiển thị trên bản đồ.
                </Text>
              </View>

              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Liên kết mạng xã hội (tùy chọn)</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput
                  style={styles.input}
                  value={formData.facebook}
                  onChangeText={(value) => handleInputChange('facebook', value)}
                  placeholder="https://facebook.com/..."
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={styles.input}
                  value={formData.instagram}
                  onChangeText={(value) => handleInputChange('instagram', value)}
                  placeholder="https://instagram.com/..."
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Twitter</Text>
                <TextInput
                  style={styles.input}
                  value={formData.twitter}
                  onChangeText={(value) => handleInputChange('twitter', value)}
                  placeholder="https://twitter.com/..."
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Website</Text>
                <TextInput
                  style={styles.input}
                  value={formData.website}
                  onChangeText={(value) => handleInputChange('website', value)}
                  placeholder="https://..."
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {/* Step 2: Campaign Information */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeader}>Bước 2: Thông tin chiến dịch</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tiêu đề chiến dịch <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={(value) => handleInputChange('title', value)}
                  placeholder="VD: Giúp đỡ trẻ em vùng cao có sách vở đến trường"
                  maxLength={100}
                />
                <Text style={styles.helperText}>{formData.title.length}/100 ký tự</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Danh mục <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.categoryContainer}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryButton,
                        formData.category === cat.value && styles.categoryButtonActive,
                      ]}
                      onPress={() => handleInputChange('category', cat.value)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          formData.category === cat.value && styles.categoryButtonTextActive,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Mục tiêu quyên góp (VNĐ) <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.goal_amount}
                  onChangeText={(value) => {
                    const numericValue = value.replace(/[^\d]/g, '');
                    handleInputChange('goal_amount', numericValue);
                  }}
                  placeholder="VD: 50000000"
                  keyboardType="numeric"
                />
                {formData.goal_amount && (
                  <Text style={styles.helperText}>
                    {parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')} VNĐ
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Ngày bắt đầu <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setDatePickers({ ...datePickers, showStartDate: true })}
                >
                  <Text style={styles.dateButtonText}>
                    {formData.start_date
                      ? new Date(formData.start_date).toLocaleDateString('vi-VN')
                      : 'Chọn ngày bắt đầu'}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={20} color="#6B7280" />
                </TouchableOpacity>
                {datePickers.showStartDate && (
                  <DateTimePicker
                    value={formData.start_date ? new Date(formData.start_date) : new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setDatePickers({ ...datePickers, showStartDate: false });
                      if (event.type === 'set' && selectedDate) {
                        handleInputChange('start_date', selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Ngày kết thúc <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setDatePickers({ ...datePickers, showEndDate: true })}
                >
                  <Text style={styles.dateButtonText}>
                    {formData.end_date
                      ? new Date(formData.end_date).toLocaleDateString('vi-VN')
                      : 'Chọn ngày kết thúc'}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={20} color="#6B7280" />
                </TouchableOpacity>
                {datePickers.showEndDate && (
                  <DateTimePicker
                    value={
                      formData.end_date
                        ? new Date(formData.end_date)
                        : formData.start_date
                        ? new Date(new Date(formData.start_date).getTime() + 86400000)
                        : new Date()
                    }
                    mode="date"
                    display="default"
                    minimumDate={
                      formData.start_date
                        ? new Date(new Date(formData.start_date).getTime() + 86400000)
                        : new Date()
                    }
                    onChange={(event, selectedDate) => {
                      setDatePickers({ ...datePickers, showEndDate: false });
                      if (event.type === 'set' && selectedDate) {
                        handleInputChange('end_date', selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Mô tả ngắn <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(value) => handleInputChange('description', value)}
                  placeholder="Tóm tắt ngắn gọn về chiến dịch của bạn (tối thiểu 50 ký tự)"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.helperText}>
                  {formData.description.length}/500 ký tự (tối thiểu 50)
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Câu chuyện chi tiết <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.story}
                  onChangeText={(value) => handleInputChange('story', value)}
                  placeholder="Kể câu chuyện đầy đủ về chiến dịch: hoàn cảnh, lý do, mục tiêu cụ thể... (tối thiểu 100 ký tự)"
                  multiline
                  numberOfLines={10}
                  maxLength={5000}
                />
                <Text style={styles.helperText}>
                  {formData.story.length}/5000 ký tự (tối thiểu 100)
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Hashtag (tùy chọn)</Text>
                <View style={styles.hashtagContainer}>
                  <Text style={styles.hashtagPrefix}>#</Text>
                  <TextInput
                    style={[styles.input, styles.hashtagInput]}
                    value={formData.hashtag}
                    onChangeText={(value) => {
                      const cleanValue = value.replace(/^#/, '').toLowerCase();
                      handleInputChange('hashtag', cleanValue);
                    }}
                    placeholder="gopquy, trogiup, thiennguyen"
                    maxLength={50}
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.helperText}>
                  {formData.hashtag ? `#${formData.hashtag}` : 'Chưa có hashtag'}
                </Text>
              </View>

              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Tiến độ dự kiến (tùy chọn)</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addTimelineItem}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Thêm mốc</Text>
                </TouchableOpacity>
              </View>

              {formData.expected_timeline.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Chưa có mốc thời gian nào. Nhấn "Thêm mốc" để thêm.
                  </Text>
                </View>
              ) : (
                <View style={styles.timelineContainer}>
                  {formData.expected_timeline.map((item, index) => (
                    <View key={index} style={styles.timelineItem}>
                      <View style={styles.timelineItemHeader}>
                        <Text style={styles.timelineItemTitle}>Mốc {index + 1}</Text>
                        <TouchableOpacity
                          onPress={() => removeTimelineItem(index)}
                          style={styles.removeButton}
                        >
                          <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>
                          Tháng/Năm <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={item.month}
                          onChangeText={(value) => updateTimelineItem(index, 'month', value)}
                          placeholder="VD: Tháng 10/2025 hoặc 10/2025"
                        />
                      </View>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>
                          Mô tả <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={item.description}
                          onChangeText={(value) => updateTimelineItem(index, 'description', value)}
                          placeholder="VD: Hoàn thành gây quỹ"
                          maxLength={200}
                        />
                        <Text style={styles.helperText}>{item.description.length}/200 ký tự</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Step 3: Commitment & Documents */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeader}>Bước 3: Cam kết & Tài liệu</Text>

              {formData.goal_amount && (
                <View style={styles.goalCard}>
                  <Text style={styles.goalLabel}>Mục tiêu quyên góp</Text>
                  <Text style={styles.goalAmount}>
                    {parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}

              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Tiến độ giải ngân</Text>
                <TouchableOpacity style={styles.addButton} onPress={addMilestone}>
                  <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                  <Text style={styles.addButtonText}>Thêm mốc</Text>
                </TouchableOpacity>
              </View>

              {formData.milestones.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    Chưa có mốc nào. Vui lòng thêm ít nhất một mốc milestone.
                  </Text>
                </View>
              ) : (
                <View style={styles.milestonesContainer}>
                  {formData.milestones.map((milestone, index) => {
                    const is100Percent = milestone.percentage === 100;
                    return (
                      <View
                        key={index}
                        style={[
                          styles.milestoneItem,
                          is100Percent && styles.milestoneItemRequired,
                        ]}
                      >
                        <View style={styles.milestoneHeader}>
                          <View style={styles.milestoneTitleContainer}>
                            <Text style={styles.milestoneTitle}>Mốc {index + 1}</Text>
                            {is100Percent && (
                              <View style={styles.requiredBadge}>
                                <Text style={styles.requiredBadgeText}>Bắt buộc</Text>
                              </View>
                            )}
                          </View>
                          {formData.milestones.length > 1 && !is100Percent && (
                            <TouchableOpacity
                              onPress={() => removeMilestone(index)}
                              style={styles.removeButton}
                            >
                              <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>
                            Phần trăm (%) <Text style={styles.required}>*</Text>
                          </Text>
                          <TextInput
                            style={[styles.input, is100Percent && styles.inputDisabled]}
                            value={milestone.percentage.toString()}
                            onChangeText={(value) => {
                              const numericValue = value.replace(/[^\d]/g, '');
                              const limitedValue = numericValue.length > 3 ? numericValue.slice(0, 3) : numericValue;
                              if (limitedValue === '' || limitedValue === '0') {
                                updateMilestone(index, 'percentage', 0);
                              } else {
                                const numValue = parseInt(limitedValue, 10);
                                if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                                  updateMilestone(index, 'percentage', numValue);
                                } else if (numValue > 100) {
                                  updateMilestone(index, 'percentage', 100);
                                }
                              }
                            }}
                            placeholder="VD: 30"
                            keyboardType="numeric"
                            editable={!is100Percent}
                          />
                          {is100Percent && (
                            <Text style={styles.helperText}>
                              Mốc 100% là cố định, dùng cho khi campaign đạt 100% hoặc hết hạn
                            </Text>
                          )}
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>
                            Cam kết thực hiện sau (ngày) <Text style={styles.required}>*</Text>
                          </Text>
                          <TextInput
                            style={styles.input}
                            value={milestone.commitment_days.toString()}
                            onChangeText={(value) => {
                              const numericValue = value.replace(/[^\d]/g, '');
                              if (numericValue === '' || numericValue === '0') {
                                updateMilestone(index, 'commitment_days', 0);
                              } else {
                                const numValue = parseInt(numericValue, 10);
                                if (!isNaN(numValue) && numValue > 0) {
                                  updateMilestone(index, 'commitment_days', numValue);
                                }
                              }
                            }}
                            placeholder="VD: 30"
                            keyboardType="numeric"
                          />
                        </View>

                        <View style={styles.formGroup}>
                          <Text style={styles.label}>
                            Cam kết sử dụng <Text style={styles.required}>*</Text>
                          </Text>
                          <TextInput
                            style={[styles.input, styles.textArea]}
                            value={milestone.commitment_description}
                            onChangeText={(value) =>
                              updateMilestone(index, 'commitment_description', value)
                            }
                            placeholder="VD: Tôi cam kết sẽ khai báo hoạt động xây cầu sau 30 ngày kể từ khi đạt mốc này"
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                          />
                          <Text style={styles.helperText}>
                            {milestone.commitment_description.length}/500 ký tự
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Cam kết sử dụng quỹ <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.commitment}
                  onChangeText={(value) => handleInputChange('commitment', value)}
                  placeholder="Cam kết cụ thể về việc sử dụng số tiền quyên góp (tối thiểu 50 ký tự)"
                  multiline
                  numberOfLines={6}
                  maxLength={2000}
                />
                <Text style={styles.helperText}>
                  {formData.commitment.length}/2000 ký tự (tối thiểu 50)
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Ảnh Banner <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.helperText}>
                  Ảnh chính hiển thị đầu tiên cho chiến dịch (tỷ lệ 16:9 khuyến nghị)
                </Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handleBannerSelect}
                >
                  <MaterialCommunityIcons name="image-plus" size={24} color="#3b82f6" />
                  <Text style={styles.imagePickerText}>Chọn ảnh banner</Text>
                </TouchableOpacity>
                {previewUris.banner_image && (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: previewUris.banner_image }}
                      style={styles.bannerPreview}
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={removeBanner}
                    >
                      <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.helperText}>Tối đa 5MB</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Ảnh Gallery (tùy chọn)</Text>
                <Text style={styles.helperText}>Thêm các ảnh minh họa khác cho chiến dịch</Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handleGallerySelect}
                >
                  <MaterialCommunityIcons name="image-multiple" size={24} color="#3b82f6" />
                  <Text style={styles.imagePickerText}>Chọn ảnh gallery</Text>
                </TouchableOpacity>
                {previewUris.gallery_images.length > 0 && (
                  <View style={styles.galleryGrid}>
                    {previewUris.gallery_images.map((uri, index) => (
                      <View key={index} style={styles.galleryItem}>
                        <Image source={{ uri }} style={styles.galleryPreview} />
                        <TouchableOpacity
                          style={styles.removeGalleryButton}
                          onPress={() => removeGalleryImage(index)}
                        >
                          <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.helperText}>Tối đa 5MB mỗi ảnh, có thể chọn nhiều ảnh</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Tài liệu chứng minh <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.helperText}>
                  Upload giấy tờ chứng minh (giấy xác nhận, hóa đơn, ảnh thực tế...)
                </Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handleProofDocumentsSelect}
                >
                  <MaterialCommunityIcons name="file-document" size={24} color="#3b82f6" />
                  <Text style={styles.imagePickerText}>Chọn tài liệu</Text>
                </TouchableOpacity>
                {previewUris.proof_documents.length > 0 && (
                  <View style={styles.galleryGrid}>
                    {previewUris.proof_documents.map((uri, index) => (
                      <View key={index} style={styles.galleryItem}>
                        <Image source={{ uri }} style={styles.galleryPreview} />
                        <TouchableOpacity
                          style={styles.removeGalleryButton}
                          onPress={() => removeProofDocument(index)}
                        >
                          <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.helperText}>Tối đa 5MB mỗi ảnh</Text>
              </View>
            </View>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepHeader}>Bước 4: Xem lại và gửi yêu cầu</Text>

              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Thông tin liên hệ</Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Họ và tên:</Text> {formData.fullname}
                </Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Số điện thoại:</Text> {formData.phone}
                </Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Email:</Text> {formData.email}
                </Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Địa chỉ:</Text> {formData.address}
                </Text>
              </View>

              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Thông tin cơ bản</Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Tiêu đề:</Text> {formData.title}
                </Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Danh mục:</Text>{' '}
                  {CATEGORIES.find((c) => c.value === formData.category)?.label}
                </Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Mục tiêu:</Text>{' '}
                  {parseInt(formData.goal_amount || '0', 10).toLocaleString('vi-VN')} VNĐ
                </Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Ngày bắt đầu:</Text>{' '}
                  {new Date(formData.start_date).toLocaleDateString('vi-VN')}
                </Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewLabel}>Ngày kết thúc:</Text>{' '}
                  {new Date(formData.end_date).toLocaleDateString('vi-VN')}
                </Text>
              </View>

              <View style={styles.reviewSection}>
                <Text style={styles.reviewSectionTitle}>Milestones</Text>
                {formData.milestones.map((milestone, index) => (
                  <View key={index} style={styles.reviewMilestone}>
                    <Text style={styles.reviewText}>
                      <Text style={styles.reviewLabel}>Mốc {index + 1}:</Text> {milestone.percentage}%
                    </Text>
                    <Text style={styles.reviewSubText}>
                      Cam kết thực hiện sau: {milestone.commitment_days} ngày
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.warningBox}>
                <MaterialCommunityIcons name="alert" size={20} color="#F59E0B" />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>Trước khi gửi</Text>
                  <Text style={styles.warningText}>
                    • Kiểm tra kỹ tất cả thông tin đã nhập{'\n'}
                    • Chiến dịch sẽ được gửi đến admin để xét duyệt{'\n'}
                    • Bạn sẽ nhận được thông báo khi chiến dịch được phê duyệt hoặc từ chối
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep === 1 ? (
            <TouchableOpacity
              style={styles.cancelFooterButton}
              onPress={handleCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelFooterButtonText}>Hủy</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handlePrevious}
              disabled={isSubmitting}
            >
              <MaterialCommunityIcons name="chevron-left" size={24} color="#374151" />
              <Text style={styles.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.stepIndicator}>
            Bước {currentStep} / {totalSteps}
          </Text>

          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              disabled={isSubmitting}
            >
              <Text style={styles.nextButtonText}>Tiếp theo</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
  cancelButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#3b82f6',
  },
  stepCircleCompleted: {
    backgroundColor: '#10b981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepTitle: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  stepTitleActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
    marginTop: -16,
  },
  stepLineCompleted: {
    backgroundColor: '#10b981',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stepContent: {
    paddingBottom: 20,
  },
  stepHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  hashtagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  hashtagPrefix: {
    fontSize: 14,
    color: '#6B7280',
    paddingLeft: 12,
  },
  hashtagInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: 4,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  timelineContainer: {
    gap: 16,
  },
  timelineItem: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timelineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timelineItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  goalCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
  },
  goalLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  goalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F97316',
  },
  milestonesContainer: {
    gap: 16,
  },
  milestoneItem: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  milestoneItemRequired: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10b981',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  milestoneTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#10b981',
    borderRadius: 12,
  },
  requiredBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderStyle: 'dashed',
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bannerPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  galleryItem: {
    position: 'relative',
    width: '30%',
    aspectRatio: 1,
  },
  galleryPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeGalleryButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  reviewSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  reviewLabel: {
    fontWeight: '600',
    color: '#1F2937',
  },
  reviewMilestone: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  reviewSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelFooterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelFooterButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  stepIndicator: {
    fontSize: 12,
    color: '#6B7280',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  nextButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  submitButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

