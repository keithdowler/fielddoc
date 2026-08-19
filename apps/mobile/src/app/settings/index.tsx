import { AuthView } from "@clerk/expo/native";
import {
  getCloudFeatureGate,
  reportBrandingAccentColors,
} from "@fielddoc/domain";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { FormField } from "@/components/form-field";
import { MetricRow } from "@/components/metric-row";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import { useMobileAuth } from "@/infrastructure/auth/mobile-auth";
import { getMobileAuthStatusCopy } from "@/infrastructure/auth/mobile-auth-state";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";
import {
  runMobileCloudSync,
  type MobileCloudSyncResult,
} from "@/infrastructure/sync/mobile-cloud-sync";
import {
  runMobileOutboxSync,
  type MobileSyncResult,
} from "@/infrastructure/sync/mobile-outbox-sync";
import {
  runMobilePullSync,
  type MobilePullSyncResult,
} from "@/infrastructure/sync/mobile-pull-sync";
import type { LocalSyncConflict } from "@/infrastructure/local-store/pull-sync";
import {
  runMobileMediaUpload,
  type MobileMediaUploadResult,
} from "@/infrastructure/sync/mobile-media-upload";
import {
  runMobileReportUpload,
  type MobileReportUploadResult,
} from "@/infrastructure/sync/mobile-report-upload";
import { useRevenueCatEntitlements } from "@/infrastructure/revenuecat/revenuecat";
import { getRevenueCatStatusCopy } from "@/infrastructure/revenuecat/revenuecat-state";
import {
  deleteLocalDeviceData,
  exportLocalData,
} from "@/infrastructure/privacy/local-privacy";

