import '../global.css';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput, View } from 'react-native';
import { useColors, useThemeStore } from '../stores/themeStore';

const textComponent = Text as any;
const textInputComponent = TextInput as any;

if (!textComponent.defaultProps) {
    textComponent.defaultProps = {};
}

if (!textInputComponent.defaultProps) {
    textInputComponent.defaultProps = {};
}

textComponent.defaultProps.allowFontScaling = false;
textInputComponent.defaultProps.allowFontScaling = false;

textComponent.defaultProps.maxFontSizeMultiplier = 1;
textInputComponent.defaultProps.maxFontSizeMultiplier = 1;

export default function RootLayout() {
    const isDark = useThemeStore((s) => s.isDark);
    const colors = useColors();

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Slot />
        </View>
    );
}
