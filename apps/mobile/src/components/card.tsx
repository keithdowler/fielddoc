import { StyleSheet, View, type ViewProps } from "react-native";

import { elevation, radius, spacing } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";

export function Card({ style, ...props }: ViewProps) {
  const theme = useAppTheme();

  return (
    <View
      {...props}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.lg,
    ...elevation.level1,
  },
});
