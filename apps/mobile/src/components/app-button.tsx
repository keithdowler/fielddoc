import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import type { SFSymbol } from "expo-symbols";

import { minTouchTarget, radius, spacing } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";
import { AppIcon } from "./app-icon";
import { AppText } from "./app-text";

type AppButtonProps = PressableProps & {
  label: string;
  icon?: SFSymbol;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

export function AppButton({
  label,
  icon,
  variant = "primary",
  loading = false,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const theme = useAppTheme();
  const isDisabled = disabled || loading;
  const backgroundColor =
    variant === "primary"
      ? theme.primary
      : variant === "danger"
        ? theme.error
        : theme.surfaceMuted;
  const foregroundColor =
    variant === "secondary" ? theme.text : theme.primaryText;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      {...props}
      style={(state) => [
        styles.button,
        {
          backgroundColor,
          borderColor: variant === "secondary" ? theme.border : backgroundColor,
          opacity: isDisabled ? 0.55 : state.pressed ? 0.82 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <AppIcon name={icon} color={foregroundColor} size={19} />
        ) : null}
        <AppText variant="label" style={{ color: foregroundColor }}>
          {loading ? "Working..." : label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
