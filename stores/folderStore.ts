import { create } from 'zustand';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import Folder from '../database/models/Folder';

interface FolderItem {
    id: string;
    name: string;
    isSynced: boolean;
}

interface FolderState {
    folders: FolderItem[];
    selectedFolderId: string | null;
    isLoading: boolean;
    loadFolders: () => Promise<void>;
    createFolder: (name: string) => Promise<string>;
    deleteFolder: (id: string) => Promise<void>;
    renameFolder: (id: string, name: string) => Promise<void>;
    selectFolder: (id: string | null) => void;
}

export const useFolderStore = create<FolderState>((set, get) => ({
    folders: [],
    selectedFolderId: null,
    isLoading: false,

    loadFolders: async () => {
        set({ isLoading: true });
        try {
            const foldersCollection = database.get<Folder>('folders');
            const allFolders = await foldersCollection.query().fetch();
            const folderItems: FolderItem[] = allFolders.map((f) => ({
                id: f.id,
                name: f.name,
                isSynced: f.isSynced,
            }));
            set({ folders: folderItems, isLoading: false });
        } catch (err) {
            console.error('loadFolders error:', err);
            set({ isLoading: false });
        }
    },

    createFolder: async (name: string) => {
        try {
            const foldersCollection = database.get<Folder>('folders');
            let newFolderId = '';
            await database.write(async () => {
                const newFolder = await foldersCollection.create((folder: any) => {
                    folder.name = name;
                    folder.isSynced = false;
                });
                newFolderId = newFolder.id;
            });
            await get().loadFolders();
            return newFolderId;
        } catch (err) {
            console.error('createFolder error:', err);
            return '';
        }
    },

    deleteFolder: async (id: string) => {
        try {
            await database.write(async () => {
                const folder = await database.get<Folder>('folders').find(id);
                // Delete all notes in the folder first
                const notes = await folder.notes.fetch();
                for (const note of notes) {
                    await note.markAsDeleted();
                }
                await folder.markAsDeleted();
            });
            const { selectedFolderId } = get();
            if (selectedFolderId === id) {
                set({ selectedFolderId: null });
            }
            await get().loadFolders();
        } catch (err) {
            console.error('deleteFolder error:', err);
        }
    },

    renameFolder: async (id: string, name: string) => {
        try {
            await database.write(async () => {
                const folder = await database.get<Folder>('folders').find(id);
                await folder.update((f: any) => {
                    f.name = name;
                    f.isSynced = false;
                });
            });
            await get().loadFolders();
        } catch (err) {
            console.error('renameFolder error:', err);
        }
    },

    selectFolder: (id: string | null) => {
        set({ selectedFolderId: id });
    },
}));
