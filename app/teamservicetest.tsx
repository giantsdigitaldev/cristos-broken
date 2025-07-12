import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { TeamServiceTest, teamServiceHealthCheck } from '@/utils/teamServiceTest';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TeamServiceTestPage = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const [projectId, setProjectId] = useState('');
    const [testEmail, setTestEmail] = useState('test@example.com');
    const [isRunning, setIsRunning] = useState(false);
    const [lastResults, setLastResults] = useState<string>('');

    // Validate UUID format
    const isValidUUID = (uuid: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    };

    // Quick test with sample project ID
    const runQuickTest = async () => {
        if (!projectId.trim()) {
            Alert.alert('Missing Project ID', 'Please enter a project ID to test with');
            return;
        }

        if (!isValidUUID(projectId.trim())) {
            Alert.alert(
                'Invalid Project ID Format', 
                'Project ID must be a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)\n\nRun the test data setup SQL to get a valid project ID.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsRunning(true);
        try {
            const isHealthy = await teamServiceHealthCheck(projectId);
            Alert.alert(
                'Health Check Results',
                isHealthy ? '✅ TeamService is working correctly!' : '❌ TeamService has issues',
                [{ text: 'OK' }]
            );
        } catch (error) {
            Alert.alert('Test Error', `Health check failed: ${error}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Run full test suite
    const runFullTests = async () => {
        if (!projectId.trim()) {
            Alert.alert('Missing Project ID', 'Please enter a project ID to test with');
            return;
        }

        if (!isValidUUID(projectId.trim())) {
            Alert.alert(
                'Invalid Project ID Format', 
                'Project ID must be a valid UUID format.\n\nRun the test data setup SQL to get a valid project ID.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsRunning(true);
        try {
            await TeamServiceTest.runTestsWithAlert(projectId, testEmail);
        } catch (error) {
            Alert.alert('Test Error', `Failed to run tests: ${error}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Navigate to team pages for manual testing
    const navigateToTeamPages = () => {
        if (!projectId.trim()) {
            Alert.alert('Missing Project ID', 'Please enter a project ID first');
            return;
        }

        if (!isValidUUID(projectId.trim())) {
            Alert.alert(
                'Invalid Project ID Format', 
                'Project ID must be a valid UUID format.\n\nRun the test data setup SQL to get a valid project ID.',
                [{ text: 'OK' }]
            );
            return;
        }

        Alert.alert(
            'Navigate to Team Pages',
            'Choose which page to test:',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Team Members', 
                    onPress: () => navigation.navigate('projectdetailsteammenber', { projectId })
                },
                { 
                    text: 'Add Team Member', 
                    onPress: () => navigation.navigate('projectdetailsaddteammenber', { projectId })
                },
                { 
                    text: 'Project Details', 
                    onPress: () => navigation.navigate('projectdetails', { projectId })
                }
            ]
        );
    };

    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons 
                        name="arrow-back" 
                        size={24} 
                        color={dark ? COLORS.white : COLORS.black} 
                    />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, {
                    color: dark ? COLORS.white : COLORS.black
                }]}>TeamService Test</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                
                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Instructions */}
                    <View style={[styles.section, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                    }]}>
                        <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>🧪 TeamService Testing</Text>
                        <Text style={[styles.sectionText, {
                            color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                        }]}>
                            Test the TeamService functionality to ensure everything is working correctly.
                        </Text>
                    </View>

                    {/* Project ID Input */}
                    <View style={[styles.section, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                    }]}>
                        <Text style={[styles.inputLabel, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Project ID (Required)</Text>
                        <TextInput
                            style={[styles.textInput, {
                                backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                                color: dark ? COLORS.white : COLORS.greyscale900,
                                borderColor: dark ? COLORS.dark3 : COLORS.grayscale200
                            }]}
                            placeholder="Enter a project ID to test with..."
                            placeholderTextColor={COLORS.grayscale400}
                            value={projectId}
                            onChangeText={setProjectId}
                        />
                        <Text style={[styles.helperText, {
                            color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                        }]}>
                            💡 You can get a project ID from your Supabase projects table
                        </Text>
                    </View>

                    {/* Test Email Input */}
                    <View style={[styles.section, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                    }]}>
                        <Text style={[styles.inputLabel, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Test Email (Optional)</Text>
                        <TextInput
                            style={[styles.textInput, {
                                backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                                color: dark ? COLORS.white : COLORS.greyscale900,
                                borderColor: dark ? COLORS.dark3 : COLORS.grayscale200
                            }]}
                            placeholder="test@example.com"
                            placeholderTextColor={COLORS.grayscale400}
                            value={testEmail}
                            onChangeText={setTestEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Test Actions */}
                    <View style={[styles.section, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                    }]}>
                        <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>🚀 Test Actions</Text>

                        <TouchableOpacity
                            style={[styles.testButton, {
                                backgroundColor: COLORS.primary,
                                opacity: isRunning ? 0.7 : 1
                            }]}
                            onPress={runQuickTest}
                            disabled={isRunning}
                        >
                            <Ionicons name="flash" size={20} color={COLORS.white} />
                            <Text style={styles.testButtonText}>
                                {isRunning ? 'Running...' : 'Quick Health Check'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.testButton, {
                                backgroundColor: COLORS.success,
                                opacity: isRunning ? 0.7 : 1
                            }]}
                            onPress={runFullTests}
                            disabled={isRunning}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                            <Text style={styles.testButtonText}>
                                {isRunning ? 'Running...' : 'Run Full Test Suite'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.testButton, {
                                backgroundColor: COLORS.info,
                                opacity: isRunning ? 0.7 : 1
                            }]}
                            onPress={navigateToTeamPages}
                            disabled={isRunning}
                        >
                            <Ionicons name="navigate" size={20} color={COLORS.white} />
                            <Text style={styles.testButtonText}>Test Team Pages</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Test Checklist */}
                    <View style={[styles.section, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                    }]}>
                        <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>✅ Manual Test Checklist</Text>
                        
                        {[
                            'Database connection works',
                            'Can retrieve team members',
                            'User search functionality works',
                            'Can send invitations',
                            'Team member pages load correctly',
                            'Add team member page works',
                            'Role management functions',
                            'Member removal works'
                        ].map((item, index) => (
                            <View key={index} style={styles.checklistItem}>
                                <Ionicons 
                                    name="checkbox-outline" 
                                    size={20} 
                                    color={COLORS.grayscale400} 
                                />
                                <Text style={[styles.checklistText, {
                                    color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                                }]}>{item}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Instructions */}
                    <View style={[styles.section, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                    }]}>
                        <Text style={[styles.sectionTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>📋 Testing Instructions</Text>
                        
                        <Text style={[styles.instructionText, {
                            color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                        }]}>
                            1. Run the SQL schema in Supabase (supabase_team_management_schema.sql){'\n'}
                            2. Run the test data setup (utils/testDataSetup.sql){'\n'}
                            3. Get a project ID: SELECT id FROM projects LIMIT 1;{'\n'}
                            4. Enter the UUID project ID above (not &quot;mock-project-1&quot;){'\n'}
                            5. Run the health check first{'\n'}
                            6. If health check passes, run the full test suite{'\n'}
                            7. Test the team pages manually{'\n'}
                            8. Check the console for detailed test results
                        </Text>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        padding: 16
    },
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 20
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: "bold",
        marginLeft: 16
    },
    content: {
        flex: 1
    },
    section: {
        backgroundColor: COLORS.secondaryWhite,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: "bold",
        marginBottom: 8
    },
    sectionText: {
        fontSize: 14,
        fontFamily: "regular",
        lineHeight: 20
    },
    inputLabel: {
        fontSize: 16,
        fontFamily: "semibold",
        marginBottom: 8
    },
    textInput: {
        backgroundColor: COLORS.white,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: "regular",
        borderWidth: 1,
        borderColor: COLORS.grayscale200
    },
    helperText: {
        fontSize: 12,
        fontFamily: "regular",
        marginTop: 4,
        fontStyle: 'italic'
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 12
    },
    testButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontFamily: "semibold",
        marginLeft: 8
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    },
    checklistText: {
        fontSize: 14,
        fontFamily: "regular",
        marginLeft: 8,
        flex: 1
    },
    instructionText: {
        fontSize: 14,
        fontFamily: "regular",
        lineHeight: 20
    }
});

export default TeamServiceTestPage; 