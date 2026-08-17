import { AuthView } from "@clerk/expo/native";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import { useMobileAuth } from "@/infrastructure/auth/mobile-auth";
import { getMobileAuthStatusCopy } from "@/infrastructure/auth/mobile-auth-state";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";
import {
  runMobileOutboxSync,
  type MobileSyncResult,
} from "@/infrastructure/sync/mobile-outbox-sync";
import {
  runMobileMediaUpload,
  type MobileMediaUploadResult,
} from "@/infrastructure/sync/mobile-media-upload";

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
  const mobileAuth = useMobileAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<MobileSyncResult | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadResult, setMediaUploadResult] =
    useState<MobileMediaUploadResult | null>(null);
  const [authActionResult, setAuthActionResult] = useState<{
    status: "success" | "canceled" | "failed";
    message: string;
  } | null>(null);
  const [authActionRunning, setAuthActionRunning] = useState(false);

  const authStatusCopy = getMobileAuthStatusCopy(mobileAuth.status);

  const signOut = useCallback(async () => {
    setAuthActionRunning(true);
    const result = await mobileAuth.signOut();

    setAuthActionResult(result);
    setAuthActionRunning(false);
  }, [mobileAuth]);

  const uploadPendingMetadata = useCallback(async () => {
    setSyncing(true);
    const repositories = await getLocalRepositories();
    const result = await runMobileOutboxSync({
      repositories,
      tokenProvider: mobileAuth,
    });

    setSyncResult(result);
    setSyncing(false);
  }, [mobileAuth]);

  const uploadOriginalMedia = useCallback(async () => {
    setUploadingMedia(true);
    const repositories = await getLocalRepositories();
    const result = await runMobileMediaUpload({
      repositories,
      tokenProvider: mobileAuth,
    });

    setMediaUploadResult(result);
    setUploadingMedia(false);
  }, [mobileAuth]);

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
          title="Cloud Account"
          detail="Connects this device to your Proof Packet workspace."
        />
        <StatusBanner
          tone={authStatusCopy.tone}
          title={authStatusCopy.title}
          message={authActionResult?.message ?? authStatusCopy.message}
        />
        {mobileAuth.userId ? (
          <View style={styles.metrics}>
            <AppText variant="small" muted>
              Clerk user {mobileAuth.userId}
            </AppText>
          </View>
        ) : null}
        {mobileAuth.isConfigured &&
        mobileAuth.isLoaded &&
        !mobileAuth.isSignedIn ? (
          <View style={styles.authFrame}>
            <AuthView mode="signInOrUp" isDismissible={false} />
          </View>
        ) : null}
        {mobileAuth.isSignedIn ? (
          <AppButton
            label="Sign Out"
            icon="rectangle.portrait.and.arrow.right"
            accessibilityLabel="Sign out of cloud account"
            onPress={signOut}
            disabled={authActionRunning}
            loading={authActionRunning}
            variant="secondary"
          />
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="Cloud Sync"
          detail="Uploads local metadata with your cloud session."
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
            local until this device is signed in.
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
          disabled={syncing || !mobileAuth.isSignedIn}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Original Media Upload"
          detail="Uploads local originals after metadata exists in the cloud."
        />
        {mediaUploadResult ? (
          <StatusBanner
            tone={statusToneByMediaStatus[mediaUploadResult.status]}
            title={statusTitleByMediaStatus[mediaUploadResult.status]}
            message={mediaUploadResult.message}
          />
        ) : (
          <AppText muted>
            Original files stay on this device until cloud sign-in can prepare a
            private upload URL.
          </AppText>
        )}
        {mediaUploadResult ? (
          <View style={styles.metrics}>
            <AppText variant="small" muted>
              Attempted {mediaUploadResult.attemptedCount} | uploaded{" "}
              {mediaUploadResult.uploadedCount} | failed{" "}
              {mediaUploadResult.failedCount} | pending{" "}
              {mediaUploadResult.pendingCount}
            </AppText>
          </View>
        ) : null}
        <AppButton
          label={uploadingMedia ? "Checking..." : "Upload Original Media"}
          icon="icloud.and.arrow.up"
          accessibilityLabel="Upload original media files to private cloud storage"
          onPress={uploadOriginalMedia}
          disabled={uploadingMedia || !mobileAuth.isSignedIn}
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
  authFrame: {
    minHeight: 520,
    overflow: "hidden",
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

const statusToneByMediaStatus = {
  not_configured: "warning",
  auth_required: "warning",
  idle: "info",
  success: "success",
  partial: "warning",
  failed: "error",
} as const;

const statusTitleByMediaStatus = {
  not_configured: "Media upload not configured",
  auth_required: "Cloud sign-in required",
  idle: "No originals waiting",
  success: "Originals uploaded",
  partial: "Some originals uploaded",
  failed: "Media upload failed",
} as const;
