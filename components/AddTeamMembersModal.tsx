import { COLORS } from '@/constants';
import { SearchUser, TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RoleSelector, { TEAM_ROLES } from './RoleSelector';
import UserAvatar from './UserAvatar';

interface AddTeamMembersModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (members: { user: SearchUser; role: string }[]) => void;
  selectedMembers?: SearchUser[];
  existingMembers?: string[]; // user IDs to exclude
  projectId?: string;
  currentMembers?: { user: SearchUser; role: string; status: string }[];
  pendingInvitations?: { user: SearchUser; role: string; status: string }[];
  isNewProject?: boolean; // Flag to indicate if this is for a new project
}

const AddTeamMembersModal: React.FC<AddTeamMembersModalProps> = ({
  visible,
  onClose,
  onAdd,
  selectedMembers = [],
  existingMembers = [],
  projectId,
  currentMembers = [],
  pendingInvitations = [],
  isNewProject = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [tempSelectedUsers, setTempSelectedUsers] = useState<SearchUser[]>([]);
  const [tempMemberRoles, setTempMemberRoles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'search' | 'selected' | 'pending'>('search');
  const [isProcessing, setIsProcessing] = useState(false);
  const refSheet = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      refSheet.current?.open();
      setSearchQuery('');
      setSearchResults([]);
      setActiveTab('search');
      // Initialize from selectedMembers
      setTempSelectedUsers(selectedMembers || []);
      // If you have roles, initialize them as well:
      const roles: Record<string, string> = {};
      (selectedMembers || []).forEach(m => {
        // If you have a role property, use it; otherwise default to 'fyi'
        // @ts-ignore: role may not exist on SearchUser, fallback to 'fyi'
        roles[m.id] = m.role || 'fyi';
      });
      setTempMemberRoles(roles);
    } else {
      refSheet.current?.close();
    }
  }, [visible]);

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
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        backgroundColor: activeTab === tab ? COLORS.primary + '20' : 'transparent',
        borderRadius: 8,
        marginHorizontal: 4,
      }}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons 
        name={icon as any} 
        size={16} 
        color={activeTab === tab ? COLORS.primary : COLORS.grayscale400} 
      />
      <Text style={{
        marginLeft: 4,
        fontSize: 12,
        fontWeight: '600',
        color: activeTab === tab ? COLORS.primary : COLORS.grayscale400
      }}>
        {label} {count > 0 ? `(${count})` : ''}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchTab = () => (
    <View style={{ flex: 1 }}>
      <View style={{ marginBottom: 16 }}>
        <TextInput
          style={{
            backgroundColor: COLORS.grayscale100,
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
            borderWidth: 1,
            borderColor: COLORS.grayscale200
          }}
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChangeText={handleSearchChange}
        />
      </View>

      {/* Selected users list under search bar, only when not searching */}
      {searchQuery.length === 0 && tempSelectedUsers.length > 0 && (
        <View style={{ marginBottom: 16, maxHeight: 220 }}>
          <FlatList
            data={tempSelectedUsers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const role = tempMemberRoles[item.id] || 'fyi';
              const roleColor = getRoleColor(role);
              const roleInfo = TEAM_ROLES.find(r => r.key === role);
              return (
                <View key={item.id} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.grayscale100,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: COLORS.grayscale200
                }}>
                  <UserAvatar size={48} userId={item.id} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                      {getDisplayName(item)}
                    </Text>
                    <Text style={{ color: COLORS.grayscale700, fontSize: 14, marginBottom: 8 }}>
                      @{item.username || 'unknown'}
                    </Text>
                    {item.email && (
                      <Text style={{ color: COLORS.grayscale700, fontSize: 12 }}>
                        {item.email}
                      </Text>
                    )}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: roleColor + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignSelf: 'flex-start'
                    }}>
                      <Ionicons name={roleInfo?.icon as any} size={12} color={roleColor} />
                      <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '600', color: roleColor }}>
                        {roleInfo?.name || role}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeTempUser(item.id)}
                    style={{
                      padding: 8,
                      borderRadius: 20,
                      backgroundColor: COLORS.error + '20'
                    }}
                  >
                    <Ionicons name="close" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      )}

      {searchLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.grayscale400 }}>Searching users...</Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isSelected = tempSelectedUsers.some(u => u.id === item.id);
            return (
              <View style={{
                marginBottom: 12,
                backgroundColor: isSelected ? COLORS.primary + '15' : 'transparent',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isSelected ? COLORS.primary : COLORS.grayscale200,
                padding: 12
              }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => handleUserToggle(item)}
                >
                  <UserAvatar size={48} userId={item.id} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                      {getDisplayName(item)}
                    </Text>
                    <Text style={{ color: COLORS.grayscale700, fontSize: 14 }}>
                      @{item.username || 'unknown'}
                    </Text>
                    {item.email && (
                      <Text style={{ color: COLORS.grayscale700, fontSize: 12 }}>
                        {item.email}
                      </Text>
                    )}
                  </View>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: isSelected ? COLORS.primary : COLORS.grayscale200,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    )}
                  </View>
                </TouchableOpacity>
                {isSelected && (
                  <View style={{ marginTop: 12, marginLeft: 60 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: COLORS.grayscale700 }}>
                      Assign Role:
                    </Text>
                    <RoleSelector
                      selectedRole={tempMemberRoles[item.id] || 'fyi'}
                      onRoleSelect={role => handleRoleChange(item.id, role)}
                      compact={true}
                    />
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="search" size={48} color={COLORS.grayscale400} />
              <Text style={{ marginTop: 12, color: COLORS.grayscale400, textAlign: 'center' }}>
                {searchQuery.length > 1 ? 'No users found' : 'Search for users to add to your team'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  const renderSelectedTab = () => (
    <View style={{ flex: 1 }}>
      {tempSelectedUsers.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
          <Ionicons name="people" size={48} color={COLORS.grayscale400} />
          <Text style={{ marginTop: 12, color: COLORS.grayscale400, textAlign: 'center' }}>
            No team members selected yet
          </Text>
          <Text style={{ marginTop: 8, color: COLORS.grayscale700, textAlign: 'center', fontSize: 12 }}>
            Go to Search tab to add team members
          </Text>
        </View>
      ) : (
        <FlatList
          data={tempSelectedUsers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const role = tempMemberRoles[item.id] || 'fyi';
            const roleColor = getRoleColor(role);
            const roleInfo = TEAM_ROLES.find(r => r.key === role);
            
            return (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.grayscale100,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.grayscale200
              }}>
                <UserAvatar size={48} userId={item.id} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                    {getDisplayName(item)}
                  </Text>
                  <Text style={{ color: COLORS.grayscale700, fontSize: 14, marginBottom: 8 }}>
                    @{item.username || 'unknown'}
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: roleColor + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    alignSelf: 'flex-start'
                  }}>
                    <Ionicons name={roleInfo?.icon as any} size={12} color={roleColor} />
                    <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '600', color: roleColor }}>
                      {roleInfo?.name || role}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removeTempUser(item.id)}
                  style={{
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: COLORS.error + '20'
                  }}
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
    <View style={{ flex: 1 }}>
      {pendingInvitations.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
          <Ionicons name="time-outline" size={48} color={COLORS.grayscale400} />
          <Text style={{ marginTop: 12, color: COLORS.grayscale400, textAlign: 'center' }}>
            No pending invitations
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingInvitations}
          keyExtractor={item => item.user.id}
          renderItem={({ item }) => {
            const roleColor = getRoleColor(item.role);
            const roleInfo = TEAM_ROLES.find(r => r.key === item.role);
            
            return (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.warning + '10',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: COLORS.warning + '30'
              }}>
                <UserAvatar size={48} userId={item.user.id} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                    {getDisplayName(item.user)}
                  </Text>
                  <Text style={{ color: COLORS.grayscale700, fontSize: 14, marginBottom: 8 }}>
                    @{item.user.username || 'unknown'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: roleColor + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginRight: 8
                    }}>
                      <Ionicons name={roleInfo?.icon as any} size={12} color={roleColor} />
                      <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '600', color: roleColor }}>
                        {roleInfo?.name || item.role}
                      </Text>
                    </View>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: COLORS.warning + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12
                    }}>
                      <Ionicons name="time-outline" size={12} color={COLORS.warning} />
                      <Text style={{ marginLeft: 4, fontSize: 12, fontWeight: '600', color: COLORS.warning }}>
                        Pending
                      </Text>
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

  // Remove existing team member from project (DB and UI)
  const handleRemoveExistingMember = async (member: SearchUser) => {
    if (!projectId) return;
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.full_name || member.username || 'this member'} from the team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            try {
              const success = await TeamService.removeTeamMember(projectId, member.id);
              if (success) {
                Alert.alert('Success', 'Member removed successfully');
                // Remove from UI
                onAdd([]); // Triggers parent to reload members
              } else {
                Alert.alert('Error', 'Failed to remove member');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          }
        }
      ]
    );
  };

  // Change role for existing team member (DB and UI)
  const handleChangeExistingRole = (member: SearchUser) => {
    if (!projectId) return;
    Alert.alert(
      'Change Role',
      'Select a new role:',
      [
        { text: 'Cancel', style: 'cancel' },
        ...TEAM_ROLES.map(role => ({
          text: role.name,
          onPress: async () => {
            try {
              const success = await TeamService.updateMemberRole(projectId, member.id, role.key as import('@/utils/teamService').TeamMember['role']);
              if (success) {
                onAdd([]); // Triggers parent to reload members
              } else {
                Alert.alert('Error', 'Failed to update role.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to update role.');
            }
          }
        }))
      ]
    );
  };

  function getDisplayName(user: any) {
    if (user.full_name) {
      return user.full_name;
    }
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.username || user.email || 'Fetching name...';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centeredView}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContentWrapper}>
              {/* Header */}
              <View style={{ marginBottom: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                  👥 Team Members
                </Text>
                {/* X Close Button */}
                <TouchableOpacity
                  onPress={onClose}
                  style={{ position: 'absolute', right: 0, top: 0, padding: 8 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={28} color={COLORS.grayscale400} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 14, color: COLORS.grayscale700, textAlign: 'center' }}>
                {isNewProject ? 'Add team members to your new project' : 'Manage your project team'}
              </Text>

              {/* Project Creator Display */}
              {currentMembers && currentMembers.length > 0 && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: COLORS.primary + '10',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  borderWidth: 2,
                  borderColor: COLORS.primary,
                }}>
                  <UserAvatar size={48} userId={currentMembers[0].user.id} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
                      {getDisplayName(currentMembers[0].user) || 'Project Creator'}
                    </Text>
                    <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600', marginBottom: 2 }}>
                      Project Creator
                    </Text>
                    <Text style={{ color: COLORS.grayscale700, fontSize: 14 }}>
                      @{currentMembers[0].user.username || 'creator'}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}>
                    <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '600' }}>
                      {currentMembers[0].role.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Tab Navigation */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: COLORS.grayscale100,
                borderRadius: 12,
                padding: 4,
                marginBottom: 20
              }}>
                {renderTabButton('search', 'Search', searchResults.length, 'search')}
                {renderTabButton('selected', 'Selected', tempSelectedUsers.length, 'checkmark-circle')}
                {renderTabButton('pending', 'Pending', pendingInvitations.length, 'time-outline')}
              </View>

              {/* Tab Content */}
              <View style={{ flex: 1, minHeight: 200 }}>
                {activeTab === 'search' && renderSearchTab()}
                {activeTab === 'selected' && renderSelectedTab()}
                {activeTab === 'pending' && renderPendingTab()}
              </View>

              {/* Action Buttons */}
              {tempSelectedUsers.length > 0 && (
                <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.grayscale200 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.grayscale700 }}>
                      {tempSelectedUsers.length} member{tempSelectedUsers.length > 1 ? 's' : ''} selected
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setTempSelectedUsers([]);
                        setTempMemberRoles({});
                      }}
                      style={{ padding: 8 }}
                    >
                      <Text style={{ color: COLORS.error, fontSize: 14, fontWeight: '600' }}>Clear All</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={{
                      backgroundColor: COLORS.primary,
                      borderRadius: 16,
                      paddingVertical: 16,
                      alignItems: 'center',
                      opacity: isProcessing ? 0.7 : 1
                    }}
                    onPress={handleConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>
                        {isNewProject ? 'Add to Project' : 'Send Invitations'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  modalContentWrapper: {
    width: '92%',
    maxHeight: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
});

export default AddTeamMembersModal; 