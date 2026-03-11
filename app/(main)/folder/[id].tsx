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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TouchableScale from '../../../components/ui/TouchableScale';
import { NoteItem, TrashedNoteItem, useNoteStore } from '../../../stores/noteStore';
import { SYSTEM_FOLDERS, useFolderStore } from '../../../stores/folderStore';
import { useAuthStore } from '../../../stores/authStore';
import { useColors, useThemeStore } from '../../../stores/themeStore';

type DisplayItem = {
    id: string;
    title: string;
    subtitle: string;
    date: Date;
    isTrash: boolean;
};

type SectionItem = {
    id: string;
    title: string;
    items: DisplayItem[];
};

const CONTENT_MAX_WIDTH = 980;

const IOS_METRICS = {
    screenHorizontal: 14,
    topRowMarginTop: 6,
    headerButtonSize: 50,
    headerButtonRadius: 25,
    headerTitleMarginTop: 18,
    headerMetaMarginBottom: 18,
    sectionGap: 24,
    sectionTitleSize: 17,
    sectionTitleLineHeight: 21,
    sectionCardRadius: 24,
    sectionCardPaddingY: 4,
    rowMinHeight: 80,
    rowPaddingX: 20,
    rowPaddingY: 10,
    noteTitleSize: 16,
    noteTitleLineHeight: 20,
    noteSubSize: 13,
    noteSubLineHeight: 18,
    dividerInsetX: 20,
    bottomBarSide: 8,
    searchHeight: 56,
    searchRadius: 28,
    composeSize: 56,
};

function daysBetween(from: Date, to: Date) {
    const millis = Math.abs(to.getTime() - from.getTime());
    return Math.floor(millis / (1000 * 60 * 60 * 24));
}

function extractPreview(content: string) {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            const firstText = parsed.find((block) => block?.type === 'text' && typeof block?.content === 'string');
            if (firstText?.content?.trim()) return firstText.content.trim();

            const firstDrawing = parsed.find((block) => block?.type === 'drawing');
            if (firstDrawing) return 'Çizim eklendi';
        }
    } catch {
        if (content.trim()) return content.trim();
    }

    return 'Başka metin yok';
}

function formatDateLabel(date: Date) {
    return date.toLocaleDateString('tr-TR');
}

function buildNoteSections(items: DisplayItem[]) {
    const now = new Date();
    const last7 = items.filter((item) => daysBetween(now, item.date) <= 7);
    const last30 = items.filter((item) => {
        const diff = daysBetween(now, item.date);
        return diff > 7 && diff <= 30;
    });

    const older = items.filter((item) => daysBetween(now, item.date) > 30);
    const yearly = older.reduce<Record<string, DisplayItem[]>>((acc, item) => {
        const year = item.date.getFullYear().toString();
        if (!acc[year]) acc[year] = [];
        acc[year].push(item);
        return acc;
    }, {});

    const sections: SectionItem[] = [];
    if (last7.length) {
        sections.push({ id: 's7', title: 'Son 7 Gün', items: last7 });
    }
    if (last30.length) {
        sections.push({ id: 's30', title: 'Son 30 Gün', items: last30 });
    }

    Object.entries(yearly)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .forEach(([year, yearItems]) => {
            sections.push({
                id: `year-${year}`,
                title: year,
                items: yearItems,
            });
        });

    return sections;
}

function resolveFolderName(folderId: string, customName: string | undefined) {
    if (customName) return customName;
    const system = SYSTEM_FOLDERS.find((folder) => folder.id === folderId);
    if (system) return system.name;
    return 'Klasör';
}

