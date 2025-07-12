import NotFoundCard from '@/components/NotFoundCard';
import ProjectCard from '@/components/ProjectCard';
import TaskCard from '@/components/TaskCard';
import { COLORS, icons, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { Project, ProjectService, Task } from '@/utils/projectServiceWrapper';
import { supabase } from '@/utils/supabase';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Search = () => {
    const { dark, colors } = useTheme();
    const { user } = useAuth();
    const navigation = useNavigation<NavigationProp<any>>();
    const [selectedTab, setSelectedTab] = useState('Projects');
    const [searchQuery, setSearchQuery] = useState('');
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<(Task & { project: Project | null })[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<(Task & { project: Project | null })[]>([]);
    const [resultsCount, setResultsCount] = useState(0);
    const [completedTasks, setCompletedTasks] = useState<{ [key: string]: boolean }>({});
    const [loading, setLoading] = useState(true);

    // Load real data from database
    const loadData = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            
            // Load projects
            const { allProjects } = await ProjectService.getProjectsWithTeamAccess(user.id);
            setProjects(allProjects || []);
            
            // Load tasks with project information
            const allTasks = await ProjectService.getAllTasksForUser(user?.id || '');
            const tasksWithProjects = allTasks.map(task => ({
              ...task,
              project: null // We'll need to fetch project data separately if needed
            }));
            setTasks(tasksWithProjects);
            
        } catch (error) {
            console.error('Error loading data:', error);
            setProjects([]);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.id]);

    // Real-time subscription for project updates (including cover image generation)
    useEffect(() => {
        if (!user?.id) return;

        console.log('🔗 Setting up real-time project updates subscription for search page user:', user.id);

        const subscription = supabase
            .channel(`search-projects-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'projects',
                    filter: `user_id=eq.${user.id}`
                },
                async (payload: any) => {
                    console.log('📋 Project updated via real-time on search page:', payload);
                    
                    if (payload.new) {
                        const updatedProject = payload.new as any;
                        
                        // Update the project in the local state
                        setProjects(prev => {
                            const updatedProjects = prev.map(project => {
                                if (project.id === updatedProject.id) {
                                    console.log('✅ Project updated in search page UI via real-time:', {
                                        id: updatedProject.id,
                                        cover_image_url: updatedProject.cover_image_url,
                                        ai_generated_cover: updatedProject.metadata?.ai_generated_cover
                                    });
                                    return updatedProject;
                                }
                                return project;
                            });
                            
                            return updatedProjects;
                        });
                    }
                }
            )
            .subscribe((status: any) => {
                console.log('📡 Search page projects subscription status:', status);
            });

        // Cleanup subscription on unmount or user change
        return () => {
            console.log('🔌 Cleaning up search page projects subscription');
            subscription.unsubscribe();
        };
    }, [user?.id]);

    const handleToggle = (id: string, completed: boolean) => {
        setCompletedTasks((prev) => ({ ...prev, [id]: completed }));
    };

    // Handle task list refresh (for reassignment)
    const handleRefresh = async () => {
        try {
            console.log('🔄 Refreshing task list due to reassignment...');
            const allTasks = await ProjectService.getAllTasksForUser(user?.id || '');
            const tasksWithProjects = allTasks.map(task => ({
              ...task,
              project: null
            }));
            setTasks(tasksWithProjects);
            console.log(`✅ Task list refreshed: ${allTasks.length} tasks`);
        } catch (error) {
            console.error("Error refreshing tasks:", error);
        }
    };

    useEffect(() => {
        handleSearch();
    }, [searchQuery, selectedTab, projects, tasks]);

    const handleSearch = () => {
        if (selectedTab === 'Projects') {
            const filtered = projects.filter((project) =>
                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredProjects(filtered);
            setResultsCount(filtered.length);
        } else if (selectedTab === 'Tasks') {
            const filtered = tasks.filter((task) =>
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
            setFilteredTasks(filtered);
            setResultsCount(filtered.length);
        }
    };

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
                console.log('🔍 [SearchPage] Using cover_image_url:', project.cover_image_url);
                return { uri: project.cover_image_url };
            }
            
            // Check if project has a generated cover image
            if (projectMetadata?.ai_generated_cover?.status === 'completed' && projectMetadata?.ai_generated_cover?.imageUrl) {
                console.log('🔍 [SearchPage] Using AI generated cover image:', projectMetadata.ai_generated_cover.imageUrl);
                return { uri: projectMetadata.ai_generated_cover.imageUrl };
            }
            
            console.log('🔍 [SearchPage] Using fallback image for cover:', coverImage);
            // Fallback to local assets
            const imageMap: { [key: string]: any } = {
                'cover1.png': require('@/assets/images/covers/cover1.png'),
                'cover2.png': require('@/assets/images/covers/cover2.png'),
                'cover3.png': require('@/assets/images/covers/cover3.png'),
                'cover4.png': require('@/assets/images/covers/cover4.png'),
                'cover5.png': require('@/assets/images/covers/cover5.png'),
                'cover6.png': require('@/assets/images/covers/cover6.png'),
                'cover7.png': require('@/assets/images/covers/cover7.png'),
            };
            return imageMap[coverImage] || require('@/assets/images/covers/cover1.png');
        };

        const getProjectLogo = (logoImage: string) => {
            const logoMap: { [key: string]: any } = {
                'logo1.png': require('@/assets/images/projectlogos/logo1.png'),
                'logo2.png': require('@/assets/images/projectlogos/logo2.png'),
                'logo3.png': require('@/assets/images/projectlogos/logo3.png'),
                'logo4.png': require('@/assets/images/projectlogos/logo4.png'),
                'logo5.png': require('@/assets/images/projectlogos/logo5.png'),
                'logo6.png': require('@/assets/images/projectlogos/logo6.png'),
                'logo7.png': require('@/assets/images/projectlogos/logo7.png'),
            };
            return logoMap[logoImage] || require('@/assets/images/projectlogos/logo1.png');
        };

        // Get team member avatars
        const getTeamAvatars = (teamMembers: any[]) => {
            if (!teamMembers || !Array.isArray(teamMembers)) {
                return [
                    require('@/assets/images/users/user1.jpeg'),
                    require('@/assets/images/users/user2.jpeg'),
                    require('@/assets/images/users/user3.jpeg')
                ];
            }
            
            const avatarMap: { [key: string]: any } = {
                'user1.jpeg': require('@/assets/images/users/user1.jpeg'),
                'user2.jpeg': require('@/assets/images/users/user2.jpeg'),
                'user3.jpeg': require('@/assets/images/users/user3.jpeg'),
                'user4.jpeg': require('@/assets/images/users/user4.jpeg'),
                'user5.jpeg': require('@/assets/images/users/user5.jpeg'),
                'user6.jpeg': require('@/assets/images/users/user6.jpeg'),
                'user7.jpeg': require('@/assets/images/users/user7.jpeg'),
                'user8.jpeg': require('@/assets/images/users/user8.jpeg'),
                'user9.jpeg': require('@/assets/images/users/user9.jpeg'),
                'user10.jpeg': require('@/assets/images/users/user10.jpeg'),
                'user11.jpeg': require('@/assets/images/users/user11.jpeg'),
            };
            
            return (teamMembers || []).slice(0, 5).map(member => 
                avatarMap[member.avatar] || require('@/assets/images/users/user1.jpeg')
            );
        };

        return {
            id: project.id,
            name: project.name,
            description: project.description || 'No description available',
            image: getProjectImage(metadata.cover_image, project.metadata, project),
            status: project.status === 'active' ? 'In Progress' : 
                   project.status === 'completed' ? 'Completed' :
                   project.status === 'draft' ? 'Draft' : 'Active',
            numberOfTask: totalTasks,
            numberOfTaskCompleted: completedTasks,
            numberOfDaysLeft: daysLeft,
            logo: getProjectLogo(metadata.cover_image),
            members: getTeamAvatars(metadata.team_members),
            endDate: metadata.end_date || new Date().toISOString().split('T')[0],
        };
    };

    /**
    * Render header
    */
    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}>
                        <Image
                            source={icons.back as ImageSourcePropType}
                            resizeMode='contain'
                            style={[styles.backIcon, {
                                tintColor: dark ? COLORS.white : COLORS.greyscale900
                            }]}
                        />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>
                        Search
                    </Text>
                </View>
                <TouchableOpacity>
                    <Image
                        source={icons.moreCircle as ImageSourcePropType}
                        resizeMode='contain'
                        style={[styles.moreIcon, {
                            tintColor: dark ? COLORS.white : COLORS.greyscale900
                        }]}
                    />
                </TouchableOpacity>
            </View>
        )
    }

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={dark ? COLORS.white : COLORS.primary} />
                    <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        Loading data...
                    </Text>
                </View>
            );
        }

        return (
            <View>
                {/* Search Bar */}
                <View
                    style={[styles.searchBarContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite,
                        marginBottom: 12
                    }]}>
                    <TouchableOpacity
                        onPress={handleSearch}>
                        <Image
                            source={icons.search2}
                            resizeMode='contain'
                            style={styles.searchIcon}
                        />
                    </TouchableOpacity>
                    <TextInput
                        placeholder='Search'
                        placeholderTextColor={COLORS.gray}
                        style={[styles.searchInput, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                    />
                    <TouchableOpacity>
                        <Image
                            source={icons.filter}
                            resizeMode='contain'
                            style={styles.filterIcon}
                        />
                    </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Tab bar container */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabBtn, selectedTab === 'Projects' && styles.selectedTab]}
                            onPress={() => {
                                setSelectedTab('Projects');
                                setSearchQuery(''); // Clear search query when changing tab
                            }}
                        >
                            <Text
                                style={[styles.tabBtnText, selectedTab === 'Projects' && styles.selectedTabText]}
                            >
                                Projects</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabBtn, selectedTab === 'Tasks' && styles.selectedTab]}
                            onPress={() => {
                                setSelectedTab('Tasks');
                                setSearchQuery(''); // Clear search query when changing tab
                            }}
                        >
                            <Text
                                style={[styles.tabBtnText, selectedTab === 'Tasks' && styles.selectedTabText]}
                            >Tasks</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Results container  */}
                    <View style={{ backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite }}>
                        {
                            searchQuery && (
                                <View style={styles.resultContainer}>
                                    <View style={styles.resultLeftView}>
                                        <Text style={[styles.subtitle, {
                                            color: dark ? COLORS.white : COLORS.greyscale900
                                        }]}>Results for &quot;</Text>
                                        <Text style={[styles.subtitle, { color: COLORS.primary }]}>{searchQuery}</Text>
                                        <Text style={styles.subtitle}>&quot;</Text>
                                    </View>
                                    <Text style={styles.subResult}>{resultsCount} found</Text>
                                </View>
                            )
                        }

                        {/* result list */}
                        <View style={{ marginVertical: 16 }}>
                            {resultsCount && resultsCount > 0 ? (
                                selectedTab === 'Projects' ? (
                                    <FlatList
                                        data={filteredProjects}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item }) => {
                                            const transformedProject = transformProjectForCard(item);
                                            return (
                                                <ProjectCard
                                                    id={transformedProject.id}
                                                    name={transformedProject.name}
                                                    description={transformedProject.description}
                                                    image={transformedProject.image}
                                                    status={transformedProject.status}
                                                    numberOfTask={transformedProject.numberOfTask}
                                                    numberOfTaskCompleted={transformedProject.numberOfTaskCompleted}
                                                    numberOfDaysLeft={transformedProject.numberOfDaysLeft}
                                                    logo={transformedProject.logo}
                                                    members={transformedProject.members}
                                                    endDate={transformedProject.endDate}
                                                    customStyles={{
                                                        card: {
                                                            width: SIZES.width - 32
                                                        }
                                                    }}
                                                    onPress={() => navigation.navigate("projectdetails", { projectId: item.id })}
                                                />
                                            );
                                        }}
                                    />
                                ) : (
                                    <FlatList
                                        data={filteredTasks}
                                        keyExtractor={(item) => item.id}
                                        renderItem={({ item, index }) => (
                                            <TaskCard 
                                                task={item} 
                                                isCompleted={!!completedTasks[item.id]} 
                                                onToggle={handleToggle}
                                                onRefresh={handleRefresh}
                                                index={index}
                                                totalTasks={filteredTasks.length}
                                            />
                                        )}
                                    />
                                )
                            ) : (
                                <NotFoundCard />
                            )}
                        </View>
                    </View>
                </ScrollView>
            </View>
        )
    }
    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <View>
                    {renderContent()}
                </View>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16,
    },
    headerContainer: {
        flexDirection: "row",
        width: SIZES.width - 32,
        justifyContent: "space-between",
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    backIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'bold',
        color: COLORS.black,
        marginLeft: 16,
    },
    moreIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.black,
    },
    searchBarContainer: {
        width: SIZES.width - 32,
        backgroundColor: COLORS.secondaryWhite,
        padding: 16,
        borderRadius: 12,
        height: 52,
        flexDirection: "row",
        alignItems: "center"
    },
    searchIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.gray
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: "regular",
        marginHorizontal: 8
    },
    filterIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.primary
    },
    tabContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: SIZES.width - 32,
        justifyContent: "space-between"
    },
    tabBtn: {
        width: (SIZES.width - 32) / 2 - 6,
        height: 42,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.4,
        borderColor: COLORS.primary,
        borderRadius: 32
    },
    selectedTab: {
        width: (SIZES.width - 32) / 2 - 6,
        height: 42,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.4,
        borderColor: COLORS.primary,
        borderRadius: 32
    },
    tabBtnText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.primary,
        textAlign: "center"
    },
    selectedTabText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.white,
        textAlign: "center"
    },
    resultContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: SIZES.width - 32,
        marginVertical: 16,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.black,
    },
    subResult: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.primary
    },
    resultLeftView: {
        flexDirection: "row"
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.primary,
        marginTop: 16,
    },
})
export default Search