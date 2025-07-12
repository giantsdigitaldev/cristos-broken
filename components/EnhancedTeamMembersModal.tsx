import { COLORS } from '@/constants';
import { SearchUser, TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import CustomBottomSheet from './CustomBottomSheet';
import RoleSelector, { TEAM_ROLES } from './RoleSelector';
import UserAvatar from './UserAvatar';

interface EnhancedTeamMembersModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (members: { user: SearchUser; role: string }[]) => void;
  selectedMembers?: SearchUser[];
  existingMembers?: string[]; // user IDs to exclude
  projectId?: string;
  currentMembers?: { user: SearchUser; role: string; status: string }[];
  pendingInvitations?: { user: SearchUser; role: string; status: string }[];
  isNewProject?: boolean; // Flag to indicate if this is for a new project
  memberRoles?: Record<string, string>; // Add prop for existing member roles
}

const EnhancedTeamMembersModal: React.FC<EnhancedTeamMembersModalProps> = ({
  visible,
  onClose,
  onAdd,
  selectedMembers = [],
  existingMembers = [],
  projectId,
  currentMembers = [],
  pendingInvitations = [],
  isNewProject = false,
  memberRoles = {}
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tempSelectedUsers, setTempSelectedUsers] = useState<SearchUser[]>([]);
  const [tempMemberRoles, setTempMemberRoles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'search' | 'selected' | 'pending'>('search');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Add refs for input focus and keyboard handling
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setSearchResults([]);
      
      // Initialize with selectedMembers instead of empty array to preserve selections
      setTempSelectedUsers(selectedMembers || []);
      
      // Initialize roles for selected members using the memberRoles prop
      const initialRoles: Record<string, string> = {};
      (selectedMembers || []).forEach(member => {
        // Use role from memberRoles prop if available, otherwise default to 'fyi'
        initialRoles[member.id] = memberRoles[member.id] || 'fyi';
      });
      setTempMemberRoles(initialRoles);
      
      setActiveTab('search');
      
      // Focus the search input after a short delay to ensure modal is fully rendered
      const focusTimer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
      
      // Refresh all users to ensure new users are discoverable
      const refreshTimer = setTimeout(async () => {
        try {
          console.log('🔄 Refreshing user discovery for team member search...');
          // Get all users to ensure new users are included
          const allUsers = await TeamService.getAllUsers(1000);
          if (allUsers.users && allUsers.users.length > 0) {
            console.log(`✅ Found ${allUsers.users.length} total users available for search`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to refresh user discovery:', error);
        }
      }, 500);
      
      return () => {
        clearTimeout(focusTimer);
        clearTimeout(refreshTimer);
      };
    } else {
      // Dismiss keyboard when modal closes
      Keyboard.dismiss();
    }
  }, [visible, selectedMembers, memberRoles]);

  // Handle keyboard dismissal when tapping outside
  const handleModalPress = () => {
    Keyboard.dismiss();
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      setSearchLoading(true);
      try {
        // Use enhanced search with higher limit to ensure all users are found
        const results = await TeamService.searchUsers(text, 200);
        
        if (results.error) {
          console.error('Search error:', results.error);
          setSearchResults([]);
          return;
        }
        
        // Filter out users that are already selected, current members, or pending
        const allExistingIds = [
          ...existingMembers,
          ...tempSelectedUsers.map(u => u.id),
          ...currentMembers.map(m => m.user.id),
          ...pendingInvitations.map(m => m.user.id)
        ];
        
        const filteredResults = results.users?.filter(u => !allExistingIds.includes(u.id)) || [];
        
        console.log(`🔍 Search for "${text}": Found ${results.users?.length || 0} total, ${filteredResults.length} available`);
        
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleUserToggle = (user: SearchUser) => {
    setTempSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        setTempMemberRoles(r => { const nr = { ...r }; delete nr[user.id]; return nr; });
        return prev.filter(u => u.id !== user.id);
      } else {
        setTempMemberRoles(r => ({ ...r, [user.id]: 'fyi' }));
        return [...prev, user];
      }
    });
  };

  const handleRoleChange = (userId: string, role: string) => {
    setTempMemberRoles(prev => ({ ...prev, [userId]: role }));
  };

  const removeTempUser = (userId: string) => {
    setTempSelectedUsers(prev => prev.filter(u => u.id !== userId));
    setTempMemberRoles(prev => {
      const newRoles = { ...prev };
      delete newRoles[userId];
      return newRoles;
    });
  };

  const handleConfirm = async () => {
    if (tempSelectedUsers.length === 0) {
      Alert.alert('No Members Selected', 'Please select at least one team member to add.');
      return;
    }

    setIsProcessing(true);
    try {
      const membersToAdd = tempSelectedUsers.map(u => ({ 
        user: u, 
        role: tempMemberRoles[u.id] || 'fyi' 
      }));

      // If this is for a new project, just pass the data back
      if (isNewProject) {
        onAdd(membersToAdd);
        setTempSelectedUsers([]);
        setTempMemberRoles({});
        onClose();
        return;
      }

      // If this is for an existing project, send invitations immediately
      if (projectId) {
        let successCount = 0;
        let errorCount = 0;

        for (const member of membersToAdd) {
          try {
            const result = await TeamService.inviteTeamMember({
              projectId,
              userId: member.user.id,
              role: member.role as any,
              message: `You've been invited to join the project as ${member.role}`
            });

            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Failed to invite ${member.user.full_name}:`, result.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error inviting ${member.user.full_name}:`, error);
          }
        }

        if (successCount > 0) {
          Alert.alert(
            'Invitations Sent',
            `${successCount} team member(s) have been invited successfully!`,
            [{ text: 'OK' }]
          );
        }

        if (errorCount > 0) {
          Alert.alert(
            'Some Invitations Failed',
            `${errorCount} invitation(s) could not be sent. Please try again.`,
            [{ text: 'OK' }]
          );
        }
      }

      onAdd(membersToAdd);
      setTempSelectedUsers([]);
      setTempMemberRoles({});
      onClose();
    } catch (error) {
      console.error('Error adding team members:', error);
      Alert.alert('Error', 'Failed to add team members. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getRoleColor = (role: string) => {
    const roleInfo = TEAM_ROLES.find(r => r.key === role);
    return roleInfo?.color || COLORS.grayscale400;
  };

  const renderTabButton = (tab: 'search' | 'selected' | 'pending', label: string, count: number, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && styles.tabButtonActive
      ]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.85}
    >
      <Ionicons 
        name={icon as any} 
        size={18} 
        color={activeTab === tab ? COLORS.primary : COLORS.grayscale700} 
      />
      <Text style={[
        styles.tabButtonText,
        activeTab === tab && styles.tabButtonTextActive
      ]}>
        {label}
      </Text>
      {count > 0 && (
        <View style={[
          styles.tabBadge,
          activeTab === tab && styles.tabBadgeActive
        ]}>
          <Text style={[
            styles.tabBadgeText,
            activeTab === tab && styles.tabBadgeTextActive
          ]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.grayscale400} style={styles.searchIcon} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Search users by name or username..."
          placeholderTextColor={COLORS.grayscale400}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {searchLoading && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchLoader} />
        )}
      </View>

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <FlatList
          ref={flatListRef}
          data={searchResults}
          keyExtractor={item => item.id}
          style={styles.resultsList}
          contentContainerStyle={styles.resultsListContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          onScrollToIndexFailed={() => {
            // Handle scroll to index failure gracefully
          }}
          renderItem={({ item }: { item: SearchUser }) => {
            const isSelected = tempSelectedUsers.some(u => u.id === item.id);
            const selectedRole = tempMemberRoles[item.id] || 'fyi';
            
            return (
              <TouchableOpacity
                style={[
                  styles.userItem,
                  isSelected && styles.userItemSelected
                ]}
                onPress={() => handleUserToggle(item)}
                activeOpacity={0.7}
              >
                <UserAvatar size={48} userId={item.id} style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.full_name || (item.first_name || item.last_name ? `${item.first_name || ''} ${item.last_name || ''}`.trim() : (item.username || 'Fetching name...'))}
                  </Text>
                  <Text style={styles.userUsername}>
                    @{item.username || 'unknown'}
                  </Text>
                  {isSelected && (
                    <View style={styles.roleSelector}>
                      <RoleSelector
                        selectedRole={selectedRole}
                        onRoleSelect={(role: string) => handleRoleChange(item.id, role)}
                        compact
                      />
                    </View>
                  )}
                </View>
                <View style={styles.userActions}>
                  <Ionicons 
                    name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
                    size={24} 
                    color={isSelected ? COLORS.success : COLORS.grayscale400} 
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : searchQuery.length > 1 && !searchLoading ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.greyscale300} />
          <Text style={styles.emptyStateText}>No users found</Text>
          <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
        </View>
      ) : searchQuery.length <= 1 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={COLORS.greyscale300} />
          <Text style={styles.emptyStateText}>Search for team members</Text>
          <Text style={styles.emptyStateSubtext}>Type at least 2 characters to search</Text>
        </View>
      ) : null}
    </View>
  );

  const renderSelectedTab = () => (
    <View style={styles.tabContent}>
      {tempSelectedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.greyscale300} />
          <Text style={styles.emptyStateText}>No members selected</Text>
          <Text style={styles.emptyStateSubtext}>Search and select team members to add</Text>
        </View>
      ) : (
        <FlatList
          data={tempSelectedUsers}
          keyExtractor={item => item.id}
          style={styles.resultsList}
          contentContainerStyle={styles.resultsListContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }: { item: SearchUser }) => {
            const roleColor = getRoleColor(tempMemberRoles[item.id] || 'fyi');
            const roleInfo = TEAM_ROLES.find(r => r.key === (tempMemberRoles[item.id] || 'fyi'));
            
            return (
              <View style={styles.selectedUserItem}>
                <UserAvatar size={48} userId={item.id} style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.full_name || (item.first_name || item.last_name ? `${item.first_name || ''} ${item.last_name || ''}`.trim() : (item.username || 'Fetching name...'))}
                  </Text>
                  <Text style={styles.userUsername}>
                    @{item.username || 'unknown'}
                  </Text>
                  <View style={styles.roleContainer}>
                    <View style={[
                      styles.roleBadge,
                      { backgroundColor: roleColor + '20' }
                    ]}>
                      <Ionicons name={roleInfo?.icon as any} size={12} color={roleColor} />
                      <Text style={[styles.roleText, { color: roleColor }]}>
                        {roleInfo?.name || tempMemberRoles[item.id] || 'fyi'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removeTempUser(item.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );

  const renderPendingTab = () => (
    <View style={styles.tabContent}>
      {pendingInvitations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={COLORS.greyscale300} />
          <Text style={styles.emptyStateText}>No pending invitations</Text>
          <Text style={styles.emptyStateSubtext}>All invitations have been accepted</Text>
        </View>
      ) : (
        <FlatList
          data={pendingInvitations}
          keyExtractor={item => item.user.id}
          style={styles.resultsList}
          contentContainerStyle={styles.resultsListContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }: { item: { user: SearchUser; role: string; status: string } }) => {
            const roleColor = getRoleColor(item.role);
            const roleInfo = TEAM_ROLES.find(r => r.key === item.role);
            
            return (
              <View style={styles.pendingUserItem}>
                <UserAvatar size={48} userId={item.user.id} style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.user.full_name || (item.user.first_name || item.user.last_name ? `${item.user.first_name || ''} ${item.user.last_name || ''}`.trim() : (item.user.username || 'Fetching name...'))}
                  </Text>
                  <Text style={styles.userUsername}>
                    @{item.user.username || 'unknown'}
                  </Text>
                  <View style={styles.pendingRoleContainer}>
                    <View style={[
                      styles.roleBadge,
                      { backgroundColor: roleColor + '20' }
                    ]}>
                      <Ionicons name={roleInfo?.icon as any} size={12} color={roleColor} />
                      <Text style={[styles.roleText, { color: roleColor }]}>
                        {roleInfo?.name || item.role}
                      </Text>
                    </View>
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time-outline" size={12} color={COLORS.warning} />
                      <Text style={styles.pendingText}>Pending</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );

  return (
    <CustomBottomSheet
      visible={visible}
      onClose={onClose}
      height="80%"
      backgroundColor={COLORS.white}
      closeOnSwipe={true}
    >
      <TouchableWithoutFeedback onPress={handleModalPress}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.title}>👥 Team Members</Text>
              <Text style={styles.subtitle}>
                {isNewProject ? 'Add team members to your new project' : 'Manage your project team'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={28} color={COLORS.grayscale700} />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {renderTabButton('search', 'Search', searchResults.length, 'search')}
            {renderTabButton('selected', 'Selected', tempSelectedUsers.length, 'checkmark-circle')}
            {renderTabButton('pending', 'Pending', pendingInvitations.length, 'time-outline')}
          </View>

          {/* Tab Content */}
          {activeTab === 'search' && renderSearchTab()}
          {activeTab === 'selected' && renderSelectedTab()}
          {activeTab === 'pending' && renderPendingTab()}
        </View>
      </TouchableWithoutFeedback>
      {/* Sticky Footer: Action Button */}
      {tempSelectedUsers.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.createTaskButton,
              isProcessing && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.createTaskButtonText}>
                {isNewProject ? 'Add to Project' : 'Send Invitations'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </CustomBottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: COLORS.greyscale900,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.greyscale600,
    textAlign: 'center',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.grayscale100,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    marginHorizontal: 2,
    backgroundColor: 'transparent',
    minWidth: 0,
    gap: 6,
    color: COLORS.grayscale700,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary + '20',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.grayscale700,
    marginLeft: 6,
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.greyscale300,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  tabBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.grayscale700,
  },
  tabBadgeTextActive: {
    color: COLORS.white,
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greyscale500,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.greyscale900,
    paddingVertical: 0,
  },
  searchLoader: {
    marginLeft: 12,
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    paddingBottom: 20, // Add padding to ensure last item is scrollable
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '05',
  },
  userAvatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: COLORS.greyscale900,
  },
  userUsername: {
    color: COLORS.greyscale600,
    fontSize: 14,
    marginBottom: 8,
  },
  roleSelector: {
    marginTop: 8,
  },
  userActions: {
    marginLeft: 12,
  },
  selectedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '05',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.success + '20',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.error + '20',
    marginLeft: 12,
  },
  pendingUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  pendingRoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  pendingText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.grayscale400,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.greyscale500,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  createTaskButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  createTaskButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
});

export default EnhancedTeamMembersModal; 