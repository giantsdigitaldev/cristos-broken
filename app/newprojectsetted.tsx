import { COLORS, icons, images, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectService } from '@/utils/projectServiceWrapper';
import { supabase } from '@/utils/supabase';
import { TeamService } from '@/utils/teamService';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, FlatList, Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Progress from 'react-native-progress';

const colors = {
  advanced: COLORS.primary,
  intermediate: "#ff566e",
  medium: "#fbd027",
  weak: "#26c2a3",
  completed: COLORS.greeen
};

interface Task {
  id: string;
  title: string;
  dueDate: string;
  participants: string[];
  comments: number;
  attachments: number;
};

const tasks: Task[] = [
  {
    id: "1",
    title: "Brainstorming",
    dueDate: "Dec 15, 2024",
    participants: [images.user1, images.user2, images.user3],
    comments: 6,
    attachments: 3,
  }
];

const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { dark } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("newprojectboardtaskdetails")}
      style={[styles.card, { 
        backgroundColor: dark ? COLORS.dark2 : "#fff",
      }]}>
      {/* Task Title and Menu Button */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { 
          color: dark ? COLORS.white : "#333",
        }]}>{task.title}</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color={dark ? COLORS.white : "#333"} />
        </TouchableOpacity>
      </View>

      {/* Due Date */}
      <Text style={[styles.dueDate, { 
        color: dark ? COLORS.grayscale400 : "#777",
      }]}>Due date: {task.dueDate}</Text>

      {/* Participants Avatars */}
      <View style={styles.avatars}>
        {task.participants.map((avatar, index) => (
          <Image key={index} source={avatar as ImageSourcePropType} style={styles.avatar} />
        ))}
      </View>

      {/* Comments & Attachments */}
      <View style={styles.footer}>
        <View style={styles.iconGroup}>
          <Ionicons name="chatbubble-outline" size={18} color={dark ? COLORS.white : "#333"} />
          <Text style={[styles.iconText, { 
             color: dark ? COLORS.white : "#333",
          }]}>{task.comments}</Text>
        </View>
        <View style={styles.iconGroup}>
          <Ionicons name="attach-outline" size={18} color={dark ? COLORS.white : "#333"} />
          <Text style={[styles.iconText, { 
             color: dark ? COLORS.white : "#333",
          }]}>{task.attachments}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const NewProjectSetted = () => {
  const members = [images.user1, images.user2, images.user3];
  const navigation = useNavigation<NavigationProp<any>>();
  const { dark } = useTheme();
  const params = useLocalSearchParams();
  const selectedTeamMembers = params.selectedTeamMembers ? JSON.parse(params.selectedTeamMembers as string) : [];
  
  const numberOfTask = 1;
  const numberOfTaskCompleted = 1;
  const progress = numberOfTaskCompleted / numberOfTask;
  const numberOfDaysLeft = 15;

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [projectCreated, setProjectCreated] = useState(false);

  // Create project with team members
  const createProjectWithTeam = async () => {
    setIsCreatingProject(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      // Create the project
      const newProject = {
        user_id: user.id,
        name: 'E-Wallet App Project',
        description: 'Add Description',
        status: 'active' as const,
        priority: 'medium' as const,
        metadata: {
          cover_image: 'cover1.png',
          logo: 'logo1.png',
          end_date: '2024-12-27',
          team_members: selectedTeamMembers.map((member: any) => ({
            id: member.id,
            user_id: member.id,
            user_name: member.full_name || member.username,
            user_email: member.email,
            role: 'fyi',
            status: 'pending',
            joined_at: null
          }))
        }
      };

      const createdProject = await ProjectService.createProject(newProject);
      
      if (createdProject) {
        console.log('✅ Project created successfully:', createdProject.id);
        
        // Send invitations to team members
        if (selectedTeamMembers.length > 0) {
          await sendTeamInvitations(createdProject.id, selectedTeamMembers);
        }
        
        setProjectCreated(true);
        Alert.alert(
          'Success', 
          `Project created successfully! ${selectedTeamMembers.length > 0 ? `${selectedTeamMembers.length} team member(s) invited.` : ''}`,
          [
            {
              text: 'View Project',
              onPress: () => navigation.navigate('projectdetails', { projectId: createdProject.id })
            },
            {
              text: 'Go Home',
              onPress: () => navigation.navigate('index')
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error creating project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Send invitations to team members
  const sendTeamInvitations = async (projectId: string, teamMembers: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile for inviter name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();

      const inviterName = userProfile?.full_name || userProfile?.username || 'Fetching name...';

      // Send invitations to each team member
      for (const member of teamMembers) {
        try {
          const invitationResult = await TeamService.inviteTeamMember({
            projectId: projectId,
            userId: member.id,
            email: member.email,
            role: 'fyi',
            message: `You've been invited to join the project by ${inviterName}`,
            sendNotification: true
          });

          if (invitationResult.success) {
            console.log(`✅ Invitation sent to ${member.full_name || member.username}`);
          } else {
            console.error(`❌ Failed to send invitation to ${member.full_name || member.username}:`, invitationResult.error);
          }
        } catch (invitationError) {
          console.error(`❌ Error sending invitation to ${member.full_name || member.username}:`, invitationError);
        }
      }
    } catch (error) {
      console.error('❌ Error sending team invitations:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden />
      <Image source={images.projectImage} style={styles.banner} />
      {/* Header  */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}>
          <Image
            source={icons.back}
            resizeMode='contain'
            style={styles.arrowBackIcon}
          />
        </TouchableOpacity>
        <View style={styles.rightContainer}>
          <TouchableOpacity>
            <Image
              source={icons.search}
              resizeMode='contain'
              style={styles.searchIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity>
            <Image
              source={icons.moreCircle}
              resizeMode='contain'
              style={styles.menuIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={images.logo5} style={styles.logo} />
        </View>
        <View style={styles.membersContainer}>
          {members.slice(0, 3).map((member, index) => (
            <Image
              key={index}
              source={member as ImageSourcePropType}
              style={[styles.memberAvatar, { left: index * -14 }]}
            />
          ))}
          {members.length > 3 && (
            <View style={styles.moreMembers}>
              <Text style={styles.moreText}>+{members.length - 3}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.container, { 
        backgroundColor: dark ? COLORS.dark1 : COLORS.white,
        flex: 1
      }]}>
        <Text style={[styles.title, { 
          color: dark ? COLORS.white : COLORS.greyscale900,
        }]}>E-Wallet App Project</Text>
        <Text style={[styles.subtitle, { 
          color: dark ? COLORS.white : COLORS.greyscale900,
        }]}>Add Description</Text>

        {/* Team Members Summary */}
        {selectedTeamMembers.length > 0 && (
          <View style={styles.teamMembersSummary}>
            <Text style={[styles.sectionTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900,
            }]}>Team Members ({selectedTeamMembers.length})</Text>
            <View style={styles.teamMembersList}>
              {selectedTeamMembers.slice(0, 3).map((member: any, index: number) => (
                <View key={member.id} style={styles.teamMemberItem}>
                  <Image
                    source={member.avatar_url ? { uri: member.avatar_url } : images.user1}
                    style={styles.teamMemberAvatar}
                  />
                  <Text style={[styles.teamMemberName, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>{member.full_name || member.username}</Text>
                </View>
              ))}
              {selectedTeamMembers.length > 3 && (
                <View style={styles.moreTeamMembers}>
                  <Text style={styles.moreTeamText}>+{selectedTeamMembers.length - 3} more</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Progress bar item */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressView, {
            backgroundColor: progress === 1 ? colors.completed :
              progress >= 0.75 ? colors.advanced :
                progress >= 0.50 ? colors.intermediate :
                  progress >= 0.35 ? colors.medium : colors.weak
          }]}>
            <Text style={styles.progressText}>{numberOfTaskCompleted} / {numberOfTask}</Text>
          </View>
          <Text style={[styles.daysLeft, { 
            color: dark ? COLORS.grayscale400 : COLORS.grayscale700
          }]}>{numberOfDaysLeft} Days Left, Dec 27 2026</Text>
        </View>
        <Progress.Bar
          progress={numberOfTaskCompleted / numberOfTask}
          width={null}
          height={8}
          unfilledColor={dark ? COLORS.grayscale700 : "#EEEEEE"}
          borderColor={dark ? "transparent" : "#FFF"}
          borderWidth={0}
          style={styles.progressBar}
          color={
            progress === 1 ? colors.completed :
              progress >= 0.75 ? colors.advanced :
                progress >= 0.50 ? colors.intermediate :
                  progress >= 0.35 ? colors.medium : colors.weak
          }
        />

        {/* Create Project Button */}
        <TouchableOpacity
          style={[styles.createProjectButton, {
            backgroundColor: isCreatingProject ? COLORS.grayscale400 : COLORS.primary,
          }]}
          onPress={createProjectWithTeam}
          disabled={isCreatingProject}
        >
          <Text style={styles.createProjectText}>
            {isCreatingProject ? 'Creating Project...' : 'Create Project'}
          </Text>
        </TouchableOpacity>

        {/* Task Details  */}
        <ScrollView showsVerticalScrollIndicator={false}
          style={[styles.taskDetailsContainer, { 
            backgroundColor: dark ? COLORS.dark1 : "#E9F0FF",
          }]}>
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TaskCard task={item} />}
            scrollEnabled={false}
          />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    height: 240,
    backgroundColor: "#E9F0FF"
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: SIZES.width - 32,
    position: "absolute",
    top: 32,
    left: 16,
  },
  arrowBackIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  searchIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 8,
  },
  menuIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: - 72,
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 16,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 18,
    height: 18,
    tintColor: COLORS.primary
  },
  membersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 32,
  },
  memberAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.white,
    position: 'absolute',
  },
  moreMembers: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  moreText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'regular',
  },
  container: {
    paddingHorizontal: 16
  },
  title: {
    fontSize: 32,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.greyscale900,
    fontFamily: 'regular',
  },
  // New styles for team members
  teamMembersSummary: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: COLORS.transparentPrimary,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  teamMembersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  teamMemberItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  teamMemberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  teamMemberName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  moreTeamMembers: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  moreTeamText: {
    fontSize: 12,
    color: COLORS.grayscale700,
    fontWeight: '500',
  },
  createProjectButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createProjectText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  progressView: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  daysLeft: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  progressBar: {
    marginBottom: 16,
  },
  taskDetailsContainer: {
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 12,
    marginBottom: 12,
  },
  avatars: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NewProjectSetted