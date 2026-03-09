import '../global.css';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useThemeStore } from '../stores/themeStore';

export default function RootLayout() {
    const isDark = useThemeStore((s) => s.isDark);

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#191919' : '#FFFFFF' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Slot />
        </View>
    );
}
