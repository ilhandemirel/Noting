import { create } from 'zustand';
import { Appearance } from 'react-native';

interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setDark: (value: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    isDark: Appearance.getColorScheme() === 'dark',

    toggleTheme: () => set((state) => ({ isDark: !state.isDark })),

    setDark: (value: boolean) => set({ isDark: value }),
}));

// Theme color tokens for use in inline styles
export const lightColors = {
    bg: '#FFFFFF',
    sidebar: '#F7F6F3',
    text: '#37352F',
    gray: '#E3E2DE',
    hover: '#EBEBEA',
    border: '#E3E2DE',
    placeholder: '#B4B4B0',
    secondary: '#787774',
    card: '#FFFFFF',
    overlay: 'rgba(0,0,0,0.3)',
    accent: '#2383E2',
    accentLight: '#E8F0FE',
    danger: '#EB5757',
    dangerLight: '#FDE8E8',
    success: '#27AE60',
};

export const darkColors = {
    bg: '#191919',
    sidebar: '#202020',
    text: '#E8E8E3',
    gray: '#2F2F2F',
    hover: '#2C2C2C',
    border: '#2F2F2F',
    placeholder: '#5A5A58',
    secondary: '#9B9A97',
    card: '#252525',
    overlay: 'rgba(0,0,0,0.6)',
    accent: '#529CCA',
    accentLight: '#1C3A52',
    danger: '#EB5757',
    dangerLight: '#3D2020',
    success: '#27AE60',
};

export const useColors = () => {
    const isDark = useThemeStore((s) => s.isDark);
    return isDark ? darkColors : lightColors;
};
