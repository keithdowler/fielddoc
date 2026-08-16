import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";
import {
  runMobileOutboxSync,
  type MobileSyncResult,
} from "@/infrastructure/sync/mobile-outbox-sync";

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
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<MobileSyncResult | null>(null);

  const uploadPendingMetadata = useCallback(async () => {
    setSyncing(true);
    const repositories = await getLocalRepositories();
    const result = await runMobileOutboxSync({
      repositories,
      tokenProvider: {
        async getAccessToken() {
          return null;
        },
      },
    });

    setSyncResult(result);
    setSyncing(false);
  }, []);

  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Settings</AppText>
        <AppText muted>
          Operational controls and privacy settings placeholders.
        </AppText>
      </View>

      <Card>
        <SectionHeader
          title="Cloud Sync"
          detail="Uploads local metadata after cloud sign-in is available."
        />
        {syncResult ? (
          <StatusBanner
            tone={statusToneBySyncStatus[syncResult.status]}
            title={statusTitleBySyncStatus[syncResult.status]}
            message={syncResult.message}
          />
        ) : (
          <AppText muted>
            Project, evidence, annotation, media, and report metadata remain
            local until an authenticated token provider is connected.
          </AppText>
        )}
        {syncResult ? (
          <View style={styles.metrics}>
            <AppText variant="small" muted>
              Attempted {syncResult.attemptedCount} | accepted{" "}
              {syncResult.acceptedCount} | duplicates{" "}
              {syncResult.duplicateCount} | rejected {syncResult.rejectedCount}{" "}
              | pending {syncResult.pendingCount}
            </AppText>
          </View>
        ) : null}
        <AppButton
          label={syncing ? "Checking..." : "Upload Pending Metadata"}
          icon="arrow.triangle.2.circlepath"
          accessibilityLabel="Upload pending local metadata changes"
          onPress={uploadPendingMetadata}
          disabled={syncing}
        />
      </Card>

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
  metrics: {
    gap: spacing.xs,
  },
});

const statusToneBySyncStatus = {
  not_configured: "warning",
  auth_required: "warning",
  idle: "info",
  success: "success",
  partial: "warning",
  failed: "error",
} as const;

const statusTitleBySyncStatus = {
  not_configured: "Sync not configured",
  auth_required: "Cloud sign-in required",
  idle: "Nothing to upload",
  success: "Metadata received",
  partial: "Some metadata rejected",
  failed: "Sync failed",
} as const;