export default function FolderDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const folderId = id && id !== 'all' ? id : 'notes';
    const insets = useSafeAreaInsets();
    const colors = useColors();

    const {
        notes,
        noteFolderMap,
        trashedNotes,
        loadNotes,
        loadTrash,
        createNote,
        restoreFromTrash,
        removeFromTrash,
        clearTrash,
        loadNoteFolderMap,
    } = useNoteStore();

    const customFolders = useFolderStore((state) => state.customFolders);
    const folderName = useMemo(
        () => resolveFolderName(folderId, customFolders.find((folder) => folder.id === folderId)?.name),
        [customFolders, folderId]
    );

    const logout = useAuthStore((state) => state.logout);
    const toggleTheme = useThemeStore((state) => state.toggleTheme);

    const [search, setSearch] = useState('');
    const [menuVisible, setMenuVisible] = useState(false);
    const searchRef = useRef<TextInput>(null);

    useEffect(() => {
        loadNotes();
        loadTrash();
        loadNoteFolderMap();
    }, [loadNoteFolderMap, loadNotes, loadTrash]);

    const folderNotes = useMemo(() => {
        if (folderId === 'notes') {
            return notes.filter((item) => !noteFolderMap[item.id]);
        }

        if (folderId === 'trash') {
            return [];
        }

        return notes.filter((item) => noteFolderMap[item.id] === folderId);
    }, [folderId, noteFolderMap, notes]);

    const displayItems = useMemo<DisplayItem[]>(() => {
        if (folderId === 'trash') {
            return trashedNotes
                .map((item: TrashedNoteItem) => ({
                    id: item.id,
                    title: item.title || 'Başlıksız',
                    subtitle: extractPreview(item.content),
                    date: new Date(item.deletedAt),
                    isTrash: true,
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        return folderNotes
            .map((item: NoteItem) => ({
                id: item.id,
                title: item.title || 'Başlıksız',
                subtitle: extractPreview(item.content),
                date: item.updatedAt,
                isTrash: false,
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [folderId, folderNotes, trashedNotes]);

    const filtered = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('tr-TR');
        if (!query) return displayItems;
        return displayItems.filter((item) => {
            const haystack = `${item.title} ${item.subtitle} ${formatDateLabel(item.date)}`.toLocaleLowerCase('tr-TR');
            return haystack.includes(query);
        });
    }, [displayItems, search]);

    const sections = useMemo(() => buildNoteSections(filtered), [filtered]);

    const handleOpenItem = useCallback(
        (item: DisplayItem) => {
            if (item.isTrash) return;
            router.push(`/(main)/note/${item.id}`);
        },
        [router]
    );

    const handleCreateNote = useCallback(async () => {
        const newId = await createNote();
        if (!newId) return;
        router.push(`/(main)/note/${newId}`);
    }, [createNote, router]);

    const handleRestoreTrash = useCallback(
        async (trashId: string) => {
            const restoredId = await restoreFromTrash(trashId);
            if (restoredId) {
                router.push(`/(main)/note/${restoredId}`);
            }
        },
        [restoreFromTrash, router]
    );

    const handleDeleteTrashPermanently = useCallback(
        async (trashId: string) => {
            await removeFromTrash(trashId);
        },
        [removeFromTrash]
    );

    const handleLogout = useCallback(() => {
        setMenuVisible(false);
        logout();
        router.replace('/(auth)/login');
    }, [logout, router]);

    const handleRefresh = useCallback(async () => {
        await loadNotes();
        await loadTrash();
        setMenuVisible(false);
    }, [loadNotes, loadTrash]);

    const listEmptyText = folderId === 'trash' ? 'Çöp kutusu boş.' : 'Bu klasörde not bulunamadı.';
    const isWeb = Platform.OS === 'web';
    const titleSize = folderName.length > 14 ? 38 : folderName.length > 9 ? 44 : 50;
    const titleLineHeight = titleSize + 4;

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}> 
            <View style={[styles.content, isWeb && styles.contentWeb]}>
                <View style={styles.topRow}>
                    <TouchableScale
                        onPress={() => router.back()}
                        style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={() => setMenuVisible(true)}
                        style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={28} color={colors.text} />
                    </TouchableScale>
                </View>

                <Text
                    style={[
                        styles.headerTitle,
                        {
                            color: colors.heading,
                            fontSize: titleSize,
                            lineHeight: titleLineHeight,
                        },
                    ]}
                    numberOfLines={1}
                >
                    {folderName}
                </Text>
                <Text style={[styles.headerMeta, { color: colors.textSecondary }]}>
                    {folderId === 'trash' ? `${filtered.length} Öğe` : `${filtered.length} Not`}
                </Text>

                <FlatList
                    data={sections}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 180 }}
                    renderItem={({ item: section }) => (
                        <View style={styles.sectionBlock}>
                            <Text style={[styles.sectionTitle, { color: colors.heading }]}>{section.title}</Text>

                            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                                {section.items.map((item, index) => {
                                    const isLast = index === section.items.length - 1;
                                    const isFirst = index === 0;
                                    return (
                                        <View key={item.id}>
                                            <TouchableScale
                                                onPress={() => handleOpenItem(item)}
                                                disabled={item.isTrash}
                                                style={[
                                                    styles.noteRow,
                                                    isFirst && styles.noteRowFirst,
                                                    isLast && styles.noteRowLast,
                                                ]}
                                                pressedStyle={{ backgroundColor: colors.cardHover }}
                                            >
                                                <View style={styles.noteTextBlock}>
                                                    <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                                                        {item.title}
                                                    </Text>
                                                    <Text style={[styles.noteSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                                        {formatDateLabel(item.date)}  {item.subtitle}
                                                    </Text>
                                                </View>

                                                {item.isTrash ? (
                                                    <View style={styles.trashActions}>
                                                        <TouchableScale
                                                            onPress={() => handleRestoreTrash(item.id)}
                                                            style={[styles.trashBtn, { backgroundColor: colors.accentSoft }]}
                                                            pressedStyle={{ opacity: 0.85 }}
                                                        >
                                                            <Ionicons name="refresh-outline" size={16} color={colors.accent} />
                                                        </TouchableScale>
                                                        <TouchableScale
                                                            onPress={() => handleDeleteTrashPermanently(item.id)}
                                                            style={[styles.trashBtn, { backgroundColor: colors.dangerLight }]}
                                                            pressedStyle={{ opacity: 0.85 }}
                                                        >
                                                            <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                                        </TouchableScale>
                                                    </View>
                                                ) : null}
                                            </TouchableScale>

                                            {!isLast ? <View style={[styles.noteDivider, { backgroundColor: colors.borderLight }]} /> : null}
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{listEmptyText}</Text>
                        </View>
                    }
                />
            </View>

            <View
                style={[
                    styles.bottomBar,
                    isWeb && styles.bottomBarWeb,
                    {
                        paddingBottom: Math.max(insets.bottom + 8, 16),
                    },
                ]}
            >
                <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                    <Ionicons name="search" size={24} color={colors.text} />
                    <TextInput
                        ref={searchRef}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Arayın"
                        placeholderTextColor={colors.placeholder}
                    />
                    <TouchableScale
                        onPress={() => searchRef.current?.focus()}
                        style={styles.micTouch}
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

            <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
                <Pressable
                    style={[styles.menuOverlay, { backgroundColor: colors.overlay }]}
                    onPress={() => setMenuVisible(false)}
                >
                    <Pressable
                        style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={(event: any) => event.stopPropagation()}
                    >
                        <TouchableScale
                            onPress={handleCreateNote}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="add-circle-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuActionText, { color: colors.text }]}>Yeni Not</Text>
                        </TouchableScale>

                        <TouchableScale
                            onPress={handleRefresh}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="refresh-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuActionText, { color: colors.text }]}>Yenile</Text>
                        </TouchableScale>

                        {folderId === 'trash' ? (
                            <TouchableScale
                                onPress={async () => {
                                    await clearTrash();
                                    setMenuVisible(false);
                                }}
                                style={styles.menuAction}
                                pressedStyle={{ backgroundColor: colors.cardHover }}
                            >
                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                <Text style={[styles.menuActionText, { color: colors.danger }]}>Çöpü Boşalt</Text>
                            </TouchableScale>
                        ) : null}

                        <TouchableScale
                            onPress={() => {
                                toggleTheme();
                                setMenuVisible(false);
                            }}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="contrast-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuActionText, { color: colors.text }]}>Temayı Değiştir</Text>
                        </TouchableScale>

                        <TouchableScale
                            onPress={handleLogout}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                            <Text style={[styles.menuActionText, { color: colors.danger }]}>Çıkış Yap</Text>
                        </TouchableScale>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: IOS_METRICS.screenHorizontal,
    },
    content: {
        flex: 1,
        width: '100%',
    },
    contentWeb: {
        alignSelf: 'center',
        maxWidth: CONTENT_MAX_WIDTH,
    },
    topRow: {
        marginTop: IOS_METRICS.topRowMarginTop,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    circleButton: {
        width: IOS_METRICS.headerButtonSize,
        height: IOS_METRICS.headerButtonSize,
        borderRadius: IOS_METRICS.headerButtonRadius,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        marginTop: IOS_METRICS.headerTitleMarginTop,
        letterSpacing: -0.7,
        fontWeight: '700',
    },
    headerMeta: {
        marginTop: 4,
        marginBottom: IOS_METRICS.headerMetaMarginBottom,
        fontSize: 15,
        fontWeight: '500',
    },
    sectionBlock: {
        marginBottom: IOS_METRICS.sectionGap,
    },
    sectionTitle: {
        fontSize: IOS_METRICS.sectionTitleSize,
        lineHeight: IOS_METRICS.sectionTitleLineHeight,
        fontWeight: '700',
        marginBottom: 10,
    },
    sectionCard: {
        borderRadius: IOS_METRICS.sectionCardRadius,
        borderWidth: 1,
        paddingVertical: IOS_METRICS.sectionCardPaddingY,
        overflow: 'hidden',
    },
    noteRow: {
        minHeight: IOS_METRICS.rowMinHeight,
        paddingHorizontal: IOS_METRICS.rowPaddingX,
        paddingVertical: IOS_METRICS.rowPaddingY,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
    },
    noteRowFirst: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
    },
    noteRowLast: {
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
    },
    noteTextBlock: {
        flex: 1,
        paddingRight: 10,
    },
    noteTitle: {
        fontSize: IOS_METRICS.noteTitleSize,
        lineHeight: IOS_METRICS.noteTitleLineHeight,
        fontWeight: '600',
    },
    noteSub: {
        marginTop: 6,
        fontSize: IOS_METRICS.noteSubSize,
        lineHeight: IOS_METRICS.noteSubLineHeight,
        fontWeight: '400',
    },
    noteDivider: {
        height: 1,
        marginLeft: IOS_METRICS.dividerInsetX,
        marginRight: IOS_METRICS.dividerInsetX,
    },
    trashActions: {
        flexDirection: 'row',
        gap: 8,
    },
    trashBtn: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBox: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },
    bottomBar: {
        position: 'absolute',
        left: IOS_METRICS.bottomBarSide,
        right: IOS_METRICS.bottomBarSide,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    bottomBarWeb: {
        alignSelf: 'center',
        width: '100%',
        maxWidth: CONTENT_MAX_WIDTH,
        left: undefined,
        right: undefined,
    },
    searchWrap: {
        flex: 1,
        minHeight: IOS_METRICS.searchHeight,
        borderRadius: IOS_METRICS.searchRadius,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        lineHeight: 21,
        fontWeight: '500',
        paddingVertical: 0,
    },
    micTouch: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    composeButton: {
        width: IOS_METRICS.composeSize,
        height: IOS_METRICS.composeSize,
        borderRadius: IOS_METRICS.composeSize / 2,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuOverlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 110,
        paddingRight: 18,
        paddingLeft: 18,
    },
    menuCard: {
        width: 250,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    menuAction: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 10,
    },
    menuActionText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
