import React, { useRef, useEffect, useState } from 'react';
import { TextInput, View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../stores/themeStore';

interface AuthInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'email-address';
    icon?: keyof typeof Ionicons.glyphMap;
}

export default function AuthInput({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    autoCapitalize = 'none',
    keyboardType = 'default',
    icon,
}: AuthInputProps) {
    const colors = useColors();
    const [focused, setFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const borderAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(borderAnim, {
            toValue: focused ? 1 : 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    }, [focused]);

    const borderColor = borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.inputBorder, colors.inputFocus],
    });

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: focused ? colors.accent : colors.textSecondary }]}>
                {label}
            </Text>
            <Animated.View style={[
                styles.inputWrapper,
                {
                    backgroundColor: colors.inputBg,
                    borderColor: borderColor,
                }
            ]}>
                {icon && (
                    <Ionicons
                        name={icon}
                        size={18}
                        color={focused ? colors.accent : colors.placeholder}
                        style={styles.icon}
                    />
                )}
                <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    secureTextEntry={secureTextEntry && !passwordVisible}
                    autoCapitalize={autoCapitalize}
                    keyboardType={keyboardType}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
                {secureTextEntry && (
                    <Pressable
                        onPress={() => setPasswordVisible(!passwordVisible)}
                        style={styles.eyeBtn}
                        hitSlop={8}
                    >
                        <Ionicons
                            name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                            size={18}
                            color={colors.placeholder}
                        />
                    </Pressable>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 14,
        paddingHorizontal: 14,
        minHeight: 52,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 14,
    },
    eyeBtn: {
        padding: 4,
        marginLeft: 8,
    },
});
