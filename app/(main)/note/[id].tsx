import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import NoteEditor from '../../../components/NoteEditor';
import { useNoteStore } from '../../../stores/noteStore';
import { useColors } from '../../../stores/themeStore';

export default function NoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const clearActiveNote = useNoteStore((s) => s.clearActiveNote);
    const colors = useColors();

    useEffect(() => {
        return () => {
            clearActiveNote();
        };
    }, [clearActiveNote]);

    if (!id) {
        return (
            <View style={[styles.container, { backgroundColor: colors.bg }]}>
                <Text style={{ color: colors.textSecondary }}>Not bulunamadı</Text>
            </View>
        );
    }

    return <NoteEditor noteId={id} />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
