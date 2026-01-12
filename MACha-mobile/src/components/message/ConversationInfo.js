import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function ConversationInfo({ conversation, conversationId, onClose }) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const currentUserId = user?._id || user?.id;
  const currentConversationId = conversation?._id || conversationId;
  const otherParticipant = conversation?.members.find(
    (member) => member._id !== currentUserId
  );

  if (!otherParticipant) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Không có thông tin</Text>
      </View>
    );
  }

  const handleViewProfile = () => {
    if (otherParticipant._id) {
      navigation.navigate('Profile', { userId: otherParticipant._id });
      if (onClose) onClose();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Thông tin cuộc trò chuyện</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {otherParticipant.avatar ? (
              <Image source={{ uri: otherParticipant.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {otherParticipant.fullname?.charAt(0).toUpperCase() ||
                    otherParticipant.username?.charAt(0).toUpperCase() ||
                    'U'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>
            {otherParticipant.fullname || otherParticipant.username || 'Người dùng'}
          </Text>
          <Text style={styles.username}>@{otherParticipant.username}</Text>
          <Text style={styles.status}>Offline</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewProfile}
          >
            <View style={styles.actionIconContainer}>
              <MaterialCommunityIcons name="account" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionText}>Trang cá nhân</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(32),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: scale(4),
    marginRight: scale(8),
  },
  headerTitle: {
    flex: 1,
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: scale(24),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    marginBottom: scale(16),
  },
  avatar: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
  },
  avatarPlaceholder: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: moderateScale(36),
    fontWeight: '600',
    color: '#6B7280',
  },
  name: {
    fontSize: moderateScale(20),
    fontWeight: '600',
    color: '#111827',
    marginBottom: scale(4),
  },
  username: {
    fontSize: moderateScale(14),
    color: '#6B7280',
    marginBottom: scale(8),
  },
  status: {
    fontSize: moderateScale(12),
    color: '#9CA3AF',
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    backgroundColor: '#F3F4F6',
    borderRadius: scale(12),
  },
  actionsSection: {
    padding: scale(16),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    backgroundColor: '#F3F4F6',
    borderRadius: scale(12),
    marginBottom: scale(12),
  },
  actionIconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  actionText: {
    fontSize: moderateScale(16),
    fontWeight: '500',
    color: '#111827',
  },
});

