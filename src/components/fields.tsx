import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { C, F, R, S } from '@/theme';
import { fmtDate, parseDate, toDateStr, type DateStr } from '@/utils/dates';
import { digits, fmtNumber } from '@/utils/format';

import { Icon, T, type IconName } from './ui';

function FieldShell({
  label,
  hint,
  children,
  focused,
  style,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  focused?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 8 }, style]}>
      {label ? <T v="caption" color={C.textDim}>{label}</T> : null}
      <View style={[styles.shell, focused && styles.shellFocused]}>{children}</View>
      {hint ? <T v="caption" color={C.textMute} style={{ fontSize: 12 }}>{hint}</T> : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  icon,
  suffix,
  keyboardType,
  autoCapitalize,
  maxLength,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  hint?: string;
  icon?: IconName | string;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell label={label} hint={hint} focused={focused} style={style}>
      {icon ? <Icon name={icon} size={19} color={focused ? C.accent : C.textMute} /> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textMute}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={C.accent}
        cursorColor={C.accent}
        style={styles.input}
      />
      {suffix ? <T v="label" color={C.textMute}>{suffix}</T> : null}
    </FieldShell>
  );
}

/** Campo de dinheiro: digita só números e ele formata como R$ 1.234,56. */
export function MoneyField({
  label,
  value,
  onChange,
  hint,
  big,
  style,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const text = value > 0 ? fmtNumber(value, 2) : '';
  return (
    <FieldShell label={label} hint={hint} focused={focused} style={style}>
      <T v="label" color={value > 0 ? C.textDim : C.textMute} style={big ? { fontSize: 20, fontFamily: F.display } : undefined}>
        R$
      </T>
      <TextInput
        value={text}
        onChangeText={(s) => {
          const d = digits(s).slice(0, 11);
          onChange(d ? parseInt(d, 10) / 100 : 0);
        }}
        placeholder="0,00"
        placeholderTextColor={C.textMute}
        keyboardType="number-pad"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={C.accent}
        cursorColor={C.accent}
        style={[styles.input, big && styles.inputBig]}
      />
    </FieldShell>
  );
}

/** Campo numérico inteiro com separador de milhar (km). */
export function IntField({
  label,
  value,
  onChange,
  suffix = 'km',
  hint,
  icon,
  style,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  hint?: string;
  icon?: IconName | string;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell label={label} hint={hint} focused={focused} style={style}>
      {icon ? <Icon name={icon} size={19} color={focused ? C.accent : C.textMute} /> : null}
      <TextInput
        value={value > 0 ? fmtNumber(value) : ''}
        onChangeText={(s) => {
          const d = digits(s).slice(0, 7);
          onChange(d ? parseInt(d, 10) : 0);
        }}
        placeholder="0"
        placeholderTextColor={C.textMute}
        keyboardType="number-pad"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={C.accent}
        cursorColor={C.accent}
        style={styles.input}
      />
      {suffix ? <T v="label" color={C.textMute}>{suffix}</T> : null}
    </FieldShell>
  );
}

/** Campo decimal simples (ex.: juros 2,49 %). Guarda o texto para não brigar com a vírgula. */
export function DecimalField({
  label,
  text,
  onChangeText,
  suffix = '%',
  hint,
  style,
}: {
  label?: string;
  text: string;
  onChangeText: (s: string) => void;
  suffix?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell label={label} hint={hint} focused={focused} style={style}>
      <TextInput
        value={text}
        onChangeText={(s) => onChangeText(s.replace(/[^\d,.]/g, '').replace('.', ',').slice(0, 6))}
        placeholder="0"
        placeholderTextColor={C.textMute}
        keyboardType="decimal-pad"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        selectionColor={C.accent}
        cursorColor={C.accent}
        style={styles.input}
      />
      <T v="label" color={C.textMute}>{suffix}</T>
    </FieldShell>
  );
}

export function DateField({
  label,
  value,
  onChange,
  hint,
  style,
}: {
  label?: string;
  value: DateStr;
  onChange: (d: DateStr) => void;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const open = () => {
    Haptics.selectionAsync();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseDate(value),
        mode: 'date',
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(toDateStr(d));
        },
      });
    } else {
      setIosOpen((o) => !o);
    }
  };
  return (
    <View style={style}>
      <Pressable onPress={open}>
        <FieldShell label={label} hint={hint}>
          <Icon name="calendar-month-outline" size={19} color={C.textMute} />
          <T v="label" style={{ flex: 1, fontSize: 16, fontFamily: F.medium }}>
            {fmtDate(value)}
          </T>
          <Icon name="chevron-down" size={20} color={C.textMute} />
        </FieldShell>
      </Pressable>
      {Platform.OS === 'ios' && iosOpen ? (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="inline"
          themeVariant="dark"
          onChange={(_, d) => d && onChange(toDateStr(d))}
        />
      ) : null}
    </View>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  scroll,
  style,
}: {
  options: { value: T; label: string; icon?: IconName | string }[];
  value: T;
  onChange: (v: T) => void;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const items = options.map((o) => {
    const active = o.value === value;
    return (
      <Pressable
        key={String(o.value)}
        onPress={() => {
          Haptics.selectionAsync();
          onChange(o.value);
        }}
        style={({ pressed }) => [
          styles.chip,
          active && styles.chipActive,
          { transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}>
        {o.icon ? <Icon name={o.icon} size={16} color={active ? C.accent : C.textDim} /> : null}
        <T v="label" color={active ? C.accent : C.textDim} style={{ fontSize: 13.5 }}>
          {o.label}
        </T>
      </Pressable>
    );
  });
  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={style}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {items}
      </ScrollView>
    );
  }
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{items}</View>;
}

/** Controle segmentado (2–4 opções lado a lado). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.segment, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[styles.segmentItem, active && styles.segmentItemActive]}>
            <T v="label" color={active ? C.text : C.textMute} style={{ fontSize: 13.5 }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 12,
  format = (n: number) => String(n),
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  format?: (n: number) => string;
}) {
  const btn = (icon: string, next: number, disabled: boolean) => (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync();
        onChange(next);
      }}
      style={({ pressed }) => [styles.stepBtn, { opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={18} color={C.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <T v="caption" color={C.textDim} style={{ flex: 1 }}>
        {label}
      </T>
      {btn('minus', value - 1, value <= min)}
      <T v="h3" style={{ minWidth: 54, textAlign: 'center' }}>
        {format(value)}
      </T>
      {btn('plus', value + 1, value >= max)}
    </View>
  );
}

export function SwitchRow({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: IconName | string;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchIcon}>
        <Icon name={icon} size={20} color={value ? C.accent : C.textMute} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label">{title}</T>
        {subtitle ? <T v="caption">{subtitle}</T> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onChange(v);
        }}
        trackColor={{ false: C.surface3, true: C.accentLine }}
        thumbColor={value ? C.accent : '#8A909C'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: S.lg,
    borderRadius: R.md,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  shellFocused: { borderColor: C.accentLine, backgroundColor: '#1D1A18' },
  input: {
    flex: 1,
    color: C.text,
    fontFamily: F.medium,
    fontSize: 16,
    paddingVertical: 14,
  },
  inputBig: { fontFamily: F.display, fontSize: 26, letterSpacing: -0.6, paddingVertical: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: R.pill,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accentSoft, borderColor: C.accentLine },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: R.md,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  segmentItem: { flex: 1, height: 40, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center' },
  segmentItemActive: { backgroundColor: C.surface3 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: S.lg,
    height: 58,
    borderRadius: R.md,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  switchIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
