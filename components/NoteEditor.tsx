import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNoteStore } from '../stores/noteStore';
import { useAuthStore } from '../stores/authStore';
import { useColors } from '../stores/themeStore';
import { useFolderStore } from '../stores/folderStore';
import DrawingBlock from './DrawingBlock';
import TouchableScale from './ui/TouchableScale';

interface NoteEditorProps {
    noteId: string;
}

type BlockType = {
    id: string;
    type: 'text' | 'drawing';
    content: string;
};

type Snapshot = {
    title: string;
    blocks: BlockType[];
};

function safeCloneBlocks(blocks: BlockType[]) {
    return blocks.map((block) => ({ ...block }));
}

function areBlocksEqual(a: BlockType[], b: BlockType[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (
            a[i].id !== b[i].id ||
            a[i].type !== b[i].type ||
            a[i].content !== b[i].content
        ) {
            return false;
        }
    }
    return true;
}

function parseBlocks(content: string): BlockType[] {
    try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            return [{ id: Date.now().toString(), type: 'text', content }];
        }

        return parsed.map((block: BlockType, index: number) => ({
            id: block?.id || `${Date.now()}-${index}`,
            type: block?.type === 'drawing' ? 'drawing' : 'text',
            content: typeof block?.content === 'string' ? block.content : '',
        }));
    } catch {
        return [{ id: Date.now().toString(), type: 'text', content }];
    }
}

