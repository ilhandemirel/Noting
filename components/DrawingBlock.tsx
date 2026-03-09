import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../stores/themeStore';

interface DrawingBlockProps {
    initialBase64?: string;
    onSave: (base64: string) => void;
    onDelete?: () => void;
    readOnly?: boolean;
}

const PEN_COLORS = ['#000000', '#EB5757', '#27AE60', '#2F80ED', '#F2994A'];
const PEN_SIZES = [2, 4, 6];

export default function DrawingBlock({
    initialBase64,
    onSave,
    onDelete,
    readOnly = false,
}: DrawingBlockProps) {
    const [isEditing, setIsEditing] = useState(!initialBase64 && !readOnly);
    const [currentColor, setCurrentColor] = useState('#000000');
    const [penSize, setPenSize] = useState(2);
    const canvasElRef = useRef<any>(null);
    const ctxElRef = useRef<any>(null);
    const drawingRef = useRef(false);
    const colorRef = useRef(currentColor);
    const sizeRef = useRef(penSize);
    const containerId = useRef('dc-' + Math.random().toString(36).substr(2, 9));
    const colors = useColors();

    colorRef.current = currentColor;
    sizeRef.current = penSize;

    // ========== WEB: attach canvas to DOM via nativeID ==========
    useEffect(() => {
        if (Platform.OS !== 'web' || !isEditing) return;

        let canvasEl: HTMLCanvasElement | null = null;
        let destroyed = false;

        const mount = () => {
            if (destroyed) return;
            const host = document.getElementById(containerId.current);
            if (!host) return;

            // clear old
            const prev = host.querySelector('canvas');
            if (prev) host.removeChild(prev);

            canvasEl = document.createElement('canvas');
            const box = host.getBoundingClientRect();
            canvasEl.width = box.width || 680;
            canvasEl.height = box.height || 300;
            Object.assign(canvasEl.style, {
                width: '100%',
                height: '100%',
                cursor: 'crosshair',
                touchAction: 'none',
                display: 'block',
                position: 'absolute',
                top: '0',
                left: '0',
            });
            host.style.position = 'relative';
            host.appendChild(canvasEl);
            canvasElRef.current = canvasEl;

            const ctx = canvasEl.getContext('2d');
            if (!ctx) return;
            ctxElRef.current = ctx;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);

            if (initialBase64) {
                const img = new window.Image();
                img.onload = () => {
                    if (canvasEl && ctx) {
                        ctx.drawImage(img, 0, 0, canvasEl.width, canvasEl.height);
                    }
                };
                img.src = initialBase64;
            }

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = colorRef.current;
            ctx.lineWidth = sizeRef.current;

            const pos = (e: MouseEvent | TouchEvent) => {
                const r = canvasEl!.getBoundingClientRect();
                const sx = canvasEl!.width / r.width;
                const sy = canvasEl!.height / r.height;
                if ('touches' in e && e.touches.length > 0) {
                    return { x: (e.touches[0].clientX - r.left) * sx, y: (e.touches[0].clientY - r.top) * sy };
                }
                const m = e as MouseEvent;
                return { x: (m.clientX - r.left) * sx, y: (m.clientY - r.top) * sy };
            };

            const onDown = (e: MouseEvent | TouchEvent) => {
                e.preventDefault();
                drawingRef.current = true;
                ctx.strokeStyle = colorRef.current;
                ctx.lineWidth = sizeRef.current;
                const p = pos(e);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
            };
            const onMov = (e: MouseEvent | TouchEvent) => {
                e.preventDefault();
                if (!drawingRef.current) return;
                const p = pos(e);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            };
            const onUp = (e: Event) => {
                e.preventDefault();
                if (drawingRef.current) { drawingRef.current = false; ctx.closePath(); }
            };

            canvasEl.addEventListener('mousedown', onDown);
            canvasEl.addEventListener('mousemove', onMov);
            canvasEl.addEventListener('mouseup', onUp);
            canvasEl.addEventListener('mouseleave', onUp);
            canvasEl.addEventListener('touchstart', onDown, { passive: false });
            canvasEl.addEventListener('touchmove', onMov, { passive: false });
            canvasEl.addEventListener('touchend', onUp);
        };

        const t = setTimeout(mount, 60);

        return () => {
            destroyed = true;
            clearTimeout(t);
            if (canvasEl && canvasEl.parentNode) {
                canvasEl.parentNode.removeChild(canvasEl);
            }
            canvasElRef.current = null;
            ctxElRef.current = null;
        };
    }, [isEditing, initialBase64]);

    // keep pen style in sync
    useEffect(() => {
        if (ctxElRef.current) {
            ctxElRef.current.strokeStyle = currentColor;
            ctxElRef.current.lineWidth = penSize;
        }
    }, [currentColor, penSize]);

    const webSave = useCallback(() => {
        const c = canvasElRef.current;
        if (c && c.toDataURL) onSave(c.toDataURL('image/png'));
        setIsEditing(false);
    }, [onSave]);

    const webClear = useCallback(() => {
        const c = canvasElRef.current;
        const x = ctxElRef.current;
        if (c && x) { x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, c.width, c.height); }
    }, []);

    // ========== READ-ONLY ==========
    if (!isEditing && initialBase64) {
        return (
            <View style={[styles.imgWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Image source={{ uri: initialBase64 }} style={styles.img} />
                {!readOnly && (
                    <View style={styles.imgActions}>
                        <Pressable onPress={() => setIsEditing(true)} style={[styles.imgBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="pencil" size={14} color={colors.text} />
                        </Pressable>
                        {onDelete && (
                            <Pressable onPress={onDelete} style={[styles.imgBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
        );
    }

    // ========== EMPTY ==========
    if (!isEditing && !initialBase64) {
        return (
            <View style={[styles.emptyWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={styles.empty}>
                    <Pressable onPress={() => setIsEditing(true)} style={[styles.startBtn, { backgroundColor: colors.accentLight }]}>
                        <Ionicons name="brush-outline" size={20} color={colors.accent} />
                    </Pressable>
                </View>
                {onDelete && (
                    <View style={styles.imgActions}>
                        <Pressable onPress={onDelete} style={[styles.imgBtn, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
                            <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        </Pressable>
                    </View>
                )}
            </View>
        );
    }

    // ========== TOOLBAR ==========
    const bar = (onCl: () => void, onSv: () => void) => (
        <View style={[styles.bar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.grp}>
                {PEN_COLORS.map((c) => (
                    <Pressable key={c} onPress={() => setCurrentColor(c)}
                        style={[styles.dot, { backgroundColor: c, borderWidth: currentColor === c ? 2 : 0, borderColor: colors.accent, transform: [{ scale: currentColor === c ? 1.2 : 1 }] }]}
                    />
                ))}
                <View style={[styles.sep, { backgroundColor: colors.border }]} />
                {PEN_SIZES.map((s) => (
                    <Pressable key={s} onPress={() => setPenSize(s)}
                        style={[styles.szBtn, { backgroundColor: penSize === s ? colors.hover : 'transparent', borderColor: penSize === s ? colors.border : 'transparent' }]}
                    >
                        <View style={{ width: s + 4, height: s + 4, borderRadius: (s + 4) / 2, backgroundColor: currentColor }} />
                    </Pressable>
                ))}
                <View style={[styles.sep, { backgroundColor: colors.border }]} />
                <Pressable onPress={onCl} style={styles.actBtn}>
                    <Ionicons name="refresh-outline" size={16} color={colors.secondary} />
                </Pressable>
            </View>
            <View style={styles.grp}>
                {initialBase64 ? (
                    <Pressable onPress={() => setIsEditing(false)} style={[styles.canBtn, { backgroundColor: colors.hover }]}>
                        <Ionicons name="close" size={16} color={colors.text} />
                    </Pressable>
                ) : null}
                <Pressable onPress={onSv} style={[styles.svBtn, { backgroundColor: colors.accent }]}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                </Pressable>
            </View>
        </View>
    );

    // ========== WEB EDITOR ==========
    if (Platform.OS === 'web') {
        return (
            <View style={[styles.editor, { borderColor: colors.border }]}>
                {bar(webClear, webSave)}
                <View nativeID={containerId.current} style={styles.canvas} />
            </View>
        );
    }

    // ========== NATIVE EDITOR ==========
    const Sig = require('react-native-signature-canvas').default;
    const sigRef = useRef<any>(null);
    const natClear = () => sigRef.current?.clearSignature();
    const natSave = () => sigRef.current?.readSignature();
    const onSig = (s: string) => {
        const blank = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyEw';
        if (!s || s.includes(blank)) { setIsEditing(false); return; }
        onSave(s);
        setIsEditing(false);
    };
    const ws = `.m-signature-pad{box-shadow:none;border:none;margin:0}.m-signature-pad--body canvas{background:#fff}.m-signature-pad--footer{display:none}`;

    return (
        <View style={[styles.editor, { borderColor: colors.border }]}>
            {bar(natClear, natSave)}
            <View style={styles.canvas}>
                <Sig ref={sigRef} onOK={onSig} dataURL={initialBase64 || undefined}
                    penColor={currentColor} minWidth={penSize} maxWidth={penSize}
                    webStyle={ws} trimWhitespace />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    imgWrap: { marginVertical: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, aspectRatio: 16 / 9 },
    emptyWrap: { marginVertical: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, height: 80 },
    img: { width: '100%', height: '100%', resizeMode: 'contain' },
    imgActions: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
    imgBtn: { padding: 8, borderRadius: 8, borderWidth: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    startBtn: { padding: 12, borderRadius: 12 },
    editor: { marginVertical: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, height: 350 },
    bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1 },
    grp: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 22, height: 22, borderRadius: 11 },
    sep: { width: 1, height: 18, marginHorizontal: 4 },
    szBtn: { padding: 6, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    actBtn: { padding: 6 },
    canBtn: { padding: 6, borderRadius: 6 },
    svBtn: { padding: 6, borderRadius: 6 },
    canvas: { flex: 1, backgroundColor: '#FFFFFF' },
});
