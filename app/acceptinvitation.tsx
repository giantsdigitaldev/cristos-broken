import { COLORS } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { cacheService } from '@/utils/cacheService';
import { acceptTeamInvitation } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AcceptInvitationScreen() {
  const { user } = useAuth();
  const { code } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) {
      Alert.alert('Invalid Invitation', 'No invitation code provided.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  }, [code]);

  const handleAcceptInvitation = async () => {
    if (!code || !user) return;

    try {
      setLoading(true);
      
      const result = await acceptTeamInvitation(code as string);
      
      if (result.success) {
        if (user?.id) {
          await cacheService.invalidate(`user_projects:${user.id}`);
          await cacheService.invalidate(`user_projects_instant:${user.id}`);
        }
        
        Alert.alert(
          'Welcome to the Team! 🎉',
          `You've successfully joined ${result.projectName} as ${result.role}`,
          [
            {
              text: 'Go Home',
              onPress: () => router.push('/(tabs)/' as any)
            },
            {
              text: 'View Project',
              onPress: () => router.push(`/projectdetails?projectId=${result.projectId}`)
            },
                         { 
               text: 'Go to Projects', 
               onPress: () => router.push('/(tabs)/projects')
             }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
             Alert.alert(
         'Invitation Error',
         (error as any)?.message || 'Failed to accept invitation. Please try again.',
        [
          { text: 'Retry', onPress: handleAcceptInvitation },
          { text: 'Cancel', onPress: () => router.back() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineInvitation = () => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this invitation?',
      [
        { text: 'Keep Invitation', style: 'cancel' },
        { 
          text: 'Decline', 
          style: 'destructive',
          onPress: () => router.back()
        }
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={64} color={COLORS.primary} />
          </View>
          
          <Text style={styles.title}>Sign In Required</Text>
          <Text style={styles.message}>
            You need to sign in to accept this team invitation.
          </Text>
          
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Invitation</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={64} color={COLORS.primary} />
        </View>
        
        <Text style={styles.title}>You&apos;re Invited!</Text>
        <Text style={styles.message}>
          You&apos;ve been invited to join a project team. Accept this invitation to collaborate with your teammates.
        </Text>
        
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Invitation Code:</Text>
          <Text style={styles.codeText}>{code}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleAcceptInvitation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>Accept Invitation</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDeclineInvitation}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color={COLORS.gray} />
          <Text style={styles.infoText}>
            By accepting, you&apos;ll gain access to the project and can collaborate with team members.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.greyscale900,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.tansparentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.greyscale900,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: COLORS.grayscale700,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  codeContainer: {
    backgroundColor: COLORS.grayscale100,
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 14,
    color: COLORS.grayscale700,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.grayscale700,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
}); 