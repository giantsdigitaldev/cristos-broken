import ProjectCard from '@/components/ProjectCard';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useAddProjectModal } from '@/contexts/AddProjectModalContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRoutePredictiveCache } from '@/hooks/usePredictiveCache';
import { useTheme } from '@/theme/ThemeProvider';
import { cacheService } from '@/utils/cacheService';
import { Project, ProjectService } from '@/utils/projectServiceWrapper';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Image, ImageSourcePropType, Modal, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';

interface Category {
  id: string;
  name: string;
}

const ProjectPage = () => {
  const { dark } = useTheme();
  const { user } = useAuth(); // Get current user from auth context
  const { showModal, setOnProjectCreated } = useAddProjectModal(); // Use the AddProjectModal context
  const navigation = useNavigation<NavigationProp<any>>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownAnimation] = useState(new Animated.Value(0));
  const [showDeleteAllConfirmation, setShowDeleteAllConfirmation] = useState(false);
  const [deleteAllAnimation] = useState(new Animated.Value(0));
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // 🚀 PREDICTIVE CACHE: Track projects page behavior
  useRoutePredictiveCache('projects');

  // Use ref to prevent infinite loop
  const refreshCallbackRef = useRef<(() => void) | null>(null);

  // Load categories from database
  const loadCategories = useCallback(async () => {
    try {
      // For now, use default categories since we don't have a categories table
      const defaultCategories: Category[] = [
        { id: "1", name: "To Do" },
        { id: "2", name: "In Progress" },
        { id: "3", name: "Completed" },
        { id: "4", name: "Upcoming" }
      ];
      setCategories(defaultCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  }, []);

  // 🚀 LOAD PROJECTS: Use the exact same method as front page
  const loadProjects = useCallback(async () => {
    const testUserId = 'c08d6265-7c3c-4f95-ad44-c4d6aaf31e46';
    const userId = user?.id || testUserId;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { allProjects } = await ProjectService.getProjectsWithTeamAccess(userId);
      if (allProjects && allProjects.length > 0) {
        setProjects(allProjects.map(transformProjectForCard));
      } else {
        setProjects([]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 🚀 OPTIMIZED: Refresh with cache invalidation
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProjects(); // Force refresh bypasses cache
    setRefreshing(false);
  }, [loadProjects]);

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
    loadCategories();
  }, [loadProjects, loadCategories]);

  // Handle focus effect - always refresh to show newly created projects
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        console.log('🔄 Refreshing projects on focus...');
        // Use a direct call to avoid dependency issues
        const userId = user.id;
        ProjectService.getProjectsWithTeamAccess(userId).then(({ allProjects }) => {
          if (allProjects && allProjects.length > 0) {
            setProjects(allProjects.map(transformProjectForCard));
          } else {
            setProjects([]);
          }
        }).catch((error) => {
          // setError('Failed to load projects'); // Removed unused variable
          setProjects([]);
        });
      }
    }, [user?.id]) // Only depend on user ID changes
  );

  // Set up callback to refresh projects when a new project is created
  useEffect(() => {
    const refreshCallback = () => {
      console.log('🔄 Refreshing projects after new project creation...');
      // Use a ref or direct call to avoid dependency issues
      const userId = user?.id || 'c08d6265-7c3c-4f95-ad44-c4d6aaf31e46';
      if (userId) {
        ProjectService.getProjectsWithTeamAccess(userId).then(({ allProjects }) => {
          if (allProjects && allProjects.length > 0) {
            setProjects(allProjects.map(transformProjectForCard));
          } else {
            setProjects([]);
          }
        }).catch((error) => {
          // setError('Failed to load projects'); // Removed unused variable
          setProjects([]);
        });
      }
    };
    
    // Store callback in ref to prevent recreation
    refreshCallbackRef.current = refreshCallback;
    
    // Set the callback in the context
    setOnProjectCreated(refreshCallback);
    
    // Cleanup function to remove callback when component unmounts
    return () => {
      refreshCallbackRef.current = null;
      setOnProjectCreated(() => {}); // Clear the callback
    };
  }, [user?.id, setOnProjectCreated]); // Include setOnProjectCreated in dependencies

  // Real-time subscription for project updates (including cover image generation)
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔗 Setting up real-time project updates subscription for user:', user.id);

    const subscription = supabase
      .channel(`user-projects-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('📋 Project updated via real-time:', payload);
          
          if (payload.new) {
            const updatedProject = payload.new as any;
            
            // Update the project in the local state
            setProjects(prev => {
              const updatedProjects = prev.map(project => {
                if (project.id === updatedProject.id) {
                  // Transform the updated project data
                  const transformedProject = transformProjectForCard(updatedProject);
                  console.log('✅ Project updated in UI via real-time:', {
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
          console.log('📋 New project created via real-time:', payload);
          
          if (payload.new) {
            const newProject = payload.new as any;
            
            // Add the new project to the local state
            setProjects(prev => {
              const transformedProject = transformProjectForCard(newProject);
              console.log('✅ New project added to UI via real-time:', {
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
          console.log('📋 Project deleted via real-time:', payload);
          
          if (payload.old) {
            const deletedProject = payload.old as any;
            
            // Remove the project from the local state
            setProjects(prev => {
              const updatedProjects = prev.filter(project => project.id !== deletedProject.id);
              console.log('✅ Project removed from UI via real-time:', {
                id: deletedProject.id
              });
              return updatedProjects;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 User projects subscription status:', status);
      });

    // Cleanup subscription on unmount or user change
    return () => {
      console.log('🔌 Cleaning up user projects subscription');
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Filter projects based on selected categories
  const filteredProjects = useMemo(() => {
    if (selectedCategories.length === 0) return projects;
    return projects.filter(project => {
      const categoryId = project.projectMetadata?.category_id || "1";
      return selectedCategories.includes(categoryId);
    });
  }, [selectedCategories, projects]);

  // Handle project card press
  const handleProjectPress = (project: any) => {
    navigation.navigate("projectdetails", { projectId: project.id });
  };

  // 🚀 OPTIMIZED: Handle project edit with smart cache invalidation
  const handleProjectEdit = async (project: any, field: string, value: any) => {
    try {
      let updatedProject: Partial<Project>;
      
      if (field === 'name' || field === 'description' || field === 'status') {
        updatedProject = { [field]: value };
      } else {
        // Update metadata field
        updatedProject = {
          metadata: {
            ...project.metadata,
            [field]: value
          }
        };
      }

      const result = await ProjectService.updateProject(project.id, updatedProject);
      if (result) {
        // Update local state immediately
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, ...updatedProject } : p));
        
        // 🚀 Smart cache invalidation - invalidate related caches
        if (user?.id) {
          await cacheService.invalidate(`user_projects:${user.id}`);
          await cacheService.invalidate(`project_details:${project.id}`);
          await cacheService.invalidate(`dashboard_stats:${user.id}`);
          console.log('🗑️ Cache invalidated after project update');
        }
      } else {
        Alert.alert('Error', 'Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      Alert.alert('Error', 'Failed to update project');
    }
  };

  // 🚀 OPTIMIZED: Handle project delete with cache invalidation
  const handleProjectDelete = async (projectId: string) => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ProjectService.deleteProject(projectId);
              if (result) {
                // Update local state immediately
                setProjects(prev => prev.filter(p => p.id !== projectId));
                
                // 🚀 Smart cache invalidation
                if (user?.id) {
                  await cacheService.invalidate(`user_projects:${user.id}`);
                  await cacheService.invalidate(`user_projects_instant:${user.id}`);
                  await cacheService.invalidate(`dashboard_stats:${user.id}`);
                  await cacheService.invalidate(`recent_data:${user.id}`);
                  await cacheService.invalidate(`project_details:${projectId}`);
                  await cacheService.invalidate(`project_full:${projectId}`);
                  await cacheService.invalidate(`project_tasks:${projectId}`);
                  await cacheService.invalidate(`project_comments:${projectId}`);
                  await cacheService.invalidate(`project_files:${projectId}`);
                  
                  // Clear optimized project service caches
                  try {
                    const { OptimizedProjectService } = await import('@/utils/optimizedProjectService');
                    await OptimizedProjectService.clearProjectCache(projectId);
                  } catch (error) {
                    console.warn('⚠️ Error clearing optimized caches:', error);
                  }
                  
                  console.log('🗑️ All caches invalidated after project deletion');
                }
              } else {
                Alert.alert('Error', 'Failed to delete project');
              }
            } catch (error) {
              console.error('Error deleting project:', error);
              Alert.alert('Error', 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  // Define dropdown options
  const dropdownOptions = [
    {
      id: '1',
      title: 'Sort by Name',
      icon: icons.arrowUp,
      onPress: () => {
        setProjects(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name)));
        hideDropdownMenu();
      }
    },
    {
      id: '2',
      title: 'Sort by Date',
      icon: icons.calendar,
      onPress: () => {
        setProjects(prev => [...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        hideDropdownMenu();
      }
    },
    {
      id: '3',
      title: 'Sort by Status',
      icon: icons.settingOutline,
      onPress: () => {
        setProjects(prev => [...prev].sort((a, b) => a.status.localeCompare(b.status)));
        hideDropdownMenu();
      }
    },
    {
      id: '4',
      title: 'Delete all Projects',
      icon: icons.trash,
      onPress: () => {
        hideDropdownMenu();
        showDeleteAllConfirmationModal();
      }
    }
  ];

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        {
          backgroundColor: selectedCategories.includes(item.id)
            ? COLORS.primary
            : dark ? COLORS.dark2 : COLORS.white,
          borderColor: selectedCategories.includes(item.id)
            ? COLORS.primary
            : dark ? COLORS.grayscale700 : COLORS.grayscale200,
        },
      ]}
      onPress={() => toggleCategory(item.id)}
    >
      <Text
        style={[
          styles.categoryText,
          {
            color: selectedCategories.includes(item.id)
              ? COLORS.white
              : dark ? COLORS.white : COLORS.greyscale900,
          },
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const showDropdownMenu = () => {
    setShowDropdown(true);
    Animated.timing(dropdownAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideDropdownMenu = () => {
    Animated.timing(dropdownAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowDropdown(false);
    });
  };

  // Add functions for delete all confirmation modal
  const showDeleteAllConfirmationModal = () => {
    setShowDeleteAllConfirmation(true);
    Animated.timing(deleteAllAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const hideDeleteAllConfirmationModal = () => {
    Animated.timing(deleteAllAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowDeleteAllConfirmation(false);
    });
  };

  // Handle delete all projects (local only)
  const handleDeleteAllForMe = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsDeletingAll(true);
    try {
      console.log('🗑️ Starting deletion of all projects for current user...');
      
      // Get all projects owned by the user
      const { data: ownedProjects, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user projects:', error);
        Alert.alert('Error', 'Failed to fetch projects');
        return;
      }

      if (!ownedProjects || ownedProjects.length === 0) {
        Alert.alert('Info', 'No projects found to delete');
        return;
      }

      console.log(`📊 Found ${ownedProjects.length} projects to delete`);

      // Delete each project using the existing ProjectService
      let deletedCount = 0;
      for (const project of ownedProjects) {
        console.log(`🗑️ Deleting project: ${project.name} (${project.id})`);
        const result = await ProjectService.deleteProject(project.id);
        if (result === true) {
          deletedCount++;
          console.log(`✅ Successfully deleted project: ${project.name}`);
        } else {
          console.log(`❌ Failed to delete project: ${project.name}`);
        }
      }

      // Clear local state
      setProjects([]);
      
      // Clear caches
      if (user.id) {
        console.log('🗑️ Clearing caches...');
        await cacheService.invalidate(`user_projects:${user.id}`);
        await cacheService.invalidate(`user_projects_instant:${user.id}`);
        await cacheService.invalidate(`dashboard_stats:${user.id}`);
        await cacheService.invalidate(`recent_data:${user.id}`);
        console.log('✅ Caches cleared');
      }

      console.log(`✅ Deletion completed: ${deletedCount} projects deleted`);
      Alert.alert('Success', `Deleted ${deletedCount} projects from your account`);
      hideDeleteAllConfirmationModal();

    } catch (error) {
      console.error('❌ Error deleting all projects:', error);
      Alert.alert('Error', 'Failed to delete projects');
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Handle delete all projects (global - for all team members)
  const handleDeleteAllForEveryone = async () => {
    console.log('🔴 [DeleteAll] handleDeleteAllForEveryone called');
    
    // TEMPORARY: Simple alert to test if button is pressed
    Alert.alert('Test', 'Delete for All button was pressed!');
    
    if (!user?.id) {
      console.log('❌ [DeleteAll] User not authenticated');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      console.log('🔄 [DeleteAll] Fetching user projects...');
      
      // Get all projects owned by the user
      const { data: ownedProjects, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ [DeleteAll] Error fetching user projects:', error);
        Alert.alert('Error', 'Failed to fetch projects');
        return;
      }

      if (!ownedProjects || ownedProjects.length === 0) {
        console.log('ℹ️ [DeleteAll] No projects found to delete');
        Alert.alert('Info', 'No projects found to delete');
        return;
      }

      console.log(`📊 [DeleteAll] Found ${ownedProjects.length} projects to delete`);

      // TEMPORARY: Skip confirmation and delete directly for testing
      console.log('🔴 [DeleteAll] TEMPORARY: Skipping confirmation, deleting directly...');
      setIsDeletingAll(true);
      try {
        console.log('🗑️ [DeleteAll] Starting deletion of all projects for everyone...');
        
        // Delete each project using the existing ProjectService
        let deletedCount = 0;
        for (const project of ownedProjects) {
          console.log(`🗑️ [DeleteAll] Deleting project: ${project.name} (${project.id})`);
          const result = await ProjectService.deleteProject(project.id);
          if (result === true) {
            deletedCount++;
            console.log(`✅ [DeleteAll] Successfully deleted project: ${project.name}`);
          } else {
            console.log(`❌ [DeleteAll] Failed to delete project: ${project.name}`);
          }
        }

        // Clear local state
        setProjects([]);
        
        // Clear caches
        if (user.id) {
          console.log('🗑️ [DeleteAll] Clearing caches...');
          await cacheService.invalidate(`user_projects:${user.id}`);
          await cacheService.invalidate(`user_projects_instant:${user.id}`);
          await cacheService.invalidate(`dashboard_stats:${user.id}`);
          await cacheService.invalidate(`recent_data:${user.id}`);
          console.log('✅ [DeleteAll] Caches cleared');
        }

        console.log(`✅ [DeleteAll] Deletion completed: ${deletedCount} projects deleted`);
        Alert.alert('Success', `Deleted ${deletedCount} projects for all team members`);
        hideDeleteAllConfirmationModal();

      } catch (error) {
        console.error('❌ [DeleteAll] Error during deletion:', error);
        Alert.alert('Error', 'Failed to delete projects');
      } finally {
        setIsDeletingAll(false);
      }

      // COMMENTED OUT: Original confirmation flow
      /*
      // Show final confirmation with project count
      console.log('🔄 [DeleteAll] Showing confirmation alert...');
      Alert.alert(
        'Final Confirmation',
        `This will permanently delete ${ownedProjects.length} projects for ALL team members. This action cannot be undone. Are you absolutely sure?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => console.log('❌ [DeleteAll] User cancelled deletion') },
          {
            text: 'Delete for Everyone',
            style: 'destructive',
            onPress: async () => {
              console.log('🔴 [DeleteAll] User confirmed deletion for everyone');
              setIsDeletingAll(true);
              try {
                console.log('🗑️ [DeleteAll] Starting deletion of all projects for everyone...');
                
                // Delete each project using the existing ProjectService
                let deletedCount = 0;
                for (const project of ownedProjects) {
                  console.log(`🗑️ [DeleteAll] Deleting project: ${project.name} (${project.id})`);
                  const result = await ProjectService.deleteProject(project.id);
                  if (result === true) {
                    deletedCount++;
                    console.log(`✅ [DeleteAll] Successfully deleted project: ${project.name}`);
                  } else {
                    console.log(`❌ [DeleteAll] Failed to delete project: ${project.name}`);
                  }
                }

                // Clear local state
                setProjects([]);
                
                // Clear caches
                if (user.id) {
                  console.log('🗑️ [DeleteAll] Clearing caches...');
                  await cacheService.invalidate(`user_projects:${user.id}`);
                  await cacheService.invalidate(`user_projects_instant:${user.id}`);
                  await cacheService.invalidate(`dashboard_stats:${user.id}`);
                  await cacheService.invalidate(`recent_data:${user.id}`);
                  console.log('✅ [DeleteAll] Caches cleared');
                }

                console.log(`✅ [DeleteAll] Deletion completed: ${deletedCount} projects deleted`);
                Alert.alert('Success', `Deleted ${deletedCount} projects for all team members`);
                hideDeleteAllConfirmationModal();

              } catch (error) {
                console.error('❌ [DeleteAll] Error during deletion:', error);
                Alert.alert('Error', 'Failed to delete projects');
              } finally {
                setIsDeletingAll(false);
              }
            }
          }
        ]
      );
      */

    } catch (error) {
      console.error('❌ [DeleteAll] Error fetching projects for deletion:', error);
      Alert.alert('Error', 'Failed to fetch projects');
    }
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={icons.back}
              style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.black }]}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.black }]}>
            Projects
          </Text>
        </View>
        <View style={styles.viewContainer}>
          <TouchableOpacity onPress={showModal}>
            <Image
              source={icons.addPlus}
              style={[styles.imageIcon, { tintColor: COLORS.primary }]}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={showDropdownMenu}>
            <Image
              source={icons.more}
              style={[styles.moreIcon, { tintColor: dark ? COLORS.white : COLORS.black }]}
            />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  /**
   * render content
   */
  const renderContent = () => {
    if (loading && projects.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Loading projects...
          </Text>
        </View>
      );
    }

    if (projects.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Image
            source={icons.document2}
            style={[styles.emptyIcon, { tintColor: dark ? COLORS.gray : COLORS.gray }]}
          />
          <Text style={[styles.emptyTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            No Projects Yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: dark ? COLORS.gray : COLORS.gray }]}>
            Create your first project to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={showModal}
          >
            <Text style={styles.createButtonText}>Create Project</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredProjects}
        keyExtractor={(item, index) => item?.id || `project-${index}`}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={() => (
          <FlatList
            data={categories}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            horizontal
            renderItem={renderCategoryItem}
            style={{ marginBottom: 16 }}
          />
        )}
        renderItem={({ item }) => {
            if (!item) return null; // Guard against undefined items
            
            // Calculate project metrics
            const totalTasks = item.metadata?.total_tasks || 0;
            const completedTasks = item.metadata?.completed_tasks || 0;
            const daysLeft = item.metadata?.days_left || 
              (item.metadata?.end_date ? ProjectService.calculateDaysLeft(item.metadata.end_date) : 0);

            return (
              <ProjectCard
                id={item.id}
                name={item.name}
                description={item.description || ''}
                image={item.metadata?.image || images.projectImage}
                status={item.status}
                numberOfTask={totalTasks}
                numberOfTaskCompleted={completedTasks}
                numberOfDaysLeft={daysLeft}
                logo={item.metadata?.logo || images.logo5}
                members={item.metadata?.members || []}
                endDate={item.metadata?.end_date || new Date().toISOString()}
                onPress={() => handleProjectPress(item)}
                onEdit={(field, value) => handleProjectEdit(item, field, value)}
                onDelete={() => handleProjectDelete(item.id)}
                onRefresh={loadProjects}
                customStyles={{
                  card: {
                    width: SIZES.width - 32,
                    marginLeft: 0,
                  }
                }}
              />
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                No projects found
              </Text>
              <Text style={[styles.emptySubtitle, { color: dark ? COLORS.gray : COLORS.gray }]}>
                Try adjusting your category filters
              </Text>
            </View>
          )}
        />
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite }]}>
      <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite }]}>
        {renderHeader()}
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      </View>

      {/* Dropdown Modal */}
      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="none"
        onRequestClose={hideDropdownMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideDropdownMenu}
        >
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                opacity: dropdownAnimation,
                transform: [
                  {
                    translateY: dropdownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    }),
                  },
                  {
                    scale: dropdownAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {dropdownOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.dropdownOption,
                  {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    borderBottomWidth: index < dropdownOptions.length - 1 ? 1 : 0,
                    borderBottomColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                    borderTopLeftRadius: index === 0 ? 16 : 0,
                    borderTopRightRadius: index === 0 ? 16 : 0,
                    borderBottomLeftRadius: index === dropdownOptions.length - 1 ? 16 : 0,
                    borderBottomRightRadius: index === dropdownOptions.length - 1 ? 16 : 0,
                  },
                ]}
                onPress={option.onPress}
              >
                <Image
                  source={option.icon as ImageSourcePropType}
                  style={[
                    styles.dropdownIcon,
                    { 
                      tintColor: option.id === '4' 
                        ? '#FF6B6B' 
                        : (dark ? COLORS.white : COLORS.greyscale900) 
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.dropdownText,
                    { 
                      color: option.id === '4' 
                        ? '#FF6B6B' 
                        : (dark ? COLORS.white : COLORS.greyscale900) 
                    },
                  ]}
                >
                  {option.title}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Delete All Projects Confirmation Modal */}
      <Modal
        visible={showDeleteAllConfirmation}
        transparent={true}
        animationType="none"
        onRequestClose={hideDeleteAllConfirmationModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideDeleteAllConfirmationModal}
        >
          <Animated.View
            style={[
              styles.confirmationContainer,
              {
                backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                opacity: deleteAllAnimation,
                transform: [
                  {
                    scale: deleteAllAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.confirmationContent}>
              <Ionicons 
                name="warning" 
                size={48} 
                color="#FF6B6B" 
                style={styles.warningIcon}
              />
              <Text style={[styles.confirmationTitle, { 
                color: dark ? COLORS.white : COLORS.greyscale900 
              }]}>
                Delete All Projects
              </Text>
              <Text style={[styles.confirmationMessage, { 
                color: dark ? COLORS.grayscale200 : COLORS.grayscale700 
              }]}>
                Choose how you want to delete all your projects:
              </Text>
              <View style={styles.deleteAllButtons}>
                <TouchableOpacity
                  style={[styles.deleteAllButton, styles.deleteForMeButton, {
                    backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  }]}
                  onPress={handleDeleteAllForMe}
                  disabled={isDeletingAll}
                >
                  <Text style={[styles.deleteAllButtonText, { 
                    color: dark ? COLORS.white : COLORS.greyscale900 
                  }]}>
                    {isDeletingAll ? 'Deleting...' : 'Delete for Me'}
                  </Text>
                  <Text style={[styles.deleteAllButtonSubtext, { 
                    color: dark ? COLORS.grayscale400 : COLORS.greyscale600 
                  }]}>
                    Only deletes from your account
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteAllButton, styles.deleteForAllButton]}
                  onPress={() => {
                    console.log('🔴 [DeleteAll] Delete for All button pressed');
                    console.log('🔴 [DeleteAll] User ID:', user?.id);
                    console.log('🔴 [DeleteAll] isDeletingAll:', isDeletingAll);
                    try {
                      handleDeleteAllForEveryone();
                    } catch (error) {
                      console.error('❌ [DeleteAll] Error in button press handler:', error);
                    }
                  }}
                  disabled={isDeletingAll}
                >
                  <Text style={styles.deleteForAllButtonText}>
                    {isDeletingAll ? 'Deleting...' : 'Delete for All'}
                  </Text>
                  <Text style={styles.deleteForAllButtonSubtext}>
                    Deletes for all team members
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.cancelButton, {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                }]}
                onPress={hideDeleteAllConfirmationModal}
                disabled={isDeletingAll}
              >
                <Text style={[styles.cancelButtonText, { 
                  color: dark ? COLORS.white : COLORS.greyscale900 
                }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
};

// Transform database project to ProjectCard format (same as front page)
const transformProjectForCard = (project: Project) => {
  const metadata = project.metadata || {};
  
  // Map database image references to actual images
  const getProjectImage = (coverImage: string, projectMetadata?: any, project?: any) => {
    // Debug logging to see what's in the metadata
    console.log('🔍 [ProjectsPage] Project metadata:', projectMetadata);
    console.log('🔍 [ProjectsPage] AI generated cover:', projectMetadata?.ai_generated_cover);
    console.log('🔍 [ProjectsPage] Cover image URL:', projectMetadata?.ai_generated_cover?.imageUrl);
    console.log('🔍 [ProjectsPage] Cover status:', projectMetadata?.ai_generated_cover?.status);
    console.log('🔍 [ProjectsPage] Project cover_image_url:', project?.cover_image_url);
    
    // Check if project has a cover_image_url (primary location for generated images)
    if (project?.cover_image_url) {
      console.log('🔍 [ProjectsPage] Using cover_image_url:', project.cover_image_url);
      return project.cover_image_url;
    }
    
    // Check if project has a generated cover image
    if (projectMetadata?.ai_generated_cover?.status === 'completed' && projectMetadata?.ai_generated_cover?.imageUrl) {
      console.log('🔍 [ProjectsPage] Using AI generated cover image:', projectMetadata.ai_generated_cover.imageUrl);
      return projectMetadata.ai_generated_cover.imageUrl; // Return the URL string directly
    }
    
    console.log('🔍 [ProjectsPage] Using fallback image for cover:', coverImage);
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
  
  return {
    id: project.id,
    name: project.name || 'Untitled Project',
    description: project.description || '',
    status: project.status || 'active',
    created_at: project.created_at || new Date().toISOString(),
    updated_at: project.updated_at || new Date().toISOString(),
    numberOfTask: metadata.total_tasks || 0,
    numberOfTaskCompleted: metadata.completed_tasks || 0,
    metadata: {
      ...metadata,
      total_tasks: metadata.total_tasks || 0,
      completed_tasks: metadata.completed_tasks || 0,
      days_left: metadata.days_left || 0,
      end_date: metadata.end_date || new Date().toISOString(),
      image: getProjectImage(metadata.cover_image, metadata, project),
      logo: metadata.logo || null,
      members: metadata.members || [],
      category_id: metadata.category_id || "1"
    }
  };
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16
  },
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    marginBottom: 16
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.black,
    marginLeft: 16
  },
  viewContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black,
    marginLeft: 12
  },
  imageIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.primary,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'regular'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50
  },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'regular',
    textAlign: 'center',
    marginBottom: 24
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'semiBold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 16,
  },
  dropdownContainer: {
    borderRadius: 16,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: 'medium',
  },
  // Add new styles for delete all confirmation modal
  confirmationContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmationContent: {
    padding: 24,
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteAllButtons: {
    width: '100%',
    marginBottom: 16,
  },
  deleteAllButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  deleteForMeButton: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  deleteForAllButton: {
    backgroundColor: '#FF6B6B',
  },
  deleteAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deleteAllButtonSubtext: {
    fontSize: 12,
    fontWeight: '400',
  },
  deleteForAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  deleteForAllButtonSubtext: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.white,
    opacity: 0.8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectPage;