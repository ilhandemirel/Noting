import { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useColors } from '../../stores/themeStore';
import { startSyncService } from '../../services/syncService';

export default function MainLayout() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const router = useRouter();
    const colors = useColors();

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/(auth)/login');
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const cleanup = startSyncService();
        return cleanup;
    }, [isAuthenticated]);

    if (!isAuthenticated) return null;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'left', 'right']}>
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
                <Slot />
            </View>
        </SafeAreaView>
    );
}
