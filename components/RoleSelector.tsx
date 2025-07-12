import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface TeamRole {
  key: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    invite: boolean;
    manage_members: boolean;
    access_chat: boolean;
    manage_roles: boolean;
    view_analytics: boolean;
  };
}

export const TEAM_ROLES: TeamRole[] = [
  {
    key: 'sponsor',
    name: 'Sponsor',
    description: 'Project sponsor with read-only access',
    color: '#EC4899',
    icon: 'heart',
    permissions: {
      read: true,
      write: false,
      delete: false,
      invite: false,
      manage_members: false,
      access_chat: false,
      manage_roles: false,
      view_analytics: true,
    },
  },
  {
    key: 'lead',
    name: 'Lead',
    description: 'Project leader with full control',
    color: '#3B82F6',
    icon: 'star',
    permissions: {
      read: true,
      write: true,
      delete: true,
      invite: true,
      manage_members: true,
      access_chat: true,
      manage_roles: true,
      view_analytics: true,
    },
  },
  {
    key: 'team',
    name: 'Team',
    description: 'Team member with edit and contribute access',
    color: '#10B981',
    icon: 'people',
    permissions: {
      read: true,
      write: true,
      delete: false,
      invite: false,
      manage_members: false,
      access_chat: true,
      manage_roles: false,
      view_analytics: false,
    },
  },
  {
    key: 'fyi',
    name: 'FYI',
    description: 'For your information - minimal access',
    color: '#9CA3AF',
    icon: 'information-circle',
    permissions: {
      read: true,
      write: false,
      delete: false,
      invite: false,
      manage_members: false,
      access_chat: false,
      manage_roles: false,
      view_analytics: false,
    },
  },
];

interface RoleSelectorProps {
  selectedRole: string;
  onRoleSelect: (role: string) => void;
  showDescriptions?: boolean;
  compact?: boolean;
  disabled?: boolean;
  style?: any;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
  showDescriptions = false,
  compact = false,
  disabled = false,
  style,
}) => {
  const { dark } = useTheme();

  const handleRolePress = (roleKey: string) => {
    if (!disabled) {
      onRoleSelect(roleKey);
    }
  };

  const renderRoleButton = (role: TeamRole) => {
    const isSelected = selectedRole === role.key;
    const textColor = isSelected ? COLORS.white : (dark ? COLORS.white : COLORS.greyscale900);
    
    return (
      <TouchableOpacity
        key={role.key}
        style={[
          styles.roleButton,
          {
            backgroundColor: isSelected ? role.color : (dark ? COLORS.dark3 : COLORS.grayscale100),
            borderColor: isSelected ? role.color : (dark ? COLORS.grayscale700 : COLORS.grayscale200),
            opacity: disabled ? 0.6 : 1,
          },
          compact && styles.roleButtonCompact,
          style,
        ]}
        onPress={() => handleRolePress(role.key)}
        disabled={disabled}
      >
        <View style={styles.roleButtonContent}>
          <Ionicons
            name={role.icon as any}
            size={compact ? 14 : 16}
            color={isSelected ? COLORS.white : (dark ? COLORS.grayscale400 : COLORS.grayscale700)}
          />
          <Text
            style={[
              styles.roleButtonText,
              {
                color: textColor,
                fontSize: compact ? 11 : 12,
              },
            ]}
          >
            {role.name}
          </Text>
        </View>
        {showDescriptions && (
          <Text
            style={[
              styles.roleDescription,
              {
                color: isSelected ? `${COLORS.white}CC` : (dark ? COLORS.grayscale400 : COLORS.grayscale700),
                fontSize: compact ? 10 : 11,
              },
            ]}
            numberOfLines={1}
          >
            {role.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.roleGrid, compact && styles.roleGridCompact]}>
        {TEAM_ROLES.map(renderRoleButton)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleGridCompact: {
    gap: 4,
  },
  roleButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 80,
    maxWidth: 120,
  },
  roleButtonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
    maxWidth: 80,
  },
  roleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleButtonText: {
    fontFamily: 'semiBold',
    textAlign: 'center',
  },
  roleDescription: {
    fontFamily: 'regular',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default RoleSelector; 