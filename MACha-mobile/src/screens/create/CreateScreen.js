import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function CreateScreen({ navigation }) {
  const handleCreateCampaign = () => {
    // TODO: Navigate to create campaign screen
    console.log('Navigate to create campaign');
  };

  const handleCreateEvent = () => {
    // TODO: Navigate to create event screen
    console.log('Navigate to create event');
  };

  const handleOpenMap = () => {
    // Navigate to map screen
    navigation.navigate('Map');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hoạt động</Text>
        <Text style={styles.subtitle}>Tạo mới hoặc khám phá trên bản đồ</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleCreateCampaign}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="megaphone-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.optionTitle}>Tạo Campaign</Text>
            <Text style={styles.optionDescription}>
              Tạo chiến dịch từ thiện mới để kêu gọi quyên góp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleCreateEvent}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#f97316' }]}>
              <Ionicons name="calendar-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.optionTitle}>Tạo Sự kiện</Text>
            <Text style={styles.optionDescription}>
              Tạo sự kiện từ thiện mới để tổ chức và mời mọi người tham gia
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleOpenMap}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="map-outline" size={32} color="#fff" />
            </View>
            <Text style={styles.optionTitle}>Bản đồ thiện nguyện</Text>
            <Text style={styles.optionDescription}>
              Khám phá các chiến dịch và sự kiện từ thiện trên bản đồ
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

