import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, Pressable,
    ScrollView, StyleSheet, Dimensions, Animated, KeyboardAvoidingView, Platform
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
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const handleRegister = useCallback(async () => {
        if (!email.trim() || !password.trim() || !passwordConfirm.trim()) return;
        if (password !== passwordConfirm) {
            useAuthStore.setState({ error: 'Şifreler eşleşmiyor.' });
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[
                        styles.inner,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}>
                        {/* Brand */}
                        <View style={styles.brandArea}>
                            <View style={[styles.brandIcon, { backgroundColor: colors.accentSoft }]}>
                                <Ionicons name="person-add" size={32} color={colors.accent} />
                            </View>
                            <Text style={[styles.brandName, { color: colors.heading }]}>
                                Kayıt Ol
                            </Text>
                            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                                Yeni bir hesap oluşturun
                            </Text>
                        </View>

                        {/* Card */}
                        <View style={[styles.card, {
                            backgroundColor: colors.card,
                            borderColor: colors.borderLight,
                            shadowColor: colors.accent,
                        }]}>
                            {/* Error */}
                            {error && (
                                <View style={[styles.errorBox, { backgroundColor: colors.dangerLight }]}>
                                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                                    <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                                </View>
                            )}

                            {/* Google Login */}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.googleBtn,
                                    {
                                        backgroundColor: pressed ? colors.hover : colors.bg,
                                        borderColor: colors.border,
                                    }
                                ]}
                                onPress={handleGoogleLogin}
                                disabled={isLoading}
                            >
                                <Ionicons name="logo-google" size={20} color="#4285F4" />
                                <Text style={[styles.googleText, { color: colors.text }]}>
                                    Google ile Devam Et
                                </Text>
                            </Pressable>

                            {/* Divider */}
                            <View style={styles.dividerRow}>
                                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                <Text style={[styles.dividerText, { color: colors.placeholder }]}>veya</Text>
                                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                            </View>

                            {/* Form */}
                            <AuthInput
                                label="E-posta"
                                value={email}
                                onChangeText={(text) => { clearError(); setEmail(text); }}
                                placeholder="ornek@email.com"
                                keyboardType="email-address"
                                icon="mail-outline"
                            />

                            <AuthInput
                                label="Şifre"
                                value={password}
                                onChangeText={(text) => { clearError(); setPassword(text); }}
                                placeholder="••••••••"
                                secureTextEntry
                                icon="lock-closed-outline"
                            />

                            <AuthInput
                                label="Şifre (Tekrar)"
                                value={passwordConfirm}
                                onChangeText={(text) => { clearError(); setPasswordConfirm(text); }}
                                placeholder="••••••••"
                                secureTextEntry
                                icon="lock-closed-outline"
                            />

                            <AuthButton
                                title="Kayıt Ol"
                                onPress={handleRegister}
                                isLoading={isLoading}
                            />
                        </View>

                        {/* Link */}
                        <View style={styles.linkRow}>
                            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                                Zaten hesabınız var mı?{' '}
                            </Text>
                            <Pressable onPress={() => router.back()}>
                                <Text style={[styles.linkAction, { color: colors.accent }]}>
                                    Giriş Yap
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingHorizontal: 24,
        paddingVertical: 40,
        minHeight: SCREEN_HEIGHT,
    },
    inner: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    brandArea: {
        alignItems: 'center',
        marginBottom: 32,
    },
    brandIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    brandName: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
    },
    brandSubtitle: {
        fontSize: 15,
        marginTop: 6,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 24,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 3,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorText: {
        fontSize: 13,
        flex: 1,
        fontWeight: '500',
    },
    googleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        marginBottom: 20,
    },
    googleText: {
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 10,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 12,
        marginHorizontal: 16,
        fontWeight: '500',
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
        fontWeight: '700',
    },
});
