import React, { useRef } from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
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
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={[
            styles.wrapper,
            { transform: [{ scale: scaleAnim }] }
        ]}>
            <Pressable
                style={[
                    styles.button,
                    isPrimary
                        ? {
                            backgroundColor: colors.accent,
                            shadowColor: colors.accent,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4,
                        }
                        : {
                            backgroundColor: 'transparent',
                            borderWidth: 1.5,
                            borderColor: colors.border,
                        },
                    isLoading && { opacity: 0.7 },
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator
                        color={isPrimary ? '#FFFFFF' : colors.text}
                        size="small"
                    />
                ) : (
                    <Text style={[
                        styles.text,
                        { color: isPrimary ? '#FFFFFF' : colors.text }
                    ]}>
                        {title}
                    </Text>
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        marginTop: 8,
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
