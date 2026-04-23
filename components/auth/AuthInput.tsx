import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, TouchableOpacity, View } from 'react-native';

import { Brand } from '@/constants/brand';

type Props = TextInputProps & {
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
};

export function AuthInput({ icon, secureToggle, secureTextEntry, style, ...rest }: Props) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false);
  const effectiveSecure = secureToggle ? hidden : secureTextEntry;

  return (
    <View style={styles.wrapper}>
      {icon ? (
        <Ionicons name={icon} size={20} color={Brand.textMuted} style={styles.leftIcon} />
      ) : null}
      <TextInput
        {...rest}
        secureTextEntry={effectiveSecure}
        placeholderTextColor={Brand.textSubtle}
        style={[styles.input, icon ? styles.inputWithIcon : null, style]}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {secureToggle ? (
        <TouchableOpacity onPress={() => setHidden((v) => !v)} style={styles.rightIcon}>
          <Ionicons
            name={hidden ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={Brand.textMuted}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.inputBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Brand.text,
    paddingVertical: 0,
  },
  inputWithIcon: {
    marginLeft: 10,
  },
  leftIcon: {
    width: 20,
  },
  rightIcon: {
    padding: 4,
    marginLeft: 4,
  },
});
