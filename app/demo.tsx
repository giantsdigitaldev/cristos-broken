import { COLORS, icons, images, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    Image,
    ImageSourcePropType,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import * as Progress from 'react-native-progress';

const colors = {
  advanced: COLORS.primary,
  intermediate: "#ff566e",
  medium: "#fbd027",
  weak: "#26c2a3",
  completed: COLORS.greeen
};

// Mock project data
const mockProject = {
  id: '1',
  name: 'AI-Powered Customer Support System',
  description: 'UI Kit Design Project for AI Chat, Knowledge Base, and Customer Support Mobile App - January 15, 2025',
  metadata: {
    owner: 'Sarah Johnson',
    edc_date: '2024-01-15',
    fud_date: '2024-01-22',
    team_members: ['Sarah Johnson', 'Mike Chen', 'Alex Rodriguez', 'Emma Wilson', 'David Kim'],
    budget: 125000,
    tools_needed: ['OpenAI API', 'Supabase', 'React Native', 'Node.js'],
    dependencies: ['User Authentication System', 'Payment Gateway Integration'],
    risks: ['API Rate Limits', 'Data Privacy Compliance', 'Integration Complexity'],
    success_criteria: ['95% Customer Satisfaction', 'Response Time < 2 seconds', '80% Query Resolution Rate'],
  },
};

interface ProjectSection {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  participants: ImageSourcePropType[];
  priority: 'high' | 'medium' | 'low';
}

const projectSections: ProjectSection[] = [
  {
    id: "1",
    title: "Project Foundation",
    description: "Define project scope, goals, and success criteria",
    status: "completed",
    participants: [images.user1, images.user2, images.user3],
    priority: "high",
  },
  {
    id: "2",
    title: "Team & Resources",
    description: "Assign team members, budget allocation, and tool setup",
    status: "completed",
    participants: [images.user2, images.user3, images.user5],
    priority: "high",
  },
  {
    id: "3",
    title: "AI Model Integration",
            description: "Implement GPT-4o-mini API and conversation management",
    status: "in-progress",
    participants: [images.user1, images.user4],
    priority: "high",
  },
  {
    id: "4",
    title: "Database Architecture",
    description: "Setup Supabase tables and relationships",
    status: "in-progress",
    participants: [images.user3, images.user1, images.user2],
    priority: "medium",
  },
  {
    id: "5",
    title: "UI/UX Implementation",
    description: "Build responsive chat interface and dashboard",
    status: "pending",
    participants: [images.user5, images.user6],
    priority: "medium",
  },
  {
    id: "6",
    title: "Testing & Deployment",
    description: "Quality assurance and production deployment",
    status: "pending",
    participants: [images.user1, images.user7],
    priority: "low",
  },
];

const ProjectSectionCard: React.FC<{ section: ProjectSection }> = ({ section }) => {
  const { dark } = useTheme();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.completed;
      case 'in-progress': return colors.intermediate;
      case 'pending': return colors.weak;
      default: return colors.medium;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return 'alert-circle';
      case 'medium': return 'time';
      case 'low': return 'checkmark-circle';
      default: return 'time';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: dark ? COLORS.dark2 : "#fff",
      }]}>
      {/* Section Title and Status */}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, {
          color: dark ? COLORS.white : "#333",
        }]}>{section.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(section.status) }]}>
          <Text style={styles.statusText}>{section.status.replace('-', ' ')}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.cardDescription, {
        color: dark ? COLORS.grayscale200 : "#777",
      }]}>{section.description}</Text>

      {/* Participants Avatars */}
      <View style={styles.avatars}>
        {section.participants.map((avatar, index) => (
          <Image key={index} source={avatar} style={styles.avatar} />
        ))}
      </View>

      {/* Priority and Actions */}
      <View style={styles.footer}>
        <View style={styles.iconGroup}>
          <Ionicons name={getPriorityIcon(section.priority)} size={18} color={getStatusColor(section.status)} />
          <Text style={[styles.iconText, { color: dark ? COLORS.greyscale300 : "#333" }]}>
            {section.priority} priority
          </Text>
        </View>
        <View style={styles.iconGroup}>
          <Ionicons name="chatbubble-outline" size={18} color={dark ? COLORS.greyscale300 : "#333"} />
          <Text style={[styles.iconText, { color: dark ? COLORS.greyscale300 : "#333" }]}>
            {Math.floor(Math.random() * 10) + 1}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function DemoScreen() {
  const members = [images.user1, images.user2, images.user3, images.user4, images.user5];
  const navigation = useNavigation<NavigationProp<any>>();
  const { dark } = useTheme();
  const numberOfTask = 18;
  const numberOfTaskCompleted = 12;
  const progress = numberOfTaskCompleted / numberOfTask;
  const numberOfDaysLeft = 18;

  const calculateFlowScore = () => {
    const score = Math.round(progress * 100);
    return { score, progress };
  };

  const flowScore = calculateFlowScore();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar hidden />
      <Image source={images.projectImage} style={styles.banner} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={icons.back}
            resizeMode='contain'
            style={styles.arrowBackIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('ui-library' as never)}
          style={styles.uiLibraryButton}
        >
          <Text style={styles.uiLibraryText}>UI Library</Text>
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
              source={member}
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

      <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
        <Text style={[styles.title, {
          color: dark ? COLORS.white : COLORS.greyscale900
        }]}>{mockProject.name}</Text>
        <Text style={[styles.subtitle, {
          color: dark ? COLORS.grayscale100 : COLORS.greyscale900
        }]}>{mockProject.description}</Text>

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
          }]}>{numberOfDaysLeft} Days Left, Jan 26 2025</Text>
        </View>
        
        <Progress.Bar
          progress={progress}
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

        {/* Project Sections */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          style={[styles.taskDetailsContainer, {
            backgroundColor: dark ? COLORS.dark1 : "#E9F0FF",
          }]}
        >
          {projectSections.map((section) => (
            <ProjectSectionCard key={section.id} section={section} />
          ))}
        </ScrollView>
      </View>

      {/* Add Task Button */}
      <TouchableOpacity style={styles.addIconContainer}>
        <Ionicons name="add" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    height: 240,
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
    tintColor: COLORS.white
  },
  searchIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.white,
    marginRight: 8,
  },
  menuIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.white
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -72,
    marginLeft: 16,
    marginRight: 16,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  logo: {
    width: 24,
    height: 24,
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
    fontFamily: 'bold',
  },
  title: {
    fontSize: 28,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginTop: 20,
    marginBottom: 12,
  },
  container: {
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.greyscale900,
    fontFamily: 'regular',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  progressView: {
    width: 78,
    height: 32,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    fontSize: 14,
    color: COLORS.white,
    fontFamily: "semiBold"
  },
  daysLeft: {
    fontSize: 12,
    color: COLORS.grayscale700,
    fontFamily: 'regular',
  },
  progressBar: {
    marginTop: 12,
  },
  taskDetailsContainer: {
    marginTop: 24,
    backgroundColor: "#E9F0FF",
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "bold",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: "semiBold",
    textTransform: 'capitalize',
  },
  cardDescription: {
    fontSize: 14,
    color: "#777",
    marginBottom: 10,
    fontFamily: "regular",
  },
  avatars: {
    flexDirection: "row",
    marginBottom: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: -10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconText: {
    marginLeft: 5,
    fontSize: 14,
    color: "#333",
    fontFamily: "regular",
  },
  addIconContainer: {
    height: 58,
    width: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 24,
    right: 16,
    backgroundColor: COLORS.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  uiLibraryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  uiLibraryText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
}); 