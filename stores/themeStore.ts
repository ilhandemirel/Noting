import { create } from 'zustand';

interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setDark: (value: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    isDark: true,
    toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
    setDark: (value: boolean) => set({ isDark: value }),
}));

export const lightColors = {
    bg: '#F4F5F7',
    sidebar: '#FFFFFF',
    card: '#FFFFFF',
    cardHover: '#F2F3F6',
    text: '#171717',
    textSecondary: '#6B6E79',
    heading: '#0F0F0F',
    border: '#DCDDE2',
    borderLight: '#ECECF1',
    placeholder: '#9A9CA8',
    hover: '#ECEEF3',
    gray: '#E5E7EB',
    overlay: 'rgba(0,0,0,0.4)',
    accent: '#D4A900',
    accentDark: '#B89000',
    accentLight: '#FFF4CC',
    accentSoft: 'rgba(212,169,0,0.14)',
    danger: '#D64545',
    dangerLight: '#FCE5E5',
    success: '#198754',
    successLight: '#D4F1E2',
    warning: '#D4A900',
    warningLight: '#FFF4CC',
    inputBg: '#FFFFFF',
    inputBorder: '#D3D5DC',
    inputFocus: '#D4A900',
    fabBg: '#D4A900',
    fabShadow: 'rgba(212,169,0,0.3)',
    noteStripe: '#D4A900',
    shimmer: '#E5E7EB',
};

export const darkColors = {
    bg: '#000000',
    sidebar: '#111214',
    card: '#15171A',
    cardHover: '#1C1F23',
    text: '#F5F5F7',
    textSecondary: '#8D919A',
    heading: '#FFFFFF',
    border: '#2C2F34',
    borderLight: '#272A2E',
    placeholder: '#6D717A',
    hover: '#25282D',
    gray: '#31343A',
    overlay: 'rgba(0,0,0,0.72)',
    accent: '#E4C446',
    accentDark: '#C9A933',
    accentLight: '#3A3213',
    accentSoft: 'rgba(228,196,70,0.18)',
    danger: '#F06A6A',
    dangerLight: '#3B1A1A',
    success: '#3AD49A',
    successLight: '#123224',
    warning: '#E4C446',
    warningLight: '#3A3213',
    inputBg: '#121417',
    inputBorder: '#353942',
    inputFocus: '#E4C446',
    fabBg: '#E4C446',
    fabShadow: 'rgba(228,196,70,0.36)',
    noteStripe: '#E4C446',
    shimmer: '#25282D',
};

export type AppColors = typeof lightColors;

export const useColors = () => {
    const isDark = useThemeStore((s) => s.isDark);
    return isDark ? darkColors : lightColors;
};
