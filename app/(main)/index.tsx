import React, { useEffect, useCallback, memo } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNoteStore } from '../../stores/noteStore';
import { useFolderStore } from '../../stores/folderStore';
import { useColors } from '../../stores/themeStore';

const NoteCard = memo(({ item, folderName, colors, onPress }: {
    item: { id: string; title: string; isSynced: boolean; updatedAt: Date; folderId: string | null };
    folderName: string;
    colors: any;
    onPress: (id: string) => void;
}) => (
    <Pressable
        style={({ pressed }) => [
            styles.noteCard,
            {
                backgroundColor: pressed ? colors.hover : colors.card,
                borderColor: colors.border,
            }
        ]}
        onPress={() => onPress(item.id)}
    >
        <View style={styles.noteCardLeft}>
            <View style={[styles.noteIcon, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="document-text" size={16} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title || 'Basliksiz'}
                </Text>
                <Text style={[styles.noteFolder, { color: colors.secondary }]}>
                    {folderName}
                </Text>
            </View>
        </View>
        <View style={styles.noteCardRight}>
            {!item.isSynced && (
                <Ionicons name="cloud-offline-outline" size={14} color={colors.placeholder} style={{ marginRight: 4 }} />
            )}
            <Ionicons name="chevron-forward" size={16} color={colors.placeholder} />
        </View>
    </Pressable>
));

export default function DashboardScreen() {
    const { notes, loadNotes } = useNoteStore();
    const { folders, loadFolders } = useFolderStore();
    const colors = useColors();
    const router = useRouter();

    useEffect(() => {
        loadFolders();
        loadNotes();
    }, []);

    const getFolderName = useCallback((folderId: string | null) => {
        if (!folderId) return 'Klasorsuz';
        const folder = folders.find((f) => f.id === folderId);
        return folder?.name || 'Klasor';
    }, [folders]);

    const handleNotePress = useCallback((id: string) => {
        router.push(`/(main)/note/${id}`);
    }, [router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <View style={styles.contentArea}>
                {/* Header */}
                <View style={styles.headerArea}>
                    <Text style={[styles.greeting, { color: colors.text }]}>
                        {'Hos Geldiniz'}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.secondary }]}>
                        {'Notlariniza buradan ulasabilirsiniz.'}
                    </Text>
                </View>

                {/* Notes */}
                {notes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                            <Ionicons name="document-text-outline" size={32} color={colors.secondary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            {'Henuz not yok'}
                        </Text>
                        <Text style={[styles.emptyDesc, { color: colors.secondary }]}>
                            {'Sag alttaki + butonuyla hemen not olusturabilir veya menuden klasor ekleyebilirsiniz.'}
                        </Text>
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionLabel, { color: colors.secondary }]}>
                            {'SON NOTLAR'}
                        </Text>
                        <FlatList
                            data={notes.slice(0, 20)}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 32 }}
                            renderItem={({ item }) => (
                                <NoteCard
                                    item={item}
                                    folderName={getFolderName(item.folderId)}
                                    colors={colors}
                                    onPress={handleNotePress}
                                />
                            )}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentArea: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 60,
    },
    headerArea: {
        marginBottom: 24,
        paddingLeft: 48,
    },
    greeting: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        marginTop: 4,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    noteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 14,
        marginBottom: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    noteCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    noteCardRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    noteIcon: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    noteTitle: {
        fontSize: 15,
        fontWeight: '500',
    },
    noteFolder: {
        fontSize: 12,
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 60,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 6,
    },
    emptyDesc: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 260,
    },
});
