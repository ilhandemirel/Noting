import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import database from '../database';
import NoteModel from '../database/models/Note';

export interface NoteItem {
    id: string;
    title: string;
    content: string;
    isSynced: boolean;
    updatedAt: Date;
}

export interface TrashedNoteItem {
    id: string;
    title: string;
    content: string;
    deletedAt: string;
}

interface NoteState {
    notes: NoteItem[];
    activeNote: NoteItem | null;
    trashedNotes: TrashedNoteItem[];
    noteFolderMap: Record<string, string>;
    isLoading: boolean;
    trashLoaded: boolean;
    folderMapLoaded: boolean;
    loadNotes: () => Promise<void>;
    loadNote: (id: string) => Promise<void>;
    createNote: () => Promise<string>;
    updateNote: (id: string, title: string, content: string) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    loadTrash: () => Promise<void>;
    restoreFromTrash: (id: string) => Promise<string | null>;
    removeFromTrash: (id: string) => Promise<void>;
    clearTrash: () => Promise<void>;
    loadNoteFolderMap: () => Promise<void>;
    getNoteFolderId: (noteId: string) => string | null;
    moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
    clearFolderAssignmentsForFolder: (folderId: string) => Promise<void>;
    clearActiveNote: () => void;
    reset: () => void;
}

import { useAuthStore } from './authStore';

const DEFAULT_CONTENT = JSON.stringify([{ type: 'text', content: '' }]);

function getTrashKey() {
    const userId = useAuthStore.getState().user?.id;
    return userId ? `noting.trashedNotes.${userId}.v1` : 'noting.trashedNotes.anonymous.v1';
}

function getFolderMapKey() {
    const userId = useAuthStore.getState().user?.id;
    return userId ? `noting.noteFolderMap.${userId}.v1` : 'noting.noteFolderMap.anonymous.v1';
}

function normalizeTitle(value: string) {
    const trimmed = value.trim();
    return trimmed || 'Başlıksız';
}

function noteFromModel(note: NoteModel): NoteItem {
    return {
        id: note.id,
        title: note.title,
        content: note.content,
        isSynced: note.isSynced,
        updatedAt: note.updatedAt,
    };
}

