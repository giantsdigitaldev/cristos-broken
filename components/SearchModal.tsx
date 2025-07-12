import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { ProjectService } from '@/utils/projectServiceWrapper';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import ProjectCard from './ProjectCard';

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Project {
  id: string;
  name: string;
  description: string;
  image: string;
  status: string;
  progress: number;
  team_members: any[];
  category: string;
  priority: string;
  created_at: string;
  numberOfDaysLeft?: number;
  numberOfTask?: number;
  numberOfTaskCompleted?: number;
  logo?: string;
  members?: string[];
  endDate?: string;
  budget?: number;
  projectMetadata?: any;
  projectLead?: string;
}

const SearchModal: React.FC<SearchModalProps> = ({ visible, onClose }) => {
  const { dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Project[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRecentSearches, setShowRecentSearches] = useState(true);

  // Animations
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  
  // Pull-to-dismiss gesture handling
  const translateY = useRef(new Animated.Value(0)).current;
  const [isDismissing, setIsDismissing] = useState(false);
  const [isGestureDismissing, setIsGestureDismissing] = useState(false);

  // Colorful icons for search
  const iconColors = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.success,
    COLORS.warning,
    COLORS.error,
  ];

  // Screen dimensions
  const screenHeight = Dimensions.get('window').height;

  // Animation functions
  const openModal = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
        delay: 50,
      }),
    ]).start();
  };

  const closeModal = () => {
    // Update state immediately for responsive button behavior
    onClose();
    setSearchQuery('');
    setSearchResults([]);
    setShowRecentSearches(true);
    
    // Only animate if not gesture dismissing
    if (!isGestureDismissing) {
      // Animate the modal out of view
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  // Separate function for gesture-based dismissal to prevent double animation
  const dismissWithGesture = () => {
    // Set flag to prevent natural modal animation
    setIsGestureDismissing(true);
    
    // Set modalAnimation to 0 to prevent bounce
    modalAnimation.setValue(0);
    
    // Update state immediately for responsive button behavior
    onClose();
    setSearchQuery('');
    setSearchResults([]);
    setShowRecentSearches(true);
    
    // Reset gesture values
    setIsDismissing(false);
    translateY.setValue(0);
    
    // Reset flag after a short delay to allow modal to close
    setTimeout(() => {
      setIsGestureDismissing(false);
    }, 100);
  };

  // Gesture handling for pull-to-dismiss
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { translationY, velocityY, state } = event.nativeEvent;
    
    if (state === 5) { // END state
      const shouldDismiss = translationY > 80 || (translationY > 50 && velocityY > 500);
      
      if (shouldDismiss) {
        // Dismiss if dragged down more than 80px or with high velocity
        setIsDismissing(true);
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: screenHeight,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          dismissWithGesture();
        });
      } else {
        // Snap back to original position with spring animation
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();
      }
    }
  };

  // Search functionality
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowRecentSearches(true);
      return;
    }

    setShowRecentSearches(false);
    setSearching(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setSearchResults([]);
        return;
      }

      // Get all accessible projects (owned + team projects)
      const { allProjects } = await ProjectService.getProjectsWithTeamAccess(user.id);
      
      // Filter projects based on search query
      const filteredResults = allProjects.filter((project: any) => {
        const searchTerm = query.toLowerCase();
        const projectName = (project.name || '').toLowerCase();
        const projectDescription = (project.description || '').toLowerCase();
        const projectCategory = (project.category || '').toLowerCase();
        
        return projectName.includes(searchTerm) || 
               projectDescription.includes(searchTerm) || 
               projectCategory.includes(searchTerm);
      });

      // Transform projects to match the expected format
      const transformedResults: Project[] = filteredResults.map((project: any) => ({
        id: project.id,
        name: project.name || 'Untitled Project',
        description: project.description || 'No description available',
        image: project.image || 'https://via.placeholder.com/150',
        status: project.status || 'active',
        progress: project.progress || 0,
        team_members: project.team_members || [],
        category: project.category || 'General',
        priority: project.priority || 'medium',
        created_at: project.created_at || new Date().toISOString(),
        numberOfDaysLeft: project.numberOfDaysLeft || 0,
        numberOfTask: project.numberOfTask || 0,
        numberOfTaskCompleted: project.numberOfTaskCompleted || 0,
        logo: project.logo,
        members: project.members,
        endDate: project.endDate,
        budget: project.budget,
        projectMetadata: project.projectMetadata,
        projectLead: project.projectLead,
      }));

      setSearchResults(transformedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle search selection
  const handleSearchSelect = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
    
    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item !== query);
      return [query, ...filtered.slice(0, 4)];
    });
  };

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    closeModal();
    // Navigate to project details
    navigation.navigate('projectdetails', { projectId: project.id });
  };

  // Effects
  useEffect(() => {
    if (visible && !isGestureDismissing) {
      openModal();
    }
  }, [visible, isGestureDismissing]);

  // Reset translateY when modal opens
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  // Render recent search item
  const renderRecentSearchItem = (search: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.recentSearchItem, {
        backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
      }]}
      onPress={() => handleSearchSelect(search)}
    >
      <View style={[styles.recentSearchIcon, { backgroundColor: iconColors[index % iconColors.length] + '20' }]}>
        <Ionicons 
          name="time-outline" 
          size={16} 
          color={iconColors[index % iconColors.length]} 
        />
      </View>
      <Text style={[styles.recentSearchText, {
        color: dark ? COLORS.white : COLORS.greyscale900,
      }]}>
        {search}
      </Text>
      <TouchableOpacity
        style={styles.removeSearchButton}
        onPress={() => {
          setRecentSearches(prev => prev.filter((_, i) => i !== index));
        }}
      >
                 <Ionicons 
           name="close" 
           size={16} 
           color={dark ? COLORS.grayscale400 : COLORS.greyscale600} 
         />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render search result item using the actual ProjectCard
  const renderSearchResultItem = ({ item }: { item: Project }) => (
    <ProjectCard
      key={item.id}
      id={item.id}
      name={item.name || ''}
      description={item.description || ''}
      image={item.image || ''}
      status={item.status || ''}
      numberOfTask={item.numberOfTask ?? 0}
      numberOfTaskCompleted={item.numberOfTaskCompleted ?? 0}
      numberOfDaysLeft={item.numberOfDaysLeft ?? 0}
      logo={item.logo || ''}
      members={item.members || []}
      endDate={item.endDate || ''}
      budget={item.budget ?? 0}
      projectMetadata={item.projectMetadata || {}}
      teamMembers={item.team_members || []}
      projectLead={item.projectLead || ''}
      onPress={() => handleProjectSelect(item)}
    />
  );

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'in_progress':
      case 'ongoing':
        return COLORS.success;
      case 'on_hold':
      case 'pending':
      case 'review':
        return COLORS.warning;
      case 'completed':
        return COLORS.greeen;
      case 'cancelled':
      case 'failed':
      case 'blocked':
        return COLORS.error;
      default:
        return COLORS.success;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={closeModal}>
      <Animated.View style={[
        styles.overlay, 
        { 
          opacity: Animated.multiply(
            overlayOpacity,
            translateY.interpolate({
              inputRange: [0, 200],
              outputRange: [1, 0.3],
              extrapolate: 'clamp',
            })
          )
        }
      ]}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={closeModal} />
      </Animated.View>
      
      <PanGestureHandler 
        onGestureEvent={onGestureEvent} 
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetY={[-10, 10]}
        failOffsetY={[-100, 100]}
        shouldCancelWhenOutside={false}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              transform: [
                {
                  translateY: Animated.add(
                    modalAnimation.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
                    translateY
                  ),
                },
              ],
              // Add subtle opacity change during gesture
              opacity: translateY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0.95],
                extrapolate: 'clamp',
              }),
              // Dynamic shadow during gesture
              shadowOpacity: translateY.interpolate({
                inputRange: [0, 100],
                outputRange: [0.25, 0.1],
                extrapolate: 'clamp',
              }),
              shadowRadius: translateY.interpolate({
                inputRange: [0, 100],
                outputRange: [8, 4],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <Animated.View 
              style={[
                styles.dragIndicator, 
                { 
                  backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                  transform: [
                    {
                      scale: translateY.interpolate({
                        inputRange: [0, 100],
                        outputRange: [1, 1.2],
                        extrapolate: 'clamp',
                      })
                    },
                    {
                      rotate: translateY.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0deg', '5deg'],
                        extrapolate: 'clamp',
                      })
                    }
                  ]
                }
              ]} 
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: iconColors[0] + '20' }]}>
                <Ionicons name="search" size={24} color={iconColors[0]} />
              </View>
              <View>
                <Text style={[styles.title, {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                }]}>
                  Search Projects
                </Text>
                <Text style={[styles.subtitle, {
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                }]}>
                  Find your projects quickly
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons 
                name="close-circle" 
                size={28} 
                color={dark ? COLORS.grayscale400 : COLORS.grayscale700} 
              />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={[styles.searchInputContainer, {
              backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
              borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
            }]}>
                              <Ionicons 
                  name="search" 
                  size={20} 
                  color={dark ? COLORS.grayscale400 : COLORS.greyscale600} 
                  style={styles.searchIcon}
                />
              <TextInput
                style={[styles.searchInput, {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                }]}
                placeholder="Search projects..."
                placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowRecentSearches(true);
                  }}
                >
                  <Ionicons 
                    name="close-circle" 
                    size={20} 
                    color={dark ? COLORS.grayscale400 : COLORS.greyscale600} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {showRecentSearches && recentSearches.length > 0 && (
              <View style={styles.recentSearchesSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons 
                    name="time" 
                    size={18} 
                    color={iconColors[1]} 
                  />
                  <Text style={[styles.sectionTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Recent Searches
                  </Text>
                </View>
                <View style={styles.recentSearchesList}>
                  {recentSearches.map(renderRecentSearchItem)}
                </View>
              </View>
            )}

            {searching && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={[styles.loadingText, {
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                }]}>
                  Searching...
                </Text>
              </View>
            )}

            {!searching && searchResults.length > 0 && (
              <View style={styles.searchResultsSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={18} 
                    color={iconColors[2]} 
                  />
                  <Text style={[styles.sectionTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900,
                  }]}>
                    Search Results ({searchResults.length})
                  </Text>
                </View>
                                 <View style={styles.searchResultsList}>
                   {searchResults.map((item, index) => renderSearchResultItem({ item }))}
                 </View>
              </View>
            )}

            {!searching && searchQuery.length > 0 && searchResults.length === 0 && (
              <View style={styles.noResultsContainer}>
                <View style={[styles.noResultsIcon, { backgroundColor: iconColors[3] + '20' }]}>
                  <Ionicons name="search-outline" size={48} color={iconColors[3]} />
                </View>
                <Text style={[styles.noResultsTitle, {
                  color: dark ? COLORS.white : COLORS.greyscale900,
                }]}>
                  No results found
                </Text>
                <Text style={[styles.noResultsText, {
                  color: dark ? COLORS.grayscale400 : COLORS.grayscale700,
                }]}>
                  Try searching with different keywords
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'regular',
  },
  clearButton: {
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recentSearchesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginLeft: 8,
  },
  recentSearchesList: {
    gap: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  recentSearchIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'regular',
  },
  removeSearchButton: {
    padding: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'regular',
    marginTop: 12,
  },
  searchResultsSection: {
    marginBottom: 24,
  },
  searchResultsList: {
    gap: 12,
  },
  searchResultCard: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultImageContainer: {
    position: 'relative',
    width: '100%',
    height: 80,
  },
  searchResultImage: {
    width: '100%',
    height: '100%',
  },
  searchResultStatusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  searchResultStatusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'medium',
  },
  searchResultTeamOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  searchResultMemberImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
    position: 'absolute',
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultContentSection: {
    gap: 12,
  },
  searchResultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  searchResultTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  searchResultDescription: {
    fontSize: 14,
    fontFamily: 'regular',
    lineHeight: 20,
  },
  searchResultMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchResultCategory: {
    fontSize: 12,
    fontFamily: 'medium',
    color: COLORS.grayscale700,
  },
  searchResultDaysLeft: {
    fontSize: 12,
    fontFamily: 'medium',
    color: COLORS.grayscale700,
  },
  noMembersPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noMembersText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'medium',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 18,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
  },
});

export default SearchModal; 