import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { logout, user } = useAuth();

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleViewAdmins = () => {
    // Navigate to admins list screen or show modal
    // TODO: Create AdminList screen
    Alert.alert(
      'Đội ngũ Admin',
      'Tính năng xem danh sách admin sẽ được triển khai sớm',
      [{ text: 'OK' }]
    );
    // navigation.navigate('AdminList');
  };

  const handleTerms = () => {
    navigation.navigate('Terms');
  };

  const handleRecoveryCases = () => {
    navigation.navigate('RecoveryCases');
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất không?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert(
                'Lỗi',
                'Không thể đăng xuất. Vui lòng thử lại.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      id: 'changePassword',
      icon: 'lock-outline',
      title: 'Đổi mật khẩu',
      subtitle: 'Tăng cường bảo mật cho tài khoản của bạn',
      onPress: handleChangePassword,
      color: '#3B82F6',
    },
    {
      id: 'admins',
      icon: 'account-group-outline',
      title: 'Đội ngũ Admin',
      subtitle: 'Xem danh sách quản trị viên của nền tảng',
      onPress: handleViewAdmins,
      color: '#10B981',
    },
    {
      id: 'terms',
      icon: 'file-document-outline',
      title: 'Điều khoản',
      subtitle: 'Điều khoản và chính sách sử dụng dịch vụ',
      onPress: handleTerms,
      color: '#6B7280',
    },
    ...(user?.role === 'org' || user?.role === 'user' ? [{
      id: 'recoveryCases',
      icon: 'trending-down',
      title: 'Các trường hợp hoàn tiền',
      subtitle: 'Quản lý các trường hợp cần hoàn tiền từ campaign đã hủy',
      onPress: handleRecoveryCases,
      color: '#F97316',
    }] : []),
    {
      id: 'logout',
      icon: 'logout',
      title: 'Đăng xuất',
      subtitle: 'Đăng xuất khỏi tài khoản của bạn',
      onPress: handleLogout,
      color: '#EF4444',
      isDestructive: true,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.settingItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={24}
                  color={item.color}
                />
              </View>
              <View style={styles.settingItemContent}>
                <Text
                  style={[
                    styles.settingItemTitle,
                    item.isDestructive && styles.destructiveText,
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={styles.settingItemSubtitle}>{item.subtitle}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  destructiveText: {
    color: '#EF4444',
  },
});

