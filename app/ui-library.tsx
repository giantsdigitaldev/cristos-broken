import { MaterialIcons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Clipboard,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Button from '../components/Button';
import Card from '../components/Card';
import CommentCard from '../components/CommentCard';
import DotsView from '../components/DotsView';
import Input from '../components/Input';
import InviteFriendCard from '../components/InviteFriendCard';
import OrSeparator from '../components/OrSeparator';
import PaymentMethodItem from '../components/PaymentMethodItem';
import SettingsItem from '../components/SettingsItem';
import SocialButton from '../components/SocialButton';
import TaskCard from '../components/TaskCard';
import { COLORS, FONTS, icons, images, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

const { width } = Dimensions.get('window');

const UILibrary = () => {
    const { dark } = useTheme();
    const [activeTab, setActiveTab] = useState('Navigation');
    const [inputValue, setInputValue] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [darkModeEnabled, setDarkModeEnabled] = useState(dark);
    const [checkboxValue, setCheckboxValue] = useState(false);

    const tabs = ['Navigation', 'Layout', 'Forms', 'Cards', 'Lists', 'Buttons', 'Widgets', 'States', 'Icons'];

    const copyToClipboard = (code: string, title: string) => {
        Clipboard.setString(code);
        Alert.alert('Copied!', `${title} code copied to clipboard`);
    };

    const TabButton = ({ title, isActive, onPress }: { title: string; isActive: boolean; onPress: () => void }) => (
        <TouchableOpacity
            style={[
                styles.tabButton,
                {
                    backgroundColor: isActive ? COLORS.primary : 'transparent',
                    borderColor: isActive ? COLORS.primary : (dark ? COLORS.grayscale700 : COLORS.grayscale200),
                }
            ]}
            onPress={onPress}
        >
            <Text style={[
                styles.tabButtonText,
                {
                    color: isActive ? COLORS.white : (dark ? COLORS.white : COLORS.black),
                }
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );

    const ComponentShowcase = ({ title, description, component, code }: any) => (
        <View style={[styles.showcase, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
            <Text style={[styles.showcaseTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                {title}
            </Text>
            <Text style={[styles.showcaseDescription, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                {description}
            </Text>
            <View style={[styles.componentContainer, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}>
                {component}
            </View>
            <View style={[styles.codeBlock, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}>
                <View style={styles.codeHeader}>
                    <Text style={[styles.codeTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                        {title} Code
                    </Text>
                    <TouchableOpacity onPress={() => copyToClipboard(code, title)} style={styles.copyButton}>
                        <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Text style={[styles.codeText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                        {code}
                    </Text>
                </ScrollView>
            </View>
        </View>
    );

    const renderButtonsTab = () => {
        const buttonExamples = [
            {
                title: 'Primary Button',
                description: 'Main action button with filled background',
                component: <Button title="Primary Button" filled={true} onPress={() => {}} />,
                code: `<Button title="Primary Button" filled={true} onPress={() => {}} />`
            },
            {
                title: 'Secondary Button',
                description: 'Secondary action button with outline style',
                component: <Button title="Secondary Button" filled={false} onPress={() => {}} />,
                code: `<Button title="Secondary Button" filled={false} onPress={() => {}} />`
            },
            {
                title: 'Loading Button',
                description: 'Button with loading state',
                component: <Button title="Loading..." filled={true} isLoading={true} onPress={() => {}} />,
                code: `<Button title="Loading..." filled={true} isLoading={true} onPress={() => {}} />`
            },
            {
                title: 'Success Button',
                description: 'Button with success color',
                component: <Button title="Success" filled={true} color={COLORS.success} onPress={() => {}} />,
                code: `<Button title="Success" filled={true} color={COLORS.success} onPress={() => {}} />`
            },
        ];

        return (
            <View>
                {buttonExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderInputsTab = () => {
        const inputExamples = [
            {
                title: 'Basic Input',
                description: 'Standard text input field',
                component: (
                    <Input
                        id="basic"
                        placeholder="Enter your text"
                        onInputChanged={(id, text) => setInputValue(text)}
                    />
                ),
                code: `<Input
    id="basic"
    placeholder="Enter your text"
    onInputChanged={(id, text) => setInputValue(text)}
/>`
            },
            {
                title: 'Email Input',
                description: 'Input field with email icon',
                component: (
                    <Input
                        id="email"
                        placeholder="Email address"
                        icon={icons.email}
                        keyboardType="email-address"
                        onInputChanged={(id, text) => setInputValue(text)}
                    />
                ),
                code: `<Input
    id="email"
    placeholder="Email address"
    icon={icons.email}
    keyboardType="email-address"
    onInputChanged={(id, text) => setInputValue(text)}
/>`
            },
            {
                title: 'Password Input',
                description: 'Secure text input for passwords',
                component: (
                    <Input
                        id="password"
                        placeholder="Password"
                        secureTextEntry={true}
                        icon={icons.lock}
                        onInputChanged={(id, text) => setInputValue(text)}
                    />
                ),
                code: `<Input
    id="password"
    placeholder="Password"
    secureTextEntry={true}
    icon={icons.lock}
    onInputChanged={(id, text) => setInputValue(text)}
/>`
            },
        ];

        return (
            <View>
                {inputExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderCardsTab = () => {
        const cardExamples = [
            {
                title: 'Payment Card',
                description: 'Credit/debit card display component',
                component: (
                    <View style={{ transform: [{ scale: 0.7 }] }}>
                        <Card
                            number="**** **** **** 1234"
                            balance="2,540.00"
                            date="12/25"
                            onPress={() => {}}
                        />
                    </View>
                ),
                code: `<Card
    number="**** **** **** 1234"
    balance="2,540.00"
    date="12/25"
    onPress={() => {}}
/>`
            },
        ];

        return (
            <View>
                {cardExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderIconsTab = () => {
        const iconList = [
            'home', 'search', 'user', 'chat', 'bell', 'heart', 'star', 'settings',
            'calendar', 'email', 'phone', 'location', 'lock', 'unlock', 'trash', 'edit'
        ];

        return (
            <View style={[styles.showcase, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                <Text style={[styles.showcaseTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                    Icon Library
                </Text>
                <Text style={[styles.showcaseDescription, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                    Available icons in the app. Tap to copy icon code.
                </Text>
                <View style={styles.iconGrid}>
                    {iconList.map((iconName, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.iconItem, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}
                            onPress={() => copyToClipboard(`icons.${iconName}`, iconName)}
                        >
                            <Image
                                source={icons[iconName as keyof typeof icons]}
                                style={[styles.iconImage, { tintColor: dark ? COLORS.white : COLORS.black }]}
                            />
                            <Text style={[styles.iconName, { color: dark ? COLORS.white : COLORS.black }]}>
                                {iconName}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderColorsTab = () => {
        const colorPalette = [
            { name: 'Primary', color: COLORS.primary },
            { name: 'Secondary', color: COLORS.secondary },
            { name: 'Success', color: COLORS.success },
            { name: 'Error', color: COLORS.error },
            { name: 'Warning', color: COLORS.warning },
            { name: 'Black', color: COLORS.black },
            { name: 'Gray', color: COLORS.gray },
            { name: 'White', color: COLORS.white },
        ];

        return (
            <View style={[styles.showcase, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                <Text style={[styles.showcaseTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                    Color Palette
                </Text>
                <Text style={[styles.showcaseDescription, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                    Primary colors used throughout the app. Tap to copy color code.
                </Text>
                <View style={styles.colorGrid}>
                    {colorPalette.map((colorItem, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.colorItem}
                            onPress={() => copyToClipboard(`COLORS.${colorItem.name.toLowerCase()}`, colorItem.name)}
                        >
                            <View style={[styles.colorSwatch, { backgroundColor: colorItem.color }]} />
                            <Text style={[styles.colorName, { color: dark ? COLORS.white : COLORS.black }]}>
                                {colorItem.name}
                            </Text>
                            <Text style={[styles.colorValue, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                                {colorItem.color}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderTaskComponentsTab = () => {
        const mockTask = { id: '1', name: 'Complete UI Design', time: '2:30 PM' };
        
        const taskExamples = [
            {
                title: 'Task Card with Checkbox',
                description: 'Interactive task card with completion toggle',
                component: (
                    <TaskCard 
                        task={mockTask}
                        isCompleted={false}
                        onToggle={(id, completed) => console.log('Task toggled:', id, completed)}
                    />
                ),
                code: `<TaskCard 
    task={{ id: '1', name: 'Complete UI Design', time: '2:30 PM' }}
    isCompleted={false}
    onToggle={(id, completed) => console.log('Task toggled:', id, completed)}
/>`
            },
            {
                title: 'Comment Card',
                description: 'Comment card with like functionality and avatar',
                component: (
                    <CommentCard
                        avatar={images.user1}
                        name="Sarah Johnson"
                        comment="Great work on this project! The design looks amazing."
                        date="2024-01-15"
                        numLikes={12}
                    />
                ),
                code: `<CommentCard
    avatar={images.user1}
    name="Sarah Johnson"
    comment="Great work on this project! The design looks amazing."
    date="2024-01-15"
    numLikes={12}
/>`
            },
            {
                title: 'Progress Dots View',
                description: 'Animated progress indicator with dots',
                component: (
                    <DotsView
                        progress={0.6}
                        numDots={5}
                        dotSize={12}
                        activeDotColor={COLORS.primary}
                        dotColor={COLORS.grayscale400}
                    />
                ),
                code: `<DotsView
    progress={0.6}
    numDots={5}
    dotSize={12}
    activeDotColor={COLORS.primary}
    dotColor={COLORS.grayscale400}
/>`
            }
        ];

        return (
            <View>
                {taskExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderSocialAuthTab = () => {
        const socialExamples = [
            {
                title: 'Social Login Buttons',
                description: 'Authentication buttons for social providers',
                component: (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <SocialButton icon={icons.google} onPress={() => {}} />
                        <SocialButton icon={icons.facebook} onPress={() => {}} />
                        <SocialButton icon={icons.appleLogo} onPress={() => {}} tintColor={dark ? COLORS.white : COLORS.black} />
                    </View>
                ),
                code: `<SocialButton icon={icons.google} onPress={() => {}} />
<SocialButton icon={icons.facebook} onPress={() => {}} />
<SocialButton icon={icons.appleLogo} onPress={() => {}} />`
            },
            {
                title: 'Or Separator',
                description: 'Divider line with text for auth forms',
                component: <OrSeparator text="or continue with" />,
                code: `<OrSeparator text="or continue with" />`
            },
            {
                title: 'Invite Friend Card',
                description: 'Contact card with invite functionality',
                component: (
                    <InviteFriendCard
                        name="John Doe"
                        phoneNumber="+1 234 567 8900"
                        avatar={images.user2}
                    />
                ),
                code: `<InviteFriendCard
    name="John Doe"
    phoneNumber="+1 234 567 8900"
    avatar={images.user2}
/>`
            }
        ];

        return (
            <View>
                {socialExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderSettingsTab = () => {
        const settingsExamples = [
            {
                title: 'Settings Item with Arrow',
                description: 'Standard settings row with icon and arrow',
                component: (
                    <SettingsItem
                        icon={icons.user}
                        name="Edit Profile"
                        onPress={() => {}}
                        hasArrowRight={true}
                    />
                ),
                code: `<SettingsItem
    icon={icons.user}
    name="Edit Profile"
    onPress={() => {}}
    hasArrowRight={true}
/>`
            },
            {
                title: 'Settings Item without Arrow',
                description: 'Settings row without navigation arrow',
                component: (
                    <SettingsItem
                        icon={icons.bell}
                        name="Notifications"
                        onPress={() => {}}
                        hasArrowRight={false}
                    />
                ),
                code: `<SettingsItem
    icon={icons.bell}
    name="Notifications"
    onPress={() => {}}
    hasArrowRight={false}
/>`
            },
            {
                title: 'Custom Settings Row with Toggle',
                description: 'Settings row with switch toggle',
                component: (
                    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderRadius: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image source={icons.show} style={[{ width: 24, height: 24, marginRight: 12 }, { tintColor: dark ? COLORS.white : COLORS.black }]} />
                            <Text style={[{ fontSize: 16, fontFamily: 'semiBold' }, { color: dark ? COLORS.white : COLORS.black }]}>Dark Mode</Text>
                        </View>
                        <Switch value={dark} onValueChange={() => {}} trackColor={{ false: COLORS.grayscale400, true: COLORS.primary }} />
                    </View>
                ),
                code: `<View style={styles.toggleRow}>
    <View style={styles.toggleLeft}>
        <Image source={icons.show} style={styles.toggleIcon} />
        <Text style={styles.toggleText}>Dark Mode</Text>
    </View>
    <Switch 
        value={dark} 
        onValueChange={() => {}} 
        trackColor={{ false: COLORS.grayscale400, true: COLORS.primary }} 
    />
</View>`
            }
        ];

        return (
            <View>
                {settingsExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderFormsTab = () => {
        
        const formExamples = [
            {
                title: 'Email Input with Icon',
                description: 'Email input field with validation',
                component: (
                    <Input
                        id="email"
                        placeholder="Enter your email"
                        icon={icons.email}
                        keyboardType="email-address"
                        onInputChanged={(id, text) => setInputValue(text)}
                    />
                ),
                code: `<Input
    id="email"
    placeholder="Enter your email"
    icon={icons.email}
    keyboardType="email-address"
    onInputChanged={(id, text) => setInputValue(text)}
/>`
            },
            {
                title: 'Password Input',
                description: 'Secure password input with lock icon',
                component: (
                    <Input
                        id="password"
                        placeholder="Enter password"
                        icon={icons.padlock}
                        secureTextEntry={true}
                        onInputChanged={(id, text) => setInputValue(text)}
                    />
                ),
                code: `<Input
    id="password"
    placeholder="Enter password"
    icon={icons.padlock}
    secureTextEntry={true}
    onInputChanged={(id, text) => setInputValue(text)}
/>`
            },
            {
                title: 'Search Input',
                description: 'Search input with search icon',
                component: (
                    <Input
                        id="search"
                        placeholder="Search tasks..."
                        icon={icons.search}
                        onInputChanged={(id, text) => setInputValue(text)}
                    />
                ),
                code: `<Input
    id="search"
    placeholder="Search tasks..."
    icon={icons.search}
    onInputChanged={(id, text) => setInputValue(text)}
/>`
            },
            {
                title: 'Phone Input',
                description: 'Phone number input with phone icon',
                component: (
                    <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        icon={icons.call}
                        keyboardType="phone-pad"
                        onInputChanged={(id, text) => setInputValue(text)}
                    />
                ),
                code: `<Input
    id="phone"
    placeholder="+1 (555) 123-4567"
    icon={icons.call}
    keyboardType="phone-pad"
    onInputChanged={(id, text) => setInputValue(text)}
/>`
            },
            {
                title: 'Checkbox with Label',
                description: 'Checkbox component with text label',
                component: (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Checkbox
                            style={{ width: 20, height: 20 }}
                            value={checkboxValue}
                            color={checkboxValue ? COLORS.primary : COLORS.grayscale400}
                            onValueChange={setCheckboxValue}
                        />
                        <Text style={[{ fontSize: 14, fontFamily: 'regular' }, { color: dark ? COLORS.white : COLORS.black }]}>
                            Remember me
                        </Text>
                    </View>
                ),
                code: `<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <Checkbox
        style={{ width: 20, height: 20 }}
        value={checkboxValue}
        color={checkboxValue ? COLORS.primary : COLORS.grayscale400}
        onValueChange={setCheckboxValue}
    />
    <Text style={styles.checkboxLabel}>Remember me</Text>
</View>`
            },
            {
                title: 'Toggle Switch',
                description: 'Switch component for boolean settings',
                component: (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 8, backgroundColor: dark ? COLORS.dark2 : COLORS.white }}>
                        <Text style={[{ fontSize: 16, fontFamily: 'medium' }, { color: dark ? COLORS.white : COLORS.black }]}>
                            Dark Mode
                        </Text>
                        <Switch
                            value={darkModeEnabled}
                            onValueChange={setDarkModeEnabled}
                            trackColor={{ false: COLORS.grayscale200, true: COLORS.primary }}
                            thumbColor={darkModeEnabled ? COLORS.white : COLORS.grayscale400}
                        />
                    </View>
                ),
                code: `<View style={styles.switchContainer}>
    <Text style={styles.switchLabel}>Dark Mode</Text>
    <Switch
        value={darkModeEnabled}
        onValueChange={setDarkModeEnabled}
        trackColor={{ false: COLORS.grayscale200, true: COLORS.primary }}
        thumbColor={darkModeEnabled ? COLORS.white : COLORS.grayscale400}
    />
</View>`
            },
            {
                title: 'Social Login Buttons',
                description: 'Social authentication buttons',
                component: (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                        <SocialButton
                            icon={icons.google}
                            onPress={() => {}}
                        />
                        <SocialButton
                            icon={icons.facebook}
                            onPress={() => {}}
                        />
                        <SocialButton
                            icon={icons.apple}
                            onPress={() => {}}
                        />
                    </View>
                ),
                code: `<View style={styles.socialButtonsContainer}>
    <SocialButton
        icon={icons.google}
        onPress={handleGoogleLogin}
    />
    <SocialButton
        icon={icons.facebook}
        onPress={handleFacebookLogin}
    />
    <SocialButton
        icon={icons.apple}
        onPress={handleAppleLogin}
    />
</View>`
            },
            {
                title: 'Or Separator',
                description: 'Divider component for form sections',
                component: <OrSeparator text="OR" />,
                code: `<OrSeparator text="OR" />`
            }
        ];

        return (
            <View>
                {formExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderWidgetsTab = () => {

        const widgetExamples = [
            {
                title: 'Profile Header Widget',
                description: 'User profile section with avatar and edit button',
                component: (
                    <View style={[{ padding: 20, alignItems: 'center', borderRadius: 12 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <View style={{ position: 'relative' }}>
                            <Image source={images.user1} style={{ width: 80, height: 80, borderRadius: 40 }} />
                            <TouchableOpacity style={[{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: COLORS.primary }]}>
                                <MaterialIcons name="edit" size={12} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[{ fontSize: 20, fontFamily: 'bold', marginTop: 12 }, { color: dark ? COLORS.white : COLORS.black }]}>Sarah Johnson</Text>
                        <Text style={[{ fontSize: 14, fontFamily: 'regular', marginTop: 4 }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>sarah.johnson@email.com</Text>
                    </View>
                ),
                code: `<View style={styles.profileWidget}>
    <View style={styles.avatarContainer}>
        <Image source={images.user1} style={styles.avatar} />
        <TouchableOpacity style={styles.editButton}>
            <MaterialIcons name="edit" size={12} color={COLORS.white} />
        </TouchableOpacity>
    </View>
    <Text style={styles.profileName}>Sarah Johnson</Text>
    <Text style={styles.profileEmail}>sarah.johnson@email.com</Text>
</View>`
            },
            {
                title: 'Task Progress Widget',
                description: 'Progress tracking widget with percentage',
                component: (
                    <View style={[{ padding: 20, borderRadius: 12 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <Text style={[{ fontSize: 18, fontFamily: 'semiBold', marginBottom: 12 }, { color: dark ? COLORS.white : COLORS.black }]}>Task Progress</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[{ fontSize: 14, fontFamily: 'regular' }, { color: dark ? COLORS.white : COLORS.black }]}>8 of 12 tasks completed</Text>
                            <Text style={[{ fontSize: 16, fontFamily: 'bold' }, { color: COLORS.primary }]}>67%</Text>
                        </View>
                        <View style={[{ height: 8, borderRadius: 4, overflow: 'hidden' }, { backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}>
                            <View style={[{ height: '100%', width: '67%', borderRadius: 4 }, { backgroundColor: COLORS.primary }]} />
                        </View>
                    </View>
                ),
                code: `<View style={styles.progressWidget}>
    <Text style={styles.widgetTitle}>Task Progress</Text>
    <View style={styles.progressInfo}>
        <Text style={styles.progressText}>8 of 12 tasks completed</Text>
        <Text style={styles.progressPercent}>67%</Text>
    </View>
    <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: '67%' }]} />
    </View>
</View>`
            },
            {
                title: 'Header with Actions',
                description: 'Page header with logo and action buttons',
                component: (
                    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 8 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image source={images.logo} style={{ width: 32, height: 32, marginRight: 12 }} />
                            <Text style={[{ fontSize: 18, fontFamily: 'bold' }, { color: dark ? COLORS.white : COLORS.black }]}>Dashboard</Text>
                        </View>
                        <TouchableOpacity>
                            <Image source={icons.moreCircle} style={[{ width: 24, height: 24 }, { tintColor: dark ? COLORS.white : COLORS.black }]} />
                        </TouchableOpacity>
                    </View>
                ),
                code: `<View style={styles.headerWidget}>
    <View style={styles.headerLeft}>
        <Image source={images.logo} style={styles.headerLogo} />
        <Text style={styles.headerTitle}>Dashboard</Text>
    </View>
    <TouchableOpacity>
        <Image source={icons.moreCircle} style={styles.headerAction} />
    </TouchableOpacity>
</View>`
            },
            {
                title: 'Step Progress Widget',
                description: 'Dot-based progress indicator for multi-step processes',
                component: (
                    <View style={[{ padding: 20, borderRadius: 12, alignItems: 'center' }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <Text style={[{ fontSize: 16, fontFamily: 'semiBold', marginBottom: 16 }, { color: dark ? COLORS.white : COLORS.black }]}>
                            Step Progress
                        </Text>
                        <DotsView progress={3} numDots={5} />
                        <Text style={[{ fontSize: 12, fontFamily: 'regular', marginTop: 8 }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                            Step 3 of 5
                        </Text>
                    </View>
                ),
                code: `<View style={styles.stepWidget}>
    <Text style={styles.widgetTitle}>Step Progress</Text>
    <DotsView progress={currentStep} numDots={totalSteps} />
    <Text style={styles.stepText}>Step {currentStep} of {totalSteps}</Text>
</View>`
            },
            {
                title: 'Invite Friend Widget',
                description: 'Friend invitation card with avatar and action',
                component: (
                    <View style={{ width: '100%' }}>
                        <InviteFriendCard
                            avatar={images.user1}
                            name="John Doe"
                            phoneNumber="+1 234 567 8900"
                        />
                    </View>
                ),
                code: `<InviteFriendCard
    avatar={user.avatar}
    name={user.name}
    onPress={() => handleInvite(user.id)}
/>`
            },
            {
                title: 'Not Found Widget',
                description: 'Empty state widget with illustration and message',
                component: (
                    <View style={{ width: '100%', padding: 20 }}>
                        <View style={{ alignItems: 'center' }}>
                            <Image
                                source={icons.folder}
                                style={[{ width: 64, height: 64, marginBottom: 16 }, { tintColor: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}
                            />
                            <Text style={[{ fontSize: 18, fontFamily: 'bold', marginBottom: 8 }, { color: dark ? COLORS.white : COLORS.black }]}>
                                Not Found
                            </Text>
                            <Text style={[{ fontSize: 14, fontFamily: 'regular', textAlign: 'center' }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                                Sorry, the keyword you entered cannot be found. Please check again or search with another keyword.
                            </Text>
                        </View>
                    </View>
                ),
                code: `<NotFoundCard />`
            },
            {
                title: 'Date Picker Widget', 
                description: 'Date selection component with modal popup',
                component: (
                    <View style={[{ padding: 20, borderRadius: 12 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <Text style={[{ fontSize: 16, fontFamily: 'semiBold', marginBottom: 12 }, { color: dark ? COLORS.white : COLORS.black }]}>
                            Select Date
                        </Text>
                        <TouchableOpacity 
                            onPress={() => setShowDatePicker(true)}
                            style={[{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1 }, { borderColor: COLORS.grayscale200, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}
                        >
                            <Image source={icons.calendar} style={[{ width: 20, height: 20, marginRight: 12 }, { tintColor: COLORS.primary }]} />
                            <Text style={[{ fontSize: 14, fontFamily: 'regular' }, { color: dark ? COLORS.white : COLORS.black }]}>January 15, 2024</Text>
                        </TouchableOpacity>
                    </View>
                ),
                code: `<View style={styles.dateWidget}>
    <Text style={styles.widgetTitle}>Select Date</Text>
    <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
        <Image source={icons.calendar} style={styles.calendarIcon} />
        <Text style={styles.dateText}>{selectedDate}</Text>
    </TouchableOpacity>
    <DatePickerModal
        open={showDatePicker}
        startDate={startDate}
        selectedDate={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onChangeStartDate={setSelectedDate}
    />
</View>`
            },
            {
                title: 'Payment Method Widget',
                description: 'Selectable payment method with radio button',
                component: (
                    <View style={{ width: '100%' }}>
                        <PaymentMethodItem
                            checked={true}
                            onPress={() => {}}
                            title="Credit Card"
                            icon={icons.creditCard}
                        />
                    </View>
                ),
                code: `<PaymentMethodItem
    checked={selectedMethod === 'card'}
    onPress={() => setSelectedMethod('card')}
    title="Credit Card"
    icon={icons.creditCard}
/>`
            },
            {
                title: 'Statistics Widget',
                description: 'Statistics display with numbers and labels',
                component: (
                    <View style={[{ padding: 20, borderRadius: 12 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <Text style={[{ fontSize: 16, fontFamily: 'semiBold', marginBottom: 16 }, { color: dark ? COLORS.white : COLORS.black }]}>
                            Project Statistics
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={[{ fontSize: 24, fontFamily: 'bold' }, { color: COLORS.primary }]}>24</Text>
                                <Text style={[{ fontSize: 12, fontFamily: 'regular' }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>Total</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={[{ fontSize: 24, fontFamily: 'bold' }, { color: COLORS.success }]}>18</Text>
                                <Text style={[{ fontSize: 12, fontFamily: 'regular' }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>Completed</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Text style={[{ fontSize: 24, fontFamily: 'bold' }, { color: COLORS.warning }]}>6</Text>
                                <Text style={[{ fontSize: 12, fontFamily: 'regular' }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>Pending</Text>
                            </View>
                        </View>
                    </View>
                ),
                code: `<View style={styles.statsWidget}>
    <Text style={styles.widgetTitle}>Project Statistics</Text>
    <View style={styles.statsRow}>
        <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>24</Text>
            <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>18</Text>
            <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>6</Text>
            <Text style={styles.statLabel}>Pending</Text>
        </View>
    </View>
</View>`
            },
            {
                title: 'Notification Badge Widget',
                description: 'Icon with notification badge indicator',
                component: (
                    <View style={[{ padding: 20, borderRadius: 12, alignItems: 'center' }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <View style={{ position: 'relative' }}>
                            <Image source={icons.notification} style={[{ width: 32, height: 32 }, { tintColor: dark ? COLORS.white : COLORS.black }]} />
                            <View style={[{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: COLORS.error }]}>
                                <Text style={{ color: COLORS.white, fontSize: 10, fontFamily: 'bold' }}>3</Text>
                            </View>
                        </View>
                        <Text style={[{ fontSize: 14, fontFamily: 'regular', marginTop: 8 }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                            Notifications
                        </Text>
                    </View>
                ),
                code: `<View style={styles.notificationWidget}>
    <View style={styles.iconContainer}>
        <Image source={icons.notification} style={styles.notificationIcon} />
        <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
        </View>
    </View>
    <Text style={styles.notificationLabel}>Notifications</Text>
</View>`
            }
        ];

        return (
            <View>
                {widgetExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderNavigationTab = () => {
        const searchBarExample = (
            <View style={[{ padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, { backgroundColor: dark ? COLORS.dark3 : COLORS.secondaryWhite }]}>
                <Image source={icons.search2} style={[{ width: 20, height: 20 }, { tintColor: COLORS.gray }]} />
                <Text style={[{ flex: 1, fontSize: 16, fontFamily: 'regular' }, { color: COLORS.gray }]}>Search</Text>
                <Image source={icons.filter} style={[{ width: 20, height: 20 }, { tintColor: COLORS.primary }]} />
            </View>
        );

        const navigationExamples = [
            {
                title: 'Header with Navigation',
                description: 'Page header with back button and actions',
                component: (
                    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 8 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image source={icons.arrowLeft} style={[{ width: 24, height: 24, marginRight: 12 }, { tintColor: dark ? COLORS.white : COLORS.black }]} />
                            <Text style={[{ fontSize: 18, fontFamily: 'bold' }, { color: dark ? COLORS.white : COLORS.black }]}>Page Title</Text>
                        </View>
                        <Image source={icons.moreCircle} style={[{ width: 24, height: 24 }, { tintColor: dark ? COLORS.white : COLORS.black }]} />
                    </View>
                ),
                code: `<View style={styles.header}>
    <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => router.back()}>
            <Image source={icons.arrowLeft} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Page Title</Text>
    </View>
    <TouchableOpacity>
        <Image source={icons.moreCircle} style={styles.actionIcon} />
    </TouchableOpacity>
</View>`
            },
            {
                title: 'Search Bar with Filter',
                description: 'Interactive search input with filter button',
                component: searchBarExample,
                code: `<View style={styles.searchContainer}>
    <Image source={icons.search2} style={styles.searchIcon} />
    <TextInput
        placeholder="Search"
        placeholderTextColor={COLORS.gray}
        style={styles.searchInput}
    />
    <TouchableOpacity>
        <Image source={icons.filter} style={styles.filterIcon} />
    </TouchableOpacity>
</View>`
            },
            {
                title: 'Tab Navigation',
                description: 'Horizontal tab navigation with active states',
                component: (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {['All', 'Active', 'Completed'].map((tab, index) => (
                            <TouchableOpacity key={index} style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 }, { backgroundColor: index === 0 ? COLORS.primary : 'transparent', borderColor: COLORS.primary }]}>
                                <Text style={[{ fontSize: 14, fontFamily: 'medium' }, { color: index === 0 ? COLORS.white : COLORS.primary }]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ),
                code: `{tabs.map((tab, index) => (
    <TouchableOpacity
        key={index}
        style={[
            styles.tab,
            { backgroundColor: activeTab === tab ? COLORS.primary : 'transparent' }
        ]}
        onPress={() => setActiveTab(tab)}
    >
        <Text style={[styles.tabText, { color: activeTab === tab ? COLORS.white : COLORS.primary }]}>
            {tab}
        </Text>
    </TouchableOpacity>
))}`
            }
        ];

        return (
            <View>
                {navigationExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderLayoutTab = () => {
        const layoutExamples = [
            {
                title: 'Section Header',
                description: 'Section header with title and action button',
                component: (
                    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 8 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <Text style={[{ fontSize: 18, fontFamily: 'bold' }, { color: dark ? COLORS.white : COLORS.black }]}>Recent Projects</Text>
                        <TouchableOpacity>
                            <Text style={[{ fontSize: 16, fontFamily: 'bold' }, { color: COLORS.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                ),
                code: `<SubHeaderItem
    title="Recent Projects"
    navTitle="See All"
    onPress={() => navigate('recentprojects')}
/>`
            },
            {
                title: 'Grid Layout',
                description: 'Responsive grid layout for cards',
                component: (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {[1, 2, 3, 4].map((item) => (
                            <View key={item} style={[{ width: (width - 80) / 2, height: 80, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 }]}>
                                <Text style={[{ fontSize: 14, fontFamily: 'medium' }, { color: dark ? COLORS.white : COLORS.black }]}>Item {item}</Text>
                            </View>
                        ))}
                    </View>
                ),
                code: `<View style={styles.gridContainer}>
    {items.map((item, index) => (
        <View key={index} style={styles.gridItem}>
            <Text style={styles.gridItemText}>{item.title}</Text>
        </View>
    ))}
</View>`
            },
            {
                title: 'Card Container',
                description: 'Standard card layout with shadow and padding',
                component: (
                    <View style={[{ padding: 20, borderRadius: 12, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                        <Text style={[{ fontSize: 16, fontFamily: 'semiBold', marginBottom: 8 }, { color: dark ? COLORS.white : COLORS.black }]}>Card Title</Text>
                        <Text style={[{ fontSize: 14, fontFamily: 'regular' }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>Card content goes here with proper spacing and typography.</Text>
                    </View>
                ),
                code: `<View style={styles.card}>
    <Text style={styles.cardTitle}>Card Title</Text>
    <Text style={styles.cardContent}>Card content goes here</Text>
</View>`
            }
        ];

        return (
            <View>
                {layoutExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderStatesTab = () => {
        const stateExamples = [
            {
                title: 'Loading State',
                description: 'Loading indicator for async operations',
                component: (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: COLORS.primary, borderTopColor: 'transparent', marginBottom: 12 }} />
                        <Text style={[{ fontSize: 14, fontFamily: 'regular' }, { color: dark ? COLORS.white : COLORS.black }]}>Loading...</Text>
                    </View>
                ),
                code: `<View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loadingText}>Loading...</Text>
</View>`
            },
            {
                title: 'Empty State',
                description: 'Empty state with illustration and message',
                component: (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <Image source={icons.folder} style={[{ width: 48, height: 48, marginBottom: 12 }, { tintColor: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]} />
                        <Text style={[{ fontSize: 16, fontFamily: 'semiBold', marginBottom: 4 }, { color: dark ? COLORS.white : COLORS.black }]}>No items found</Text>
                        <Text style={[{ fontSize: 14, fontFamily: 'regular', textAlign: 'center' }, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>Try adjusting your search or filters</Text>
                    </View>
                ),
                code: `<View style={styles.emptyState}>
    <Image source={icons.folder} style={styles.emptyIcon} />
    <Text style={styles.emptyTitle}>No items found</Text>
    <Text style={styles.emptySubtitle}>Try adjusting your search</Text>
</View>`
            },
            {
                title: 'Error State',
                description: 'Error state with retry action',
                component: (
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <View style={[{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }, { backgroundColor: COLORS.error }]}>
                            <Text style={{ color: COLORS.white, fontSize: 20, fontFamily: 'bold' }}>!</Text>
                        </View>
                        <Text style={[{ fontSize: 16, fontFamily: 'semiBold', marginBottom: 4 }, { color: dark ? COLORS.white : COLORS.black }]}>Something went wrong</Text>
                        <TouchableOpacity style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginTop: 8 }, { backgroundColor: COLORS.primary }]}>
                            <Text style={{ color: COLORS.white, fontSize: 14, fontFamily: 'medium' }}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ),
                code: `<View style={styles.errorState}>
    <View style={styles.errorIcon}>
        <Text style={styles.errorIconText}>!</Text>
    </View>
    <Text style={styles.errorTitle}>Something went wrong</Text>
    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryText}>Try Again</Text>
    </TouchableOpacity>
</View>`
            }
        ];

        return (
            <View>
                {stateExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderListsTab = () => {
        const listExamples = [
            {
                title: 'Task List Item',
                description: 'Task item with checkbox and details',
                component: (
                    <TaskCard 
                        task={{ id: '1', name: 'Complete UI Design', time: '2:30 PM' }}
                        isCompleted={false}
                        onToggle={(id: string, completed: boolean) => console.log('Task toggled:', id, completed)}
                    />
                ),
                code: `<TaskCard 
    task={{ id: '1', name: 'Complete UI Design', time: '2:30 PM' }}
    isCompleted={false}
    onToggle={(id, completed) => handleToggle(id, completed)}
/>`
            },
            {
                title: 'Settings List Item',
                description: 'Settings row with icon and navigation',
                component: (
                    <SettingsItem
                        icon={icons.user}
                        name="Edit Profile"
                        onPress={() => {}}
                        hasArrowRight={true}
                    />
                ),
                code: `<SettingsItem
    icon={icons.user}
    name="Edit Profile"
    onPress={() => navigate('editprofile')}
    hasArrowRight={true}
/>`
            },
            {
                title: 'Comment Item',
                description: 'Comment with avatar, like, and timestamp',
                component: (
                    <CommentCard
                        avatar={images.user1}
                        name="Sarah Johnson"
                        comment="Great work on this project! The design looks amazing."
                        date="2024-01-15"
                        numLikes={12}
                    />
                ),
                code: `<CommentCard
    avatar={images.user1}
    name="Sarah Johnson"
    comment="Great work on this project!"
    date="2024-01-15"
    numLikes={12}
/>`
            },
            {
                title: 'Settings Item without Arrow',
                description: 'Settings item without navigation arrow',
                component: (
                    <SettingsItem
                        icon={icons.notification}
                        name="Push Notifications"
                        onPress={() => {}}
                        hasArrowRight={false}
                    />
                ),
                code: `<SettingsItem
    icon={icons.notification}
    name="Push Notifications"
    onPress={() => {}}
    hasArrowRight={false}
/>`
            }
        ];

        return (
            <View>
                {listExamples.map((example, index) => (
                    <ComponentShowcase
                        key={index}
                        title={example.title}
                        description={example.description}
                        component={example.component}
                        code={example.code}
                    />
                ))}
            </View>
        );
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'Navigation':
                return renderNavigationTab();
            case 'Layout':
                return renderLayoutTab();
            case 'Forms':
                return renderFormsTab();
            case 'Cards':
                return renderCardsTab();
            case 'Lists':
                return renderListsTab();
            case 'Buttons':
                return renderButtonsTab();
            case 'Widgets':
                return renderWidgetsTab();
            case 'States':
                return renderStatesTab();
            case 'Icons':
                return renderIconsTab();
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.grayscale100 }]}>
            <View style={[styles.header, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Image source={icons.arrowLeft} style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.black }]} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                    UI Component Library
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
                {tabs.map((tab, index) => (
                    <TabButton
                        key={index}
                        title={tab}
                        isActive={activeTab === tab}
                        onPress={() => setActiveTab(tab)}
                    />
                ))}
            </ScrollView>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {renderTabContent()}
                <View style={styles.bottomSpacing} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding3,
        paddingVertical: SIZES.padding2,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200,
    },
    backIcon: {
        width: 24,
        height: 24,
    },
    headerTitle: {
        ...FONTS.h3,
        textAlign: 'center',
    },
    placeholder: {
        width: 24,
    },
    tabContainer: {
        paddingHorizontal: SIZES.padding3,
        paddingVertical: SIZES.padding2,
    },
    tabButton: {
        paddingHorizontal: width < 380 ? SIZES.padding2 : SIZES.padding3,
        paddingVertical: SIZES.padding,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: width < 380 ? 6 : SIZES.padding,
        minWidth: width < 380 ? 70 : 85,
        alignItems: 'center',
    },
    tabButtonText: {
        fontSize: width < 380 ? 12 : 14,
        fontFamily: 'medium',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: SIZES.padding3,
    },
    showcase: {
        borderRadius: 12,
        padding: SIZES.padding3,
        marginBottom: SIZES.padding3,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    showcaseTitle: {
        ...FONTS.h3,
        marginBottom: SIZES.padding,
    },
    showcaseDescription: {
        ...FONTS.body4,
        marginBottom: SIZES.padding3,
    },
    componentContainer: {
        padding: SIZES.padding3,
        borderRadius: 8,
        marginBottom: SIZES.padding3,
        alignItems: 'center',
        minHeight: 60,
        justifyContent: 'center',
    },
    codeBlock: {
        borderRadius: 8,
        padding: SIZES.padding2,
    },
    codeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.padding,
    },
    codeTitle: {
        ...FONTS.body4,
        fontFamily: 'semiBold',
    },
    copyButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SIZES.padding2,
        paddingVertical: 4,
        borderRadius: 6,
    },
    copyButtonText: {
        color: COLORS.white,
        fontSize: 12,
        fontFamily: 'medium',
    },
    codeText: {
        fontSize: width < 380 ? 10 : 12,
        lineHeight: width < 380 ? 16 : 18,
        fontFamily: 'monospace',
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SIZES.padding3,
    },
    iconItem: {
        width: width < 380 ? (width - 50) / 3 - 8 : (width - 60) / 4 - 8,
        alignItems: 'center',
        padding: SIZES.padding2,
        borderRadius: 8,
        marginBottom: SIZES.padding2,
    },
    iconImage: {
        width: 24,
        height: 24,
        marginBottom: 4,
    },
    iconName: {
        fontSize: 10,
        fontFamily: 'medium',
        textAlign: 'center',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: SIZES.padding3,
    },
    colorItem: {
        width: (width - 60) / 3 - 8,
        alignItems: 'center',
        marginBottom: SIZES.padding3,
    },
    colorSwatch: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginBottom: SIZES.padding,
    },
    colorName: {
        ...FONTS.body4,
        fontFamily: 'semiBold',
        marginBottom: 2,
    },
    colorValue: {
        fontSize: 10,
        fontFamily: 'regular',
    },
    typographyContainer: {
        marginBottom: SIZES.padding3,
    },
    typographyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.padding2,
        paddingVertical: SIZES.padding,
    },
    copyText: {
        color: COLORS.primary,
        fontSize: 12,
        fontFamily: 'medium',
    },
    bottomSpacing: {
        height: 50,
    },
});

export default UILibrary; 