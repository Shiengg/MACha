import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { recoveryService } from '../../services/recovery.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

function formatCurrencyVND(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusColor(status) {
  const colorMap = {
    pending: { bg: '#FEF3C7', text: '#92400E' },
    in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
    completed: { bg: '#D1FAE5', text: '#065F46' },
    failed: { bg: '#FEE2E2', text: '#991B1B' },
    legal_action: { bg: '#E9D5FF', text: '#6B21A8' },
  };
  return colorMap[status] || { bg: '#F3F4F6', text: '#374151' };
}

function formatStatus(status) {
  const statusMap = {
    pending: 'Chờ thanh toán',
    in_progress: 'Đang xử lý',
    completed: 'Đã hoàn thành',
    failed: 'Thất bại',
    legal_action: 'Hành động pháp lý',
  };
  return statusMap[status] || status;
}

function getDaysRemaining(deadline) {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function RecoveryCasesScreen() {
  const navigation = useNavigation();
  const [recoveryCases, setRecoveryCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentHtml, setPaymentHtml] = useState('');
  const webViewRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      fetchRecoveryCases();
    }, [])
  );

  const fetchRecoveryCases = async () => {
    try {
      setLoading(true);
      const data = await recoveryService.getRecoveryCasesByCreator();
      setRecoveryCases(data.recoveryCases || []);
    } catch (error) {
      console.error('Error fetching recovery cases:', error);
      Alert.alert(
        'Lỗi',
        error?.response?.data?.message || error?.message || 'Không thể tải danh sách recovery cases'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (recoveryCase) => {
    try {
      const data = await recoveryService.getRecoveryCaseById(recoveryCase._id);
      setSelectedCase(data.recoveryCase);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching recovery case details:', error);
      Alert.alert(
        'Lỗi',
        error?.response?.data?.message || error?.message || 'Không thể tải chi tiết recovery case'
      );
    }
  };

  const handlePayment = async (recoveryCase) => {
    const remainingAmount = recoveryCase.total_amount - recoveryCase.recovered_amount;

    Alert.alert(
      'Xác nhận thanh toán',
      `Bạn sẽ thanh toán số tiền còn lại:\n${formatCurrencyVND(remainingAmount)}\n\nCampaign: ${recoveryCase.campaign?.title || 'N/A'}\nTổng số tiền cần hoàn: ${formatCurrencyVND(recoveryCase.total_amount)}\nĐã hoàn: ${formatCurrencyVND(recoveryCase.recovered_amount)}\nCòn lại cần thanh toán: ${formatCurrencyVND(remainingAmount)}`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xác nhận và chuyển đến SePay',
          onPress: async () => {
            try {
              setIsProcessing(true);
              const paymentData = await recoveryService.initSepayRecoveryPayment(
                recoveryCase._id,
                'BANK_TRANSFER'
              );

              // Create HTML form for SePay payment
              const formFields = paymentData.formFields || {};
              let formInputs = '';
              Object.entries(formFields).forEach(([key, value]) => {
                formInputs += `<input type="hidden" name="${key}" value="${value}" />`;
              });

              const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body>
                    <form id="sepayForm" method="POST" action="${paymentData.checkoutUrl}">
                      ${formInputs}
                    </form>
                    <script>
                      document.getElementById('sepayForm').submit();
                    </script>
                  </body>
                </html>
              `;

              setPaymentHtml(html);
              setShowWebView(true);
            } catch (error) {
              console.error('Error initializing payment:', error);
              const errorMessage =
                error?.response?.data?.message || error?.message || 'Không thể khởi tạo thanh toán';
              Alert.alert('Lỗi', errorMessage);
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleWebViewNavigation = (navState) => {
    const url = navState.url || '';

    // Detect redirect to server callback URLs
    if (
      url.includes('/api/recovery/') &&
      (url.includes('/sepay/success') || url.includes('/sepay/error') || url.includes('/sepay/cancel'))
    ) {
      const isSuccess = url.includes('/sepay/success');
      const isError = url.includes('/sepay/error');
      const isCancel = url.includes('/sepay/cancel');

      setShowWebView(false);
      setIsProcessing(false);

      if (isSuccess) {
        Alert.alert(
          'Thanh toán thành công!',
          'Thanh toán của bạn đã được ghi nhận. Chúng tôi sẽ xử lý và hoàn tiền cho người quyên góp.',
          [
            {
              text: 'OK',
              onPress: () => {
                fetchRecoveryCases();
              },
            },
          ]
        );
      } else if (isError) {
        Alert.alert('Thanh toán thất bại', 'Có lỗi xảy ra trong quá trình thanh toán.');
      } else if (isCancel) {
        Alert.alert('Thanh toán đã hủy', 'Bạn đã hủy quá trình thanh toán.');
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Các trường hợp hoàn tiền</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A855F7" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Các trường hợp hoàn tiền</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            Quản lý các trường hợp cần hoàn tiền từ các campaign đã bị hủy
          </Text>
        </View>

        {recoveryCases.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="trending-down" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>Chưa có trường hợp nào</Text>
            <Text style={styles.emptyStateText}>Bạn chưa có campaign nào cần hoàn tiền</Text>
          </View>
        ) : (
          <View style={styles.casesList}>
            {recoveryCases.map((recoveryCase) => {
              const remainingAmount = recoveryCase.total_amount - recoveryCase.recovered_amount;
              const progressPercentage =
                (recoveryCase.recovered_amount / recoveryCase.total_amount) * 100;
              const daysRemaining = getDaysRemaining(recoveryCase.deadline);
              const isOverdue = daysRemaining < 0;
              const statusColors = getStatusColor(recoveryCase.status);

              return (
                <View key={recoveryCase._id} style={styles.caseCard}>
                  <View style={styles.caseHeader}>
                    <View style={styles.caseIconContainer}>
                      <MaterialCommunityIcons name="trending-down" size={24} color="#F97316" />
                    </View>
                    <View style={styles.caseHeaderContent}>
                      <View style={styles.caseTitleRow}>
                        <Text style={styles.caseTitle}>
                          {recoveryCase.campaign?.title || 'N/A'}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate('CampaignDetail', {
                              campaignId: recoveryCase.campaign._id,
                            })
                          }
                        >
                          <MaterialCommunityIcons name="open-in-new" size={16} color="#A855F7" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.caseDeadline}>
                        Deadline: {formatDate(recoveryCase.deadline)}
                        {isOverdue && (
                          <Text style={styles.overdueText}>
                            {' '}
                            (Quá hạn {Math.abs(daysRemaining)} ngày)
                          </Text>
                        )}
                        {!isOverdue && daysRemaining > 0 && (
                          <Text style={styles.daysRemainingText}>
                            {' '}
                            (Còn {daysRemaining} ngày)
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Tiến độ hoàn tiền</Text>
                      <Text style={styles.progressAmount}>
                        {formatCurrencyVND(recoveryCase.recovered_amount)} /{' '}
                        {formatCurrencyVND(recoveryCase.total_amount)}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${progressPercentage}%` }]}
                      />
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Tổng số tiền</Text>
                      <Text style={styles.statValue}>
                        {formatCurrencyVND(recoveryCase.total_amount)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Đã hoàn</Text>
                      <Text style={[styles.statValue, styles.statValueGreen]}>
                        {formatCurrencyVND(recoveryCase.recovered_amount)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Còn lại</Text>
                      <Text style={[styles.statValue, styles.statValueOrange]}>
                        {formatCurrencyVND(remainingAmount)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Trạng thái</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.bg },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                          {formatStatus(recoveryCase.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.caseActions}>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() => handleViewDetails(recoveryCase)}
                    >
                      <Text style={styles.detailsButtonText}>Chi tiết</Text>
                    </TouchableOpacity>
                    {recoveryCase.status !== 'completed' && remainingAmount > 0 && (
                      <TouchableOpacity
                        style={[styles.paymentButton, isProcessing && styles.paymentButtonDisabled]}
                        onPress={() => handlePayment(recoveryCase)}
                        disabled={isProcessing}
                      >
                        <MaterialCommunityIcons name="wallet" size={16} color="#FFFFFF" />
                        <Text style={styles.paymentButtonText}>Thanh toán</Text>
                      </TouchableOpacity>
                    )}
                    {recoveryCase.status === 'completed' && (
                      <View style={styles.completedBadge}>
                        <MaterialCommunityIcons name="check-circle" size={16} color="#065F46" />
                        <Text style={styles.completedText}>Đã hoàn thành</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedCase(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết recovery case</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedCase(null);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedCase && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Campaign</Text>
                    <View style={styles.modalSectionRow}>
                      <Text style={styles.modalSectionValue}>
                        {selectedCase.campaign?.title || 'N/A'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setShowDetailsModal(false);
                          navigation.navigate('CampaignDetail', {
                            campaignId: selectedCase.campaign._id,
                          });
                        }}
                      >
                        <MaterialCommunityIcons name="open-in-new" size={16} color="#A855F7" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.modalStatsGrid}>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatLabel}>Tổng số tiền</Text>
                      <Text style={styles.modalStatValue}>
                        {formatCurrencyVND(selectedCase.total_amount)}
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatLabel}>Đã hoàn</Text>
                      <Text style={[styles.modalStatValue, styles.modalStatValueGreen]}>
                        {formatCurrencyVND(selectedCase.recovered_amount)}
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatLabel}>Còn lại</Text>
                      <Text style={[styles.modalStatValue, styles.modalStatValueOrange]}>
                        {formatCurrencyVND(
                          selectedCase.total_amount - selectedCase.recovered_amount
                        )}
                      </Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatLabel}>Trạng thái</Text>
                      <View
                        style={[
                          styles.modalStatusBadge,
                          { backgroundColor: getStatusColor(selectedCase.status).bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.modalStatusText,
                            { color: getStatusColor(selectedCase.status).text },
                          ]}
                        >
                          {formatStatus(selectedCase.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Deadline</Text>
                    <View style={styles.modalSectionRow}>
                      <MaterialCommunityIcons name="calendar" size={16} color="#9CA3AF" />
                      <Text style={styles.modalSectionValue}>
                        {formatDate(selectedCase.deadline)}
                      </Text>
                      {getDaysRemaining(selectedCase.deadline) < 0 && (
                        <Text style={styles.overdueText}>
                          {' '}
                          (Quá hạn {Math.abs(getDaysRemaining(selectedCase.deadline))} ngày)
                        </Text>
                      )}
                    </View>
                  </View>

                  {selectedCase.notes && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Ghi chú</Text>
                      <Text style={styles.modalNotes}>{selectedCase.notes}</Text>
                    </View>
                  )}

                  {selectedCase.timeline && selectedCase.timeline.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Lịch sử</Text>
                      <View style={styles.timelineContainer}>
                        {selectedCase.timeline.map((item, index) => (
                          <View key={index} style={styles.timelineItem}>
                            <View style={styles.timelineIcon}>
                              <MaterialCommunityIcons name="clock" size={16} color="#A855F7" />
                            </View>
                            <View style={styles.timelineContent}>
                              <View style={styles.timelineHeader}>
                                <Text style={styles.timelineAction}>{item.action}</Text>
                                <Text style={styles.timelineDate}>{formatDateTime(item.date)}</Text>
                              </View>
                              {item.amount !== 0 && (
                                <Text style={styles.timelineAmount}>
                                  Số tiền: <Text style={styles.timelineAmountBold}>
                                    {formatCurrencyVND(item.amount)}
                                  </Text>
                                </Text>
                              )}
                              {item.notes && (
                                <Text style={styles.timelineNotes}>{item.notes}</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedCase(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>Đóng</Text>
              </TouchableOpacity>
              {selectedCase &&
                selectedCase.status !== 'completed' &&
                selectedCase.total_amount - selectedCase.recovered_amount > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.modalPaymentButton,
                      isProcessing && styles.modalPaymentButtonDisabled,
                    ]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      handlePayment(selectedCase);
                    }}
                    disabled={isProcessing}
                  >
                    <MaterialCommunityIcons name="wallet" size={16} color="#FFFFFF" />
                    <Text style={styles.modalPaymentButtonText}>Thanh toán</Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        onRequestClose={() => {
          setShowWebView(false);
          setIsProcessing(false);
        }}
      >
        <SafeAreaView style={styles.webViewContainer} edges={['top']}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Thanh toán SePay</Text>
            <TouchableOpacity
              onPress={() => {
                setShowWebView(false);
                setIsProcessing(false);
              }}
            >
              <MaterialCommunityIcons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          <WebView
            ref={webViewRef}
            source={{ html: paymentHtml }}
            onNavigationStateChange={handleWebViewNavigation}
            style={styles.webView}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: scale(4),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  headerPlaceholder: {
    width: scale(32),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: moderateScale(16),
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },
  descriptionContainer: {
    marginBottom: scale(16),
  },
  descriptionText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(64),
    paddingHorizontal: scale(32),
  },
  emptyStateTitle: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#111827',
    marginTop: scale(16),
    marginBottom: scale(8),
  },
  emptyStateText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  casesList: {
    gap: scale(16),
  },
  caseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  caseHeader: {
    flexDirection: 'row',
    marginBottom: scale(16),
  },
  caseIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  caseHeaderContent: {
    flex: 1,
  },
  caseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  caseTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  caseDeadline: {
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  overdueText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  daysRemainingText: {
    color: '#F97316',
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: scale(16),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  progressLabel: {
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  progressAmount: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#111827',
  },
  progressBar: {
    width: '100%',
    height: scale(12),
    backgroundColor: '#E5E7EB',
    borderRadius: scale(6),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: scale(6),
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(16),
    marginBottom: scale(16),
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: '#6B7280',
    marginBottom: scale(4),
  },
  statValue: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#111827',
  },
  statValueGreen: {
    color: '#10B981',
  },
  statValueOrange: {
    color: '#F97316',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  statusText: {
    fontSize: moderateScale(11),
    fontWeight: '500',
  },
  caseActions: {
    flexDirection: 'row',
    gap: scale(12),
    alignItems: 'center',
  },
  detailsButton: {
    flex: 1,
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    backgroundColor: '#F3F4F6',
    borderRadius: scale(8),
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
  },
  paymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    backgroundColor: '#10B981',
    borderRadius: scale(8),
  },
  paymentButtonDisabled: {
    opacity: 0.5,
  },
  paymentButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#FFFFFF',
  },
  completedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    backgroundColor: '#D1FAE5',
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: '#10B981',
  },
  completedText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#065F46',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: scale(20),
  },
  modalSection: {
    marginBottom: scale(24),
  },
  modalSectionTitle: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: scale(8),
  },
  modalSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  modalSectionValue: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(16),
    marginBottom: scale(24),
  },
  modalStatItem: {
    flex: 1,
    minWidth: '45%',
  },
  modalStatLabel: {
    fontSize: moderateScale(12),
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: scale(8),
  },
  modalStatValue: {
    fontSize: moderateScale(20),
    fontWeight: 'bold',
    color: '#111827',
  },
  modalStatValueGreen: {
    color: '#10B981',
  },
  modalStatValueOrange: {
    color: '#F97316',
  },
  modalStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(12),
  },
  modalStatusText: {
    fontSize: moderateScale(12),
    fontWeight: '500',
  },
  modalNotes: {
    fontSize: moderateScale(14),
    color: '#111827',
    backgroundColor: '#F9FAFB',
    padding: scale(16),
    borderRadius: scale(8),
  },
  timelineContainer: {
    gap: scale(12),
  },
  timelineItem: {
    flexDirection: 'row',
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timelineIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scale(4),
  },
  timelineAction: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#111827',
  },
  timelineDate: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  timelineAmount: {
    fontSize: moderateScale(13),
    color: '#6B7280',
    marginBottom: scale(4),
  },
  timelineAmountBold: {
    fontWeight: '600',
  },
  timelineNotes: {
    fontSize: moderateScale(13),
    color: '#6B7280',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: scale(12),
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalCloseButton: {
    flex: 1,
    paddingVertical: scale(12),
    backgroundColor: '#F3F4F6',
    borderRadius: scale(8),
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#374151',
  },
  modalPaymentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
    backgroundColor: '#10B981',
    borderRadius: scale(8),
  },
  modalPaymentButtonDisabled: {
    opacity: 0.5,
  },
  modalPaymentButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: '#FFFFFF',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webViewTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  webView: {
    flex: 1,
  },
});

