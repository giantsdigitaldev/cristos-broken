import { View, Text, TouchableOpacity, StyleSheet, Image, ImageSourcePropType, GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';
import React from 'react';
import { COLORS, images } from '../constants';

interface CardProps {
    number: string;
    balance: string;
    date: string;
    onPress?: (event: GestureResponderEvent) => void;
    containerStyle?: StyleProp<ViewStyle>;
}

const Card: React.FC<CardProps> = ({ number, balance, date, onPress, containerStyle }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.container, containerStyle]}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Payment Card</Text>
                <Image
                    source={images.logo as ImageSourcePropType}
                    style={styles.icon}
                />
            </View>
            <Text style={styles.cardNumber}>{number}</Text>
            <View style={styles.footerContainer}>
                <Text style={styles.balance}>${balance}</Text>
                <Text style={styles.date}>{date}</Text>
            </View>
            <Image
                source={images.elipseCard as ImageSourcePropType}
                style={styles.elipseIcon}
            />
            <Image
                source={images.rectangleCard as ImageSourcePropType}
                style={styles.rectangleIcon}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 304,
        height: 200,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        padding: 12,
        marginRight: 16
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    header: {
        fontSize: 12,
        fontFamily: "regular",
        color: "rgba(255,255,255,.8)"
    },
    icon: {
        width: 40,
        height: 24,
        tintColor: COLORS.white
    },
    cardNumber: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.white,
        marginVertical: 32
    },
    footerContainer: {
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "row",
        marginTop: 30
    },
    balance: {
        fontFamily: "semiBold",
        fontSize: 20,
        color: COLORS.white
    },
    date: {
        fontSize: 14,
        fontFamily: "regular",
        color: "rgba(255,255,255,.8)"
    },
    elipseIcon: {
        height: 142,
        width: 142,
        position: "absolute",
        bottom: -22,
        right: 0
    },
    rectangleIcon: {
        height: 132,
        width: 156,
        position: "absolute",
        top: -44,
        left: -44,
        zIndex: -999
    }
});

export default Card;