export default function NoteEditor({ noteId }: NoteEditorProps) {
    const colors = useColors();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        activeNote,
        loadNote,
        updateNote,
        deleteNote,
        createNote,
        loadNoteFolderMap,
        moveNoteToFolder,
        getNoteFolderId,
    } = useNoteStore();

    const logout = useAuthStore((state) => state.logout);
    const customFolders = useFolderStore((state) => state.customFolders);
    const initializeFolders = useFolderStore((state) => state.initializeFolders);

    const [title, setTitle] = useState('');
    const [blocks, setBlocks] = useState<BlockType[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [folderPickerVisible, setFolderPickerVisible] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [historyIndex, setHistoryIndex] = useState(0);
    const isWeb = Platform.OS === 'web';

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInitialLoadRef = useRef(true);
    const historyCursorRef = useRef(0);
    const titleInputRef = useRef<TextInput>(null);
    const firstTextInputRef = useRef<TextInput>(null);
    const historyRef = useRef<Snapshot[]>([]);

    useEffect(() => {
        isInitialLoadRef.current = true;
        loadNote(noteId);
        loadNoteFolderMap();
        initializeFolders();
    }, [initializeFolders, loadNote, loadNoteFolderMap, noteId]);

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    useEffect(() => {
        if (!activeNote || activeNote.id !== noteId) return;

        const parsedBlocks = parseBlocks(activeNote.content);
        const initialBlocks = parsedBlocks.length
            ? parsedBlocks
            : [{ id: Date.now().toString(), type: 'text' as const, content: '' }];

        setTitle(activeNote.title || 'Başlıksız');
        setBlocks(initialBlocks);
        historyRef.current = [{ title: activeNote.title || 'Başlıksız', blocks: safeCloneBlocks(initialBlocks) }];
        historyCursorRef.current = 0;
        setHistoryIndex(0);
        isInitialLoadRef.current = false;
    }, [activeNote, noteId]);

    const pushHistory = useCallback((nextTitle: string, nextBlocks: BlockType[]) => {
        const cloned = safeCloneBlocks(nextBlocks);
        const cursor = historyCursorRef.current;
        const current = historyRef.current[cursor];

        if (
            current &&
            current.title === nextTitle &&
            areBlocksEqual(current.blocks, cloned)
        ) {
            return;
        }

        const truncated = historyRef.current.slice(0, cursor + 1);
        const next = [...truncated, { title: nextTitle, blocks: cloned }];
        const bounded = next.slice(-60);
        historyRef.current = bounded;
        historyCursorRef.current = bounded.length - 1;
        setHistoryIndex(historyCursorRef.current);
    }, []);

    const debouncedSave = useCallback(
        (nextTitle: string, nextBlocks: BlockType[]) => {
            if (isInitialLoadRef.current) return;

            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            setIsSaving(true);

            saveTimeoutRef.current = setTimeout(async () => {
                const contentJson = JSON.stringify(nextBlocks);
                await updateNote(noteId, nextTitle, contentJson);
                setIsSaving(false);
            }, 450);
        },
        [noteId, updateNote]
    );

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    const applyDraft = useCallback(
        (nextTitle: string, nextBlocks: BlockType[]) => {
            setTitle(nextTitle);
            setBlocks(nextBlocks);
            pushHistory(nextTitle, nextBlocks);
            debouncedSave(nextTitle, nextBlocks);
        },
        [debouncedSave, pushHistory]
    );

    const handleTitleChange = useCallback(
        (value: string) => {
            applyDraft(value, blocks);
        },
        [applyDraft, blocks]
    );

    const handleTextBlockChange = useCallback(
        (id: string, value: string) => {
            const nextBlocks = blocks.map((block) =>
                block.id === id ? { ...block, content: value } : block
            );
            applyDraft(title, nextBlocks);
        },
        [applyDraft, blocks, title]
    );

    const addDrawingBlock = useCallback(() => {
        const timestamp = Date.now().toString();
        const nextBlocks = [
            ...blocks,
            { id: `draw-${timestamp}`, type: 'drawing' as const, content: '' },
            { id: `text-${timestamp}`, type: 'text' as const, content: '' },
        ];
        applyDraft(title, nextBlocks);
    }, [applyDraft, blocks, title]);

    const addTextTemplate = useCallback(
        (template: string) => {
            const firstText = blocks.find((block) => block.type === 'text');

            if (!firstText) {
                const nextBlocks = [
                    ...blocks,
                    { id: `text-${Date.now()}`, type: 'text' as const, content: template },
                ];
                applyDraft(title, nextBlocks);
                return;
            }

            const nextBlocks = blocks.map((block) =>
                block.id === firstText.id ? { ...block, content: `${block.content}${template}` } : block
            );
            applyDraft(title, nextBlocks);
        },
        [applyDraft, blocks, title]
    );

    const removeBlock = useCallback(
        (id: string) => {
            const next = blocks.filter((block) => block.id !== id);
            const fallback = next.length ? next : [{ id: Date.now().toString(), type: 'text' as const, content: '' }];
            applyDraft(title, fallback);
        },
        [applyDraft, blocks, title]
    );

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const handleDelete = useCallback(async () => {
        await deleteNote(noteId);
        setMenuVisible(false);
        router.back();
    }, [deleteNote, noteId, router]);

    const handleUndo = useCallback(() => {
        const cursor = historyCursorRef.current;
        if (cursor <= 0) return;
        const nextIndex = cursor - 1;
        const snapshot = historyRef.current[nextIndex];
        if (!snapshot) return;

        historyCursorRef.current = nextIndex;
        setHistoryIndex(nextIndex);
        setTitle(snapshot.title);
        setBlocks(safeCloneBlocks(snapshot.blocks));
        debouncedSave(snapshot.title, snapshot.blocks);
    }, [debouncedSave]);

    const shareContent = useMemo(() => {
        const textContent = blocks
            .filter((block) => block.type === 'text' && block.content.trim())
            .map((block) => block.content.trim())
            .join('\n\n');

        return `${title || 'Başlıksız'}\n\n${textContent || ''}`.trim();
    }, [blocks, title]);

    const handleShare = useCallback(async () => {
        try {
            await Share.share({ message: shareContent, title });
        } catch (error) {
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(shareContent);
            }
        }
    }, [shareContent, title]);

    const handleCreateAnother = useCallback(async () => {
        const newId = await createNote();
        if (!newId) return;
        setMenuVisible(false);
        router.replace(`/(main)/note/${newId}`);
    }, [createNote, router]);

    const currentFolderId = useMemo(() => getNoteFolderId(noteId), [getNoteFolderId, noteId]);

    const handleMoveToFolder = useCallback(
        async (folderId: string | null) => {
            await moveNoteToFolder(noteId, folderId);
            setFolderPickerVisible(false);
            setMenuVisible(false);
        },
        [moveNoteToFolder, noteId]
    );

    const handleDone = useCallback(() => {
        Keyboard.dismiss();
        router.back();
    }, [router]);

    if (!activeNote || activeNote.id !== noteId) {
        return (
            <View style={[styles.loading, { backgroundColor: colors.bg }]}> 
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
            </View>
        );
    }

    const timestampText = new Date(activeNote.updatedAt).toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <View style={[styles.screen, { backgroundColor: colors.bg }]}> 
            <View style={[styles.mainContent, isWeb && styles.mainContentWeb]}>
            <View style={styles.topBar}>
                <TouchableScale
                    onPress={handleBack}
                    style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    pressedStyle={{ backgroundColor: colors.cardHover }}
                >
                    <Ionicons name="chevron-back" size={30} color={colors.text} />
                </TouchableScale>

                <View style={styles.topBarActions}>
                    <TouchableScale
                        onPress={handleShare}
                        style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Ionicons name="share-outline" size={24} color={colors.text} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={() => setMenuVisible(true)}
                        style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={handleUndo}
                        style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Ionicons name="arrow-undo" size={24} color={historyIndex > 0 ? colors.text : colors.placeholder} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={handleDone}
                        style={[styles.doneButton, { backgroundColor: colors.accent }]}
                        pressedStyle={{ opacity: 0.88 }}
                    >
                        <Ionicons name="checkmark" size={24} color="#111111" />
                    </TouchableScale>
                </View>
            </View>

            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>{timestampText}</Text>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ paddingBottom: 170 + Math.max(0, insets.bottom) }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.editorArea}>
                    <TextInput
                        ref={titleInputRef}
                        style={[styles.titleInput, { color: colors.heading }]}
                        value={title}
                        onChangeText={handleTitleChange}
                        placeholder="Başlık"
                        placeholderTextColor={colors.placeholder}
                        multiline
                    />

                    {blocks.map((block, index) => {
                        if (block.type === 'drawing') {
                            return (
                                <DrawingBlock
                                    key={block.id}
                                    initialBase64={block.content}
                                    onSave={(base64) => {
                                        const nextBlocks = blocks.map((item) =>
                                            item.id === block.id ? { ...item, content: base64 } : item
                                        );
                                        applyDraft(title, nextBlocks);
                                    }}
                                    onDelete={() => removeBlock(block.id)}
                                />
                            );
                        }

                        return (
                            <TextInput
                                key={block.id}
                                ref={index === 0 ? firstTextInputRef : undefined}
                                style={[styles.textInput, { color: colors.text }]}
                                value={block.content}
                                onChangeText={(text) => handleTextBlockChange(block.id, text)}
                                placeholder={index === 0 ? 'Yazmaya başlayın...' : ''}
                                placeholderTextColor={colors.placeholder}
                                multiline
                                textAlignVertical="top"
                            />
                        );
                    })}
                </View>
            </ScrollView>
            </View>

            <View
                style={[
                    styles.toolbarWrap,
                    isWeb && styles.toolbarWrapWeb,
                    {
                        paddingBottom: isKeyboardVisible ? 10 : Math.max(14, insets.bottom + 8),
                    },
                ]}
            >
                <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                    <TouchableScale
                        onPress={() => titleInputRef.current?.focus()}
                        style={styles.toolbarButton}
                        pressedStyle={{ opacity: 0.8 }}
                    >
                        <Text style={[styles.toolbarAa, { color: colors.text }]}>Aa</Text>
                    </TouchableScale>

                    <TouchableScale
                        onPress={() => addTextTemplate('\n- [ ] ')}
                        style={styles.toolbarButton}
                        pressedStyle={{ opacity: 0.8 }}
                    >
                        <Ionicons name="list-outline" size={24} color={colors.text} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={() => addTextTemplate('\n| Sütun 1 | Sütun 2 |\n| --- | --- |\n|  |  |\n')}
                        style={styles.toolbarButton}
                        pressedStyle={{ opacity: 0.8 }}
                    >
                        <Ionicons name="grid-outline" size={24} color={colors.text} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={() => addTextTemplate('\n📎 ')}
                        style={styles.toolbarButton}
                        pressedStyle={{ opacity: 0.8 }}
                    >
                        <Ionicons name="attach-outline" size={24} color={colors.text} />
                    </TouchableScale>

                    <TouchableScale
                        onPress={addDrawingBlock}
                        style={styles.toolbarButton}
                        pressedStyle={{ opacity: 0.8 }}
                    >
                        <Ionicons name="color-wand-outline" size={24} color={colors.text} />
                    </TouchableScale>
                </View>

                {!isKeyboardVisible ? (
                    <TouchableScale
                        onPress={handleCreateAnother}
                        style={[styles.floatingCompose, { backgroundColor: colors.card, borderColor: colors.border }]}
                        pressedStyle={{ backgroundColor: colors.cardHover }}
                    >
                        <Ionicons name="create-outline" size={28} color={colors.text} />
                    </TouchableScale>
                ) : null}
            </View>

            <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <Pressable
                    onPress={() => setMenuVisible(false)}
                    style={[styles.menuOverlay, { backgroundColor: colors.overlay }]}
                >
                    <Pressable
                        style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={(event: any) => event.stopPropagation()}
                    >
                        <TouchableScale
                            onPress={handleCreateAnother}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="add-circle-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuActionText, { color: colors.text }]}>Yeni Not</Text>
                        </TouchableScale>

                        <TouchableScale
                            onPress={handleShare}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="share-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuActionText, { color: colors.text }]}>Paylaş</Text>
                        </TouchableScale>

                        <TouchableScale
                            onPress={() => {
                                setMenuVisible(false);
                                setFolderPickerVisible(true);
                            }}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="folder-open-outline" size={18} color={colors.text} />
                            <Text style={[styles.menuActionText, { color: colors.text }]}>Klasöre Taşı</Text>
                        </TouchableScale>

                        <TouchableScale
                            onPress={handleDelete}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            <Text style={[styles.menuActionText, { color: colors.danger }]}>Notu Sil</Text>
                        </TouchableScale>

                        <TouchableScale
                            onPress={() => {
                                logout();
                                setMenuVisible(false);
                                router.replace('/(auth)/login');
                            }}
                            style={styles.menuAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                            <Text style={[styles.menuActionText, { color: colors.danger }]}>Çıkış Yap</Text>
                        </TouchableScale>
                    </Pressable>
                </Pressable>
            </Modal>

            <Modal
                transparent
                visible={folderPickerVisible}
                animationType="fade"
                onRequestClose={() => setFolderPickerVisible(false)}
            >
                <Pressable
                    onPress={() => setFolderPickerVisible(false)}
                    style={[styles.menuOverlay, { backgroundColor: colors.overlay }]}
                >
                    <Pressable
                        style={[styles.folderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={(event: any) => event.stopPropagation()}
                    >
                        <Text style={[styles.folderTitle, { color: colors.heading }]}>Klasöre Taşı</Text>

                        <TouchableScale
                            onPress={() => handleMoveToFolder(null)}
                            style={styles.folderAction}
                            pressedStyle={{ backgroundColor: colors.cardHover }}
                        >
                            <Ionicons name="document-text-outline" size={18} color={colors.text} />
                            <Text style={[styles.folderActionText, { color: colors.text }]}>Notlar</Text>
                            {currentFolderId === null ? (
                                <Ionicons name="checkmark" size={18} color={colors.accent} style={styles.folderCheck} />
                            ) : null}
                        </TouchableScale>

                        {customFolders.map((folder) => (
                            <TouchableScale
                                key={folder.id}
                                onPress={() => handleMoveToFolder(folder.id)}
                                style={styles.folderAction}
                                pressedStyle={{ backgroundColor: colors.cardHover }}
                            >
                                <Ionicons name="folder-outline" size={18} color={colors.accent} />
                                <Text style={[styles.folderActionText, { color: colors.text }]} numberOfLines={1}>
                                    {folder.name}
                                </Text>
                                {currentFolderId === folder.id ? (
                                    <Ionicons name="checkmark" size={18} color={colors.accent} style={styles.folderCheck} />
                                ) : null}
                            </TouchableScale>
                        ))}
                    </Pressable>
                </Pressable>
            </Modal>

            <View style={[styles.saveIndicator, { backgroundColor: isSaving ? colors.warningLight : colors.successLight }]}> 
                <View style={[styles.saveDot, { backgroundColor: isSaving ? colors.warning : colors.success }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: 12,
    },
    mainContent: {
        flex: 1,
        width: '100%',
    },
    mainContentWeb: {
        maxWidth: 980,
        alignSelf: 'center',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 15,
        fontWeight: '500',
    },
    topBar: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topBarActions: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
    },
    circleButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timestamp: {
        marginTop: 18,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    editorArea: {
        paddingTop: 10,
        width: '100%',
        maxWidth: 920,
        alignSelf: 'center',
    },
    titleInput: {
        fontSize: 34,
        lineHeight: 40,
        fontWeight: '800',
        letterSpacing: -0.6,
        marginBottom: 16,
        minHeight: 50,
    },
    textInput: {
        fontSize: 18,
        lineHeight: 30,
        fontWeight: '500',
        minHeight: 180,
        paddingBottom: 18,
    },
    toolbarWrap: {
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    toolbarWrapWeb: {
        alignSelf: 'center',
        width: '100%',
        maxWidth: 980,
        left: undefined,
        right: undefined,
    },
    toolbar: {
        flex: 1,
        minHeight: 58,
        borderRadius: 29,
        borderWidth: 1,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toolbarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbarAa: {
        fontSize: 22,
        lineHeight: 24,
        fontWeight: '500',
    },
    floatingCompose: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuOverlay: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        paddingTop: 96,
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
        gap: 10,
        paddingHorizontal: 14,
    },
    menuActionText: {
        fontSize: 16,
        fontWeight: '600',
    },
    folderCard: {
        width: 280,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    folderTitle: {
        fontSize: 16,
        fontWeight: '700',
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 10,
    },
    folderAction: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
    },
    folderActionText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    folderCheck: {
        marginLeft: 8,
    },
    saveIndicator: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 8 : 6,
        right: 20,
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    saveDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
    },
});
