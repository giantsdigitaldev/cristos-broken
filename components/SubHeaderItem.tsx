import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { GestureResponderEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface SubHeaderItemProps {
    title: string;
    onPress?: (event: GestureResponderEvent) => void;
    navTitle?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    activeFilter?: string;
    onFilterChange?: (filter: string) => void;
}

const SubHeaderItem: React.FC<SubHeaderItemProps> = ({ 
    title, 
    onPress, 
    navTitle, 
    icon,
    activeFilter,
    onFilterChange 
}) => {
    const { dark } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.titleContainer}>
                {icon && <Ionicons name={icon} size={22} color={dark ? COLORS.white : COLORS.greyscale900} style={{ marginRight: 8 }} />}
                <Text style={[styles.title, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>{title}</Text>
            </View>
            <View style={styles.rightContainer}>
                {onFilterChange && (
                    <>
                        <TouchableOpacity onPress={() => onFilterChange('open')}>
                            <Text style={[styles.filterText, activeFilter === 'open' && styles.activeFilter]}>Open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onFilterChange('completed')}>
                            <Text style={[styles.filterText, activeFilter === 'completed' && styles.activeFilter]}>Completed</Text>
                        </TouchableOpacity>
                    </>
                )}
                {navTitle && onPress && (
                    <TouchableOpacity onPress={onPress}>
                        <Text style={styles.navTitle}>{navTitle}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIZES.width - 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 16,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.black,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterText: {
        fontSize: 14,
        fontFamily: 'regular',
        color: COLORS.grayscale700,
        marginHorizontal: 8,
    },
    activeFilter: {
        fontFamily: 'bold',
        color: COLORS.primary,
    },
    navTitle: {
        fontSize: 16,
        fontFamily: 'bold',
        color: COLORS.primary,
        marginLeft: 12,
    },
});

export default SubHeaderItem;