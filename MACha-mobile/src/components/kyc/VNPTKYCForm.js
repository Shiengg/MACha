import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { kycService } from '../../services/kyc.service';
import { cloudinaryService } from '../../services/cloudinary.service';
import { scale, moderateScale } from '../../utils/responsive';

export default function VNPTKYCForm({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [identityFrontFile, setIdentityFrontFile] = useState(null);
  const [identityBackFile, setIdentityBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const [identityFrontPreview, setIdentityFrontPreview] = useState(null);
  const [identityBackPreview, setIdentityBackPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  const [verifying, setVerifying] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  const [formData, setFormData] = useState({
    identity_verified_name: '',
    identity_card_number: '',
    tax_code: '',
    address: {
      city: '',
      district: '',
      ward: '',
    },
    bank_account: {
      bank_name: '',
      account_number: '',
      account_holder_name: '',
    },
    kyc_documents: {
      identity_front_url: '',
      identity_back_url: '',
      selfie_url: '',
    },
  });

  // Request camera permission
  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập camera để chụp ảnh',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  // Request media library permission
  const requestMediaLibraryPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập',
          'Cần quyền truy cập thư viện ảnh để chọn ảnh',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const handleFileSelect = async (type) => {
    try {
      const hasPermission = await requestMediaLibraryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: type === 'selfie' ? [1, 1] : undefined,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        if (asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'File ảnh quá lớn (tối đa 5MB)');
          return;
        }

        if (type === 'front') {
          setIdentityFrontFile(asset);
          setIdentityFrontPreview(asset.uri);
        } else if (type === 'back') {
          setIdentityBackFile(asset);
          setIdentityBackPreview(asset.uri);
        } else {
          setSelfieFile(asset);
          setSelfiePreview(asset.uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const handleTakePhoto = async (type) => {
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        aspect: type === 'selfie' ? [1, 1] : undefined,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        if (asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Lỗi', 'File ảnh quá lớn (tối đa 5MB)');
          return;
        }

        if (type === 'front') {
          setIdentityFrontFile(asset);
          setIdentityFrontPreview(asset.uri);
        } else if (type === 'back') {
          setIdentityBackFile(asset);
          setIdentityBackPreview(asset.uri);
        } else {
          setSelfieFile(asset);
          setSelfiePreview(asset.uri);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  };

  const verifyImageQuality = async (imageUrl, type) => {
    try {
      const result = await kycService.verifyDocumentQuality(imageUrl);

      if (!result.success) {
        Alert.alert('Lỗi', `${type}: ${result.message}`);
        return false;
      }

      if (!result.is_real) {
        const livenessMsg = result.liveness_msg || 'Không phải ảnh gốc';
        Alert.alert(
          '⚠️ Cảnh báo: Ảnh chưa đạt chuẩn VNPT',
          `${type}\n\n${livenessMsg}\n\nLoại giấy tờ: ${result.card_type}\n\nVNPT phát hiện ảnh này có thể:\n- Chụp từ màn hình thiết bị khác\n- Là bản photocopy hoặc scan\n- Chụp qua lớp nhựa bảo vệ\n- Chất lượng kém\n\n✅ Gợi ý:\n- Chụp trực tiếp từ CCCD gốc\n- Tháo khỏi ví/lớp bảo vệ\n- Ánh sáng tự nhiên, không flash\n- Camera ổn định, không rung\n\n💡 Lưu ý: Bạn có thể tiếp tục nhưng KYC sẽ được admin xem xét thủ công.`,
          [{ text: 'Tôi đã hiểu, tiếp tục' }]
        );
      } else {
        Alert.alert('✅ Ảnh đạt chuẩn', `${result.message}\n\n📋 ${result.card_type}`, [
          { text: 'OK' },
        ]);
      }

      return true;
    } catch (error) {
      console.error('Lỗi kiểm tra chất lượng:', error);
      return true;
    }
  };

  const performOCR = async (frontUrl, backUrl) => {
    try {
      setVerifying(true);
      const result = await kycService.ocrDocument(frontUrl, backUrl);

      if (result.success && result.extracted_data) {
        setOcrData(result);
        setFormData((prev) => ({
          ...prev,
          identity_card_number: result.extracted_data.identity_card_number || '',
          identity_verified_name: result.extracted_data.identity_verified_name || '',
          address: {
            ...prev.address,
            city: result.extracted_data.address?.split(',').pop()?.trim() || '',
            district: '',
            ward: '',
          },
        }));

        Alert.alert(
          'Trích xuất thông tin thành công',
          `Họ tên: ${result.extracted_data.identity_verified_name}\nSố CCCD: ${result.extracted_data.identity_card_number}\nNgày sinh: ${result.extracted_data.date_of_birth || 'N/A'}\n\nĐộ tin cậy: ${(result.confidence * 100).toFixed(1)}%`,
          [{ text: 'Tiếp tục', onPress: () => setCurrentStep(3) }]
        );
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể trích xuất thông tin');
      }
    } catch (error) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Lỗi khi trích xuất thông tin');
    } finally {
      setVerifying(false);
    }
  };

  const handleStep2Submit = async () => {
    if (!identityFrontFile) {
      Alert.alert('Lỗi', 'Vui lòng chụp/tải ảnh mặt trước CCCD');
      return;
    }

    setLoading(true);

    try {
      // Upload front image
      const frontResponse = await cloudinaryService.uploadImage(identityFrontFile.uri, 'kyc');
      const frontUrl = frontResponse.secure_url;
      await verifyImageQuality(frontUrl, 'Ảnh mặt trước CCCD');

      let backUrl;
      if (identityBackFile) {
        const backResponse = await cloudinaryService.uploadImage(identityBackFile.uri, 'kyc');
        backUrl = backResponse.secure_url;
        await verifyImageQuality(backUrl, 'Ảnh mặt sau CCCD');
      }

      await performOCR(frontUrl, backUrl);

      setFormData((prev) => ({
        ...prev,
        kyc_documents: {
          ...prev.kyc_documents,
          identity_front_url: frontUrl,
          identity_back_url: backUrl || '',
        },
      }));
    } catch (error) {
      console.error('Lỗi upload:', error);
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi xử lý ảnh');
    } finally {
      setLoading(false);
    }
  };

  const handleStep3Submit = async () => {
    if (!selfieFile) {
      Alert.alert('Lỗi', 'Vui lòng chụp/tải ảnh chân dung');
      return;
    }

    setLoading(true);

    try {
      const selfieResponse = await cloudinaryService.uploadImage(selfieFile.uri, 'kyc');
      const selfieUrl = selfieResponse.secure_url;

      const compareResult = await kycService.compareFaces(
        formData.kyc_documents.identity_front_url,
        selfieUrl
      );

      if (compareResult.success) {
        if (compareResult.is_match) {
          Alert.alert(
            'Khuôn mặt khớp!',
            `${compareResult.result_text}\n\nĐộ tương đồng: ${compareResult.probability.toFixed(1)}%`
          );
        } else {
          Alert.alert(
            'Khuôn mặt không khớp',
            `${compareResult.result_text}\n\nĐộ tương đồng: ${compareResult.probability.toFixed(1)}%\n\nBạn có thể tiếp tục nhưng KYC sẽ cần được duyệt thủ công.`,
            [{ text: 'Tiếp tục' }]
          );
        }
      }

      setFormData((prev) => ({
        ...prev,
        kyc_documents: {
          ...prev.kyc_documents,
          selfie_url: selfieUrl,
        },
      }));

      setCurrentStep(4);
    } catch (error) {
      console.error('Lỗi:', error);
      Alert.alert('Lỗi', error?.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!formData.identity_verified_name || !formData.identity_card_number) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        kyc_documents: formData.kyc_documents,
        identity_card_number: formData.identity_card_number,
        identity_verified_name: formData.identity_verified_name,
        tax_code: formData.tax_code || undefined,
        address: formData.address,
        bank_account: formData.bank_account.account_number ? formData.bank_account : undefined,
      };

      const result = await kycService.submitKYCWithVNPT(payload);

      if (result.kyc?.status === 'verified') {
        Alert.alert(
          'Xác thực thành công!',
          `${result.message}\n\nTài khoản của bạn đã được xác thực tự động bởi VNPT eKYC.`,
          [
            {
              text: 'Hoàn tất',
              onPress: () => {
                if (onBack) onBack();
              },
            },
          ]
        );
      } else if (result.kyc?.status === 'pending') {
        Alert.alert(
          'Đã gửi yêu cầu',
          `${result.message}\n\nVui lòng đợi admin duyệt KYC của bạn.`,
          [
            {
              text: 'Đã hiểu',
              onPress: () => {
                if (onBack) onBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'KYC bị từ chối',
          `${result.message}\n\nLý do: ${result.kyc?.rejection_reason}\n\nBạn có thể thử lại với ảnh khác hoặc liên hệ hỗ trợ.`
        );
      }
    } catch (error) {
      Alert.alert('Lỗi', error?.response?.data?.message || 'Có lỗi xảy ra khi gửi KYC');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map((step) => (
        <View key={step} style={styles.stepIndicatorItem}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.step1Header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="shield-check" size={scale(64)} color="#3B82F6" />
        </View>
        <Text style={styles.step1Title}>Xác thực KYC với VNPT eKYC</Text>
        <Text style={styles.step1Subtitle}>
          Hệ thống tự động xác thực danh tính bằng công nghệ AI hiện đại
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <View style={styles.featureCard}>
          <MaterialCommunityIcons name="file-document" size={scale(32)} color="#3B82F6" />
          <Text style={styles.featureTitle}>Trích xuất tự động</Text>
          <Text style={styles.featureText}>OCR thông tin từ CCCD</Text>
        </View>
        <View style={styles.featureCard}>
          <MaterialCommunityIcons name="camera" size={scale(32)} color="#3B82F6" />
          <Text style={styles.featureTitle}>Xác thực khuôn mặt</Text>
          <Text style={styles.featureText}>So sánh với ảnh trên giấy tờ</Text>
        </View>
        <View style={styles.featureCard}>
          <MaterialCommunityIcons name="check-circle" size={scale(32)} color="#3B82F6" />
          <Text style={styles.featureTitle}>Duyệt nhanh</Text>
          <Text style={styles.featureText}>Tự động hoặc thủ công</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <View style={styles.infoBoxHeader}>
          <MaterialCommunityIcons name="alert-circle" size={scale(20)} color="#F59E0B" />
          <Text style={styles.infoBoxTitle}>Yêu cầu chất lượng ảnh (theo tiêu chuẩn VNPT):</Text>
        </View>
        <View style={styles.infoBoxContent}>
          <Text style={styles.infoBoxText}>• Ảnh gốc, không scan hay photocopy</Text>
          <Text style={styles.infoBoxText}>• Định dạng: JPG, JPEG, PNG (tối đa 5MB)</Text>
          <Text style={styles.infoBoxText}>• Độ phân giải tối thiểu: 600x900 pixel</Text>
          <Text style={styles.infoBoxText}>• Khuyến nghị: 1200x1800 pixel</Text>
          <Text style={styles.infoBoxText}>• Đủ 4 góc rõ ràng, không bị cắt mép</Text>
          <Text style={styles.infoBoxText}>• Không mờ nhòe, lóa sáng, tẩy xóa</Text>
        </View>
      </View>

      <View style={[styles.infoBox, styles.infoBoxBlue]}>
        <View style={styles.infoBoxHeader}>
          <MaterialCommunityIcons name="information" size={scale(20)} color="#3B82F6" />
          <Text style={styles.infoBoxTitle}>Hướng dẫn chụp ảnh CCCD:</Text>
        </View>
        <View style={styles.infoBoxContent}>
          <Text style={styles.infoBoxText}>• Đặt giấy tờ lên mặt bàn phẳng</Text>
          <Text style={styles.infoBoxText}>• Chụp từ phía trên, song song với giấy tờ</Text>
          <Text style={styles.infoBoxText}>• Đảm bảo ánh sáng đủ và đều</Text>
          <Text style={styles.infoBoxText}>• Không để ngón tay che góc hoặc thông tin</Text>
          <Text style={styles.infoBoxText}>• Không chụp lại từ màn hình điện thoại/máy tính</Text>
        </View>
      </View>

      <View style={[styles.infoBox, styles.infoBoxGreen]}>
        <View style={styles.infoBoxHeader}>
          <MaterialCommunityIcons name="camera" size={scale(20)} color="#10B981" />
          <Text style={styles.infoBoxTitle}>Hướng dẫn chụp ảnh chân dung:</Text>
        </View>
        <View style={styles.infoBoxContent}>
          <Text style={styles.infoBoxText}>• Độ phân giải tối thiểu: 480x480 pixel</Text>
          <Text style={styles.infoBoxText}>• Khuyến nghị: 720x1280 pixel</Text>
          <Text style={styles.infoBoxText}>• Chỉ có 1 người trong ảnh</Text>
          <Text style={styles.infoBoxText}>• Khuôn mặt chiếm 1/4 đến 4/5 diện tích ảnh</Text>
          <Text style={styles.infoBoxText}>• Không đeo khẩu trang, kính đen</Text>
          <Text style={styles.infoBoxText}>• Chụp ở nơi có ánh sáng tốt</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentStep(2)}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>Bắt đầu xác thực</Text>
        <MaterialCommunityIcons name="arrow-right" size={scale(20)} color="#FFFFFF" />
      </TouchableOpacity>

      {onBack && (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="arrow-left" size={scale(20)} color="#6B7280" />
          <Text style={styles.secondaryButtonText}>Quay lại</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Upload ảnh CCCD</Text>
        <Text style={styles.stepSubtitle}>
          Chụp hoặc tải lên ảnh CCCD mặt trước và mặt sau
        </Text>
      </View>

      <View style={styles.imageUploadContainer}>
        <View style={styles.imageUploadSection}>
          <Text style={styles.imageUploadLabel}>
            Mặt trước CCCD <Text style={styles.required}>*</Text>
          </Text>
          {identityFrontPreview ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: identityFrontPreview }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setIdentityFrontFile(null);
                  setIdentityFrontPreview(null);
                }}
              >
                <MaterialCommunityIcons name="close" size={scale(20)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageUploadBox}>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => handleTakePhoto('front')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="camera" size={scale(32)} color="#3B82F6" />
                <Text style={styles.imageUploadButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <Text style={styles.imageUploadOr}>hoặc</Text>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => handleFileSelect('front')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="image" size={scale(32)} color="#3B82F6" />
                <Text style={styles.imageUploadButtonText}>Chọn từ thư viện</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.imageUploadSection}>
          <Text style={styles.imageUploadLabel}>Mặt sau CCCD (tùy chọn)</Text>
          {identityBackPreview ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: identityBackPreview }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setIdentityBackFile(null);
                  setIdentityBackPreview(null);
                }}
              >
                <MaterialCommunityIcons name="close" size={scale(20)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imageUploadBox}>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => handleTakePhoto('back')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="camera" size={scale(32)} color="#3B82F6" />
                <Text style={styles.imageUploadButtonText}>Chụp ảnh</Text>
              </TouchableOpacity>
              <Text style={styles.imageUploadOr}>hoặc</Text>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={() => handleFileSelect('back')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="image" size={scale(32)} color="#3B82F6" />
                <Text style={styles.imageUploadButtonText}>Chọn từ thư viện</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentStep(1)}
          disabled={loading || verifying}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="arrow-left" size={scale(20)} color="#6B7280" />
          <Text style={styles.secondaryButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, (!identityFrontFile || loading || verifying) && styles.buttonDisabled]}
          onPress={handleStep2Submit}
          disabled={!identityFrontFile || loading || verifying}
          activeOpacity={0.8}
        >
          {verifying ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Đang xử lý...</Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Tiếp tục</Text>
              <MaterialCommunityIcons name="arrow-right" size={scale(20)} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Chụp ảnh chân dung</Text>
        <Text style={styles.stepSubtitle}>Chụp ảnh khuôn mặt của bạn để xác thực</Text>
      </View>

      {ocrData && (
        <View style={styles.ocrResultBox}>
          <View style={styles.ocrResultHeader}>
            <MaterialCommunityIcons name="check-circle" size={scale(20)} color="#10B981" />
            <Text style={styles.ocrResultTitle}>Thông tin đã trích xuất:</Text>
          </View>
          <Text style={styles.ocrResultText}>
            Họ tên: {ocrData.extracted_data.identity_verified_name}
          </Text>
          <Text style={styles.ocrResultText}>
            Số CCCD: {ocrData.extracted_data.identity_card_number}
          </Text>
          <Text style={styles.ocrResultText}>
            Ngày sinh: {ocrData.extracted_data.date_of_birth || 'N/A'}
          </Text>
          <Text style={styles.ocrResultText}>
            Giới tính: {ocrData.extracted_data.gender || 'N/A'}
          </Text>
        </View>
      )}

      <View style={styles.selfieContainer}>
        <Text style={styles.imageUploadLabel}>
          Ảnh chân dung <Text style={styles.required}>*</Text>
        </Text>
        {selfiePreview ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: selfiePreview }} style={styles.selfiePreview} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => {
                setSelfieFile(null);
                setSelfiePreview(null);
              }}
            >
              <MaterialCommunityIcons name="close" size={scale(20)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imageUploadBox}>
            <TouchableOpacity
              style={styles.imageUploadButton}
              onPress={() => handleTakePhoto('selfie')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="camera" size={scale(32)} color="#3B82F6" />
              <Text style={styles.imageUploadButtonText}>Chụp selfie</Text>
              <Text style={styles.imageUploadHint}>Khuyến nghị để có kết quả tốt nhất</Text>
            </TouchableOpacity>
            <Text style={styles.imageUploadOr}>hoặc</Text>
            <TouchableOpacity
              style={styles.imageUploadButton}
              onPress={() => handleFileSelect('selfie')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="image" size={scale(32)} color="#3B82F6" />
              <Text style={styles.imageUploadButtonText}>Tải ảnh từ thiết bị</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.selfieHint}>
          <MaterialCommunityIcons name="alert-circle" size={scale(16)} color="#6B7280" />
          <Text style={styles.selfieHintText}>
            Ảnh chân dung cần rõ mặt, không đeo kính hoặc khẩu trang. Chụp trực tiếp từ camera để đạt kết quả tốt nhất.
          </Text>
        </View>
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentStep(2)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="arrow-left" size={scale(20)} color="#6B7280" />
          <Text style={styles.secondaryButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, (!selfieFile || loading) && styles.buttonDisabled]}
          onPress={handleStep3Submit}
          disabled={!selfieFile || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Đang xử lý...</Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Tiếp tục</Text>
              <MaterialCommunityIcons name="arrow-right" size={scale(20)} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView 
      style={styles.stepContent} 
      contentContainerStyle={styles.stepContentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>Xác nhận thông tin</Text>
        <Text style={styles.stepSubtitle}>Kiểm tra và bổ sung thông tin còn thiếu</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Họ tên <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={formData.identity_verified_name}
            onChangeText={(text) =>
              setFormData({ ...formData, identity_verified_name: text })
            }
            placeholder="VD: NGUYỄN VĂN A"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Số CCCD <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            value={formData.identity_card_number}
            onChangeText={(text) =>
              setFormData({ ...formData, identity_card_number: text })
            }
            placeholder="VD: 001234567890"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mã số thuế (tùy chọn)</Text>
          <TextInput
            style={styles.textInput}
            value={formData.tax_code}
            onChangeText={(text) => setFormData({ ...formData, tax_code: text })}
            placeholder="VD: 0123456789"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.addressRow}>
          <View style={[styles.inputGroup, styles.inputGroupHalf, styles.inputGroupLeft]}>
            <Text style={styles.inputLabel}>Tỉnh/Thành phố</Text>
            <TextInput
              style={styles.textInput}
              value={formData.address.city}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, city: text },
                })
              }
              placeholder="VD: Hà Nội"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[styles.inputGroup, styles.inputGroupHalf, styles.inputGroupRight]}>
            <Text style={styles.inputLabel}>Quận/Huyện</Text>
            <TextInput
              style={styles.textInput}
              value={formData.address.district}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  address: { ...formData.address, district: text },
                })
              }
              placeholder="VD: Hoàn Kiếm"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.bankSection}>
          <Text style={styles.sectionTitle}>Thông tin ngân hàng (tùy chọn)</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên ngân hàng</Text>
            <TextInput
              style={styles.textInput}
              value={formData.bank_account.bank_name}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  bank_account: { ...formData.bank_account, bank_name: text },
                })
              }
              placeholder="VD: Vietcombank"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số tài khoản</Text>
            <TextInput
              style={styles.textInput}
              value={formData.bank_account.account_number}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  bank_account: { ...formData.bank_account, account_number: text },
                })
              }
              placeholder="VD: 0123456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên chủ tài khoản</Text>
            <TextInput
              style={styles.textInput}
              value={formData.bank_account.account_holder_name}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  bank_account: { ...formData.bank_account, account_holder_name: text },
                })
              }
              placeholder="VD: NGUYEN VAN A"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      </View>

      <View style={styles.stepButtons}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentStep(3)}
          disabled={loading}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="arrow-left" size={scale(20)} color="#6B7280" />
          <Text style={styles.secondaryButtonText}>Quay lại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (loading || !formData.identity_verified_name || !formData.identity_card_number) &&
              styles.buttonDisabled,
          ]}
          onPress={handleFinalSubmit}
          disabled={loading || !formData.identity_verified_name || !formData.identity_card_number}
          activeOpacity={0.8}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Đang gửi...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle" size={scale(20)} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Hoàn tất KYC</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderStepIndicator()}
      <View style={styles.content}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(20),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#3B82F6',
  },
  stepNumber: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: scale(64),
    height: scale(4),
    backgroundColor: '#E5E7EB',
    marginHorizontal: scale(4),
  },
  stepLineActive: {
    backgroundColor: '#3B82F6',
  },
  content: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
  },
  stepContentContainer: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    paddingBottom: scale(32),
  },
  step1Header: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  iconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  step1Title: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: scale(8),
    textAlign: 'center',
    paddingHorizontal: scale(16),
  },
  step1Subtitle: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: scale(16),
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: scale(24),
  },
  featureCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    padding: scale(12),
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: scale(12),
  },
  featureTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#111827',
    marginTop: scale(8),
    marginBottom: scale(4),
    textAlign: 'center',
  },
  featureText: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(16),
  },
  infoBoxBlue: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  infoBoxGreen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#86EFAC',
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  infoBoxTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#92400E',
    marginLeft: scale(8),
    flex: 1,
  },
  infoBoxContent: {
    marginLeft: scale(28),
  },
  infoBoxText: {
    fontSize: moderateScale(12),
    color: '#78350F',
    marginBottom: scale(4),
    lineHeight: moderateScale(18),
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: scale(24),
  },
  stepTitle: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: scale(8),
    textAlign: 'center',
    paddingHorizontal: scale(16),
  },
  stepSubtitle: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: scale(16),
  },
  imageUploadContainer: {
    marginBottom: scale(24),
  },
  imageUploadSection: {
    marginBottom: scale(24),
  },
  imageUploadLabel: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: scale(12),
  },
  required: {
    color: '#EF4444',
  },
  imageUploadBox: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: scale(12),
    padding: scale(24),
    alignItems: 'center',
  },
  imageUploadButton: {
    width: '100%',
    padding: scale(16),
    backgroundColor: '#EFF6FF',
    borderRadius: scale(12),
    alignItems: 'center',
    marginBottom: scale(12),
    minHeight: scale(80),
  },
  imageUploadButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#3B82F6',
    marginTop: scale(8),
  },
  imageUploadHint: {
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginTop: scale(4),
  },
  imageUploadOr: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginVertical: scale(8),
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: scale(200),
    resizeMode: 'contain',
    backgroundColor: '#F3F4F6',
  },
  selfiePreview: {
    width: '100%',
    height: scale(300),
    resizeMode: 'contain',
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfieContainer: {
    marginBottom: scale(24),
  },
  selfieHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: scale(12),
    padding: scale(12),
    backgroundColor: '#F3F4F6',
    borderRadius: scale(8),
  },
  selfieHintText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: '#6B7280',
    marginLeft: scale(8),
    lineHeight: moderateScale(18),
  },
  ocrResultBox: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(24),
  },
  ocrResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  ocrResultTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#065F46',
    marginLeft: scale(8),
  },
  ocrResultText: {
    fontSize: moderateScale(13),
    color: '#047857',
    marginBottom: scale(4),
  },
  formContainer: {
    marginBottom: scale(24),
  },
  inputGroup: {
    marginBottom: scale(16),
  },
  inputGroupHalf: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: scale(16),
  },
  inputGroupLeft: {
    marginRight: scale(6),
  },
  inputGroupRight: {
    marginLeft: scale(6),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: scale(8),
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: moderateScale(14),
    color: '#111827',
  },
  bankSection: {
    marginTop: scale(24),
    paddingTop: scale(24),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
    marginBottom: scale(16),
  },
  stepButtons: {
    flexDirection: 'row',
    marginTop: scale(24),
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    marginLeft: scale(6),
  },
  primaryButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: scale(8),
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    marginRight: scale(6),
  },
  secondaryButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: scale(8),
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
});

