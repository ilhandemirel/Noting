import React, { useState, useCallback } from 'react';
import {
    View, Text, Pressable,
    ScrollView, StyleSheet, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AuthInput from '../../components/AuthInput';
import AuthButton from '../../components/AuthButton';
import { useAuthStore } from '../../stores/authStore';
import { useColors } from '../../stores/themeStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const { register, loginWithGoogle, isLoading, error, clearError } = useAuthStore();
    const router = useRouter();
    const colors = useColors();

    const handleRegister = useCallback(async () => {
        if (!email.trim() || !password.trim() || !passwordConfirm.trim()) return;
        if (password !== passwordConfirm) {
            useAuthStore.setState({ error: 'Sifreler eslesmiyor.' });
            return;
        }
        await register(email.trim(), password, passwordConfirm);
        if (useAuthStore.getState().isAuthenticated) {
            router.replace('/(main)');
        }
    }, [email, password, passwordConfirm, register, router]);

    const handleGoogleLogin = useCallback(async () => {
        await loginWithGoogle();
        if (useAuthStore.getState().isAuthenticated) {
            router.replace('/(main)');
        }
    }, [loginWithGoogle, router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.inner}>
                    {/* Header */}
                    <View style={styles.headerArea}>
                        <Text style={[styles.logo, { color: colors.text }]}>
                            {'Noting'}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.secondary }]}>
                            {'Yeni bir hesap olusturun'}
                        </Text>
                    </View>

                    {/* Error */}
                    {error && (
                        <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                        </View>
                    )}

                    {/* Google Login */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.googleBtn,
                            {
                                backgroundColor: pressed ? colors.hover : colors.card,
                                borderColor: colors.border,
                            }
                        ]}
                        onPress={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        <Ionicons name="logo-google" size={20} color="#4285F4" />
                        <Text style={[styles.googleText, { color: colors.text }]}>
                            {'Google ile Devam Et'}
                        </Text>
                    </Pressable>

                    {/* Divider */}
                    <View style={styles.dividerRow}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                        <Text style={[styles.dividerText, { color: colors.placeholder }]}>{'veya'}</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Form */}
                    <AuthInput
                        label="E-posta"
                        value={email}
                        onChangeText={(text) => {
                            clearError();
                            setEmail(text);
                        }}
                        placeholder="ornek@email.com"
                        keyboardType="email-address"
                    />

                    <AuthInput
                        label="Sifre"
                        value={password}
                        onChangeText={(text) => {
                            clearError();
                            setPassword(text);
                        }}
                        placeholder="********"
                        secureTextEntry
                    />

                    <AuthInput
                        label="Sifre (Tekrar)"
                        value={passwordConfirm}
                        onChangeText={(text) => {
                            clearError();
                            setPasswordConfirm(text);
                        }}
                        placeholder="********"
                        secureTextEntry
                    />

                    <AuthButton
                        title="Kayit Ol"
                        onPress={handleRegister}
                        isLoading={isLoading}
                    />

                    {/* Link to Login */}
                    <View style={styles.linkRow}>
                        <Text style={[styles.linkText, { color: colors.secondary }]}>
                            {'Zaten hesabiniz var mi? '}
                        </Text>
                        <Pressable onPress={() => router.back()}>
                            <Text style={[styles.linkAction, { color: '#2383E2' }]}>
                                {'Giris Yap'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 40,
        minHeight: SCREEN_HEIGHT,
    },
    inner: {
        width: '100%',
        maxWidth: 360,
        alignSelf: 'center',
    },
    headerArea: {
        marginBottom: 32,
    },
    logo: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        marginTop: 4,
    },
    errorBox: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    errorText: {
        fontSize: 13,
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 16,
    },
    googleText: {
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 10,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 12,
        marginHorizontal: 12,
    },
    linkRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    linkText: {
        fontSize: 14,
    },
    linkAction: {
        fontSize: 14,
        fontWeight: '600',
    },
});
