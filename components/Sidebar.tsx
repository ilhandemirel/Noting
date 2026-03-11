import React, { useEffect, useCallback, useRef, memo } from 'react';
import {
    View, Text, Pressable, Animated, FlatList,
    StyleSheet, Platform, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useNoteStore } from '../stores/noteStore';
import { useNetworkStore } from '../stores/networkStore';
import { useThemeStore, useColors } from '../stores/themeStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(260, SCREEN_WIDTH * 0.75);

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const SidebarNoteItem = memo(({ note, colors, onPress }: {
    note: { id: string; title: string; updatedAt: Date; isSynced: boolean };
    colors: any;
    onPress: (id: string) => void;
}) => (
    <Pressable
        style={({ pressed }) => [
            styles.noteItem,
            { backgroundColor: pressed ? colors.hover : 'transparent' }
        ]}
        onPress={() => onPress(note.id)}
    >
        <View style={[styles.noteIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="document-text" size={14} color={colors.accent} />
        </View>
        <View style={styles.noteInfo}>
            <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                {note.title || 'Başlıksız'}
            </Text>
            <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
                {note.updatedAt.toLocaleDateString('tr-TR')}
            </Text>
        </View>
        {!note.isSynced && (
            <Ionicons name="cloud-offline-outline" size={12} color={colors.warning} />
        )}
    </Pressable>
));

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH - 20)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const { notes, loadNotes, createNote } = useNoteStore();
    const isConnected = useNetworkStore((s) => s.isConnected);
    const isDark = useThemeStore((s) => s.isDark);
    const toggleTheme = useThemeStore((s) => s.toggleTheme);
    const colors = useColors();
    const router = useRouter();

    useEffect(() => {
        if (isOpen) loadNotes();
    }, [isOpen]);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: isOpen ? 0 : -SIDEBAR_WIDTH - 20,
                friction: 20,
                tension: 70,
                useNativeDriver: true,
            }),
            Animated.timing(overlayAnim, {
                toValue: isOpen ? 1 : 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isOpen]);

    const handleQuickNote = useCallback(async () => {
        const noteId = await createNote();
        if (noteId) {
            onToggle();
            router.push(`/(main)/note/${noteId}`);
        }
    }, [createNote, onToggle, router]);

    const handleNotePress = useCallback((noteId: string) => {
        onToggle();
        router.push(`/(main)/note/${noteId}`);
    }, [onToggle, router]);

    const handleLogout = useCallback(() => {
        logout();
        router.replace('/(auth)/login');
    }, [logout, router]);

    const handleClose = useCallback(() => {
        onToggle();
    }, [onToggle]);

    const handleToggleTheme = useCallback(() => {
        toggleTheme();
    }, [toggleTheme]);

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <Pressable
                    style={[StyleSheet.absoluteFill, styles.overlay]}
                    onPress={handleClose}
                >
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: colors.overlay, opacity: overlayAnim }
                        ]}
                    />
                </Pressable>
            )}

            {/* Sidebar */}
            <Animated.View
                style={[
                    styles.sidebar,
                    {
                        width: SIDEBAR_WIDTH,
                        backgroundColor: colors.sidebar,
                        borderRightColor: colors.border,
                        transform: [{ translateX: slideAnim }],
                    }
                ]}
            >
                <View style={styles.sidebarContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.brandDot, { backgroundColor: colors.accent }]} />
                            <Text style={[styles.brand, { color: colors.heading }]}>Noting</Text>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isConnected ? '#10B981' : '#EF4444' }
                            ]} />
                        </View>
                        <View style={styles.headerRight}>
                            {/* Dark/Light Theme Toggle */}
                            <Pressable
                                onPress={handleToggleTheme}
                                style={[
                                    styles.themeBtn,
                                    { backgroundColor: colors.hover }
                                ]}
                            >
                                <Ionicons
                                    name={isDark ? 'sunny' : 'moon'}
                                    size={18}
                                    color={colors.accent}
                                />
                            </Pressable>
                            {/* Close Button - BÜYÜK */}
                            <Pressable
                                onPress={handleClose}
                                style={[
                                    styles.closeBtn,
                                    { backgroundColor: colors.hover }
                                ]}
                                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                            >
                                <Ionicons name="close" size={24} color={colors.text} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Yeni Not Butonu */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.newNoteBtn,
                            {
                                backgroundColor: pressed ? colors.accentDark : colors.accent,
                                shadowColor: colors.fabShadow,
                            }
                        ]}
                        onPress={handleQuickNote}
                    >
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                        <Text style={styles.newNoteText}>Yeni Not</Text>
                    </Pressable>

                    {/* Notlar Bölümü */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                            TÜM NOTLAR
                        </Text>
                        <Text style={[styles.sectionCount, { color: colors.placeholder }]}>
                            {notes.length}
                        </Text>
                    </View>

                    <FlatList
                        data={notes}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <SidebarNoteItem
                                note={item}
                                colors={colors}
                                onPress={handleNotePress}
                            />
                        )}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyArea}>
                                <Ionicons name="document-text-outline" size={24} color={colors.placeholder} />
                                <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                                    Henüz not yok
                                </Text>
                            </View>
                        )}
                    />

                    {/* Alt Kısım */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <View style={styles.userRow}>
                            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                                <Text style={styles.avatarText}>
                                    {(user?.email || 'U')[0].toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                                    {user?.name || 'Kullanıcı'}
                                </Text>
                                <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {user?.email || ''}
                                </Text>
                            </View>
                        </View>
                        <Pressable
                            style={({ pressed }) => [
                                styles.logoutBtn,
                                { backgroundColor: pressed ? colors.dangerLight : 'transparent' }
                            ]}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                            <Text style={[styles.logoutText, { color: colors.danger }]}>
                                Çıkış Yap
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        zIndex: 49,
        elevation: 9,
    },
    sidebar: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        borderRightWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    sidebarContent: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 38 : 50,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    brandDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    brand: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    themeBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newNoteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 20,
        gap: 6,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    newNoteText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    sectionCount: {
        fontSize: 10,
        fontWeight: '600',
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        marginBottom: 2,
        gap: 10,
    },
    noteIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteInfo: {
        flex: 1,
    },
    noteTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 1,
    },
    noteDate: {
        fontSize: 10,
    },
    emptyArea: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 6,
    },
    emptyText: {
        fontSize: 12,
    },
    footer: {
        borderTopWidth: 1,
        paddingTop: 12,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 10,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 13,
        fontWeight: '600',
    },
    userEmail: {
        fontSize: 11,
        marginTop: 1,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 10,
        gap: 6,
    },
    logoutText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
