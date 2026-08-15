import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from "react-native";

import { minTouchTarget, radius, spacing } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";
import { AppText } from "./app-text";

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  accessibilityLabel?: string;
};

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline = false,
  keyboardType,
  accessibilityLabel,
}: FormFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        returnKeyType={multiline ? "default" : "next"}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.error : theme.border,
            color: theme.text,
          },
        ]}
      />
      {error ? (
        <AppText variant="small" style={{ color: theme.error }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    fontSize: 17,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  multiline: {
    minHeight: 104,
    textAlignVertical: "top",
  },
});
