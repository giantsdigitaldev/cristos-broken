import HomeTaskCard from '@/components/HomeTaskCard';
import NotificationsModal from '@/components/NotificationsModal';
import OptimizedUserAvatar, { useAvatarCache } from '@/components/OptimizedUserAvatar';
import ProjectCard, { CircularProgress } from '@/components/ProjectCard';
import SearchModal from '@/components/SearchModal';
import SubHeaderItem from '@/components/SubHeaderItem';
import TaskDetailsModal from '@/components/TaskDetailsModal';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useAddProjectModal } from '@/contexts/AddProjectModalContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationContext } from '@/contexts/NotificationContext';
import { useTaskContext } from '@/contexts/TaskContext';
import { useRoutePredictiveCache } from '@/hooks/usePredictiveCache';
import { useTheme } from '@/theme/ThemeProvider';
import { cacheService, useBackgroundRefresh } from '@/utils/cacheService';
import { Project, ProjectService, Task } from '@/utils/projectServiceWrapper';
import { supabase } from '@/utils/supabase';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Image, ImageBackground, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Transform database project to ProjectCard format
const transformProjectForCard = (project: Project) => {
  const metadata = project.metadata || {};
  const totalTasks = metadata.total_tasks || metadata.numberOfTask || 0;
  const completedTasks = metadata.completed_tasks || metadata.numberOfTaskCompleted || 0;
  const daysLeft = metadata.days_left || metadata.numberOfDaysLeft || 0;
  
  // Map database image references to actual images
  const getProjectImage = (coverImage: string, projectMetadata?: any, project?: any) => {
    // Check if project has a cover_image_url (primary location for generated images)
    if (project?.cover_image_url) {
      console.log('🔍 [HomeScreen] Using cover_image_url:', project.cover_image_url);
      return project.cover_image_url;
    }
    
    // Check if project has a generated cover image in metadata
    if (projectMetadata?.ai_generated_cover?.status === 'completed' && projectMetadata?.ai_generated_cover?.imageUrl) {
      console.log('🔍 [HomeScreen] Using AI generated cover image:', projectMetadata.ai_generated_cover.imageUrl);
      return projectMetadata.ai_generated_cover.imageUrl;
    }
    
    console.log('🔍 [HomeScreen] Using fallback image for cover:', coverImage);
    // Fallback to local assets
    const imageMap: { [key: string]: any } = {
      'cover1.png': images.cover1,
      'cover2.png': images.cover2,
      'cover3.png': images.cover3,
      'cover4.png': images.cover4,
      'cover5.png': images.cover5,
      'cover6.png': images.cover6,
      'cover7.png': images.cover7,
    };
    return imageMap[coverImage] || images.cover1;
  };

  const getProjectLogo = (logoImage: string) => {
    const logoMap: { [key: string]: any } = {
      'logo1.png': images.logo1,
      'logo2.png': images.logo2,
      'logo3.png': images.logo3,
      'logo4.png': images.logo4,
      'logo5.png': images.logo5,
      'logo6.png': images.logo6,
      'logo7.png': images.logo7,
    };
    return logoMap[logoImage] || images.logo1;
  };

  // Get team member avatars
  const getTeamAvatars = (teamMembers: any[] | undefined) => {
    if (!teamMembers || !Array.isArray(teamMembers)) {
      return [images.user1, images.user2, images.user3]; // Default avatars
    }
    
    const avatarMap: { [key: string]: any } = {
      'user1.jpeg': images.user1,
      'user2.jpeg': images.user2,
      'user3.jpeg': images.user3,
      'user4.jpeg': images.user4,
      'user5.jpeg': images.user5,
      'user6.png': images.user6,
      'user7.jpeg': images.user7,
      'user8.jpeg': images.user8,
      'user9.jpeg': images.user9,
      'user10.jpeg': images.user10,
      'user11.jpeg': images.user11,
    };
    
    return teamMembers.slice(0, 5).map(member => 
      avatarMap[member.avatar] || images.user1
    );
  };

  return {
    id: project.id,
    name: project.name,
    description: project.description || 'No description available',
    image: getProjectImage(metadata.cover_image, metadata, project),
    status: project.status === 'active' ? 'In Progress' : 
           project.status === 'completed' ? 'Completed' :
           project.status === 'draft' ? 'Draft' : 'Active',
    numberOfTask: totalTasks,
    numberOfTaskCompleted: completedTasks,
    numberOfDaysLeft: daysLeft,
    logo: getProjectLogo(metadata.cover_image),
    members: getTeamAvatars(metadata.team_members),
    endDate: metadata.end_date || new Date().toISOString().split('T')[0],
    budget: metadata.budget,
    projectMetadata: metadata,
    teamMembers: metadata.team_members,
    projectLead: metadata.project_lead
  };
};

