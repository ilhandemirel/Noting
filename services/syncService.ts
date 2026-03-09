import { Q } from '@nozbe/watermelondb';
import database from '../database';
import Folder from '../database/models/Folder';
import Note from '../database/models/Note';
import pb from './pocketbase';
import { useNetworkStore } from '../stores/networkStore';
import { useAuthStore } from '../stores/authStore';
import { useFolderStore } from '../stores/folderStore';
import { useNoteStore } from '../stores/noteStore';

let syncInProgress = false;
let lastSyncTime: string | null = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

// ==================== HELPERS ====================

function getSyncState() {
    const { isConnected } = useNetworkStore.getState();
    const { isAuthenticated, user } = useAuthStore.getState();
    return { isConnected, isAuthenticated, userId: user?.id ?? null };
}

// ==================== PUSH: Local → Server ====================

async function pushFolders() {
    const { userId } = getSyncState();
    if (!userId) return;

    const foldersCollection = database.get<Folder>('folders');

    let unsyncedFolders: Folder[];
    try {
        unsyncedFolders = await foldersCollection
            .query(Q.where('is_synced', false))
            .fetch();
    } catch (err) {
        console.warn('[Sync] Failed to query unsynced folders:', err);
        return;
    }

    for (const folder of unsyncedFolders) {
        try {
            if (folder.remoteId) {
                await pb.collection('folders').update(folder.remoteId, {
                    name: folder.name,
                });
            } else {
                const record = await pb.collection('folders').create({
                    name: folder.name,
                    user_id: userId,
                });
                await database.write(async () => {
                    await folder.update((f: any) => {
                        f.remoteId = record.id;
                    });
                });
            }

            await database.write(async () => {
                await folder.update((f: any) => {
                    f.isSynced = true;
                });
            });
        } catch (err: any) {
            // If record was deleted on server, mark local as synced to avoid infinite retry
            if (err?.status === 404 && folder.remoteId) {
                console.warn(`[Sync] Remote folder "${folder.name}" (${folder.remoteId}) not found, clearing remoteId`);
                try {
                    await database.write(async () => {
                        await folder.update((f: any) => {
                            f.remoteId = null;
                            f.isSynced = false;
                        });
                    });
                } catch (writeErr) {
                    console.error(`[Sync] Failed to clear remoteId for folder "${folder.name}":`, writeErr);
                }
            } else {
                console.error(`[Sync] Push folder "${folder.name}" failed:`, err?.message || err);
            }
        }
    }
}

async function pushNotes() {
    const { userId } = getSyncState();
    if (!userId) return;

    const notesCollection = database.get<Note>('notes');
    const foldersCollection = database.get<Folder>('folders');

    let unsyncedNotes: Note[];
    try {
        unsyncedNotes = await notesCollection
            .query(Q.where('is_synced', false))
            .fetch();
    } catch (err) {
        console.warn('[Sync] Failed to query unsynced notes:', err);
        return;
    }

    for (const note of unsyncedNotes) {
        try {
            let contentData;
            try {
                contentData = JSON.parse(note.content);
            } catch {
                contentData = [{ type: 'text', content: note.content || '' }];
            }

            // Find the remote folder ID for this note (null = folderless note)
            let remoteFolderId: string | null = note.folderId || null;
            if (remoteFolderId) {
                try {
                    const localFolder = await foldersCollection.find(remoteFolderId);
                    if (localFolder.remoteId) {
                        remoteFolderId = localFolder.remoteId;
                    }
                } catch {
                    // Folder not found locally — skip this note until folder syncs
                    console.warn(`[Sync] Local folder "${note.folderId}" not found for note "${note.title}", skipping`);
                    continue;
                }
            }

            if (note.remoteId) {
                await pb.collection('notes').update(note.remoteId, {
                    title: note.title,
                    content: contentData,
                    folder_id: remoteFolderId || '',
                });
            } else {
                const record = await pb.collection('notes').create({
                    title: note.title,
                    content: contentData,
                    folder_id: remoteFolderId || '',
                    user_id: userId,
                });
                await database.write(async () => {
                    await note.update((n: any) => {
                        n.remoteId = record.id;
                    });
                });
            }

            await database.write(async () => {
                await note.update((n: any) => {
                    n.isSynced = true;
                });
            });
        } catch (err: any) {
            if (err?.status === 404 && note.remoteId) {
                console.warn(`[Sync] Remote note "${note.title}" (${note.remoteId}) not found, clearing remoteId`);
                try {
                    await database.write(async () => {
                        await note.update((n: any) => {
                            n.remoteId = null;
                            n.isSynced = false;
                        });
                    });
                } catch (writeErr) {
                    console.error(`[Sync] Failed to clear remoteId for note "${note.title}":`, writeErr);
                }
            } else {
                console.error(`[Sync] Push note "${note.title}" failed:`, err?.message || err);
            }
        }
    }
}

// ==================== PULL: Server → Local ====================

