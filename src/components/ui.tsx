import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  StyleSheet,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { C, F, gradients, R, S, toneColors, type Tone } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 20, color = C.text }: { name: IconName | string; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color} />;
}

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'label' | 'caption' | 'overline' | 'number';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: F.displayX, fontSize: 40, letterSpacing: -1.4, color: C.text },
  title: { fontFamily: F.display, fontSize: 28, letterSpacing: -0.8, color: C.text },
  h2: { fontFamily: F.display, fontSize: 20, letterSpacing: -0.4, color: C.text },
  h3: { fontFamily: F.displaySemi, fontSize: 16, letterSpacing: -0.2, color: C.text },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.text },
  label: { fontFamily: F.semi, fontSize: 14, color: C.text },
  caption: { fontFamily: F.medium, fontSize: 12.5, color: C.textDim },
  overline: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: C.textMute,
  },
  number: { fontFamily: F.display, fontSize: 22, letterSpacing: -0.6, color: C.text },
};

export function T({
  v = 'body',
  color,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string }) {
  return <RNText {...rest} style={[variants[v], color ? { color } : null, style]} />;
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const content = <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>;
  if (!onPress) return content;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: StyleSheet.flatten(style)?.flex,
        transform: [{ scale: pressed ? 0.985 : 1 }],
        opacity: pressed ? 0.92 : 1,
      })}>
      {content}
    </Pressable>
  );
}

export function IconBadge({
  icon,
  tone = 'accent',
  size = 44,
  iconSize,
}: {
  icon: IconName | string;
  tone?: Tone;
  size?: number;
  iconSize?: number;
}) {
  const t = toneColors(tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        backgroundColor: t.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon} size={iconSize ?? size * 0.5} color={t.fg} />
    </View>
  );
}

export function Pill({
  label,
  tone = 'neutral',
  icon,
  style,
}: {
  label: string;
  tone?: Tone;
  icon?: IconName | string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = toneColors(tone);
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }, style]}>
      {icon ? <Icon name={icon} size={13} color={t.fg} /> : <View style={[styles.dot, { backgroundColor: t.fg }]} />}
      <RNText style={[styles.pillText, { color: t.fg }]}>{label}</RNText>
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  style,
  size = 'lg',
}: {
  label: string;
  onPress: () => void;
  icon?: IconName | string;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
}) {
  const h = size === 'lg' ? 56 : 44;
  const fg =
    variant === 'primary' ? '#fff' : variant === 'danger' ? C.red : variant === 'ghost' ? C.textDim : C.text;
  const inner = (
    <View style={[styles.btnInner, { height: h }]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'lg' ? 20 : 18} color={fg} /> : null}
          <RNText style={[styles.btnText, { color: fg, fontSize: size === 'lg' ? 16 : 14.5 }]}>{label}</RNText>
        </>
      )}
    </View>
  );

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        { borderRadius: R.lg, overflow: 'hidden', opacity: disabled ? 0.4 : 1 },
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
        variant === 'secondary' && styles.btnSecondary,
        variant === 'danger' && styles.btnDanger,
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'neutral',
  size = 44,
}: {
  icon: IconName | string;
  onPress: () => void;
  tone?: Tone;
  size?: number;
}) {
  const t = toneColors(tone);
  return (
    <Pressable
      hitSlop={8}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone === 'neutral' ? C.surface2 : t.bg,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}>
      <Icon name={icon} size={size * 0.48} color={tone === 'neutral' ? C.text : t.fg} />
    </Pressable>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      <T v="h3">{title}</T>
      {action && onAction ? (
        <Pressable hitSlop={10} onPress={onAction} style={styles.sectionAction}>
          <RNText style={styles.sectionActionText}>{action}</RNText>
          <Icon name="chevron-right" size={16} color={C.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Row({
  icon,
  tone = 'neutral',
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  icon?: IconName | string;
  tone?: Tone;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      {icon ? <IconBadge icon={icon} tone={tone} size={40} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T v="caption" numberOfLines={2}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chevron-right" size={20} color={C.textMute} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  );
}

export function ProgressBar({ value, color = C.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.surface3, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: IconName | string;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: S.xxl, gap: S.md }}>
      <IconBadge icon={icon} size={60} />
      <T v="h3" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T v="caption" style={{ textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
        {text}
      </T>
      {action && onAction ? (
        <Button label={action} onPress={onAction} size="md" icon="plus" style={{ marginTop: S.sm, alignSelf: 'stretch' }} />
      ) : null}
    </Card>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.borderStrong }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardPad: { padding: S.lg + 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 26,
    borderRadius: R.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontFamily: F.semi, fontSize: 12 },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  btnText: { fontFamily: F.bold, letterSpacing: -0.1 },
  btnSecondary: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.borderStrong },
  btnDanger: { backgroundColor: C.redSoft },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: S.xxl,
    marginBottom: S.md,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { fontFamily: F.semi, fontSize: 13.5, color: C.accent },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md + 2 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderStrong },
});