const HomeScreen = () => {
  const { dark, colors, isThemeReady } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const { user } = useAuth();
  const { showModal, setOnProjectCreated } = useAddProjectModal();
  const { preloadAvatar } = useAvatarCache();
  const { unreadCount = 0 } = useNotificationContext();
  
  // Scroll animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_MAX_HEIGHT = 200;
  const HEADER_MIN_HEIGHT = 80;
  
  // 🚀 INSTANT LOADING STATE: Show cached data immediately
  const [projects, setProjects] = useState<any[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Today's tasks state management
  const { todayTasks, todayTasksLoading, updateTask, deleteTask, refreshTodayTasks } = useTaskContext();
  const todayTasksData = todayTasks;
  const todayTasksLoadingState = todayTasksLoading;

  // Today's tasks filter state
  const [taskFilter, setTaskFilter] = useState('open');

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Notification count is now handled by NotificationContext

  // Task Details Modal state
  const [showTaskDetailsModal, setShowTaskDetailsModal] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // Notifications Modal state
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // 🚀 PREDICTIVE CACHE: Track home page behavior
  useRoutePredictiveCache('home');

  // 🚀 BACKGROUND REFRESH: Automatically refresh data in background
  const { updateActivity } = useBackgroundRefresh(user?.id || null);

  // 🚀 INSTANT LOADING: Load cached data immediately on mount
  useEffect(() => {
    const loadCachedData = async () => {
      const testUserId = 'c08d6265-7c3c-4f95-ad44-c4d6aaf31e46';
      const userId = user?.id || testUserId;
      
      if (!userId) return;

      try {
        console.log('🚀 Loading cached data for instant display...');
        
        // Load cached projects immediately
        const cachedProjects = await cacheService.get(`user_projects:${userId}`);
        if (cachedProjects && Array.isArray(cachedProjects)) {
          console.log('⚡ Displaying cached projects:', cachedProjects.length);
          const transformedProjects = cachedProjects.map((project: any) => transformProjectForCard(project));
          setProjects(transformedProjects);
        }

        // Load cached notifications (handled by NotificationContext)
        // No need to load cached notifications as NotificationContext handles this

        // Load cached tasks (handled by TaskContext)
        const cachedTasks = await cacheService.get(`user_tasks:${userId}`);
        if (cachedTasks && Array.isArray(cachedTasks)) {
          console.log('⚡ Cached tasks available:', cachedTasks.length);
        }

      } catch (error) {
        console.error('❌ Error loading cached data:', error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadCachedData();
  }, [user?.id]);

  // 🚀 BACKGROUND DATA REFRESH: Refresh data in background without blocking UI
  const refreshDataInBackground = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log('🔄 Refreshing data in background for user:', user.id);
      
      // Refresh projects
      const projects = await ProjectService.getProjects(user.id);
      if (projects && Array.isArray(projects)) {
        const transformedProjects = projects.map((project: any) => transformProjectForCard(project));
        setProjects(transformedProjects);
        
        // Cache the projects for instant loading
        await cacheService.set(`user_projects:${user.id}`, projects);
      }

      // Refresh notifications count (handled by NotificationContext)
      // No need to manually refresh notifications as NotificationContext handles this

      // Refresh today's tasks (handled by TaskContext)
      await refreshTodayTasks();

    } catch (error) {
      console.error('❌ Error refreshing data in background:', error);
    }
  }, [user?.id, refreshTodayTasks]);

  // 🚀 PROJECT CREATION CALLBACK: Refresh projects when new project is created
  useEffect(() => {
    const refreshCallback = () => {
      console.log('🔄 Refreshing home screen projects after new project creation...');
      refreshDataInBackground();
    };
    
    setOnProjectCreated(refreshCallback);
    
    return () => {
      setOnProjectCreated(() => {});
    };
  }, [user?.id, setOnProjectCreated, refreshDataInBackground]);

  // Preload user avatar on mount
  useEffect(() => {
    if (user?.id) {
      preloadAvatar(user.id);
    }
  }, [user?.id, preloadAvatar]);

  // Refresh avatar when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        preloadAvatar(user.id);
      }
    }, [user?.id, preloadAvatar])
  );

  // 🚀 FOCUS EFFECT: Refresh data in background when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Home screen focused, refreshing data in background...');
      
      // Refresh data in background without blocking UI
      setTimeout(() => {
        refreshDataInBackground();
      }, 100); // Small delay to ensure UI is responsive
      
    }, [refreshDataInBackground])
  );

  // Handle refresh
  const onRefresh = useCallback(async () => {
    updateActivity();
    setRefreshing(true);
    await refreshDataInBackground();
    setRefreshing(false);
  }, [refreshDataInBackground, updateActivity]);

  // Get user display name and greeting
  const getUserDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Search modal state
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleSearchIconPress = () => {
    setShowSearchModal(true);
  };

  const handleCloseSearchModal = () => {
    setShowSearchModal(false);
  };



  // Real-time notification subscription - using NotificationContext instead
  // No need for additional notification queries as NotificationContext handles everything

  // Real-time subscription for project updates (including cover image generation)
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔗 Setting up real-time project updates subscription for home page user:', user.id);

    const subscription = supabase
      .channel(`home-projects-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('📋 Project updated via real-time on home page:', payload);
          
          if (payload.new) {
            const updatedProject = payload.new as any;
            
            // Update the project in the local state
            setProjects(prev => {
              const updatedProjects = prev.map(project => {
                if (project.id === updatedProject.id) {
                  // Transform the updated project data
                  const transformedProject = transformProjectForCard(updatedProject);
                  console.log('✅ Project updated in home page UI via real-time:', {
                    id: updatedProject.id,
                    cover_image_url: updatedProject.cover_image_url,
                    ai_generated_cover: updatedProject.metadata?.ai_generated_cover
                  });
                  return transformedProject;
                }
                return project;
              });
              
              return updatedProjects;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('📋 New project created via real-time on home page:', payload);
          
          if (payload.new) {
            const newProject = payload.new as any;
            
            // Add the new project to the local state
            setProjects(prev => {
              const transformedProject = transformProjectForCard(newProject);
              console.log('✅ New project added to home page UI via real-time:', {
                id: newProject.id,
                name: newProject.name
              });
              return [transformedProject, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📋 Project deleted via real-time on home page:', payload);
          
          if (payload.old) {
            const deletedProject = payload.old as any;
            
            // Remove the project from the local state
            setProjects(prev => {
              const updatedProjects = prev.filter(project => project.id !== deletedProject.id);
              console.log('✅ Project removed from home page UI via real-time:', {
                id: deletedProject.id
              });
              return updatedProjects;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Home page projects subscription status:', status);
      });

    // Cleanup subscription on unmount or user change
    return () => {
      console.log('🔌 Cleaning up home page projects subscription');
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Render header with correct layout
  const renderHeader = () => {
    return (
      <View style={styles.headerContainerFixed}> {/* NEW: full-width flex row */}
        {/* Left: Avatar and greeting (flex: 1, maxWidth: 60%) */}
        <View style={styles.headerLeftFixed}>
          <TouchableOpacity onPress={() => navigation.navigate('editprofile')} style={styles.avatarButton}>
            <OptimizedUserAvatar size={40} />
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.headerTitleText, { color: dark ? COLORS.white : COLORS.black }]}>
              {getGreeting() || 'Hello'}
            </Text>
            <Text style={[styles.headerSubtitleText, { color: dark ? COLORS.grayscale700 : COLORS.grayscale700 }]}>
              Welcome back, {getUserDisplayName() || 'User'}
            </Text>
          </View>
        </View>
        {/* Right: Search and notification icons, always at far right */}
        <View style={styles.headerRightFixed}>
          <TouchableOpacity onPress={handleSearchIconPress} style={styles.searchButton}>
            <Image 
              source={icons.search} 
              style={[styles.searchIcon, { tintColor: dark ? COLORS.white : COLORS.black }]} 
              onError={() => {}} // Silent error handling
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNotificationsModal(true)} style={styles.notificationButton}>
            <Image 
              source={icons.notification} 
              style={[styles.notificationIcon, { tintColor: dark ? COLORS.white : COLORS.black }]} 
              onError={() => {}} // Silent error handling
            />
            {unreadCount && unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render main content
  const renderContent = () => (
    <View style={styles.content}>
      {renderRecentProject()}
      {renderTodayTask()}
    </View>
  );

  // 5. Create StatsCard component (reusing Card/CircularProgress, blue overlay, white text)
  /*
  DESIGN RESEARCH COMPLETED:
  ✅ Checked /components/ - Found Card, CircularProgress, and style patterns
  ✅ Checked /theme/colors.ts and constants for color system
  ✅ Checked existing StatsCard implementation for layout and style
  ✅ Confirmed blue stats bar is now inside scrollable content and not sticky
  ✅ DECISION: Place StatsCard above project cards, add spacing between stats charts
  REUSED COMPONENTS:
  - Card (from ProjectCard)
  - CircularProgress (from ProjectCard)
  - COLORS, SIZES (from constants)
  NEW COMPONENTS JUSTIFIED:
  - None (all reused)
  */
  const StatsCard = () => {
    // Calculate completed/total projects
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    // Calculate completed/total tasks (across all projects)
    let totalTasks = 0;
    let completedTasks = 0;
    projects.forEach(p => {
      totalTasks += p.numberOfTask || 0;
      completedTasks += p.numberOfTaskCompleted || 0;
    });
    // Fallback to todayTasksData if no projects
    if (totalProjects === 0 && todayTasksData && todayTasksData.length > 0) {
      totalTasks = todayTasksData.length;
      completedTasks = todayTasksData.filter(t => t.status === 'completed').length;
    }
    return (
      <ImageBackground source={require('../../assets/images/background.jpg')} style={styles.statsCardBg} imageStyle={{ borderRadius: 16 }}>
        <View style={styles.statsOverlayBlue} />
        <View style={styles.statsContentPadded}>
          {/* Left side - Title and subtitle */}
          <View style={styles.statsLeftContent}>
            <Text style={styles.statsTitle}>Project Insights</Text>
            <Text style={styles.statsSubtitle}>Your weekly project performance</Text>
          </View>
          {/* Right side - Charts and stats inline, with more spacing */}
          <View style={styles.statsRightContentSpaced}>
            <View style={[styles.statsItem, { marginRight: 16 }]}>
              <Text style={styles.statsHeader}>Projects</Text>
              <CircularProgress size={32} strokeWidth={4} progress={totalProjects ? (completedProjects/totalProjects)*100 : 0} completed={completedProjects} total={totalProjects} color={COLORS.white} />
            </View>
            <View style={[styles.statsItem, { marginRight: 16 }]}>
              <Text style={styles.statsHeader}>Tasks</Text>
              <CircularProgress size={32} strokeWidth={4} progress={totalTasks ? (completedTasks/totalTasks)*100 : 0} completed={completedTasks} total={totalTasks} color={COLORS.white} />
            </View>
            <View style={styles.statsItem}>
              <Text style={styles.statsHeader}>Flow Score</Text>
              <Text style={styles.flowScore}>87</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    );
  };

  /**
   * render recent project
   */
  const renderRecentProject = () => {
    let content = null;
    if (isInitialLoad && projects.length === 0) {
      content = (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Loading projects...</Text>
        </View>
      );
    } else if (projects.length === 0) {
      content = (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>No projects found. Create your first project!</Text>
          <TouchableOpacity onPress={showModal} style={styles.createProjectButton}>
            <Text style={styles.createProjectButtonText}>Create Project</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      content = (
        <View style={[styles.horizontalSliderContainer, {
          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
          marginHorizontal: -16,
          paddingVertical: 24
        }]}
        >
          <FlatList
            data={projects}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalSliderContent}
            ItemSeparatorComponent={() => <View style={{ width: 0 }} />}
            pagingEnabled
            snapToInterval={SIZES.width}
            decelerationRate="fast"
            renderItem={({ item, index }) => (
              <ProjectCard
                {...item}
                onPress={() => navigation.navigate('projectdetails', { projectId: item.id })}
                customStyles={{
                  card: {
                    marginLeft: index === 0 ? 18 : 0,
                    marginRight: SIZES.padding,
                  },
                }}
              />
            )}
          />
        </View>
      );
    }
    return (
      <View style={[styles.sectionContainer, {
        backgroundColor: dark ? COLORS.dark1 : COLORS.white,
      }]}
      >
        <SubHeaderItem
          title="Recent Projects"
          navTitle="See All"
          onPress={() => navigation.navigate("projects")}
        />
        {content}
      </View>
    );
  };

  /**
   * render today task
   */
  const renderTodayTask = () => {
    const filteredTasks = taskFilter === 'completed'
      ? todayTasksData.filter(task => task.status === 'completed')
      : todayTasksData.filter(task => task.status !== 'completed');

    return (
      <View style={[styles.sectionContainer, { 
        backgroundColor: dark ? COLORS.dark1 : COLORS.white,
      }]}>
        <SubHeaderItem
          title="Today's Tasks"
          icon="checkmark-done-circle-outline"
          activeFilter={taskFilter}
          onFilterChange={setTaskFilter}
        />
        <View style={[styles.horizontalSliderContainer, { 
          backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
          marginHorizontal: -16,
          paddingVertical: 24,
          paddingHorizontal: 16
        }]}>
          {/* 🚀 INSTANT DISPLAY: Show cached tasks immediately */}
          {todayTasksLoadingState && todayTasksData.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                Loading tasks...
              </Text>
            </View>
          ) : todayTasksData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                No tasks for today
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTasks}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <HomeTaskCard 
                  task={item} 
                  onEdit={createTaskEditHandler(item)}
                  onDelete={createTaskDeleteHandler(item.id)}
                  onRefresh={handleTaskRefresh}
                  onPress={() => {
                    setCurrentTaskIndex(index);
                    setShowTaskDetailsModal(true);
                  }}
                />
              )}
              scrollEnabled={false}
              nestedScrollEnabled={false}
            />
          )}
        </View>
      </View>
    );
  };

  // Handle project created callback
  const handleProjectCreated = useCallback(async () => {
    await refreshDataInBackground();
  }, [refreshDataInBackground]);

  // Set up callback to refresh projects when a new project is created
  useEffect(() => {
    setOnProjectCreated(handleProjectCreated);
    
    return () => {
      setOnProjectCreated(() => {});
    };
  }, [setOnProjectCreated, handleProjectCreated]);

  // Create task-specific edit handler
  const createTaskEditHandler = useCallback((task: Task & { project: { id: string } | null }) => {
    return async (field: string, value: any) => {
      if (field === 'refresh' || (typeof value === 'object' && value._refreshTrigger)) {
        await refreshTodayTasks();
        return;
      }
      
      try {
        const updatedTask = await ProjectService.updateTask(task.id, { [field]: value });
        if (updatedTask) {
          updateTask(task.id, { [field]: value });
          // if (field === 'status') { // This line was removed
          //   setCompletedTasks((prev) => ({ ...prev, [task.id]: value === 'completed' })); // This line was removed
          // }
        }
      } catch (error) {
        console.error('Error updating task:', error);
        Alert.alert('Error', 'Failed to update task');
      }
    };
  }, [refreshTodayTasks, updateTask]);

  // Create task-specific delete handler
  const createTaskDeleteHandler = useCallback((taskId: string) => {
    return async () => {
      try {
        const success = await ProjectService.deleteTask(taskId);
        if (success) {
          deleteTask(taskId);
          // setCompletedTasks((prev) => { // This line was removed
          //   const newState = { ...prev };
          //   delete newState[taskId];
          //   return newState;
          // });
        } else {
          Alert.alert('Error', 'Failed to delete task');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        Alert.alert('Error', 'Failed to delete task');
      }
    };
  }, [deleteTask]);

  // Handle task list refresh
  const handleTaskRefresh = useCallback(async () => {
    await refreshTodayTasks();
  }, [refreshTodayTasks]);

  // Task Details Modal handlers
  const handleTaskDetailsUpdate = useCallback((taskId: string, updates: any) => {
    const task = todayTasksData.find(t => t.id === taskId);
    if (task) {
      createTaskEditHandler(task)(Object.keys(updates)[0], Object.values(updates)[0]);
    }
  }, [todayTasksData, createTaskEditHandler]);

  const handleTaskDetailsDelete = useCallback((taskId: string) => {
    createTaskDeleteHandler(taskId)();
    setShowTaskDetailsModal(false);
  }, [createTaskDeleteHandler]);

  // Don't render until theme is ready
  if (!isThemeReady) {
    return (
      <SafeAreaView style={[styles.area, { backgroundColor: COLORS.white }]}>
        <View style={[styles.container, { backgroundColor: COLORS.white }]}>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.headerContainer]}>
          {renderHeader()}
        </Animated.View>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
          }
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 150,
            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
          }}
        >
          <StatsCard />
          {renderContent()}
        </Animated.ScrollView>
        {showTaskDetailsModal && (
          <TaskDetailsModal
            visible={showTaskDetailsModal}
            onClose={() => setShowTaskDetailsModal(false)}
            project={todayTasksData[currentTaskIndex]?.project || null}
            tasks={todayTasksData}
            currentTaskIndex={currentTaskIndex}
            onTaskUpdate={handleTaskDetailsUpdate}
            onTaskDelete={handleTaskDetailsDelete}
          />
        )}
        <SearchModal
          visible={showSearchModal}
          onClose={handleCloseSearchModal}
        />
        <NotificationsModal
          visible={showNotificationsModal}
          onClose={() => setShowNotificationsModal(false)}
        />
      </View>
    </SafeAreaView>
  );
};

HomeScreen.options = {
  headerShown: false,
};
const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.tertiaryWhite,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.tertiaryWhite,
    paddingHorizontal: 4, // Minimal horizontal padding for maximum card width
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 110 : 90 // Account for tab bar height
  },
  headerContainer: {
    flexDirection: 'row',
    width: SIZES.width,
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 4, // Match card edge
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 10, // Match card left edge
    paddingRight: 10, // Align notification icon with card right edge
    paddingVertical: 12,
  },
  avatarButton: {
    padding: 0, // Remove extra padding
    marginRight: 0, // Remove margin
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  viewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeeting: {
    fontSize: 12,
    fontFamily: 'regular',
    color: 'gray',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
  },
  viewNameContainer: {
    marginLeft: 12,
  },
  viewRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 8,
  },
  bookmarkIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
  },
  searchBarContainer: {
    width: SIZES.width - 16, // Wider search bar to match minimal padding
    backgroundColor: COLORS.secondaryWhite,
    padding: 16,
    borderRadius: 12,
    height: 52,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center', // Center the search bar
    
    elevation: 2,
  },
  searchIcon: {
    height: 20,
    width: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
    marginHorizontal: 8,
  },
  filterIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.primary,
  },
  // Loading, error and empty state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'regular',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  createProjectButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createProjectButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  // Clean section container styles without shadows (shadows are on individual cards)
  sectionContainer: {
    marginVertical: 8,
    paddingVertical: 16,
    paddingHorizontal: 2, // Minimal padding for maximum card width
  },
  clearButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
  },
  closeSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  closeSearchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  searchSection: {
    marginBottom: 20,
  },
  searchSectionTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.greyscale900,
    marginBottom: 12,
    paddingHorizontal: 4,

  },
  searchResultItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  searchResultItemTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.greyscale900,
    marginBottom: 4,
  },
  searchResultItemDescription: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.greyScale800,
    marginBottom: 8,
    lineHeight: 20,
  },
  searchResultItemMeta: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.greyScale800,
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontFamily: 'regular',
    color: COLORS.greyScale800,
    textAlign: 'center',
  },
  horizontalSliderContainer: {
    marginBottom: 24,
    minHeight: 340, // Increased from 320 to 340px to accommodate larger cards (320 + margins)
    paddingHorizontal: 0, // Remove horizontal padding to allow full-width cards
  },
  horizontalSliderContent: {
    paddingHorizontal: 0, // Remove horizontal padding to allow full width cards
    paddingLeft: 0, // Ensure first card starts at screen edge with its own margin
  },
  statsCardBg: {
    width: '100%',
    height: 70,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // old overlay, now replaced
  },
  statsOverlayBlue: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    opacity: 0.92,
  },
  statsContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
  },
  statsContentPadded: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.white,
    marginBottom: 2,
  },
  statsSubtitle: {
    fontSize: 11,
    fontFamily: 'regular',
    color: COLORS.white,
    opacity: 0.85,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  statsIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.white,
    marginBottom: 1,
  },
  statsHeader: {
    fontSize: 10,
    fontFamily: 'medium',
    color: COLORS.white,
    marginBottom: 1,
    opacity: 0.9,
  },
  statsLabel: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.white,
    marginTop: 4,
  },
  flowScore: {
    fontSize: 18,
    fontFamily: 'bold',
    color: COLORS.white,
    marginTop: 1,
  },
  searchBarDropContainer: { width: '100%', position: 'relative', zIndex: 50 },
  searchResultsDropContainer: { backgroundColor: COLORS.white, borderRadius: 16, margin: 16, marginTop: 8, shadowColor: COLORS.black, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4, minHeight: 120, maxHeight: '70%' },
  statsLeftContent: {
    flex: 1, // Take up available space on the left
    justifyContent: 'center',
    paddingRight: 16, // Add some spacing from the right content
  },
  statsRightContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  headerSubtitleText: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  searchButton: {
    padding: 8,
    marginRight: 4, // Small gap between search and notification
  },
  notificationButton: {
    padding: 8,
    marginRight: 0, // No extra margin, flush right
    position: 'relative',
  },
  notificationIcon: {
    width: 20,
    height: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'bold',
  },

  content: {
    flex: 1,
  },
  searchBarInlineContainer: { position: 'absolute', top: 0, right: 120, height: 56, zIndex: 100, justifyContent: 'center', backgroundColor: 'transparent' },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    minWidth: 0,
    flexShrink: 0,
  },
  headerContainerFixed: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingRight: 10,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  headerLeftFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '60%',
    minWidth: 0,
  },
  headerRightFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    minWidth: 0,
  },
  statsRightContentSpaced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})

export default HomeScreen

