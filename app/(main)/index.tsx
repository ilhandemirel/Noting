import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNoteStore } from '../../stores/noteStore';
import { useColors } from '../../stores/themeStore';
import { useFolderStore } from '../../stores/folderStore';
import TouchableScale from '../../components/ui/TouchableScale';

type FolderRow = {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    count: number;
    isCustom: boolean;
    action?: 'create';
};

const CONTENT_MAX_WIDTH = 980;

export default function HomeScreen() {
    const router = useRouter();
    const colors = useColors();
    const insets = useSafeAreaInsets();

    const {
        notes,
        noteFolderMap,
        loadNotes,
        createNote,
        trashedNotes,
        loadTrash,
        loadNoteFolderMap,
    } = useNoteStore();

    const { initializeFolders, customFolders, createFolder, deleteFolder } = useFolderStore();

    const [search, setSearch] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const searchInputRef = useRef<TextInput>(null);
    const createFolderInputRef = useRef<TextInput>(null);

    useEffect(() => {
        loadNotes();
        loadTrash();
        initializeFolders();
        loadNoteFolderMap();
    }, [initializeFolders, loadNoteFolderMap, loadNotes, loadTrash]);

    useEffect(() => {
        if (!createModalVisible) return;
        const timeout = setTimeout(() => {
            createFolderInputRef.current?.focus();
        }, 80);

        return () => clearTimeout(timeout);
    }, [createModalVisible]);

    const customFolderCounts = useMemo(() => {
        return notes.reduce<Record<string, number>>((acc, note) => {
            const folderId = noteFolderMap[note.id];
            if (!folderId) return acc;
            acc[folderId] = (acc[folderId] || 0) + 1;
            return acc;
        }, {});
    }, [noteFolderMap, notes]);

    const notesCount = useMemo(
        () => notes.filter((note) => !noteFolderMap[note.id]).length,
        [noteFolderMap, notes]
    );

    const folderRows: FolderRow[] = useMemo(() => {
        const notesFolder: FolderRow = {
            id: 'notes',
            name: 'Notlar',
            icon: 'folder-outline',
            count: notesCount,
            isCustom: false,
        };

        const customRows: FolderRow[] = customFolders.map((folder) => ({
            id: folder.id,
            name: folder.name,
            icon: 'folder-outline',
            count: customFolderCounts[folder.id] || 0,
            isCustom: true,
        }));

        const createRow: FolderRow = {
            id: 'create-folder',
            name: 'Yeni Klasör',
            icon: 'folder-outline',
            count: 0,
            isCustom: false,
            action: 'create',
        };

        const trashRow: FolderRow = {
            id: 'trash',
            name: 'Son Silinenler',
            icon: 'trash-outline',
            count: trashedNotes.length,
            isCustom: false,
        };

        return [notesFolder, ...customRows, createRow, trashRow];
    }, [customFolderCounts, customFolders, notesCount, trashedNotes.length]);

    const filteredRows = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('tr-TR');
        if (!query) return folderRows;

        return folderRows.filter((row) => row.name.toLocaleLowerCase('tr-TR').includes(query));
    }, [folderRows, search]);

    const handleCreateNote = useCallback(async () => {
        const id = await createNote();
        if (!id) return;
        router.push(`/(main)/note/${id}`);
    }, [createNote, router]);

    const handleOpenFolder = useCallback(
        (row: FolderRow) => {
            if (row.action === 'create') {
                setCreateModalVisible(true);
                return;
            }

            router.push(`/(main)/folder/${row.id}`);
        },
        [router]
    );

    const handleDeleteCustomFolder = useCallback(
        async (id: string) => {
            await deleteFolder(id);
        },
        [deleteFolder]
    );

    const handleSaveNewFolder = useCallback(async () => {
        const created = await createFolder(newFolderName);
        if (!created) return;

        setCreateModalVisible(false);
        setNewFolderName('');
        router.push(`/(main)/folder/${created.id}`);
    }, [createFolder, newFolderName, router]);

    const renderFolderRow = useCallback(
        ({ item, index }: { item: FolderRow; index: number }) => {
            const isFirst = index === 0;
            const isLast = index === filteredRows.length - 1;

            return (
                <View>
                    <TouchableScale
                        onPress={() => handleOpenFolder(item)}
                        style={[
                            styles.row,
                            {
                                borderTopLeftRadius: isFirst ? 20 : 0,
                                borderTopRightRadius: isFirst ? 20 : 0,
                                borderBottomLeftRadius: isLast ? 20 : 0,
                                borderBottomRightRadius: isLast ? 20 : 0,
                            },
                        ]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <View style={styles.rowLeft}>
                            <Ionicons name={item.icon} size={24} color={colors.accent} />
                            <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                        </View>

                        <View style={styles.rowRight}>
                            <Text style={[styles.rowCount, { color: colors.textSecondary }]}>{item.count}</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
                        </View>
                    </TouchableScale>

                    {item.isCustom && editMode ? (
                        <TouchableScale
                            onPress={() => handleDeleteCustomFolder(item.id)}
                            style={[styles.deleteSmall, { backgroundColor: colors.dangerLight }]}
                            pressedStyle={{ opacity: 0.86 }}
                        >
                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
                            <Text style={[styles.deleteSmallText, { color: colors.danger }]}>Sil</Text>
                        </TouchableScale>
                    ) : null}

                    {!isLast ? <View style={[styles.rowDivider, { backgroundColor: colors.borderLight }]} /> : null}
                </View>
            );
        },
        [colors.accent, colors.borderLight, colors.cardHover, colors.danger, colors.dangerLight, colors.placeholder, colors.text, colors.textSecondary, editMode, filteredRows.length, handleDeleteCustomFolder, handleOpenFolder]
    );

    const isWeb = Platform.OS === 'web';

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}> 
            <View style={[styles.content, isWeb && styles.contentWeb]}>
                <View style={styles.topActions}>
                    <TouchableScale
                        onPress={() => setCreateModalVisible(true)}
                        style={[styles.roundAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Ionicons name="folder-open-outline" size={21} color={colors.text} />
                        <Ionicons name="add" size={14} color={colors.text} style={styles.roundActionAdd} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={() => setEditMode((prev) => !prev)}
                        style={[styles.editButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Text style={[styles.editButtonText, { color: colors.text }]}>
                            {editMode ? 'Bitti' : 'Düzenle'}
                        </Text>
                    </TouchableScale>
                </View>

                <Text style={[styles.title, { color: colors.heading }]}>Klasörler</Text>

                <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                    <FlatList
                        data={filteredRows}
                        renderItem={renderFolderRow}
                        keyExtractor={(item) => item.id}
                        scrollEnabled={false}
                    />
                </View>

                <View style={styles.bottomSpacer} />
            </View>

            <View
                style={[
                    styles.bottomBar,
                    isWeb && styles.bottomBarWeb,
                    {
                        paddingBottom: Math.max(14, insets.bottom + 8),
                    },
                ]}
            >
                <View style={[styles.searchShell, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                    <Ionicons name="search" size={24} color={colors.text} />
                    <TextInput
                        ref={searchInputRef}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Arayın"
                        placeholderTextColor={colors.placeholder}
                    />
                    <TouchableScale
                        onPress={() => searchInputRef.current?.focus()}
                        style={styles.micButton}
                        pressedStyle={{ opacity: 0.8 }}
                    >
                        <Ionicons name="mic-outline" size={24} color={colors.text} />
                    </TouchableScale>
                </View>

                <TouchableScale
                    onPress={handleCreateNote}
                    style={[styles.composeButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    pressedStyle={{ backgroundColor: colors.cardHover }}
                >
                    <Ionicons name="create-outline" size={26} color={colors.text} />
                </TouchableScale>
            </View>

            <Modal
                transparent
                visible={createModalVisible}
                animationType="fade"
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <Pressable
                    style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
                    onPress={() => setCreateModalVisible(false)}
                >
                    <Pressable
                        style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={(event: any) => event.stopPropagation()}
                    >
                        <Text style={[styles.modalTitle, { color: colors.heading }]}>Yeni Klasör</Text>
                        <TextInput
                            ref={createFolderInputRef}
                            style={[
                                styles.modalInput,
                                {
                                    color: colors.text,
                                    backgroundColor: colors.inputBg,
                                    borderColor: colors.inputBorder,
                                },
                            ]}
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            placeholder="Klasör adı"
                            placeholderTextColor={colors.placeholder}
                        />

                        <View style={styles.modalActions}>
                            <TouchableScale
                                onPress={() => {
                                    setCreateModalVisible(false);
                                    setNewFolderName('');
                                }}
                                style={[styles.modalBtn, { backgroundColor: colors.hover }]}
                                pressedStyle={{ opacity: 0.8 }}
                            >
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>İptal</Text>
                            </TouchableScale>

                            <TouchableScale
                                onPress={handleSaveNewFolder}
                                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                                pressedStyle={{ opacity: 0.88 }}
                            >
                                <Text style={[styles.modalBtnText, { color: '#111111' }]}>Oluştur</Text>
                            </TouchableScale>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 16,
    },
    content: {
        flex: 1,
        width: '100%',
    },
    contentWeb: {
        alignSelf: 'center',
        maxWidth: CONTENT_MAX_WIDTH,
    },
    topActions: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
    },
    roundAction: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    roundActionAdd: {
        position: 'absolute',
        right: 16,
        top: 12,
    },
    editButton: {
        minWidth: 124,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
    },
    editButtonText: {
        fontSize: 17,
        lineHeight: 21,
        fontWeight: '600',
    },
    title: {
        marginTop: 24,
        marginBottom: 14,
        fontSize: 36,
        lineHeight: 40,
        fontWeight: '700',
        letterSpacing: -0.4,
    },
    panel: {
        borderRadius: 26,
        borderWidth: 1,
        paddingVertical: 4,
        overflow: 'hidden',
    },
    row: {
        minHeight: 66,
        paddingVertical: 8,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
        paddingRight: 8,
    },
    rowLabel: {
        fontSize: 17,
        lineHeight: 21,
        fontWeight: '500',
    },
    rowRight: {
        minWidth: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
    },
    rowCount: {
        fontSize: 16,
        fontWeight: '500',
    },
    rowDivider: {
        height: 1,
        marginLeft: 58,
        marginRight: 16,
    },
    deleteSmall: {
        alignSelf: 'flex-end',
        marginRight: 16,
        marginBottom: 6,
        marginTop: -8,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    deleteSmallText: {
        fontSize: 12,
        fontWeight: '700',
    },
    bottomSpacer: {
        flex: 1,
    },
    bottomBar: {
        marginHorizontal: -2,
        paddingTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bottomBarWeb: {
        alignSelf: 'center',
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        marginHorizontal: 0,
    },
    searchShell: {
        flex: 1,
        minHeight: 56,
        borderRadius: 28,
        borderWidth: 1,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        fontWeight: '500',
        lineHeight: 21,
        paddingVertical: 0,
    },
    micButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    composeButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        gap: 14,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 14,
        fontSize: 17,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    modalBtn: {
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 11,
        minWidth: 96,
        alignItems: 'center',
    },
    modalBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