export default function SettingsScreen() {
  const mobileAuth = useMobileAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<MobileSyncResult | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadResult, setMediaUploadResult] =
    useState<MobileMediaUploadResult | null>(null);
  const [reportUploadResult, setReportUploadResult] =
    useState<MobileReportUploadResult | null>(null);
  const [uploadingReports, setUploadingReports] = useState(false);
  const [cloudSyncResult, setCloudSyncResult] =
    useState<MobileCloudSyncResult | null>(null);
  const [pullSyncResult, setPullSyncResult] =
    useState<MobilePullSyncResult | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [pullingChanges, setPullingChanges] = useState(false);
  const [authActionResult, setAuthActionResult] = useState<{
    status: "success" | "canceled" | "failed";
    message: string;
  } | null>(null);
  const [subscriptionActionResult, setSubscriptionActionResult] = useState<{
    status: "success" | "canceled" | "failed";
    message: string;
  } | null>(null);
  const [privacyActionResult, setPrivacyActionResult] = useState<{
    status: "success" | "failed";
    message: string;
  } | null>(null);
  const [authActionRunning, setAuthActionRunning] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deletingLocalData, setDeletingLocalData] = useState(false);
  const [deleteLocalDataArmed, setDeleteLocalDataArmed] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [footerText, setFooterText] = useState("");
  const [accentColor, setAccentColor] = useState<
    (typeof reportBrandingAccentColors)[number]
  >(reportBrandingAccentColors[0]);
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingStatus, setBrandingStatus] = useState<string | null>(null);
  const [conflictCount, setConflictCount] = useState(0);
  const [conflictPreview, setConflictPreview] = useState<LocalSyncConflict[]>(
    [],
  );
  const [conflictStatus, setConflictStatus] = useState<string | null>(null);
  const [resolvingConflicts, setResolvingConflicts] = useState(false);

  const authStatusCopy = getMobileAuthStatusCopy(mobileAuth.status);
  const revenueCat = useRevenueCatEntitlements({
    isSignedIn: mobileAuth.isSignedIn,
    userId: mobileAuth.userId,
  });
  const revenueCatStatusCopy = getRevenueCatStatusCopy(revenueCat);
  const cloudFeatureGate = getCloudFeatureGate({
    isSignedIn: mobileAuth.isSignedIn,
    entitlementConfigured: revenueCat.isConfigured,
    entitlements: revenueCat.entitlements,
  });
  const cloudActionsDisabled =
    syncingAll ||
    syncing ||
    uploadingMedia ||
    uploadingReports ||
    pullingChanges ||
    !cloudFeatureGate.allowed;
  const syncCenterReady = mobileAuth.isSignedIn && cloudFeatureGate.allowed;
  const syncCenterTone =
    revenueCat.status === "failed"
      ? "error"
      : syncCenterReady
        ? "success"
        : "warning";
  const syncCenterTitle = syncCenterReady
    ? "Ready for cloud backup"
    : mobileAuth.isSignedIn
      ? "Cloud backup locked"
      : "Sign in to back up";
  const syncCenterMessage = syncCenterReady
    ? "Use Back Up Now to send details, original files, and generated Proof Packet PDFs."
    : (cloudFeatureGate.reason ?? authStatusCopy.message);

  useEffect(() => {
    let mounted = true;

    async function loadBranding() {
      const repositories = await getLocalRepositories();
      const branding = await repositories.reportBranding.get();

      if (!mounted) return;
      setCompanyName(branding.companyName ?? "");
      setPreparedBy(branding.preparedBy ?? "");
      setFooterText(branding.footerText ?? "");
      setAccentColor(
        reportBrandingAccentColors.includes(
          branding.accentColor as (typeof reportBrandingAccentColors)[number],
        )
          ? (branding.accentColor as (typeof reportBrandingAccentColors)[number])
          : reportBrandingAccentColors[0],
      );
    }

    void loadBranding().catch(() => {
      if (mounted) {
        setBrandingStatus("Report branding could not be loaded.");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const loadConflictSummary = useCallback(async () => {
    const repositories = await getLocalRepositories();
    const [count, conflicts] = await Promise.all([
      repositories.pullSync.countUnresolvedConflicts(),
      repositories.pullSync.listUnresolvedConflicts(5),
    ]);

    setConflictCount(count);
    setConflictPreview(conflicts);
  }, []);

  useEffect(() => {
    void loadConflictSummary().catch(() => {
      setConflictStatus("Conflict review could not be loaded.");
    });
  }, [loadConflictSummary]);

  const signOut = useCallback(async () => {
    setAuthActionRunning(true);
    const result = await mobileAuth.signOut();

    setAuthActionResult(result);
    setAuthActionRunning(false);
  }, [mobileAuth]);

  const refreshSubscription = useCallback(async () => {
    const result = await revenueCat.refresh();

    setSubscriptionActionResult(result);
  }, [revenueCat]);

  const restorePurchases = useCallback(async () => {
    const result = await revenueCat.restore();

    setSubscriptionActionResult(result);
  }, [revenueCat]);

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

  const uploadReportPdfs = useCallback(async () => {
    setUploadingReports(true);
    const repositories = await getLocalRepositories();
    const result = await runMobileReportUpload({
      repositories,
      tokenProvider: mobileAuth,
    });

    setReportUploadResult(result);
    setUploadingReports(false);
  }, [mobileAuth]);

  const uploadAllPendingChanges = useCallback(async () => {
    setSyncingAll(true);

    try {
      const repositories = await getLocalRepositories();
      const result = await runMobileCloudSync({
        repositories,
        tokenProvider: mobileAuth,
      });

      setCloudSyncResult(result);
      setSyncResult(result.metadata);
      setMediaUploadResult(result.media);
      setReportUploadResult(result.reports);
    } finally {
      setSyncingAll(false);
    }
  }, [mobileAuth]);

  const downloadCloudChanges = useCallback(async () => {
    setPullingChanges(true);

    try {
      const repositories = await getLocalRepositories();
      const result = await runMobilePullSync({
        repositories,
        tokenProvider: mobileAuth,
      });

      setPullSyncResult(result);
      await loadConflictSummary();
    } finally {
      setPullingChanges(false);
    }
  }, [loadConflictSummary, mobileAuth]);

  const markConflictsReviewed = useCallback(async () => {
    setResolvingConflicts(true);

    try {
      const repositories = await getLocalRepositories();
      const resolvedCount = await repositories.pullSync.resolveAllConflicts();

      setConflictStatus(
        resolvedCount === 0
          ? "No unresolved conflicts were waiting for review."
          : `${resolvedCount} preserved conflicts marked reviewed. Local edits were not overwritten.`,
      );
      await loadConflictSummary();
    } finally {
      setResolvingConflicts(false);
    }
  }, [loadConflictSummary]);

  const exportDeviceData = useCallback(async () => {
    setExportingData(true);

    try {
      const repositories = await getLocalRepositories();
      const result = await exportLocalData({
        database: repositories.database,
      });

      setPrivacyActionResult({
        status: result.status,
        message: result.localUri
          ? `${result.message} Saved at ${result.localUri}`
          : result.message,
      });
    } finally {
      setExportingData(false);
    }
  }, []);

  const deleteDeviceData = useCallback(async () => {
    if (!deleteLocalDataArmed) {
      setDeleteLocalDataArmed(true);
      setPrivacyActionResult({
        status: "failed",
        message:
          "Press Delete Local Device Data again to confirm. This does not delete cloud account data.",
      });
      return;
    }

    setDeletingLocalData(true);

    try {
      const repositories = await getLocalRepositories();
      const result = await deleteLocalDeviceData({
        database: repositories.database,
      });

      setPrivacyActionResult({
        status: result.status,
        message: `${result.message} Rows removed: ${result.deletedRows}.`,
      });
      setDeleteLocalDataArmed(false);
      setSyncResult(null);
      setMediaUploadResult(null);
      setReportUploadResult(null);
      setCloudSyncResult(null);
      setPullSyncResult(null);
      setConflictCount(0);
      setConflictPreview([]);
      setConflictStatus(null);
      setCompanyName("");
      setPreparedBy("");
      setFooterText("");
      setAccentColor(reportBrandingAccentColors[0]);
      setBrandingStatus(null);
    } finally {
      setDeletingLocalData(false);
    }
  }, [deleteLocalDataArmed]);

  const saveReportBranding = useCallback(async () => {
    setSavingBranding(true);

    try {
      const repositories = await getLocalRepositories();
      const branding = await repositories.reportBranding.save({
        companyName,
        preparedBy,
        footerText,
        accentColor,
      });

      setCompanyName(branding.companyName ?? "");
      setPreparedBy(branding.preparedBy ?? "");
      setFooterText(branding.footerText ?? "");
      setAccentColor(
        branding.accentColor as (typeof reportBrandingAccentColors)[number],
      );
      setBrandingStatus("Report branding saved locally.");
    } catch (error) {
      setBrandingStatus(
        error instanceof Error
          ? error.message
          : "Report branding could not be saved.",
      );
    } finally {
      setSavingBranding(false);
    }
  }, [accentColor, companyName, footerText, preparedBy]);

  return (
    <AppScreen>
      <View>
        <AppText variant="hero">Settings</AppText>
        <AppText muted>
          Account, subscription, cloud backup, privacy, and support tools.
        </AppText>
      </View>

      <Card>
        <SectionHeader
          title="Settings Guide"
          detail="Use this page when you want work to leave the device safely."
        />
        <MetricRow
          label="Cloud account"
          value={mobileAuth.isSignedIn ? "Connected" : "Sign in"}
        />
        <MetricRow label="Subscription" value={revenueCatStatusCopy.title} />
        <MetricRow
          label="Backup"
          value={syncCenterReady ? "Ready" : "Locked"}
        />
        <MetricRow label="Report branding" value="Optional" />
        <MetricRow
          label="Privacy actions"
          value="Export or delete local data"
        />
        <MetricRow label="Diagnostics" value="Support information only" />
      </Card>

      <Card>
        <SectionHeader
          title="Cloud Account"
          detail="Connects this device to your FieldDoc workspace."
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
          title="Subscription"
          detail="Unlocks cloud backup, private media archive, and report upload."
        />
        <StatusBanner
          tone={revenueCatStatusCopy.tone}
          title={revenueCatStatusCopy.title}
          message={
            subscriptionActionResult?.message ?? revenueCatStatusCopy.message
          }
        />
        {cloudFeatureGate.reason ? (
          <AppText variant="small" muted>
            {cloudFeatureGate.reason}
          </AppText>
        ) : null}
        <View style={styles.actionRow}>
          <AppButton
            label="Refresh"
            icon="arrow.clockwise"
            accessibilityLabel="Refresh subscription entitlements"
            onPress={refreshSubscription}
            disabled={revenueCat.status === "checking"}
            loading={revenueCat.status === "checking"}
            variant="secondary"
            style={styles.actionButton}
          />
          <AppButton
            label="Restore"
            icon="arrow.down.circle"
            accessibilityLabel="Restore app store purchases"
            onPress={restorePurchases}
            disabled={revenueCat.status === "checking"}
            loading={revenueCat.status === "checking"}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Cloud Backup"
          detail="Normal field workflow for protecting work from this device."
        />
        <StatusBanner
          tone={syncCenterTone}
          title={syncCenterTitle}
          message={syncCenterMessage}
        />
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <AppText variant="label">Account</AppText>
            <AppText variant="small" muted>
              {mobileAuth.isSignedIn ? "Connected" : authStatusCopy.title}
            </AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText variant="label">Subscription</AppText>
            <AppText variant="small" muted>
              {revenueCatStatusCopy.title}
            </AppText>
          </View>
          <View style={styles.summaryItem}>
            <AppText variant="label">Last upload</AppText>
            <AppText variant="small" muted>
              {cloudSyncResult
                ? statusTitleByCloudStatus[cloudSyncResult.status]
                : "Not run this session"}
            </AppText>
          </View>
        </View>
        <AppButton
          label={syncingAll ? "Backing Up..." : "Back Up Now"}
          icon="arrow.triangle.2.circlepath"
          accessibilityLabel="Back up metadata original media and report PDFs"
          onPress={uploadAllPendingChanges}
          disabled={cloudActionsDisabled}
          loading={syncingAll}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Backup Details"
          detail="Sends job details first, then originals and report PDFs."
        />
        {cloudSyncResult ? (
          <StatusBanner
            tone={statusToneByCloudStatus[cloudSyncResult.status]}
            title={statusTitleByCloudStatus[cloudSyncResult.status]}
            message={cloudSyncResult.message}
          />
        ) : (
          <AppText muted>
            Use this for the normal field workflow after capturing evidence. Job
            details must reach the cloud before originals can be placed in
            private storage.
          </AppText>
        )}
        {cloudSyncResult ? (
          <View style={styles.metrics}>
            <AppText variant="small" muted>
              Metadata accepted {cloudSyncResult.metadata.acceptedCount} |
              duplicates {cloudSyncResult.metadata.duplicateCount} | rejected{" "}
              {cloudSyncResult.metadata.rejectedCount} | pending{" "}
              {cloudSyncResult.metadata.pendingCount}
            </AppText>
            <AppText variant="small" muted>
              Originals uploaded {cloudSyncResult.media?.uploadedCount ?? 0} |
              failed {cloudSyncResult.media?.failedCount ?? 0} | pending{" "}
              {cloudSyncResult.media?.pendingCount ?? 0}
            </AppText>
            <AppText variant="small" muted>
              Report PDFs uploaded {cloudSyncResult.reports?.uploadedCount ?? 0}{" "}
              | failed {cloudSyncResult.reports?.failedCount ?? 0} | pending{" "}
              {cloudSyncResult.reports?.pendingCount ?? 0}
            </AppText>
          </View>
        ) : null}
        <AppButton
          label={syncingAll ? "Backing Up..." : "Back Up Everything"}
          icon="icloud.and.arrow.up"
          accessibilityLabel="Back up all pending metadata original media and report PDFs"
          onPress={uploadAllPendingChanges}
          disabled={cloudActionsDisabled}
          loading={syncingAll}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Job Detail Upload"
          detail="Uploads local project, evidence, and report details."
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
          label={syncing ? "Checking..." : "Upload Job Details"}
          icon="arrow.triangle.2.circlepath"
          accessibilityLabel="Upload pending local job detail changes"
          onPress={uploadPendingMetadata}
          disabled={cloudActionsDisabled}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Download From Cloud"
          detail="Pulls workspace job details into local storage."
        />
        {pullSyncResult ? (
          <StatusBanner
            tone={statusToneByPullStatus[pullSyncResult.status]}
            title={statusTitleByPullStatus[pullSyncResult.status]}
            message={pullSyncResult.message}
          />
        ) : (
          <AppText muted>
            Use this after signing in on a new device or after another device
            uploads project details.
          </AppText>
        )}
        {pullSyncResult ? (
          <View style={styles.metrics}>
            <AppText variant="small" muted>
              Pulled {pullSyncResult.pulledCount} | applied{" "}
              {pullSyncResult.appliedCount} | conflicts{" "}
              {pullSyncResult.conflictCount} | unresolved{" "}
              {pullSyncResult.unresolvedConflictCount}
            </AppText>
            <AppText variant="small" muted>
              Last pull {pullSyncResult.lastPulledAt ?? "never"} | cursor{" "}
              {pullSyncResult.cursor ?? "none"}
            </AppText>
          </View>
        ) : null}
        <AppButton
          label={pullingChanges ? "Downloading..." : "Download Updates"}
          icon="icloud.and.arrow.down"
          accessibilityLabel="Download cloud project and evidence changes"
          onPress={downloadCloudChanges}
          disabled={cloudActionsDisabled}
          loading={pullingChanges}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Conflict Review"
          detail="Local edits are preserved when cloud changes disagree."
        />
        <StatusBanner
          tone={conflictCount > 0 ? "warning" : "success"}
          title={
            conflictCount > 0 ? "Review preserved changes" : "No conflicts"
          }
          message={
            conflictStatus ??
            (conflictCount > 0
              ? `${conflictCount} cloud ${conflictCount === 1 ? "change" : "changes"} differed from local edits. Nothing was overwritten.`
              : "Cloud downloads can preserve local edits without silently replacing field work.")
          }
        />
        {conflictPreview.length ? (
          <View style={styles.metrics}>
            {conflictPreview.map((conflict) => (
              <View key={conflict.id} style={styles.conflictRow}>
                <AppText variant="label">
                  {conflict.entityType} / {conflict.entityId.slice(0, 8)}
                </AppText>
                <AppText variant="small" muted>
                  Detected {formatConflictDate(conflict.detectedAt)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
        <AppButton
          label={resolvingConflicts ? "Marking..." : "Mark Reviewed"}
          icon="checkmark.seal"
          accessibilityLabel="Mark preserved cloud sync conflicts reviewed"
          onPress={markConflictsReviewed}
          disabled={resolvingConflicts || conflictCount === 0}
          loading={resolvingConflicts}
          variant="secondary"
        />
      </Card>

      <Card>
        <SectionHeader
          title="Original File Backup"
          detail="Uploads local originals after job details exist in the cloud."
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
          label={uploadingMedia ? "Checking..." : "Back Up Originals"}
          icon="icloud.and.arrow.up"
          accessibilityLabel="Back up original media files to private cloud storage"
          onPress={uploadOriginalMedia}
          disabled={cloudActionsDisabled}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Report PDF Backup"
          detail="Archives generated Proof Packets in private storage."
        />
        {reportUploadResult ? (
          <StatusBanner
            tone={statusToneByReportStatus[reportUploadResult.status]}
            title={statusTitleByReportStatus[reportUploadResult.status]}
            message={reportUploadResult.message}
          />
        ) : (
          <AppText muted>
            Generated PDFs stay on this device until cloud sign-in can prepare a
            private upload URL.
          </AppText>
        )}
        {reportUploadResult ? (
          <View style={styles.metrics}>
            <AppText variant="small" muted>
              Attempted {reportUploadResult.attemptedCount} | uploaded{" "}
              {reportUploadResult.uploadedCount} | failed{" "}
              {reportUploadResult.failedCount} | pending{" "}
              {reportUploadResult.pendingCount}
            </AppText>
          </View>
        ) : null}
        <AppButton
          label={uploadingReports ? "Checking..." : "Back Up Report PDFs"}
          icon="doc.richtext"
          accessibilityLabel="Back up generated report PDFs to private cloud storage"
          onPress={uploadReportPdfs}
          disabled={cloudActionsDisabled}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Default Report Branding"
          detail="Applied to newly generated local Proof Packet PDFs."
        />
        {brandingStatus ? (
          <StatusBanner
            tone={brandingStatus.includes("saved") ? "success" : "warning"}
            title="Report branding"
            message={brandingStatus}
          />
        ) : null}
        <FormField
          label="Company name"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Acme Restoration"
        />
        <FormField
          label="Prepared by"
          value={preparedBy}
          onChangeText={setPreparedBy}
          placeholder="Keith Dowler"
        />
        <FormField
          label="Footer text"
          value={footerText}
          onChangeText={setFooterText}
          placeholder="Proof Packet generated from immutable local evidence."
          multiline
        />
        <View style={styles.actionRow}>
          {reportBrandingAccentColors.map((color) => (
            <AppButton
              key={color}
              label={color === accentColor ? "Selected" : "Color"}
              accessibilityLabel={`Select report accent color ${color}`}
              variant={color === accentColor ? "primary" : "secondary"}
              onPress={() => setAccentColor(color)}
              style={[styles.swatchButton, { borderColor: color }]}
            />
          ))}
        </View>
        <AppButton
          label={savingBranding ? "Saving..." : "Save Report Branding"}
          icon="paintpalette"
          accessibilityLabel="Save default report branding"
          onPress={saveReportBranding}
          loading={savingBranding}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Privacy"
          detail="Local-first controls for data portability and device cleanup."
        />
        {privacyActionResult ? (
          <StatusBanner
            tone={
              privacyActionResult.status === "success" ? "success" : "warning"
            }
            title={
              privacyActionResult.status === "success"
                ? "Privacy action complete"
                : "Confirm action"
            }
            message={privacyActionResult.message}
          />
        ) : (
          <AppText muted>
            FieldDoc keeps originals and report PDFs in app-owned storage until
            you explicitly upload or remove them.
          </AppText>
        )}
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="label">Export My Data</AppText>
            <AppText variant="small" muted>
              Creates a JSON archive of local metadata. Original files are not
              bundled into the archive.
            </AppText>
          </View>
          <AppButton
            label={exportingData ? "Exporting" : "Export"}
            icon="square.and.arrow.up"
            variant="secondary"
            accessibilityLabel="Export local FieldDoc metadata"
            onPress={exportDeviceData}
            disabled={exportingData || deletingLocalData}
            loading={exportingData}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="label">Delete Local Device Data</AppText>
            <AppText variant="small" muted>
              Removes local projects, evidence metadata, originals, generated
              PDFs, queued mutations, and sync state from this device only.
            </AppText>
          </View>
          <AppButton
            label={deleteLocalDataArmed ? "Confirm Delete" : "Delete Local"}
            icon="trash"
            variant="danger"
            accessibilityLabel="Delete local FieldDoc data from this device"
            onPress={deleteDeviceData}
            disabled={exportingData || deletingLocalData}
            loading={deletingLocalData}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Workspace Controls"
          detail="Production controls that are partially wired or awaiting a future sprint."
        />
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="label">Profile</AppText>
            <AppText variant="small" muted>
              Cloud identity is managed by Clerk sign-in and sign-out above.
            </AppText>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="label">Default Report Branding</AppText>
            <AppText variant="small" muted>
              Editable above. New local PDFs include company, prepared-by,
              footer, and accent color settings.
            </AppText>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="label">Delete Cloud Account</AppText>
            <AppText variant="small" muted>
              Not yet implemented. Current delete control is device-local only.
            </AppText>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="label">Diagnostics</AppText>
            <AppText variant="small" muted>
              Use sync result cards above for upload, download, subscription,
              and authentication diagnostics.
            </AppText>
          </View>
        </View>
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
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
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  summaryGrid: {
    gap: spacing.sm,
  },
  summaryItem: {
    gap: spacing.xs,
  },
  swatchButton: {
    borderWidth: 3,
    flex: 1,
    minWidth: 96,
  },
  conflictRow: {
    gap: spacing.xs,
  },
});

function formatConflictDate(value: string): string {
  return new Date(value).toLocaleString();
}

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

const statusToneByReportStatus = {
  not_configured: "warning",
  auth_required: "warning",
  idle: "info",
  success: "success",
  partial: "warning",
  failed: "error",
} as const;

const statusTitleByReportStatus = {
  not_configured: "Report upload not configured",
  auth_required: "Cloud sign-in required",
  idle: "No PDFs waiting",
  success: "Report PDFs uploaded",
  partial: "Some PDFs uploaded",
  failed: "Report upload failed",
} as const;

const statusToneByCloudStatus = {
  not_configured: "warning",
  auth_required: "warning",
  idle: "info",
  success: "success",
  partial: "warning",
  failed: "error",
} as const;

const statusTitleByCloudStatus = {
  not_configured: "Sync not configured",
  auth_required: "Cloud sign-in required",
  idle: "Nothing to upload",
  success: "Cloud upload complete",
  partial: "Some changes need attention",
  failed: "Cloud upload failed",
} as const;

const statusToneByPullStatus = {
  not_configured: "warning",
  auth_required: "warning",
  idle: "info",
  success: "success",
  partial: "warning",
  failed: "error",
} as const;

const statusTitleByPullStatus = {
  not_configured: "Download not configured",
  auth_required: "Cloud sign-in required",
  idle: "Nothing to download",
  success: "Cloud changes downloaded",
  partial: "Conflicts need review",
  failed: "Download failed",
} as const;
