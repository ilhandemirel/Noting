import { Stack } from 'expo-router';
import { useColors } from '../../stores/themeStore';

export default function AuthLayout() {
    const colors = useColors();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'fade',
            }}
        />
    );
}
