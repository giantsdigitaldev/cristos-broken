import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from './colors';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
    dark: boolean;
    colors: typeof lightColors;
    setScheme: (scheme: ColorScheme) => void;
    isThemeReady: boolean;
}

const defaultThemeContext: ThemeContextType = {
    dark: false,
    colors: lightColors,
    setScheme: () => {},
    isThemeReady: false,
};

export const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = React.memo(({ children }) => {
    const colorScheme = useColorScheme() as ColorScheme;
    // Default to light mode instead of system preference
    const [isDark, setIsDark] = useState<boolean>(false);
    const [isThemeReady, setIsThemeReady] = useState(false);

    useEffect(() => {
        setIsThemeReady(true);
    }, []);

    // Memoize the theme object to prevent unnecessary re-renders
    const theme = useMemo(() => ({
        dark: isDark,
        colors: isDark ? darkColors : lightColors,
    }), [isDark]);

    // Memoize the setScheme function to maintain referential equality
    const setScheme = useCallback((scheme: ColorScheme) => {
        setIsDark(scheme === 'dark');
    }, []);

    // Comment out automatic system theme following - keep user's choice
    // useEffect(() => {
    //     setIsDark(colorScheme === 'dark');
    // }, [colorScheme]);

    const contextValue = useMemo(() => ({
        ...theme,
        setScheme,
        isThemeReady,
    }), [theme, setScheme, isThemeReady]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
});
ThemeProvider.displayName = 'ThemeProvider';

// Custom hook that ensures consumers only re-render when necessary
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Memoize the theme colors to prevent unnecessary re-renders
const memoizedColors = {
    light: lightColors,
    dark: darkColors,
} as const;
