import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { searchService } from '../../services/search.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return 'Hôm nay';
  if (isYesterday) return 'Hôm qua';

  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export default function SearchHistoryScreen() {
  const navigation = useNavigation();
  const [history, setHistory] = useState([]);
  const [groupedHistory, setGroupedHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await searchService.getAllSearchHistory();
      setHistory(data);

      const grouped = data.reduce((acc, item) => {
        const dateKey = new Date(item.searchedAt).toDateString();
        const existingGroup = acc.find((g) => g.date === dateKey);

        if (existingGroup) {
          existingGroup.items.push(item);
        } else {
          acc.push({
            date: dateKey,
            items: [item],
          });
        }

        return acc;
      }, []);

      grouped.forEach((group) => {
        group.items.sort(
          (a, b) =>
            new Date(b.searchedAt).getTime() -
            new Date(a.searchedAt).getTime()
        );
      });

      grouped.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setGroupedHistory(grouped);
    } catch (error) {
      console.error('Failed to load search history:', error);
      Alert.alert('Lỗi', 'Không thể tải lịch sử tìm kiếm. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (historyId) => {
    try {
      setDeletingId(historyId);
      await searchService.deleteSearchHistory([historyId]);
      setHistory((prev) => prev.filter((item) => item._id !== historyId));

      const updatedGrouped = groupedHistory
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item._id !== historyId),
        }))
        .filter((group) => group.items.length > 0);

      setGroupedHistory(updatedGrouped);
    } catch (error) {
      console.error('Failed to delete search history:', error);
      Alert.alert('Lỗi', 'Không thể xóa mục này. Vui lòng thử lại sau.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await searchService.deleteAllSearchHistory();
      setHistory([]);
      setGroupedHistory([]);
      setShowDeleteAllConfirm(false);
    } catch (error) {
      console.error('Failed to delete all search history:', error);
      Alert.alert('Lỗi', 'Không thể xóa tất cả lịch sử. Vui lòng thử lại sau.');
    }
  };

  const handleItemPress = (item) => {
    const query = item.type === 'hashtag' ? `#${item.keyword}` : item.keyword;
    if (navigation) {
      // Điều hướng lại về màn search với query tương ứng
      navigation.navigate('Search', { query });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Đang tải lịch sử tìm kiếm...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={24}
            color="#374151"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử tìm kiếm của bạn</Text>
        {history.length > 0 ? (
          <TouchableOpacity
            onPress={() => setShowDeleteAllConfirm(true)}
            style={styles.clearAllButton}
          >
            <Text style={styles.clearAllText}>Xóa</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.clearAllPlaceholder} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {groupedHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={48}
              color="#D1D5DB"
            />
            <Text style={styles.emptyText}>Chưa có lịch sử tìm kiếm</Text>
          </View>
        ) : (
          <FlatList
            data={groupedHistory}
            keyExtractor={(group) => group.date}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: group }) => (
              <View style={styles.groupContainer}>
                <Text style={styles.groupTitle}>{formatDate(group.date)}</Text>
                {group.items.map((historyItem) => (
                  <View
                    key={historyItem._id}
                    style={styles.historyRow}
                  >
                    <View style={styles.historyLeft}>
                      <View style={styles.historyIconWrapper}>
                        <MaterialCommunityIcons
                          name={
                            historyItem.type === 'hashtag'
                              ? 'pound'
                              : 'clock-outline'
                          }
                          size={20}
                          color="#9CA3AF"
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.historyTextWrapper}
                        onPress={() => handleItemPress(historyItem)}
                      >
                        <Text style={styles.historyMainText} numberOfLines={1}>
                          Bạn đã tìm kiếm{' '}
                          <Text style={styles.historyHighlightText}>
                            "
                            {historyItem.type === 'hashtag'
                              ? `#${historyItem.keyword}`
                              : historyItem.keyword}
                            "
                          </Text>
                        </Text>
                        <View style={styles.historyMetaRow}>
                          <MaterialCommunityIcons
                            name="lock-outline"
                            size={14}
                            color="#9CA3AF"
                          />
                          <Text style={styles.historyMetaText}>
                            Chỉ mình tôi · {formatTime(historyItem.searchedAt)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(historyItem._id)}
                      style={styles.historyDeleteButton}
                      disabled={deletingId === historyItem._id}
                    >
                      {deletingId === historyItem._id ? (
                        <ActivityIndicator size="small" color="#9CA3AF" />
                      ) : (
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={20}
                          color="#6B7280"
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          />
        )}
      </View>

      {/* Delete all confirm */}
      {showDeleteAllConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Xóa tất cả lịch sử tìm kiếm?</Text>
            <Text style={styles.modalMessage}>
              Bạn có chắc chắn muốn xóa tất cả lịch sử tìm kiếm? Hành động này
              không thể hoàn tác.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDeleteAllConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={handleDeleteAll}
              >
                <Text style={styles.modalDeleteText}>Xóa tất cả</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: moderateScale(14),
    color: '#6B7280',
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
    flex: 1,
    marginLeft: scale(8),
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
  },
  clearAllButton: {
    paddingVertical: scale(4),
    paddingHorizontal: scale(8),
  },
  clearAllText: {
    fontSize: moderateScale(13),
    color: '#2563EB',
    fontWeight: '500',
  },
  clearAllPlaceholder: {
    width: scale(32),
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(24),
  },
  groupContainer: {
    marginBottom: scale(16),
  },
  groupTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#111827',
    marginBottom: scale(8),
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    paddingHorizontal: scale(8),
    borderRadius: scale(8),
    backgroundColor: '#FFFFFF',
    marginBottom: scale(4),
  },
  historyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconWrapper: {
    width: scale(32),
    alignItems: 'center',
  },
  historyTextWrapper: {
    flex: 1,
  },
  historyMainText: {
    fontSize: moderateScale(13),
    color: '#111827',
  },
  historyHighlightText: {
    fontWeight: '600',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(4),
  },
  historyMetaText: {
    marginLeft: scale(4),
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  historyDeleteButton: {
    padding: scale(6),
    marginLeft: scale(4),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  emptyText: {
    marginTop: scale(12),
    fontSize: moderateScale(14),
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    padding: scale(20),
  },
  modalTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#111827',
    marginBottom: scale(8),
  },
  modalMessage: {
    fontSize: moderateScale(13),
    color: '#6B7280',
    marginBottom: scale(16),
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    borderRadius: scale(8),
    marginLeft: scale(8),
  },
  modalCancelButton: {
    backgroundColor: '#E5E7EB',
  },
  modalDeleteButton: {
    backgroundColor: '#EF4444',
  },
  modalCancelText: {
    fontSize: moderateScale(13),
    color: '#111827',
    fontWeight: '500',
  },
  modalDeleteText: {
    fontSize: moderateScale(13),
    color: '#FFFFFF',
    fontWeight: '500',
  },
});


