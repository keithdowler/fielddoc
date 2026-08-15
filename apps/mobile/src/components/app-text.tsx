import { StyleSheet, Text, type TextProps } from "react-native";

import { typography } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";

type AppTextVariant = "hero" | "title" | "section" | "body" | "small" | "label";

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  muted?: boolean;
};

export function AppText({
  variant = "body",
  muted = false,
  style,
  ...props
}: AppTextProps) {
  const theme = useAppTheme();

  return (
    <Text
      maxFontSizeMultiplier={1.8}
      {...props}
      style={[
        styles.base,
        typography[variant],
        { color: muted ? theme.textMuted : theme.text },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0,
  },
});
