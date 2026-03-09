import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
    View, Text, Pressable, Animated, TextInput, FlatList,
    Dimensions, StyleSheet, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useFolderStore } from '../stores/folderStore';
import { useNoteStore } from '../stores/noteStore';
import { useNetworkStore } from '../stores/networkStore';
import { useThemeStore, useColors } from '../stores/themeStore';

const SIDEBAR_WIDTH = 280;

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

// Memoized note item
const NoteItem = memo(({ note, colors, onPress }: {
    note: { id: string; title: string };
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
        <Ionicons name="document-text-outline" size={14} color={colors.placeholder} />
        <Text
            style={[styles.noteTitle, { color: colors.secondary }]}
            numberOfLines={1}
        >
            {note.title || 'Başlıksız'}
        </Text>
    </Pressable>
));

// Memoized folder item
const FolderItem = memo(({ folder, isExpanded, isSelected, folderNotes, colors, onToggle, onNewNote, onNotePress }: {
    folder: { id: string; name: string };
    isExpanded: boolean;
    isSelected: boolean;
    folderNotes: { id: string; title: string }[];
    colors: any;
    onToggle: (id: string) => void;
    onNewNote: (id: string) => void;
    onNotePress: (id: string) => void;
}) => (
    <View style={{ marginBottom: 2 }}>
        <Pressable
            style={({ pressed }) => [
                styles.folderRow,
                {
                    backgroundColor: isSelected
                        ? colors.hover
                        : pressed ? colors.gray : 'transparent',
                }
            ]}
            onPress={() => onToggle(folder.id)}
        >
            <Ionicons
                name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                size={12}
                color={colors.secondary}
            />
            <Ionicons
                name={isExpanded ? 'folder-open' : 'folder'}
                size={16}
                color={colors.accent}
                style={{ marginLeft: 6 }}
            />
            <Text
                style={[styles.folderName, { color: colors.text }]}
                numberOfLines={1}
            >
                {folder.name}
            </Text>
            <Pressable
                onPress={() => onNewNote(folder.id)}
                style={styles.addNoteBtn}
                hitSlop={8}
            >
                <Ionicons name="add" size={16} color={colors.secondary} />
            </Pressable>
        </Pressable>

        {isExpanded && (
            <View style={{ marginLeft: 28 }}>
                {folderNotes.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.placeholder }]}>
                        Not yok
                    </Text>
                ) : (
                    folderNotes.map((note) => (
                        <NoteItem key={note.id} note={note} colors={colors} onPress={onNotePress} />
                    ))
                )}
            </View>
        )}
    </View>
));

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
    const [isAddingFolder, setIsAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH - 20)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const { folders, selectedFolderId, loadFolders, createFolder, deleteFolder, selectFolder } = useFolderStore();
    const { notes, loadNotes, createNote } = useNoteStore();
    const isConnected = useNetworkStore((s) => s.isConnected);
    const isDark = useThemeStore((s) => s.isDark);
    const toggleTheme = useThemeStore((s) => s.toggleTheme);
    const colors = useColors();
    const router = useRouter();

    useEffect(() => {
        loadFolders();
    }, []);

    useEffect(() => {
        const expandedIds = Object.keys(expandedFolders).filter((k) => expandedFolders[k]);
        if (expandedIds.length > 0) {
            loadNotes();
        }
    }, [expandedFolders]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: isOpen ? 0 : -SIDEBAR_WIDTH - 20,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(overlayAnim, {
                toValue: isOpen ? 1 : 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isOpen]);

    const handleAddFolder = useCallback(async () => {
        if (!newFolderName.trim()) return;
        const folderId = await createFolder(newFolderName.trim());
        setNewFolderName('');
        setIsAddingFolder(false);
        if (folderId) {
            setExpandedFolders((prev) => ({ ...prev, [folderId]: true }));
        }
    }, [newFolderName, createFolder]);

    const handleNewNote = useCallback(async (folderId?: string | null) => {
        if (folderId) {
            selectFolder(folderId);
        }
        const noteId = await createNote(folderId || null);
        if (noteId) {
            onToggle(); // close sidebar on mobile
            router.push(`/(main)/note/${noteId}`);
        }
    }, [selectFolder, createNote, onToggle, router]);

    const handleQuickNote = useCallback(async () => {
        const noteId = await createNote(null);
        if (noteId) {
            onToggle();
            router.push(`/(main)/note/${noteId}`);
        }
    }, [createNote, onToggle, router]);

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders((prev) => ({
            ...prev,
            [folderId]: !prev[folderId],
        }));
        selectFolder(folderId);
    }, [selectFolder]);

    const handleNotePress = useCallback((noteId: string) => {
        onToggle(); // close sidebar
        router.push(`/(main)/note/${noteId}`);
    }, [onToggle, router]);

    const notesForFolder = useCallback((folderId: string) =>
        notes.filter((n) => n.folderId === folderId),
        [notes]
    );

    const handleLogout = useCallback(() => {
        logout();
        router.replace('/(auth)/login');
    }, [logout, router]);

    return (
        <>
            {/* Overlay - clickable area to close sidebar */}
            {isOpen && (
                <Pressable
                    style={[
                        StyleSheet.absoluteFill,
                        styles.overlay,
                    ]}
                    onPress={onToggle}
                    accessibilityRole="button"
                    accessibilityLabel="Menüyü kapat"
                >
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: colors.overlay,
                                opacity: overlayAnim,
                            }
                        ]}
                    />
                </Pressable>
            )}

            {/* Sidebar Panel */}
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
                            <Text style={[styles.logo, { color: colors.text }]}>
                                Noting
                            </Text>
                            <View style={[
                                styles.connectionDot,
                                { backgroundColor: isConnected ? '#27AE60' : '#EB5757' }
                            ]} />
                        </View>
                        <View style={styles.headerRight}>
                            <Pressable
                                onPress={toggleTheme}
                                style={({ pressed }) => [
                                    styles.iconBtn,
                                    { backgroundColor: pressed ? colors.hover : 'transparent' }
                                ]}
                            >
                                <Ionicons
                                    name={isDark ? 'sunny-outline' : 'moon-outline'}
                                    size={18}
                                    color={colors.secondary}
                                />
                            </Pressable>
                            <Pressable
                                onPress={onToggle}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                style={({ pressed }) => [
                                    styles.closeBtn,
                                    { backgroundColor: pressed ? colors.hover : 'transparent' }
                                ]}
                            >
                                <Ionicons name="close" size={22} color={colors.secondary} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Quick Note + New Folder Buttons */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.quickNoteBtn,
                            {
                                backgroundColor: pressed ? colors.accent : colors.accentLight || colors.accent + '20',
                            }
                        ]}
                        onPress={handleQuickNote}
                    >
                        <Ionicons name="create-outline" size={16} color={colors.accent} />
                        <Text style={[styles.quickNoteText, { color: colors.accent }]}>
                            Hızlı Not
                        </Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.newFolderBtn,
                            {
                                borderColor: colors.border,
                                backgroundColor: pressed ? colors.hover : 'transparent',
                            }
                        ]}
                        onPress={() => setIsAddingFolder(true)}
                    >
                        <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
                        <Text style={[styles.newFolderText, { color: colors.text }]}>
                            Yeni Klasör
                        </Text>
                    </Pressable>

                    {/* New Folder Input */}
                    {isAddingFolder && (
                        <View style={styles.addFolderRow}>
                            <TextInput
                                style={[
                                    styles.folderInput,
                                    {
                                        color: colors.text,
                                        backgroundColor: colors.bg,
                                        borderColor: colors.accent,
                                    }
                                ]}
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                placeholder="Klasör adı"
                                placeholderTextColor={colors.placeholder}
                                autoFocus
                                onSubmitEditing={handleAddFolder}
                            />
                            <Pressable style={styles.smallBtn} onPress={handleAddFolder}>
                                <Ionicons name="checkmark" size={18} color={colors.accent} />
                            </Pressable>
                            <Pressable
                                style={styles.smallBtn}
                                onPress={() => {
                                    setIsAddingFolder(false);
                                    setNewFolderName('');
                                }}
                            >
                                <Ionicons name="close" size={18} color={colors.secondary} />
                            </Pressable>
                        </View>
                    )}

                    {/* User Info & Logout */}
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                        <View style={styles.userRow}>
                            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                                <Text style={styles.avatarText}>
                                    {(user?.email || 'U')[0].toUpperCase()}
                                </Text>
                            </View>
                            <Text
                                style={[styles.userEmail, { color: colors.secondary }]}
                                numberOfLines={1}
                            >
                                {user?.email || 'Kullanıcı'}
                            </Text>
                        </View>
                        <Pressable
                            style={({ pressed }) => [
                                styles.logoutBtn,
                                { backgroundColor: pressed ? colors.hover : 'transparent' }
                            ]}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                            <Text style={[styles.logoutText, { color: colors.danger }]}>
                                Çıkış Yap
                            </Text>
                        </Pressable>
                    </View>
                </View >
            </Animated.View >
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
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    sidebarContent: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
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
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    logo: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    connectionDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        marginLeft: 8,
    },
    iconBtn: {
        padding: 6,
        borderRadius: 8,
    },
    closeBtn: {
        padding: 8,
        borderRadius: 8,
        minWidth: 36,
        minHeight: 36,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    quickNoteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    quickNoteText: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 8,
    },
    newFolderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginBottom: 16,
    },
    newFolderText: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 8,
    },
    addFolderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    folderInput: {
        flex: 1,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1.5,
        borderRadius: 8,
        fontSize: 13,
    },
    smallBtn: {
        padding: 6,
        marginLeft: 4,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    folderName: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    },
    addNoteBtn: {
        padding: 4,
    },
    noteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    noteTitle: {
        fontSize: 13,
        marginLeft: 8,
        flex: 1,
    },
    emptyText: {
        fontSize: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    emptyFolder: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    emptyFolderText: {
        fontSize: 13,
        marginLeft: 8,
    },
    footer: {
        borderTopWidth: 1,
        paddingTop: 12,
        marginTop: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    userEmail: {
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    logoutText: {
        fontSize: 13,
        marginLeft: 8,
        fontWeight: '500',
    },
});
