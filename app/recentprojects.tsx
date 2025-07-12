import ProjectCard from '@/components/ProjectCard';
import { COLORS, icons, SIZES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme/ThemeProvider';
import { cacheService } from '@/utils/cacheService';
import { Project, ProjectService } from '@/utils/projectServiceWrapper';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, ImageSourcePropType, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RecentProjects = () => {
    const { dark } = useTheme();
    const { user } = useAuth();
    const navigation = useNavigation<NavigationProp<any>>();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Load real projects from database
    const loadProjects = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        
        try {
            setLoading(true);
            const { allProjects } = await ProjectService.getProjectsWithTeamAccess(user.id);
            if (allProjects && allProjects.length > 0) {
                setProjects(allProjects);
            } else {
                setProjects([]);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, [user?.id]);

    // 🚀 WARM CACHE when screen is focused
    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                // Warm cache for instant access to other screens
                setTimeout(() => {
                    cacheService.warmCache(user.id);
                }, 500); // Warm cache after initial load
            }
        }, [user?.id])
    );

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
                console.log('🔍 [RecentProjectsPage] Using cover_image_url:', project.cover_image_url);
                return { uri: project.cover_image_url };
            }
            
            // Check if project has a generated cover image
            if (projectMetadata?.ai_generated_cover?.status === 'completed' && projectMetadata?.ai_generated_cover?.imageUrl) {
                console.log('🔍 [RecentProjectsPage] Using AI generated cover image:', projectMetadata.ai_generated_cover.imageUrl);
                return { uri: projectMetadata.ai_generated_cover.imageUrl };
            }
            
            console.log('🔍 [RecentProjectsPage] Using fallback image for cover:', coverImage);
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
                        Recent Projects ({projects.length})
                    </Text>
                </View>
                <View style={styles.viewContainer}>
                    <TouchableOpacity>
                        <Image
                            source={icons.image2 as ImageSourcePropType}
                            resizeMode='contain'
                            style={styles.imageIcon}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Image
                            source={icons.file2 as ImageSourcePropType}
                            resizeMode='contain'
                            style={[styles.moreIcon, {
                                tintColor: dark ? COLORS.white : COLORS.greyscale900
                            }]}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={dark ? COLORS.white : COLORS.primary} />
                    <Text style={[styles.loadingText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        Loading projects...
                    </Text>
                </View>
            );
        }

        if (projects.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                        No projects found
                    </Text>
                    <Text style={[styles.emptySubtext, { color: dark ? COLORS.gray : COLORS.gray }]}>
                        Create your first project to get started
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView showsVerticalScrollIndicator={false}>
                <FlatList
                    data={projects}
                    keyExtractor={item => item.id}
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
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite }]}>
            <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.tertiaryWhite }]}>
                {renderHeader()}
                {renderContent()}
            </View>
        </SafeAreaView>
    )
}

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
        flexDirection: "row"
    },
    moreIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.black
    },
    imageIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.primary,
        marginRight: 8
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'regular',
        marginTop: 12
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'bold',
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        fontFamily: 'regular',
        textAlign: 'center'
    }
})

export default RecentProjects