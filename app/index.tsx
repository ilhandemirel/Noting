import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useColors } from '../stores/themeStore';

export default function Index() {
    const router = useRouter();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const initialize = useAuthStore((s) => s.initialize);
    const colors = useColors();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            await initialize();
            setIsReady(true);
        };
        init();
    }, []);

    useEffect(() => {
        if (!isReady) return;
        if (isAuthenticated) {
            router.replace('/(main)');
        } else {
            router.replace('/(auth)/login');
        }
    }, [isReady, isAuthenticated, router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <ActivityIndicator size="large" color={colors.accent} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
