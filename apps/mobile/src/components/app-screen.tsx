import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { useAppTheme } from "@/design/use-app-theme";
import { spacing } from "@/design/tokens";

type AppScreenProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function AppScreen({ children, footer }: AppScreenProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  footer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
});
