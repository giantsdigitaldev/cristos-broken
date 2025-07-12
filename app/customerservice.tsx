import UserAvatar from '@/components/UserAvatar';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomChat, { ChatMessage } from '../components/CustomChat';
import { COLORS, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

// Customer Service Screen
const CustomerService = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const { colors, dark } = useTheme();

    const handleSendMessage = (message: ChatMessage) => {
        setMessages(prevMessages => [...prevMessages, message]);
    };

    const renderMessage = (message: ChatMessage, index: number) => {
        const isOwnMessage = message.user._id === 1;

        if (isOwnMessage) {
            return (
                <View
                    key={message._id}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        marginVertical: 4,
                    }}>
                    <View
                        style={{
                            backgroundColor: COLORS.primary,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            borderBottomRightRadius: 4,
                            maxWidth: '80%',
                        }}>
                        <Text style={{ color: COLORS.white, fontSize: 14 }}>
                            {message.text}
                        </Text>
                    </View>
                </View>
            );
        } else {
            return (
                <View
                    key={message._id}
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        marginVertical: 4,
                        alignItems: 'flex-end',
                    }}>
                    <UserAvatar
                        size={40}
                        style={{
                            marginRight: 8,
                        }}
                    />
                    <View
                        style={{
                            backgroundColor: COLORS.secondary,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 20,
                            borderBottomLeftRadius: 4,
                            maxWidth: '80%',
                        }}>
                        <Text style={{ color: COLORS.white, fontSize: 14 }}>
                            {message.text}
                        </Text>
                    </View>
                </View>
            );
        }
    };
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar hidden={true} />
            <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Image
                                source={icons.arrowLeft}
                                resizeMode="contain"
                                style={[styles.headerIcon, {
                                    tintColor: dark ? COLORS.white : COLORS.greyscale900
                                }]}
                            />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Customer Service</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: 'center' }}>
                        <TouchableOpacity>
                            <Image
                                source={icons.call}
                                resizeMode="contain"
                                style={[styles.headerIcon, {
                                    tintColor: dark ? COLORS.secondaryWhite : COLORS.greyscale900
                                }]}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ marginLeft: 16 }}>
                            <Image
                                source={icons.moreCircle}
                                resizeMode="contain"
                                style={[styles.headerIcon, {
                                    tintColor: dark ? COLORS.secondaryWhite : COLORS.greyscale900
                                }]}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.chatContainer}>
                    <CustomChat
                        messages={messages}
                        onSend={handleSendMessage}
                        user={{ _id: 1 }}
                        renderMessage={renderMessage}
                        minInputToolbarHeight={0}
                    />
                </View>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    contentContainer: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: "semiBold",
        color: COLORS.black,
        marginLeft: 22
    },
    headerIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        marginRight: 12,
    },
    chatContainer: {
        flex: 1,
    },
});

export default CustomerService;