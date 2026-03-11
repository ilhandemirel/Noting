import PocketBase, { AsyncAuthStore } from 'pocketbase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { POCKETBASE_URL } from '../utils/constants';

const AUTH_KEY = 'pb_auth';

let pb: PocketBase;

if (Platform.OS === 'web') {
    pb = new PocketBase(POCKETBASE_URL);
} else {
    const store = new AsyncAuthStore({
        save: async (serialized) => {
            try {
                await AsyncStorage.setItem(AUTH_KEY, serialized);
            } catch (e) {
                console.warn('[PB] Auth save error:', e);
            }
        },
        initial: '',
        clear: async () => {
            try {
                await AsyncStorage.removeItem(AUTH_KEY);
            } catch (e) {
                console.warn('[PB] Auth clear error:', e);
            }
        },
    });

    pb = new PocketBase(POCKETBASE_URL, store);
}

export async function loadSavedAuth(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
        const saved = await AsyncStorage.getItem(AUTH_KEY);
        if (!saved) return;

        try {
            const parsed = JSON.parse(saved);
            const token = typeof parsed?.token === 'string' ? parsed.token : '';
            const model = parsed?.model || parsed?.record || null;

            if (token && model) {
                pb.authStore.save(token, model);
                return;
            }
        } catch {
            // no-op, fallback below
        }

        pb.authStore.loadFromCookie(saved);
    } catch (e) {
        console.warn('[PB] Load saved auth error:', e);
    }
}

export default pb;
