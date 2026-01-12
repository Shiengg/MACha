import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import ConversationList from '../../components/message/ConversationList';
import ChatWindow from '../../components/message/ChatWindow';
import ConversationInfo from '../../components/message/ConversationInfo';
import { conversationService } from '../../services/conversation.service';
import { scale, verticalScale, moderateScale } from '../../utils/responsive';

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      // Navigate to login if not authenticated
      navigation.navigate('Login');
      return;
    }

    // Load conversations
    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await conversationService.getConversations();
        const sorted = data.sort((a, b) => {
          const dateA = new Date(a.updatedAt).getTime();
          const dateB = new Date(b.updatedAt).getTime();
          return dateB - dateA;
        });
        setConversations(sorted);
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isAuthenticated, navigation]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setShowInfoPanel(false);
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowInfoPanel(false);
  };

  const handleToggleInfoPanel = () => {
    setShowInfoPanel(!showInfoPanel);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (selectedConversation) {
              handleBackToList();
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleWrapper}>
            <Text style={styles.headerTitle}>Tin nhắn</Text>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {!selectedConversation ? (
          <ConversationList
            selectedConversationId={null}
            onSelectConversation={handleSelectConversation}
            initialConversations={conversations}
            loading={loading}
          />
        ) : (
          <ChatWindow
            conversation={selectedConversation}
            onToggleInfoPanel={handleToggleInfoPanel}
            onBackToList={handleBackToList}
          />
        )}
      </View>

      {/* Conversation Info Modal */}
      <Modal
        visible={showInfoPanel && !!selectedConversation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInfoPanel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ConversationInfo
              conversation={selectedConversation}
              onClose={() => setShowInfoPanel(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  headerTitleWrapper: {
    marginLeft: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: scale(32),
  },
  content: {
    flex: 1,
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
    height: '90%',
  },
});

