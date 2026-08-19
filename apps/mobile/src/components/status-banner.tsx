import { StyleSheet, View } from "react-native";
import type { SFSymbol } from "expo-symbols";

import { radius, spacing, stateIcons } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";
import { AppButton } from "./app-button";
import { AppIcon } from "./app-icon";
import { AppText } from "./app-text";

type StatusTone = "info" | "success" | "warning" | "error" | "blocked";

type StatusBannerProps = {
  tone: StatusTone;
  title: string;
  message: string;
  detail?: string;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onAction?: () => void;
};

const iconByTone: Record<StatusTone, SFSymbol> = {
  info: stateIcons.info,
  success: stateIcons.success,
  warning: stateIcons.warning,
  error: stateIcons.error,
  blocked: stateIcons.blocked,
};

export function StatusBanner({
  tone,
  title,
  message,
  detail,
  actionLabel,
  actionAccessibilityLabel,
  onAction,
}: StatusBannerProps) {
  const theme = useAppTheme();
  const color = tone === "blocked" ? theme.error : theme[tone];

  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : "text"}
      style={[
        styles.banner,
        { borderColor: color, backgroundColor: theme.surface },
      ]}
    >
      <AppIcon name={iconByTone[tone]} color={color} size={22} />
      <View style={styles.copy}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="body" muted>
          {message}
        </AppText>
        {detail ? (
          <AppText variant="small" muted>
            Details: {detail}
          </AppText>
        ) : null}
        {actionLabel && onAction ? (
          <AppButton
            label={actionLabel}
            variant="secondary"
            onPress={onAction}
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "flex-start",
    borderLeftWidth: 4,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
});
