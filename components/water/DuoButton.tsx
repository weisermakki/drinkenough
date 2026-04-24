import { StyleSheet, Text, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

import { Brand } from '@/constants/brand';

type Variant = 'primary' | 'success' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function DuoButton({ title, onPress, variant = 'primary', style, disabled }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}>
      <Text style={[styles.label, variant === 'ghost' && styles.labelGhost]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Brand.primary,
    borderBottomWidth: 4,
    borderBottomColor: Brand.shadow,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  success: {
    backgroundColor: Brand.success,
    borderBottomWidth: 4,
    borderBottomColor: Brand.successDark,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  ghost: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: Brand.border,
    borderBottomWidth: 4,
    borderBottomColor: Brand.border,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelGhost: {
    color: Brand.primary,
  },
});
