import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { useNoteStore } from './noteStore';

export type FolderKind = 'system' | 'custom';

export interface FolderItem {
    id: string;
    name: string;
    kind: FolderKind;
    createdAt: string;
}

interface FolderState {
    initialized: boolean;
    customFolders: FolderItem[];
    initializeFolders: () => Promise<void>;
    createFolder: (name: string) => Promise<FolderItem | null>;
    renameFolder: (id: string, name: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'noting.customFolders.v1';

export const SYSTEM_FOLDERS: FolderItem[] = [
    { id: 'notes', name: 'Notlar', kind: 'system', createdAt: '1970-01-01T00:00:00.000Z' },
    { id: 'trash', name: 'Son Silinenler', kind: 'system', createdAt: '1970-01-01T00:00:00.000Z' },
];

async function persistFolders(folders: FolderItem[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

export const useFolderStore = create<FolderState>((set, get) => ({
    initialized: false,
    customFolders: [],

    initializeFolders: async () => {
        if (get().initialized) return;

        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (!raw) {
                set({ customFolders: [], initialized: true });
                return;
            }

            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                set({ customFolders: [], initialized: true });
                return;
            }

            const folders = parsed
                .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
                .map((item) => ({
                    id: item.id,
                    name: item.name,
                    kind: 'custom' as const,
                    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
                }));

            set({ customFolders: folders, initialized: true });
        } catch (error) {
            console.warn('[FolderStore] initializeFolders failed:', error);
            set({ customFolders: [], initialized: true });
        }
    },

    createFolder: async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return null;

        const folder: FolderItem = {
            id: `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            name: trimmed,
            kind: 'custom',
            createdAt: new Date().toISOString(),
        };

        const next = [...get().customFolders, folder];
        set({ customFolders: next });

        try {
            await persistFolders(next);
        } catch (error) {
            console.warn('[FolderStore] createFolder persist failed:', error);
        }

        return folder;
    },

    renameFolder: async (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        const next = get().customFolders.map((folder) =>
            folder.id === id ? { ...folder, name: trimmed } : folder
        );
        set({ customFolders: next });

        try {
            await persistFolders(next);
        } catch (error) {
            console.warn('[FolderStore] renameFolder persist failed:', error);
        }
    },

    deleteFolder: async (id: string) => {
        const next = get().customFolders.filter((folder) => folder.id !== id);
        set({ customFolders: next });

        await useNoteStore.getState().clearFolderAssignmentsForFolder(id);

        try {
            await persistFolders(next);
        } catch (error) {
            console.warn('[FolderStore] deleteFolder persist failed:', error);
        }
    },
}));
