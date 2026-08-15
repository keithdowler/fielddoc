import { StyleSheet, View } from "react-native";
import type { SFSymbol } from "expo-symbols";

import { radius, spacing } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";
import { AppButton } from "./app-button";
import { AppIcon } from "./app-icon";
import { AppText } from "./app-text";

type EmptyStateProps = {
  title: string;
  message: string;
  ctaLabel?: string;
  icon: SFSymbol;
  onPress?: () => void;
};

export function EmptyState({
  title,
  message,
  ctaLabel,
  icon,
  onPress,
}: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.empty,
        { borderColor: theme.border, backgroundColor: theme.surfaceMuted },
      ]}
    >
      <AppIcon name={icon} color={theme.textMuted} size={26} />
      <View style={styles.copy}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="small" muted>
          {message}
        </AppText>
      </View>
      {ctaLabel ? (
        <AppButton
          label={ctaLabel}
          icon="plus.circle.fill"
          variant="secondary"
          onPress={onPress}
          accessibilityLabel={ctaLabel}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    borderRadius: radius.sm,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: {
    gap: spacing.xs,
  },
});
