import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { SectionHeader } from "@/components/section-header";
import { spacing } from "@/design/tokens";

const settingsSections = [
  "Profile",
  "Cloud Backup",
  "Subscription",
  "Default Report Branding",
  "Privacy",
  "Export My Data",
  "Delete Account",
  "Diagnostics",
] as const;

export default function SettingsScreen() {
  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Settings</AppText>
        <AppText muted>
          Operational controls and privacy settings placeholders.
        </AppText>
      </View>

      <Card>
        <SectionHeader title="Account & Workspace" />
        {settingsSections.map((section) => (
          <View key={section} style={styles.row}>
            <View style={styles.copy}>
              <AppText variant="label">{section}</AppText>
              <AppText variant="small" muted>
                Placeholder
              </AppText>
            </View>
            <AppButton
              label="Open"
              variant={section === "Delete Account" ? "danger" : "secondary"}
              accessibilityLabel={`Open ${section}`}
            />
          </View>
        ))}
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  copy: {
    flex: 1,
  },
});
