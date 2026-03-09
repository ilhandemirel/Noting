import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import NoteModel from '../database/models/Note';

interface NoteItem {
    id: string;
    title: string;
    content: string;
    folderId: string | null;
    isSynced: boolean;
    updatedAt: Date;
}

interface NoteState {
    notes: NoteItem[];
    activeNote: NoteItem | null;
    isLoading: boolean;
    loadNotes: (folderId?: string) => Promise<void>;
    loadNote: (id: string) => Promise<void>;
    createNote: (folderId?: string | null) => Promise<string>;
    updateNote: (id: string, title: string, content: string) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    clearActiveNote: () => void;
}

const DEFAULT_CONTENT = JSON.stringify([
    { type: 'text', content: '' },
]);

export const useNoteStore = create<NoteState>((set, get) => ({
    notes: [],
    activeNote: null,
    isLoading: false,

    loadNotes: async (folderId?: string) => {
        set({ isLoading: true });
        try {
            const notesCollection = database.get<NoteModel>('notes');
            let query;
            if (folderId) {
                query = notesCollection.query(Q.where('folder_id', folderId));
            } else {
                query = notesCollection.query();
            }
            const allNotes = await query.fetch();
            const noteItems: NoteItem[] = allNotes.map((n) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                folderId: n.folderId,
                isSynced: n.isSynced,
                updatedAt: n.updatedAt,
            }));
            // Sort by updatedAt descending
            noteItems.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            set({ notes: noteItems, isLoading: false });
        } catch (err) {
            console.error('loadNotes error:', err);
            set({ isLoading: false });
        }
    },

    loadNote: async (id: string) => {
        try {
            const note = await database.get<NoteModel>('notes').find(id);
            set({
                activeNote: {
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    folderId: note.folderId,
                    isSynced: note.isSynced,
                    updatedAt: note.updatedAt,
                },
            });
        } catch (err) {
            console.error('loadNote error:', err);
        }
    },

    createNote: async (folderId?: string | null) => {
        try {
            const notesCollection = database.get<NoteModel>('notes');
            let newNoteId = '';
            await database.write(async () => {
                const newNote = await notesCollection.create((note: any) => {
                    note.title = 'Basliksiz';
                    note.content = DEFAULT_CONTENT;
                    note.folderId = folderId || null;
                    note.reminderDate = null;
                    note.isSynced = false;
                });
                newNoteId = newNote.id;
            });
            if (folderId) {
                await get().loadNotes(folderId);
            } else {
                await get().loadNotes();
            }
            return newNoteId;
        } catch (err) {
            console.error('createNote error:', err);
            return '';
        }
    },

    updateNote: async (id: string, title: string, content: string) => {
        try {
            await database.write(async () => {
                const note = await database.get<NoteModel>('notes').find(id);
                await note.update((n: any) => {
                    n.title = title;
                    n.content = content;
                    n.isSynced = false;
                });
            });
            // Update active note in state
            const current = get().activeNote;
            if (current && current.id === id) {
                set({
                    activeNote: {
                        ...current,
                        title,
                        content,
                        isSynced: false,
                        updatedAt: new Date(),
                    },
                });
            }
        } catch (err) {
            console.error('updateNote error:', err);
        }
    },

    deleteNote: async (id: string) => {
        try {
            const note = await database.get<NoteModel>('notes').find(id);
            const folderId = note.folderId;
            await database.write(async () => {
                await note.markAsDeleted();
            });
            const { activeNote } = get();
            if (activeNote?.id === id) {
                set({ activeNote: null });
            }
            await get().loadNotes(folderId || undefined);
        } catch (err) {
            console.error('deleteNote error:', err);
        }
    },

    clearActiveNote: () => set({ activeNote: null }),
}));
