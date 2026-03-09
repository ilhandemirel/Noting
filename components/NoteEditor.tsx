import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNoteStore } from '../stores/noteStore';
import { useColors } from '../stores/themeStore';
import DrawingBlock from './DrawingBlock';

interface NoteEditorProps {
    noteId: string;
}

type BlockType = {
    id: string;
    type: 'text' | 'drawing';
    content: string;
};

export default function NoteEditor({ noteId }: NoteEditorProps) {
    const { activeNote, loadNote, updateNote } = useNoteStore();
    const colors = useColors();
    const [title, setTitle] = useState('');
    const [blocks, setBlocks] = useState<BlockType[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isInitialLoadRef = useRef(true);

    const parseContent = (content: string): BlockType[] => {
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return parsed.map((b: any, index: number) => ({
                    ...b,
                    id: b.id || `${Date.now()}-${index}`
                }));
            } else {
                return [{ id: Date.now().toString(), type: 'text', content }];
            }
        } catch {
            return [{ id: Date.now().toString(), type: 'text', content }];
        }
    };

    useEffect(() => {
        isInitialLoadRef.current = true;
        loadNote(noteId);
    }, [noteId]);

    useEffect(() => {
        if (activeNote && activeNote.id === noteId) {
            setTitle(activeNote.title);
            const initialBlocks = parseContent(activeNote.content);
            if (initialBlocks.length === 0) {
                initialBlocks.push({ id: Date.now().toString(), type: 'text', content: '' });
            }
            setBlocks(initialBlocks);
            isInitialLoadRef.current = false;
        }
    }, [activeNote?.id]);

    const debouncedSave = useCallback(
        (newTitle: string, newBlocks: BlockType[]) => {
            if (isInitialLoadRef.current) return;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            setIsSaving(true);
            saveTimeoutRef.current = setTimeout(async () => {
                const contentJson = JSON.stringify(newBlocks);
                await updateNote(noteId, newTitle, contentJson);
                setIsSaving(false);
            }, 500);
        },
        [noteId, updateNote]
    );

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);

    const handleTitleChange = useCallback((text: string) => {
        setTitle(text);
        debouncedSave(text, blocks);
    }, [blocks, debouncedSave]);

    const updateBlockContent = useCallback((id: string, newContent: string) => {
        setBlocks(prev => {
            const newBlocks = prev.map(b => b.id === id ? { ...b, content: newContent } : b);
            debouncedSave(title, newBlocks);
            return newBlocks;
        });
    }, [title, debouncedSave]);

    const addDrawingBlock = useCallback(() => {
        setBlocks(prev => {
            const newBlocks = [
                ...prev,
                { id: Date.now().toString(), type: 'drawing' as const, content: '' },
                { id: (Date.now() + 1).toString(), type: 'text' as const, content: '' }
            ];
            debouncedSave(title, newBlocks);
            return newBlocks;
        });
    }, [title, debouncedSave]);

    const removeBlock = useCallback((id: string) => {
        setBlocks(prev => {
            let newBlocks = prev.filter(b => b.id !== id);
            if (newBlocks.length === 0) {
                newBlocks = [{ id: Date.now().toString(), type: 'text', content: '' }];
            }
            debouncedSave(title, newBlocks);
            return newBlocks;
        });
    }, [title, debouncedSave]);

    if (!activeNote || activeNote.id !== noteId) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
                <Text style={{ color: colors.secondary }}>{'Yukleniyor...'}</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.editorArea}>
                    {/* Save Status */}
                    <View style={styles.statusRow}>
                        <View style={styles.statusLeft}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isSaving ? '#F2C94C' : colors.success }
                            ]} />
                            <Text style={[styles.statusText, { color: colors.secondary }]}>
                                {isSaving ? 'Kaydediliyor...' : 'Kaydedildi'}
                            </Text>
                            {!activeNote.isSynced && (
                                <View style={styles.offlineBadge}>
                                    <Ionicons name="cloud-offline-outline" size={11} color={colors.placeholder} />
                                    <Text style={[styles.offlineText, { color: colors.placeholder }]}>{'Yerel'}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Title */}
                    <TextInput
                        style={[styles.titleInput, { color: colors.text }]}
                        value={title}
                        onChangeText={handleTitleChange}
                        placeholder="Basliksiz"
                        placeholderTextColor={colors.placeholder}
                        multiline
                    />

                    {/* Divider */}
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />

                    {/* Blocks */}
                    {blocks.map((block, index) => {
                        if (block.type === 'drawing') {
                            return (
                                <DrawingBlock
                                    key={block.id}
                                    initialBase64={block.content}
                                    onSave={(base64) => updateBlockContent(block.id, base64)}
                                    onDelete={() => removeBlock(block.id)}
                                />
                            );
                        }
                        return (
                            <TextInput
                                key={block.id}
                                style={[
                                    styles.textBlock,
                                    { color: colors.text },
                                    blocks.length === 1 ? { minHeight: 300 } : undefined
                                ]}
                                value={block.content}
                                onChangeText={(text) => updateBlockContent(block.id, text)}
                                placeholder={index === 0 ? "Buraya yazin..." : ""}
                                placeholderTextColor={colors.placeholder}
                                multiline
                                textAlignVertical="top"
                            />
                        );
                    })}
                </View>
            </ScrollView>

            {/* Floating Toolbar */}
            <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable
                    onPress={addDrawingBlock}
                    style={({ pressed }) => [
                        styles.toolBtn,
                        { backgroundColor: pressed ? colors.hover : 'transparent' }
                    ]}
                >
                    <Ionicons name="brush-outline" size={18} color={colors.text} />
                    <Text style={[styles.toolText, { color: colors.text }]}>{'Cizim'}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editorArea: {
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 100,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
    },
    offlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    offlineText: {
        fontSize: 11,
        marginLeft: 3,
    },
    titleInput: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 12,
        minHeight: 40,
    },
    divider: {
        height: 1,
        marginBottom: 20,
    },
    textBlock: {
        fontSize: 15,
        lineHeight: 26,
    },
    toolbar: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 4,
        paddingVertical: 4,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    toolBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    toolText: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 6,
    },
});
