import { COLORS } from '@/constants';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import UserAvatar from '../UserAvatar';

interface TeamMemberCardProps {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  id,
  name,
  email,
  role = 'viewer',
  avatar_url,
  onPress,
  onEdit,
  onRemove
}) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'sponsor': return COLORS.info;
      case 'lead': return COLORS.primary;
      case 'team': return COLORS.success;
      case 'fyi': return COLORS.grayscale400;
      default: return COLORS.grayscale700;
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'sponsor': return 'Sponsor';
      case 'lead': return 'Lead';
      case 'team': return 'Team';
      case 'fyi': return 'FYI';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'shield';
      case 'lead':
        return 'star';
      case 'member':
        return 'person';
      case 'viewer':
        return 'eye';
      default:
        return 'person';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <UserAvatar
          size={40}
          userId={id}
        />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{name}</Text>
          {email && (
            <Text style={styles.memberEmail}>{email}</Text>
          )}
          <View style={styles.roleContainer}>
            <Ionicons 
              name={getRoleIcon(role) as any} 
              size={12} 
              color={getRoleColor(role)} 
            />
            <Text style={[styles.roleText, { color: getRoleColor(role) }]}>
              {getRoleDisplayName(role)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
        {onRemove && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.greyscale900,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: COLORS.grayscale700,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default TeamMemberCard; 