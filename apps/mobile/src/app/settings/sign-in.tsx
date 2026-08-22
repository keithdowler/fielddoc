import { AuthView } from "@clerk/expo/native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { spacing } from "@/design/tokens";
import { useAppTheme } from "@/design/use-app-theme";
import { useMobileAuth } from "@/infrastructure/auth/mobile-auth";

export default function SignInScreen() {
  const auth = useMobileAuth();
  const router = useRouter();
  const theme = useAppTheme();

  useEffect(() => {
    if (auth.isSignedIn) {
      router.replace("/settings");
    }
  }, [auth.isSignedIn, router]);

  if (!auth.isConfigured) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme.background }]}
      >
        <AppText variant="section">Sign-in is temporarily unavailable</AppText>
        <AppText variant="body" muted style={styles.centeredText}>
          Please update FieldDoc or contact support.
        </AppText>
      </SafeAreaView>
    );
  }

  if (!auth.isLoaded || auth.isSignedIn) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.primary} size="large" />
        <AppText variant="body" muted>
          Connecting to your account...
        </AppText>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.authView, { backgroundColor: theme.background }]}>
      <AuthView
        mode="signInOrUp"
        isDismissible
        onDismiss={() => router.back()}
        onHostBack={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  authView: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.xl,
  },
  centeredText: {
    textAlign: "center",
  },
});
