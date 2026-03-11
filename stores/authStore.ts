import { create } from 'zustand';
import pb, { loadSavedAuth } from '../services/pocketbase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

interface User {
    id: string;
    email: string;
    name?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    initialize: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    register: (email: string, password: string, passwordConfirm: string) => Promise<void>;
    logout: () => void;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    initialize: async () => {
        // Önce kaydedilmiş oturumu yükle (native için)
        await loadSavedAuth();

        if (pb.authStore.isValid && pb.authStore.record) {
            const record = pb.authStore.record;
            set({
                user: {
                    id: record.id,
                    email: record.email || '',
                    name: (record as any).name || '',
                },
                token: pb.authStore.token,
                isAuthenticated: true,
            });
        } else {
            pb.authStore.clear();
            set({
                user: null,
                token: null,
                isAuthenticated: false,
            });
        }
    },

    login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            set({
                user: {
                    id: authData.record.id,
                    email: authData.record.email,
                    name: authData.record.name,
                },
                token: authData.token,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (err: any) {
            let errorMessage = 'Giriş başarısız. Lütfen tekrar deneyin.';

            const errData = err?.data?.data || err?.response?.data;
            if (errData && typeof errData === 'object') {
                const fields = Object.values(errData).map((v: any) => v.message);
                if (fields.length > 0) {
                    errorMessage = fields.join('\n');
                }
            } else if (err?.message) {
                errorMessage = err.message;
            }

            set({
                error: errorMessage,
                isLoading: false,
            });
        }
    },

    loginWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
            if (Platform.OS === 'web') {
                const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
                set({
                    user: {
                        id: authData.record.id,
                        email: authData.record.email,
                        name: authData.record.name || authData.meta?.name || '',
                    },
                    token: authData.token,
                    isAuthenticated: true,
                    isLoading: false,
                });
                return;
            }

            // Native: OAuth2 akışı
            const redirectUrl = Linking.createURL('/(auth)/login');

            const authMethods = await pb.collection('users').listAuthMethods();
            const providers = (authMethods as any).authProviders || (authMethods as any).oauth2?.providers || [];
            const provider = providers.find((p: any) => p.name === 'google');

            if (!provider) {
                throw new Error('Google sağlayıcısı yapılandırılmamış. PocketBase ayarlarını kontrol edin.');
            }

            const authUrl = provider.authUrl + encodeURIComponent(redirectUrl);
            const response = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

            if (response.type === 'success') {
                const parsedUrl = Linking.parse(response.url);
                const code = parsedUrl.queryParams?.code as string;
                const state = parsedUrl.queryParams?.state as string;

                if (state !== provider.state) {
                    throw new Error('Güvenlik doğrulaması başarısız, giriş iptal edildi.');
                }

                if (code && provider.codeVerifier) {
                    const finalAuthData = await pb.collection('users').authWithOAuth2Code(
                        'google',
                        code,
                        provider.codeVerifier,
                        redirectUrl
                    );

                    set({
                        user: {
                            id: finalAuthData.record.id,
                            email: finalAuthData.record.email,
                            name: finalAuthData.record.name || finalAuthData.meta?.name || '',
                        },
                        token: finalAuthData.token,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } else {
                    throw new Error('Yetkilendirme kodu alınamadı.');
                }
            } else {
                throw new Error('Giriş kullanıcı tarafından iptal edildi.');
            }
        } catch (err: any) {
            let errorMessage = 'Google ile giriş başarısız. Lütfen tekrar deneyin.';

            if (err?.message) {
                errorMessage = err.message;
            }

            set({
                error: errorMessage,
                isLoading: false,
            });
        }
    },

    register: async (email: string, password: string, passwordConfirm: string) => {
        set({ isLoading: true, error: null });
        try {
            await pb.collection('users').create({
                email,
                password,
                passwordConfirm,
            });
            // Kayıttan sonra otomatik giriş
            const authData = await pb.collection('users').authWithPassword(email, password);
            set({
                user: {
                    id: authData.record.id,
                    email: authData.record.email,
                    name: authData.record.name,
                },
                token: authData.token,
                isAuthenticated: true,
                isLoading: false,
            });
        } catch (err: any) {
            let errorMessage = 'Kayıt başarısız. Lütfen tekrar deneyin.';

            const errData = err?.data?.data || err?.response?.data;
            if (errData && typeof errData === 'object') {
                const fields = Object.values(errData).map((v: any) => v.message);
                if (fields.length > 0) {
                    errorMessage = fields.join('\n');
                }
            } else if (err?.message) {
                errorMessage = err.message;
            }

            set({
                error: errorMessage,
                isLoading: false,
            });
        }
    },

    logout: async () => {
        pb.authStore.clear();
        
        // Reset local database and UI stores
        try {
            const { resetDatabase } = await import('../database');
            const { useNoteStore } = await import('./noteStore');
            
            await resetDatabase();
            useNoteStore.getState().reset();
        } catch (error) {
            console.error('[Auth] Logout cleanup error:', error);
        }

        set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
        });
    },

    clearError: () => set({ error: null }),
}));
