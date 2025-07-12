import FeedbackModal from '@/components/FeedbackModal';
import UserAvatar from '@/components/UserAvatar';
import { COLORS } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Feedback, feedbackService } from '@/utils/feedbackService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Category = 'bug' | 'pre_mvp_feature' | 'post_mvp_feature' | 'completed';

const TABS: { key: Category; title: string }[] = [
  { key: 'bug', title: 'Bugs' },
  { key: 'pre_mvp_feature', title: 'Pre-MVP' },
  { key: 'post_mvp_feature', title: 'Post-MVP' },
  { key: 'completed', title: 'Completed' },
];

const FeedbackTab = () => {
  const { dark, isThemeReady } = useTheme();
  const { user } = useAuth();
  
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<Feedback | null>(null);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Category>('bug');
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading feedback...');
      const result = await feedbackService.getUserFeedback();
      
      console.log('📊 Feedback result:', result);
      
      if (result.success) {
        console.log('✅ Feedback loaded successfully, count:', result.data?.length || 0);
        setFeedback(result.data || []);
      } else {
        console.error('❌ Error loading feedback:', result.error);
      }
    } catch (error) {
      console.error('❌ Error in loadFeedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeedback();
    setRefreshing(false);
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const filteredFeedback = useMemo(() => {
    if (activeTab === 'completed') {
      return feedback.filter(item => item.status === 'completed');
    }
    return feedback.filter(item => item.category === activeTab && item.status !== 'completed');
  }, [feedback, activeTab]);

  if (!isThemeReady) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={dark ? COLORS.white : COLORS.primary} />
      </View>
    );
  }

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;

    try {
      setProcessingActions(prev => new Set(prev).add(`delete-${feedbackToDelete.id}`));
      
      const result = await feedbackService.deleteFeedback(feedbackToDelete.id);
      
      if (result.success) {
        setFeedback(prev => prev.filter(item => item.id !== feedbackToDelete.id));
        setShowDeleteConfirmation(false);
        setFeedbackToDelete(null);
        Alert.alert('Success', 'Feedback deleted successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to delete feedback');
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      Alert.alert('Error', 'An error occurred while deleting the feedback');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(`delete-${feedbackToDelete?.id}`);
        return newSet;
      });
    }
  };

  const handleMarkAsCompleted = async (feedbackItem: Feedback) => {
    try {
      setProcessingActions(prev => new Set(prev).add(`complete-${feedbackItem.id}`));
      
      const result = await feedbackService.markFeedbackAsCompleted(feedbackItem.id);
      
      if (result.success) {
        setFeedback(prev => prev.map(fb => 
          fb.id === feedbackItem.id 
            ? { ...fb, status: 'completed', updated_at: new Date().toISOString() }
            : fb
        ));
      } else {
        Alert.alert('Error', result.error || 'Failed to mark feedback as completed');
      }
    } catch (error) {
      console.error('Error marking feedback as completed:', error);
      Alert.alert('Error', 'An error occurred while updating the feedback');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(`complete-${feedbackItem.id}`);
        return newSet;
      });
    }
  };

  const handleReopenFeedback = async (feedbackItem: Feedback) => {
    try {
      setProcessingActions(prev => new Set(prev).add(`reopen-${feedbackItem.id}`));
      
      const result = await feedbackService.reopenFeedback(feedbackItem.id);
      
      if (result.success) {
        setFeedback(prev => prev.map(fb => 
          fb.id === feedbackItem.id 
            ? { ...fb, status: 'pending', updated_at: new Date().toISOString() }
            : fb
        ));
      } else {
        Alert.alert('Error', result.error || 'Failed to re-open feedback.');
      }
    } catch (error) {
      console.error('Error re-opening feedback:', error);
      Alert.alert('Error', 'An error occurred while re-opening feedback.');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(`reopen-${feedbackItem.id}`);
        return newSet;
      });
    }
  };

  const showDeleteConfirmationModal = (feedbackItem: Feedback) => {
    setFeedbackToDelete(feedbackItem);
    setShowDeleteConfirmation(true);
  };

  const hideDeleteConfirmationModal = () => {
    setShowDeleteConfirmation(false);
    setFeedbackToDelete(null);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return 'bug';
      case 'pre_mvp_feature': return 'flag';
      case 'post_mvp_feature': return 'rocket';
      case 'completed': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
        Community Feedback
      </Text>
      <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addButton}>
        <Ionicons name="add" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            activeTab === tab.key && styles.activeTab,
            {
              backgroundColor: activeTab === tab.key ? COLORS.primary : (dark ? COLORS.dark2 : COLORS.grayscale100),
              borderColor: activeTab === tab.key ? COLORS.primary : (dark ? COLORS.grayscale700 : COLORS.grayscale200)
            }
          ]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab.key ? COLORS.white : (dark ? COLORS.white : COLORS.greyscale900) }
            ]}
          >
            {tab.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFeedbackItem = (item: Feedback) => {
    // Render as a plain View, not a TouchableOpacity
    return (
      <View key={item.id} style={{ width: '100%' }}>
        {renderFeedbackCard(item)}
      </View>
    );
  };

  const renderFeedbackCard = (item: Feedback) => {
    const isCurrentUser = user?.id === item.user_id;
    
    // Get user display name - prefer full_name, fallback to user ID, then "You" for current user
    const getUserDisplayName = () => {
      if (isCurrentUser) {
        return 'You';
      }
      
      if (item.profiles?.full_name) {
        return item.profiles.full_name;
      }
      
      // If no profile data available, show user ID or fallback
      return item.user_id ? `User ${item.user_id.slice(0, 8)}` : 'Community Member';
    };

    return (
      <View key={item.id} style={[styles.feedbackItem, { backgroundColor: dark ? COLORS.dark3 : COLORS.white, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}>
        {/* Action buttons positioned absolutely to avoid interference */}
        <View style={styles.actionButtons}>
          {item.status === 'completed' ? (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.warning + '20' }]}
              onPress={() => {
                console.log('🔄 Reopen button pressed for:', item.title);
                handleReopenFeedback(item);
              }}
              disabled={processingActions.has(`reopen-${item.id}`)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {processingActions.has(`reopen-${item.id}`) ? (
                <ActivityIndicator size="small" color={COLORS.warning} />
              ) : (
                <Ionicons name="refresh" size={20} color={COLORS.warning} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: COLORS.success + '20' }]}
              onPress={() => {
                console.log('✅ Complete button pressed for:', item.title);
                handleMarkAsCompleted(item);
              }}
              disabled={processingActions.has(`complete-${item.id}`)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {processingActions.has(`complete-${item.id}`) ? (
                <ActivityIndicator size="small" color={COLORS.success} />
              ) : (
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.error + '20' }]}
            onPress={() => {
              console.log('🗑️ Delete button pressed for:', item.title);
              showDeleteConfirmationModal(item);
            }}
            disabled={processingActions.has(`delete-${item.id}`)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {processingActions.has(`delete-${item.id}`) ? (
              <ActivityIndicator size="small" color={COLORS.error} />
            ) : (
              <Ionicons name="trash" size={16} color={COLORS.error} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Editable content area - separate from action buttons */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setEditingFeedback(item)}
          style={{ flex: 1, paddingRight: 140, zIndex: 1 }} // Increased padding and lower z-index
        >
          <View style={styles.feedbackHeader}>
            <View style={styles.categoryContainer}>
              <Ionicons name={getCategoryIcon(item.category || 'bug') as any} size={14} color={COLORS.primary} />
                      <Text style={[styles.feedbackTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]} numberOfLines={1}>
          {item.title}
        </Text>
            </View>
          </View>
          <Text style={[styles.feedbackDescription, { color: dark ? COLORS.grayscale400 : COLORS.greyscale600 }]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.feedbackFooter}>
            <View style={styles.authorContainer}>
              {item.user_id && (
                <UserAvatar 
                  userId={item.user_id} 
                  size={20} 
                  style={styles.authorAvatar}
                />
              )}
              <Text style={[styles.footerText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>by {getUserDisplayName()}</Text>
            </View>
            <Text style={[styles.footerText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>{formatDate(item.created_at)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={dark ? COLORS.white : COLORS.primary} />
        </View>
      );
    }

    if (filteredFeedback.length === 0) {
      return (
        <View style={styles.centered}>
          <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900 }}>
            {activeTab === 'completed' ? 'No completed feedback yet.' : 'No feedback in this category yet.'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {filteredFeedback.map(renderFeedbackItem)}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
      {renderHeader()}
      {renderTabs()}
      {renderContent()}
      <FeedbackModal
        visible={showModal || !!editingFeedback}
        onClose={() => {
          setShowModal(false);
          setEditingFeedback(null);
        }}
        onFeedbackSubmitted={(newFeedback) => {
          setShowModal(false);
          if (newFeedback) {
            setFeedback(prev => [newFeedback, ...prev]);
          }
          setTimeout(() => loadFeedback(), 1000);
        }}
        feedback={editingFeedback || undefined}
        onFeedbackUpdated={(updatedFeedback) => {
          setEditingFeedback(null);
          if (updatedFeedback) {
            setFeedback(prev => prev.map(fb => fb.id === updatedFeedback.id ? updatedFeedback : fb));
          }
          setTimeout(() => loadFeedback(), 1000);
        }}
      />
      {/* Delete Confirmation Modal */}
      <Modal
        transparent
        visible={showDeleteConfirmation}
        animationType="fade"
        onRequestClose={hideDeleteConfirmationModal}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
            <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Confirm Deletion</Text>
            <Text style={[styles.modalMessage, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={hideDeleteConfirmationModal}>
                <Text style={[styles.modalButtonText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={handleDeleteFeedback}>
                <Text style={[styles.modalButtonText, { color: COLORS.white }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'bold',
  },
  addButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  activeTab: {
    // Active styles are now applied inline
  },
  tabText: {
    fontFamily: 'semiBold',
    fontSize: 14,
  },
  feedbackItem: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  actionButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    zIndex: 11,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between'
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  feedbackTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'bold',
    flexShrink: 1,
  },
  feedbackDescription: {
    fontSize: 14,
    fontFamily: 'regular',
    lineHeight: 20,
    color: COLORS.greyscale600,
    marginVertical: 8,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.grayscale700
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: 'regular',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  modalButtonText: {
    fontFamily: 'semiBold',
    fontSize: 16,
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    marginRight: 8,
  },
});

export default FeedbackTab; 