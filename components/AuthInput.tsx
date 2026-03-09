import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { useColors } from '../stores/themeStore';

interface AuthInputProps {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    keyboardType?: 'default' | 'email-address';
}

export default function AuthInput({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    autoCapitalize = 'none',
    keyboardType = 'default',
}: AuthInputProps) {
    const colors = useColors();

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.secondary }]}>
                {label}
            </Text>
            <TextInput
                style={[styles.input, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={secureTextEntry}
                autoCapitalize={autoCapitalize}
                keyboardType={keyboardType}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
    },
    input: {
        width: '100%',
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderWidth: 1,
        borderRadius: 10,
        fontSize: 15,
    },
});
