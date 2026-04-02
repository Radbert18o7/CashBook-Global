import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export function ThemedTextInput({ style, ...rest }: TextInputProps) {
  const color = useThemeColor({}, 'text');
  const placeholder = useThemeColor({}, 'placeholder');
  const backgroundColor = useThemeColor({}, 'inputBackground');
  const borderColor = useThemeColor({}, 'inputBorder');
  const selectionColor = useThemeColor({}, 'tint');

  return (
    <TextInput
      placeholderTextColor={placeholder}
      selectionColor={selectionColor}
      style={[
        styles.base,
        { color, backgroundColor, borderColor },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
