import { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter } from 'expo-router';
import { View, Pressable, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Sidebar from '../../components/Sidebar';
import { useAuthStore } from '../../stores/authStore';
import { useColors } from '../../stores/themeStore';
import { useNoteStore } from '../../stores/noteStore';
import { startSyncService } from '../../services/syncService';

export default function MainLayout() {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const router = useRouter();
    const colors = useColors();
    const createNote = useNoteStore((s) => s.createNote);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleFabPress = useCallback(async () => {
        const noteId = await createNote(null);
        if (noteId) {
            router.push(`/(main)/note/${noteId}`);
        }
    }, [createNote, router]);

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/(auth)/login');
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (isAuthenticated) {
            const cleanup = startSyncService();
            return cleanup;
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
            {/* Content */}
            <View style={styles.content}>
                <Slot />
            </View>

            {/* Hamburger Toggle - rendered AFTER content for higher z-order */}
            <View style={styles.menuBtnWrapper}>
                <Pressable
                    onPress={() => setSidebarOpen(true)}
                    style={[styles.menuBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="menu" size={22} color={colors.text} />
                </Pressable>
            </View>

            {/* FAB - Quick Note Button */}
            {!sidebarOpen && (
                <View style={styles.fabWrapper}>
                    <Pressable
                        onPress={handleFabPress}
                        style={({ pressed }) => [
                            styles.fabBtn,
                            {
                                backgroundColor: pressed ? colors.accent + 'DD' : colors.accent,
                            }
                        ]}
                    >
                        <Ionicons name="add" size={28} color="#FFFFFF" />
                    </Pressable>
                </View>
            )}

            {/* Sidebar Drawer */}
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    menuBtnWrapper: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 40 : 54,
        left: 14,
        zIndex: 45,
        elevation: 5,
    },
    menuBtn: {
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    fabWrapper: {
        position: 'absolute',
        bottom: 28,
        right: 20,
        zIndex: 40,
        elevation: 6,
    },
    fabBtn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
});
