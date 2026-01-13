import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiClient from '../../services/apiClient';
import { INIT_SEPAY_PAYMENT_ROUTE } from '../../constants/api';
import { useAuth } from '../../contexts/AuthContext';
import { donationService } from '../../services/donation.service';
import { campaignCompanionService } from '../../services/campaignCompanion.service';
import { cacheService } from '../../services/cache.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function DonateScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { campaignId, companion_id } = route.params || {};
  const { user, fetchCurrentUser } = useAuth();

  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const [orderInvoiceNumber, setOrderInvoiceNumber] = useState(null);
  const [companionId, setCompanionId] = useState(companion_id || null);
  const [companionName, setCompanionName] = useState(null);
  const webViewRef = useRef(null);
  const isProcessingRef = useRef(false); // Flag to prevent multiple alerts

  useEffect(() => {
    if (!user) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để ủng hộ chiến dịch', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    }
  }, [user, navigation]);

  useEffect(() => {
    const checkCompanion = async () => {
      if (companion_id) {
        setCompanionId(companion_id);
        try {
          const companions = await campaignCompanionService.getCampaignCompanions(campaignId);
          const companion = companions.companions.find(c => c._id === companion_id);
          if (companion) {
            setCompanionName(companion.user.fullname || companion.user.username);
          }
        } catch (error) {
          console.error('Error fetching companion:', error);
        }
      } else if (user && user.role === 'user') {
        try {
          const companions = await campaignCompanionService.getCampaignCompanions(campaignId);
          const userCompanion = companions.companions.find(
            c => c.user._id === (user._id || user.id)
          );
          if (userCompanion) {
            setCompanionId(userCompanion._id);
            setCompanionName(userCompanion.user.fullname || userCompanion.user.username);
          }
        } catch (error) {
          console.error('Error checking companion:', error);
        }
      }
    };

    if (campaignId && user) {
      checkCompanion();
    }
  }, [campaignId, user, companion_id]);

  const formatAmount = (value) => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, '');
    return numericValue;
  };

  const formatDisplayAmount = (value) => {
    if (!value) return '';
    const numericValue = value.replace(/\D/g, '');
    return new Intl.NumberFormat('vi-VN').format(Number(numericValue));
  };

  const handleAmountChange = (text) => {
    const formatted = formatAmount(text);
    setAmount(formatted);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (!user) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để ủng hộ chiến dịch', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        amount: value,
        currency: 'VND',
        paymentMethod: 'BANK_TRANSFER',
        is_anonymous: false,
      };

      if (companionId) {
        payload.companion_id = companionId;
      }

      const res = await apiClient.post(INIT_SEPAY_PAYMENT_ROUTE(campaignId), payload);

      const { checkoutUrl, formFields, donation } = res.data;

      // Save order invoice number for polling donation status later
      if (donation && donation.order_invoice_number) {
        setOrderInvoiceNumber(donation.order_invoice_number);
      }

      // SePay requires POST form submission
      // Create HTML form with auto-submit for WebView
      // Escape checkoutUrl properly for HTML attribute
      const escapedCheckoutUrl = checkoutUrl
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      const formInputs = Object.entries(formFields || {})
        .map(([key, value]) => {
          // Escape HTML entities properly
          const escapedKey = String(key)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          const escapedValue = String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<input type="hidden" name="${escapedKey}" value="${escapedValue}" />`;
        })
        .join('\n');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Đang chuyển đến SePay...</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #F97E2C 0%, #FB923C 100%);
                color: white;
              }
              .loading {
                text-align: center;
              }
              .spinner {
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="loading">
              <div class="spinner"></div>
              <p>Đang chuyển đến SePay...</p>
            </div>
            <form id="paymentForm" method="POST" action="${escapedCheckoutUrl}">
              ${formInputs}
            </form>
            <script>
              // Wait for DOM to be ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', submitForm);
              } else {
                submitForm();
              }
              
              function submitForm() {
                setTimeout(function() {
                  try {
                    var form = document.getElementById('paymentForm');
                    if (form && !form.dataset.submitted) {
                      form.dataset.submitted = 'true';
                      form.submit();
                    }
                  } catch(e) {
                    console.error('Error submitting form:', e);
                  }
                }, 300);
              }
            </script>
          </body>
        </html>
      `;

      setPaymentHtml(htmlContent);
      setShowWebView(true);
    } catch (err) {
      console.error('Error initializing payment:', err);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể khởi tạo thanh toán SePay';
      setError(message);
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialCommunityIcons name="arrow-left" size={scale(24)} color="#6B7280" />
              <Text style={styles.backButtonText}>Quay lại chiến dịch</Text>
            </TouchableOpacity>

            {/* Title Section */}
            <View style={styles.titleSection}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="heart" size={scale(48)} color="#F97E2C" />
              </View>
              <Text style={styles.title}>Ủng hộ chiến dịch</Text>
              <Text style={styles.subtitle}>
                Nhập số tiền bạn muốn ủng hộ (VND)
              </Text>
              {companionId && companionName && (
                <View style={styles.companionBadge}>
                  <Text style={styles.companionBadgeText}>
                    Đang donate qua: {companionName}
                  </Text>
                </View>
              )}
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Số tiền ủng hộ</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 500000"
                    value={formatDisplayAmount(amount)}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                    editable={!loading}
                  />
                  <Text style={styles.currencyText}>VND</Text>
                </View>
                {amount && (
                  <Text style={styles.amountHint}>
                    {new Intl.NumberFormat('vi-VN').format(Number(amount))} VND
                  </Text>
                )}
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={moderateScale(20)} color="#EF4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading || !amount || Number(amount) <= 0}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Đang chuyển đến SePay...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Xác nhận ủng hộ</Text>
                )}
              </TouchableOpacity>

              {/* Info */}
              <View style={styles.infoContainer}>
                <MaterialCommunityIcons name="information" size={moderateScale(16)} color="#6B7280" />
                <Text style={styles.infoText}>
                  Thanh toán sẽ được chuyển hướng đến SePay. Sau khi thanh toán thành công, bạn sẽ được chuyển về ứng dụng.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* WebView Modal for SePay Payment */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => {
          Alert.alert(
            'Hủy thanh toán?',
            'Bạn có chắc muốn hủy thanh toán?',
            [
              { text: 'Tiếp tục', style: 'cancel' },
              {
                text: 'Hủy',
                style: 'destructive',
                onPress: () => {
                  setShowWebView(false);
                  setPaymentHtml('');
                },
              },
            ]
          );
        }}
      >
        <SafeAreaView style={styles.webViewContainer} edges={['top', 'bottom']}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Hủy thanh toán?',
                  'Bạn có chắc muốn hủy thanh toán?',
                  [
                    { text: 'Tiếp tục', style: 'cancel' },
                    {
                      text: 'Hủy',
                      style: 'destructive',
                      onPress: () => {
                        setShowWebView(false);
                        setPaymentHtml('');
                      },
                    },
                  ]
                );
              }}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons name="close" size={scale(24)} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>Thanh toán SePay</Text>
            <View style={styles.placeholder} />
          </View>
          <WebView
            ref={webViewRef}
            source={{ html: paymentHtml }}
            style={styles.webView}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            onLoadEnd={() => {
              // Ensure form submits after WebView is fully loaded
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  (function() {
                    try {
                      var form = document.getElementById('paymentForm');
                      if (form && !form.dataset.submitted) {
                        form.dataset.submitted = 'true';
                        setTimeout(function() {
                          form.submit();
                        }, 200);
                      }
                    } catch(e) {
                      console.error('Error submitting form:', e);
                    }
                  })();
                  true; // note: this is required, or you'll sometimes get silent failures
                `);
              }
            }}
            onNavigationStateChange={async (navState) => {
              // Prevent multiple processing
              if (isProcessingRef.current) return;
              
              // Check if navigation is to success/error/cancel URLs
              const url = navState.url || '';
              
              // Detect redirect to server callback URLs
              if (url.includes('/api/donations/sepay/success') || url.includes('/api/donations/sepay/error') || url.includes('/api/donations/sepay/cancel')) {
                isProcessingRef.current = true;
                // Server is processing the payment, wait a bit then check donation status
                const isSuccess = url.includes('/sepay/success');
                const isError = url.includes('/sepay/error');
                const isCancel = url.includes('/sepay/cancel');
                
                // Wait for server to process (server redirects to frontend)
                setTimeout(async () => {
                  // Poll donation status if we have order invoice number
                  if (orderInvoiceNumber) {
                    try {
                      // Clear cache to force fresh fetch
                      cacheService.delete(`donations:${campaignId}`);
                      cacheService.delete(`campaign:${campaignId}`);
                      
                      // Poll with retry logic
                      let donation = null;
                      let retries = 0;
                      const maxRetries = 5;
                      
                      while (retries < maxRetries) {
                        // Wait before each retry (exponential backoff)
                        if (retries > 0) {
                          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                        }
                        
                        // Clear cache before each fetch
                        cacheService.delete(`donations:${campaignId}`);
                        
                        // Get donations for this campaign and find the one with matching order_invoice_number
                        const donations = await donationService.getDonationsByCampaign(campaignId);
                        donation = donations.find(d => d.order_invoice_number === orderInvoiceNumber);
                        
                        // If found donation and it's completed, exit loop
                        if (donation && donation.payment_status === 'completed') {
                          break; // Found completed donation, exit loop
                        }
                        
                        // If found donation but not completed yet, continue retrying
                        // If not found, also continue retrying
                        retries++;
                      }
                      
                      if (donation) {
                        setShowWebView(false);
                        setPaymentHtml('');
                        setOrderInvoiceNumber(null);
                        
                        if (donation && donation.payment_status === 'completed') {
                          // Clear all related caches
                          cacheService.delete(`donations:${campaignId}`);
                          cacheService.delete(`campaign:${campaignId}`);
                          cacheService.invalidatePattern(`campaigns.*`);
                          
                          // Refresh user data to update balance
                          try {
                            await fetchCurrentUser();
                          } catch (error) {
                            console.error('Error refreshing user data:', error);
                          }
                          
                          Alert.alert(
                            'Thành công',
                            'Thanh toán đã được xử lý thành công. Cảm ơn bạn đã ủng hộ!',
                            [
                              {
                                text: 'OK',
                                onPress: () => {
                                  isProcessingRef.current = false;
                                  navigation.goBack();
                                },
                              },
                            ]
                          );
                        } else if (donation.payment_status === 'failed') {
                          Alert.alert(
                            'Lỗi thanh toán',
                            'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
                            [
                              {
                                text: 'OK',
                                onPress: () => {
                                  // Stay on screen to retry
                                },
                              },
                            ]
                          );
                        } else if (donation.payment_status === 'cancelled') {
                          Alert.alert(
                            'Đã hủy',
                            'Bạn đã hủy thanh toán.',
                            [
                              {
                                text: 'OK',
                                onPress: () => {
                                  // Stay on screen
                                },
                              },
                            ]
                          );
                        } else {
                          // Still pending, show appropriate message based on redirect URL
                          if (isSuccess) {
                            Alert.alert(
                              'Đang xử lý',
                              'Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                              [
                                {
                                  text: 'OK',
                                  onPress: () => navigation.goBack(),
                                },
                              ]
                            );
                          } else if (isError) {
                            Alert.alert(
                              'Lỗi thanh toán',
                              'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
                              [
                                {
                                  text: 'OK',
                                  onPress: () => {
                                    isProcessingRef.current = false;
                                    // Stay on screen to retry
                                  },
                                },
                              ]
                            );
                          } else {
                            Alert.alert(
                              'Đã hủy',
                              'Bạn đã hủy thanh toán.',
                              [
                                {
                                  text: 'OK',
                                  onPress: () => {
                                    isProcessingRef.current = false;
                                    // Stay on screen
                                  },
                                },
                              ]
                            );
                          }
                        }
                      } else {
                        // Donation not found yet, show message based on redirect URL
                        setShowWebView(false);
                        setPaymentHtml('');
                        setOrderInvoiceNumber(null);
                        
                        if (isSuccess) {
                          Alert.alert(
                            'Đang xử lý',
                            'Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                            [
                              {
                                text: 'OK',
                                onPress: () => {
                                  isProcessingRef.current = false;
                                  navigation.goBack();
                                },
                              },
                            ]
                          );
                        } else if (isError) {
                          Alert.alert(
                            'Lỗi thanh toán',
                            'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
                            [
                              {
                                text: 'OK',
                                onPress: () => {
                                  isProcessingRef.current = false;
                                  // Stay on screen to retry
                                },
                              },
                            ]
                          );
                        } else {
                          Alert.alert(
                            'Đã hủy',
                            'Bạn đã hủy thanh toán.',
                            [
                              {
                                text: 'OK',
                                onPress: () => {
                                  isProcessingRef.current = false;
                                  // Stay on screen
                                },
                              },
                            ]
                          );
                        }
                      }
                    } catch (pollError) {
                      console.error('Error polling donation status:', pollError);
                      // Fallback to showing message based on redirect URL
                      setShowWebView(false);
                      setPaymentHtml('');
                      setOrderInvoiceNumber(null);
                      
                      if (isSuccess) {
                        Alert.alert(
                          'Đang xử lý',
                          'Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                isProcessingRef.current = false;
                                navigation.goBack();
                              },
                            },
                          ]
                        );
                      } else {
                        isProcessingRef.current = false;
                      }
                    }
                  } else {
                    // No order invoice number, just close and show message
                    setShowWebView(false);
                    setPaymentHtml('');
                    
                    if (isSuccess) {
                      Alert.alert(
                        'Đang xử lý',
                        'Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              isProcessingRef.current = false;
                              navigation.goBack();
                            },
                          },
                        ]
                      );
                    } else if (isError) {
                      Alert.alert(
                        'Lỗi thanh toán',
                        'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              isProcessingRef.current = false;
                              // Stay on screen to retry
                            },
                          },
                        ]
                      );
                    } else {
                      Alert.alert(
                        'Đã hủy',
                        'Bạn đã hủy thanh toán.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              isProcessingRef.current = false;
                              // Stay on screen
                            },
                          },
                        ]
                      );
                    }
                  }
                }, 2000); // Wait 2 seconds for server to process
                return; // Exit early to prevent duplicate processing
              }
              
              // Also detect frontend redirect URLs (server redirects to frontend with donation query param)
              if ((url.includes('donation=success') || url.includes('donation=error') || url.includes('donation=cancelled')) && !isProcessingRef.current) {
                isProcessingRef.current = true;
                // Poll donation status when redirecting to frontend
                if (orderInvoiceNumber) {
                  setTimeout(async () => {
                    try {
                      // Clear cache to force fresh fetch
                      cacheService.delete(`donations:${campaignId}`);
                      cacheService.delete(`campaign:${campaignId}`);
                      
                      // Poll with retry logic
                      let donation = null;
                      let retries = 0;
                      const maxRetries = 5;
                      
                      while (retries < maxRetries) {
                        // Wait before each retry (exponential backoff)
                        if (retries > 0) {
                          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                        }
                        
                        // Clear cache before each fetch
                        cacheService.delete(`donations:${campaignId}`);
                        
                        // Get donations for this campaign and find the one with matching order_invoice_number
                        const donations = await donationService.getDonationsByCampaign(campaignId);
                        donation = donations.find(d => d.order_invoice_number === orderInvoiceNumber);
                        
                        // If found donation and it's completed, exit loop
                        if (donation && donation.payment_status === 'completed') {
                          break; // Found completed donation, exit loop
                        }
                        
                        // If found donation but not completed yet, continue retrying
                        // If not found, also continue retrying
                        retries++;
                      }
                      
                      setShowWebView(false);
                      setPaymentHtml('');
                      setOrderInvoiceNumber(null);
                      
                      if (donation && donation.payment_status === 'completed') {
                        // Clear all related caches
                        cacheService.delete(`donations:${campaignId}`);
                        cacheService.delete(`campaign:${campaignId}`);
                        cacheService.invalidatePattern(`campaigns.*`);
                        
                        // Refresh user data to update balance
                        try {
                          await fetchCurrentUser();
                        } catch (error) {
                          console.error('Error refreshing user data:', error);
                        }
                        
                        Alert.alert(
                          'Thành công',
                          'Thanh toán đã được xử lý thành công. Cảm ơn bạn đã ủng hộ!',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                isProcessingRef.current = false;
                                navigation.goBack();
                              },
                            },
                          ]
                        );
                      } else if (url.includes('donation=success')) {
                        Alert.alert(
                          'Đang xử lý',
                          'Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                isProcessingRef.current = false;
                                navigation.goBack();
                              },
                            },
                          ]
                        );
                      } else if (url.includes('donation=error')) {
                        Alert.alert(
                          'Lỗi thanh toán',
                          'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                isProcessingRef.current = false;
                                // Stay on screen to retry
                              },
                            },
                          ]
                        );
                      } else {
                        Alert.alert(
                          'Đã hủy',
                          'Bạn đã hủy thanh toán.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                isProcessingRef.current = false;
                                // Stay on screen
                              },
                            },
                          ]
                        );
                      }
                    } catch (pollError) {
                      console.error('Error polling donation status:', pollError);
                      setShowWebView(false);
                      setPaymentHtml('');
                      setOrderInvoiceNumber(null);
                      
                      if (url.includes('donation=success')) {
                        Alert.alert(
                          'Đang xử lý',
                          'Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                isProcessingRef.current = false;
                                navigation.goBack();
                              },
                            },
                          ]
                        );
                      } else {
                        isProcessingRef.current = false;
                      }
                    }
                  }, 2000);
                } else {
                  setShowWebView(false);
                  setPaymentHtml('');
                  
                  if (url.includes('donation=success')) {
                    Alert.alert(
                      'Đang xử lý',
                      'Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau vài phút.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            isProcessingRef.current = false;
                            navigation.goBack();
                          },
                        },
                      ]
                    );
                  } else if (url.includes('donation=error')) {
                    Alert.alert(
                      'Lỗi thanh toán',
                      'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            isProcessingRef.current = false;
                            // Stay on screen to retry
                          },
                        },
                      ]
                    );
                  } else {
                    Alert.alert(
                      'Đã hủy',
                      'Bạn đã hủy thanh toán.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            isProcessingRef.current = false;
                            // Stay on screen
                          },
                        },
                      ]
                    );
                  }
                }
              }
            }}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error: ', nativeEvent);
              
              // Check if it's a network error
              if (nativeEvent.code === -1004 || nativeEvent.description?.includes('kết nối')) {
                Alert.alert(
                  'Lỗi kết nối',
                  'Không thể kết nối đến SePay. Vui lòng kiểm tra kết nối mạng và thử lại.',
                  [
                    {
                      text: 'Đóng',
                      onPress: () => {
                        setShowWebView(false);
                        setPaymentHtml('');
                        setOrderInvoiceNumber(null);
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  'Lỗi',
                  'Không thể tải trang thanh toán. Vui lòng thử lại.',
                  [
                    {
                      text: 'Đóng',
                      onPress: () => {
                        setShowWebView(false);
                        setPaymentHtml('');
                        setOrderInvoiceNumber(null);
                      },
                    },
                  ]
                );
              }
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error: ', nativeEvent);
              
              // HTTP errors (4xx, 5xx) - might be server issue
              if (nativeEvent.statusCode >= 500) {
                Alert.alert(
                  'Lỗi server',
                  'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
                  [
                    {
                      text: 'Đóng',
                      onPress: () => {
                        setShowWebView(false);
                        setPaymentHtml('');
                        setOrderInvoiceNumber(null);
                      },
                    },
                  ]
                );
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        </SafeAreaView>
      </Modal>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: scale(20),
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(24),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(24),
  },
  backButtonText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginLeft: scale(8),
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: scale(32),
  },
  iconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: scale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  companionBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    marginTop: scale(8),
  },
  companionBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#2563EB',
    textAlign: 'center',
  },
  form: {
    gap: scale(20),
  },
  inputContainer: {
    marginBottom: scale(8),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: scale(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#1F2937',
    paddingVertical: scale(14),
  },
  currencyText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: scale(8),
  },
  amountHint: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    marginTop: scale(8),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: scale(12),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: moderateScale(14),
    color: '#EF4444',
    marginLeft: scale(8),
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#F97E2C',
    paddingVertical: scale(16),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97E2C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  submitButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: scale(12),
    borderRadius: scale(8),
    gap: scale(8),
  },
  infoText: {
    flex: 1,
    fontSize: moderateScale(12),
    color: '#6B7280',
    lineHeight: moderateScale(18),
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: scale(8),
  },
  webViewTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: scale(40),
  },
  webView: {
    flex: 1,
  },
});

