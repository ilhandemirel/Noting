import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useColors } from '../stores/themeStore';

interface AuthButtonProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    variant?: 'primary' | 'secondary';
}

export default function AuthButton({
    title,
    onPress,
    isLoading = false,
    variant = 'primary',
}: AuthButtonProps) {
    const colors = useColors();
    const isPrimary = variant === 'primary';

    const bgColor = isPrimary ? '#2383E2' : 'transparent';
    const textColor = isPrimary ? '#FFFFFF' : colors.text;

    return (
        <View style={{ marginTop: 8 }}>
            <Pressable
                style={[
                    styles.button,
                    {
                        backgroundColor: bgColor,
                        borderWidth: isPrimary ? 0 : 1,
                        borderColor: colors.border,
                        opacity: isLoading ? 0.7 : 1,
                    }
                ]}
                onPress={onPress}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color={textColor} size="small" />
                ) : (
                    <Text style={[styles.text, { color: textColor }]}>
                        {title}
                    </Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
