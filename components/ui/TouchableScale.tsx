import React, { ReactNode, useRef } from 'react';
import {
    Animated,
    GestureResponderEvent,
    Pressable,
    PressableProps,
    Platform,
    StyleProp,
    Vibration,
    ViewStyle,
} from 'react-native';

interface TouchableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
    children: ReactNode | ((pressed: boolean) => ReactNode);
    style?: StyleProp<ViewStyle>;
    pressedStyle?: StyleProp<ViewStyle>;
    scaleTo?: number;
    haptic?: boolean;
}

export default function TouchableScale({
    children,
    style,
    pressedStyle,
    scaleTo = 0.96,
    haptic = true,
    onPressIn,
    onPressOut,
    ...rest
}: TouchableScaleProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = (event: GestureResponderEvent) => {
        if (haptic && Platform.OS !== 'web' && !rest.disabled) {
            Vibration.vibrate(6);
        }

        Animated.spring(scale, {
            toValue: scaleTo,
            friction: 8,
            tension: 240,
            useNativeDriver: true,
        }).start();
        onPressIn?.(event);
    };

    const handlePressOut = (event: GestureResponderEvent) => {
        Animated.spring(scale, {
            toValue: 1,
            friction: 8,
            tension: 240,
            useNativeDriver: true,
        }).start();
        onPressOut?.(event);
    };

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <Pressable
                {...rest}
                style={({ pressed }) => [style, pressed && pressedStyle]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {({ pressed }) =>
                    typeof children === 'function' ? children(pressed) : children
                }
            </Pressable>
        </Animated.View>
    );
}