async function pullFolders() {
    const { userId } = getSyncState();
    if (!userId) return;

    try {
        const remoteFolders = await pb.collection('folders').getFullList({
            filter: `user_id = "${userId}"`,
            sort: '-updated_at',
        });

        const foldersCollection = database.get<Folder>('folders');

        for (const remote of remoteFolders) {
            try {
                const existing = await foldersCollection
                    .query(Q.where('remote_id', remote.id))
                    .fetch();

                if (existing.length > 0) {
                    const local = existing[0];
                    const remoteUpdated = new Date(remote.updated_at).getTime();
                    const localUpdated = local.updatedAt?.getTime() || 0;

                    if (remoteUpdated > localUpdated) {
                        await database.write(async () => {
                            await local.update((f: any) => {
                                f.name = remote.name;
                                f.isSynced = true;
                            });
                        });
                    }
                } else {
                    await database.write(async () => {
                        await foldersCollection.create((f: any) => {
                            f.name = remote.name;
                            f.remoteId = remote.id;
                            f.isSynced = true;
                        });
                    });
                }
            } catch (err: any) {
                console.error(`[Sync] Pull folder "${remote.name}" (${remote.id}) failed:`, err?.message || err);
            }
        }
    } catch (err: any) {
        console.error('[Sync] Pull folders failed:', err?.message || err);
        throw err; // Re-throw to signal failure to performSync
    }
}

async function pullNotes() {
    const { userId } = getSyncState();
    if (!userId) return;

    try {
        const remoteNotes = await pb.collection('notes').getFullList({
            filter: `user_id = "${userId}"`,
            sort: '-updated_at',
        });

        const notesCollection = database.get<Note>('notes');
        const foldersCollection = database.get<Folder>('folders');

        for (const remote of remoteNotes) {
            try {
                // Resolve remote folder_id to local folder id (empty = folderless note)
                let localFolderId: string | null = remote.folder_id || null;
                if (localFolderId) {
                    try {
                        const localFolders = await foldersCollection
                            .query(Q.where('remote_id', remote.folder_id))
                            .fetch();
                        if (localFolders.length > 0) {
                            localFolderId = localFolders[0].id;
                        }
                    } catch { }
                }

                const contentStr = typeof remote.content === 'string'
                    ? remote.content
                    : JSON.stringify(remote.content);

                const existing = await notesCollection
                    .query(Q.where('remote_id', remote.id))
                    .fetch();

                if (existing.length > 0) {
                    const local = existing[0];
                    const remoteUpdated = new Date(remote.updated_at).getTime();
                    const localUpdated = local.updatedAt?.getTime() || 0;

                    if (remoteUpdated > localUpdated) {
                        await database.write(async () => {
                            await local.update((n: any) => {
                                n.title = remote.title;
                                n.content = contentStr;
                                n.folderId = localFolderId;
                                n.isSynced = true;
                            });
                        });
                    }
                } else {
                    await database.write(async () => {
                        await notesCollection.create((n: any) => {
                            n.title = remote.title;
                            n.content = contentStr;
                            n.folderId = localFolderId;
                            n.remoteId = remote.id;
                            n.isSynced = true;
                        });
                    });
                }
            } catch (err: any) {
                console.error(`[Sync] Pull note "${remote.title}" (${remote.id}) failed:`, err?.message || err);
            }
        }
    } catch (err: any) {
        console.error('[Sync] Pull notes failed:', err?.message || err);
        throw err; // Re-throw to signal failure to performSync
    }
}

// ==================== MAIN SYNC ====================

export async function performSync() {
    if (syncInProgress) return;

    const { isConnected, isAuthenticated } = getSyncState();

    if (!isConnected || !isAuthenticated) return;

    syncInProgress = true;
    try {
        // Push local changes first
        await pushFolders();
        await pushNotes();

        // Then pull server changes
        await pullFolders();
        await pullNotes();

        // Update last sync time & reset failure counter
        lastSyncTime = new Date().toISOString();
        consecutiveFailures = 0;

        // Refresh UI stores after successful sync
        await useFolderStore.getState().loadFolders();
        await useNoteStore.getState().loadNotes();

        console.log('[Sync] Completed successfully at', lastSyncTime);
    } catch (err: any) {
        consecutiveFailures++;
        console.error(`[Sync] Error (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, err?.message || err);

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            console.warn('[Sync] Too many consecutive failures, backing off. Will retry when connectivity changes.');
        }
    } finally {
        syncInProgress = false;
    }
}

let syncIntervalId: ReturnType<typeof setInterval> | null = null;

export function startSyncService() {
    // Sync immediately on start
    performSync();

    // Then sync every 30 seconds (skip if too many failures)
    syncIntervalId = setInterval(() => {
        if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
            performSync();
        }
    }, 30000);

    // Also sync when connectivity changes
    const unsubscribe = useNetworkStore.getState().startListening();

    // Subscribe to connectivity changes
    const unsub = useNetworkStore.subscribe((state, prev) => {
        if (state.isConnected && !prev.isConnected) {
            console.log('[Sync] Back online — triggering sync');
            consecutiveFailures = 0; // Reset on reconnect
            performSync();
        }
    });

    return () => {
        if (syncIntervalId) clearInterval(syncIntervalId);
        unsubscribe();
        unsub();
    };
}