function sortByUpdatedAtDesc<T extends { updatedAt: Date }>(items: T[]) {
    return [...items].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

function sortTrashByDeletedAtDesc(items: TrashedNoteItem[]) {
    return [...items].sort(
        (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );
}

async function persistTrash(items: TrashedNoteItem[]) {
    await AsyncStorage.setItem(getTrashKey(), JSON.stringify(items));
}

async function persistFolderMap(map: Record<string, string>) {
    await AsyncStorage.setItem(getFolderMapKey(), JSON.stringify(map));
}

export const useNoteStore = create<NoteState>((set, get) => ({
    notes: [],
    activeNote: null,
    trashedNotes: [],
    noteFolderMap: {},
    isLoading: false,
    trashLoaded: false,
    folderMapLoaded: false,

    loadNotes: async () => {
        set({ isLoading: true });
        try {
            const notesCollection = database.get<NoteModel>('notes');
            const allNotes = await notesCollection.query().fetch();
            const items = sortByUpdatedAtDesc(allNotes.map(noteFromModel));
            set({ notes: items, isLoading: false });

            const { noteFolderMap } = get();
            const currentIds = new Set(items.map((note) => note.id));
            const cleanedMap = Object.entries(noteFolderMap).reduce<Record<string, string>>((acc, [noteId, folderId]) => {
                if (currentIds.has(noteId) && folderId) {
                    acc[noteId] = folderId;
                }
                return acc;
            }, {});

            if (Object.keys(cleanedMap).length !== Object.keys(noteFolderMap).length) {
                set({ noteFolderMap: cleanedMap });
                try {
                    await persistFolderMap(cleanedMap);
                } catch (mapPersistError) {
                    console.warn('loadNotes map cleanup persist error:', mapPersistError);
                }
            }
        } catch (err) {
            console.error('loadNotes error:', err);
            set({ isLoading: false });
        }
    },

    loadNote: async (id: string) => {
        try {
            const note = await database.get<NoteModel>('notes').find(id);
            set({ activeNote: noteFromModel(note) });
        } catch (err) {
            console.error('loadNote error:', err);
            set({ activeNote: null });
        }
    },

    createNote: async () => {
        try {
            const notesCollection = database.get<NoteModel>('notes');
            let newNoteId = '';

            await database.write(async () => {
                const newNote = await notesCollection.create((note: any) => {
                    note.title = 'Başlıksız';
                    note.content = DEFAULT_CONTENT;
                    note.reminderDate = null;
                    note.isSynced = false;
                });
                newNoteId = newNote.id;
            });

            await get().loadNotes();
            return newNoteId;
        } catch (err) {
            console.error('createNote error:', err);
            return '';
        }
    },

    updateNote: async (id: string, title: string, content: string) => {
        const normalizedTitle = normalizeTitle(title);

        try {
            await database.write(async () => {
                const note = await database.get<NoteModel>('notes').find(id);
                await note.update((record: any) => {
                    record.title = normalizedTitle;
                    record.content = content;
                    record.isSynced = false;
                });
            });

            const now = new Date();
            const current = get().activeNote;

            if (current && current.id === id) {
                set({
                    activeNote: {
                        ...current,
                        title: normalizedTitle,
                        content,
                        isSynced: false,
                        updatedAt: now,
                    },
                });
            }

            set((state) => {
                const nextNotes = state.notes.some((note) => note.id === id)
                    ? state.notes.map((note) =>
                        note.id === id
                            ? { ...note, title: normalizedTitle, content, isSynced: false, updatedAt: now }
                            : note
                    )
                    : state.notes;

                return { notes: sortByUpdatedAtDesc(nextNotes) };
            });
        } catch (err) {
            console.error('updateNote error:', err);
        }
    },

    deleteNote: async (id: string) => {
        try {
            const note = await database.get<NoteModel>('notes').find(id);
            const noteSnapshot = noteFromModel(note);

            await database.write(async () => {
                await note.markAsDeleted();
            });

            const trashItem: TrashedNoteItem = {
                id: `trash-${Date.now().toString(36)}-${noteSnapshot.id}`,
                title: noteSnapshot.title,
                content: noteSnapshot.content,
                deletedAt: new Date().toISOString(),
            };

            let nextTrash = [trashItem, ...get().trashedNotes];
            nextTrash = sortTrashByDeletedAtDesc(nextTrash);

            const nextMap = { ...get().noteFolderMap };
            delete nextMap[id];

            set({ trashedNotes: nextTrash, trashLoaded: true, noteFolderMap: nextMap });

            try {
                await Promise.all([persistTrash(nextTrash), persistFolderMap(nextMap)]);
            } catch (persistErr) {
                console.warn('deleteNote persist error:', persistErr);
            }

            const { activeNote } = get();
            if (activeNote?.id === id) {
                set({ activeNote: null });
            }

            await get().loadNotes();
        } catch (err) {
            console.error('deleteNote error:', err);
        }
    },

    loadTrash: async () => {
        if (get().trashLoaded) return;

        try {
            const raw = await AsyncStorage.getItem(getTrashKey());
            if (!raw) {
                set({ trashedNotes: [], trashLoaded: true });
                return;
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                set({ trashedNotes: [], trashLoaded: true });
                return;
            }

            const trash = parsed
                .filter((item) => item && typeof item.id === 'string')
                .map((item) => ({
                    id: item.id,
                    title: typeof item.title === 'string' ? item.title : 'Başlıksız',
                    content: typeof item.content === 'string' ? item.content : DEFAULT_CONTENT,
                    deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : new Date().toISOString(),
                }));

            set({ trashedNotes: sortTrashByDeletedAtDesc(trash), trashLoaded: true });
        } catch (err) {
            console.error('loadTrash error:', err);
            set({ trashedNotes: [], trashLoaded: true });
        }
    },

    restoreFromTrash: async (id: string) => {
        const item = get().trashedNotes.find((trash) => trash.id === id);
        if (!item) return null;

        try {
            let createdId = '';
            const notesCollection = database.get<NoteModel>('notes');

            await database.write(async () => {
                const restored = await notesCollection.create((note: any) => {
                    note.title = normalizeTitle(item.title);
                    note.content = item.content || DEFAULT_CONTENT;
                    note.reminderDate = null;
                    note.isSynced = false;
                });
                createdId = restored.id;
            });

            const nextTrash = get().trashedNotes.filter((trash) => trash.id !== id);
            set({ trashedNotes: nextTrash });
            await persistTrash(nextTrash);
            await get().loadNotes();

            return createdId;
        } catch (err) {
            console.error('restoreFromTrash error:', err);
            return null;
        }
    },

    removeFromTrash: async (id: string) => {
        const nextTrash = get().trashedNotes.filter((trash) => trash.id !== id);
        set({ trashedNotes: nextTrash });

        try {
            await persistTrash(nextTrash);
        } catch (err) {
            console.error('removeFromTrash error:', err);
        }
    },

    clearTrash: async () => {
        set({ trashedNotes: [] });
        try {
            await AsyncStorage.removeItem(getTrashKey());
        } catch (err) {
            console.error('clearTrash error:', err);
        }
    },

    loadNoteFolderMap: async () => {
        if (get().folderMapLoaded) return;

        try {
            const raw = await AsyncStorage.getItem(getFolderMapKey());
            if (!raw) {
                set({ noteFolderMap: {}, folderMapLoaded: true });
                return;
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                set({ noteFolderMap: {}, folderMapLoaded: true });
                return;
            }

            const cleanMap = Object.entries(parsed).reduce<Record<string, string>>((acc, [noteId, folderId]) => {
                if (typeof noteId === 'string' && typeof folderId === 'string' && folderId.trim()) {
                    acc[noteId] = folderId;
                }
                return acc;
            }, {});

            set({ noteFolderMap: cleanMap, folderMapLoaded: true });
        } catch (err) {
            console.error('loadNoteFolderMap error:', err);
            set({ noteFolderMap: {}, folderMapLoaded: true });
        }
    },

    getNoteFolderId: (noteId: string) => {
        const folderId = get().noteFolderMap[noteId];
        return folderId || null;
    },

    moveNoteToFolder: async (noteId: string, folderId: string | null) => {
        const nextMap = { ...get().noteFolderMap };

        if (folderId && folderId.trim()) {
            nextMap[noteId] = folderId;
        } else {
            delete nextMap[noteId];
        }

        set({ noteFolderMap: nextMap });

        try {
            await persistFolderMap(nextMap);
        } catch (err) {
            console.error('moveNoteToFolder error:', err);
        }
    },

    clearFolderAssignmentsForFolder: async (folderId: string) => {
        const nextMap = Object.entries(get().noteFolderMap).reduce<Record<string, string>>((acc, [noteId, assignedFolder]) => {
            if (assignedFolder !== folderId) {
                acc[noteId] = assignedFolder;
            }
            return acc;
        }, {});

        set({ noteFolderMap: nextMap });

        try {
            await persistFolderMap(nextMap);
        } catch (err) {
            console.error('clearFolderAssignmentsForFolder error:', err);
        }
    },

    clearActiveNote: () => set({ activeNote: null }),

    reset: () => set({
        notes: [],
        activeNote: null,
        trashedNotes: [],
        noteFolderMap: {},
        isLoading: false,
        trashLoaded: false,
        folderMapLoaded: false,
    }),
}));
