import { createFieldDocApiClient } from "@fielddoc/api-client";
import {
  getCloudFeatureGate,
  reportBrandingAccentColors,
} from "@fielddoc/domain";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { type Href, useRouter } from "expo-router";

import { AppButton } from "@/components/app-button";
import { AppScreen } from "@/components/app-screen";
import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { FormField } from "@/components/form-field";
import { SectionHeader } from "@/components/section-header";
import { StatusBanner } from "@/components/status-banner";
import { spacing } from "@/design/tokens";
import { useMobileAuth } from "@/infrastructure/auth/mobile-auth";
import { getMobileAuthStatusCopy } from "@/infrastructure/auth/mobile-auth-state";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";
import {
  deleteLocalDeviceData,
  exportLocalData,
} from "@/infrastructure/privacy/local-privacy";
import { useRevenueCatEntitlements } from "@/infrastructure/revenuecat/revenuecat";
import { getRevenueCatStatusCopy } from "@/infrastructure/revenuecat/revenuecat-state";
import { useAutomaticCloudSync } from "@/infrastructure/sync/automatic-cloud-sync";
import { accountSignInRoute } from "@/navigation/app-navigation";

type ActionResult = {
  tone: "success" | "error" | "warning";
  title: string;
  message: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_FIELDDOC_API_BASE_URL;

export default function SettingsScreen() {
  const router = useRouter();
  const auth = useMobileAuth();
  const automaticSync = useAutomaticCloudSync();
  const subscription = useRevenueCatEntitlements({
    isSignedIn: auth.isSignedIn,
    userId: auth.userId,
  });
  const [companyName, setCompanyName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [footerText, setFooterText] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const authCopy = getMobileAuthStatusCopy(auth.status);
  const subscriptionCopy = getRevenueCatStatusCopy(subscription);
  const cloudGate = getCloudFeatureGate({
    isSignedIn: auth.isSignedIn,
    entitlementConfigured: subscription.isConfigured,
    entitlements: subscription.entitlements,
  });

  useEffect(() => {
    let mounted = true;

    void getLocalRepositories()
      .then((repositories) => repositories.reportBranding.get())
      .then((branding) => {
        if (!mounted) return;
        setCompanyName(branding.companyName ?? "");
        setPreparedBy(branding.preparedBy ?? "");
        setFooterText(branding.footerText ?? "");
      })
      .catch(() => {
        if (mounted) {
          setResult({
            tone: "warning",
            title: "Report details unavailable",
            message: "Your saved report details could not be loaded.",
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const saveBranding = useCallback(async () => {
    setSavingBranding(true);
    try {
      const repositories = await getLocalRepositories();
      await repositories.reportBranding.save({
        companyName: companyName.trim() || undefined,
        preparedBy: preparedBy.trim() || undefined,
        footerText: footerText.trim() || undefined,
        accentColor: reportBrandingAccentColors[0],
      });
      setResult({
        tone: "success",
        title: "Report details saved",
        message: "New reports will use these details.",
      });
    } catch (error) {
      setResult({
        tone: "error",
        title: "Report details not saved",
        message: getErrorMessage(error, "Please try again."),
      });
    } finally {
      setSavingBranding(false);
    }
  }, [companyName, footerText, preparedBy]);

  const signOut = useCallback(async () => {
    setWorking(true);
    const signOutResult = await auth.signOut();
    setResult({
      tone: signOutResult.status === "success" ? "success" : "error",
      title:
        signOutResult.status === "success"
          ? "Signed out"
          : "Could not sign out",
      message: signOutResult.message,
    });
    setWorking(false);
  }, [auth]);

  const refreshSubscription = useCallback(async () => {
    setWorking(true);
    const refreshResult = await subscription.refresh();
    setResult({
      tone: refreshResult.status === "success" ? "success" : "warning",
      title:
        refreshResult.status === "success"
          ? "Subscription updated"
          : "Subscription not updated",
      message: simplifySubscriptionMessage(refreshResult.message),
    });
    setWorking(false);
  }, [subscription]);

  const restorePurchases = useCallback(async () => {
    setWorking(true);
    const restoreResult = await subscription.restore();
    setResult({
      tone: restoreResult.status === "success" ? "success" : "warning",
      title:
        restoreResult.status === "success"
          ? "Purchases restored"
          : "Nothing was restored",
      message: simplifySubscriptionMessage(restoreResult.message),
    });
    setWorking(false);
  }, [subscription]);

  const exportMyData = useCallback(async () => {
    setWorking(true);
    const repositories = await getLocalRepositories();
    const exportResult = await exportLocalData({
      database: repositories.database,
    });
    setResult({
      tone: exportResult.status === "success" ? "success" : "error",
      title:
        exportResult.status === "success" ? "Export ready" : "Export failed",
      message: exportResult.message,
    });
    setWorking(false);
  }, []);

  const removeDeviceData = useCallback(async () => {
    setWorking(true);
    const repositories = await getLocalRepositories();
    const deleteResult = await deleteLocalDeviceData({
      database: repositories.database,
    });
    setResult({
      tone: deleteResult.status === "success" ? "success" : "error",
      title:
        deleteResult.status === "success"
          ? "Device data removed"
          : "Data not removed",
      message: deleteResult.message,
    });
    setWorking(false);
  }, []);

  const deleteAccount = useCallback(async () => {
    setWorking(true);
    try {
      if (!apiBaseUrl) {
        throw new Error(
          "Account deletion is unavailable in this version. Please contact support.",
        );
      }

      const accessToken = await auth.getAccessToken();
      if (!accessToken) {
        throw new Error("Please sign in again before deleting your account.");
      }

      const client = createFieldDocApiClient({
        baseUrl: apiBaseUrl,
        accessToken,
      });
      await client.deleteAccount();

      const repositories = await getLocalRepositories();
      await deleteLocalDeviceData({ database: repositories.database });
      await auth.signOut();
      setResult({
        tone: "success",
        title: "Account deleted",
        message: "Your FieldDoc account and its data have been deleted.",
      });
    } catch (error) {
      setResult({
        tone: "error",
        title: "Account not deleted",
        message: getErrorMessage(error, "Please contact support for help."),
      });
    } finally {
      setWorking(false);
    }
  }, [auth]);

  const confirmAccountDeletion = useCallback(() => {
    Alert.alert(
      "Delete account and all data?",
      "This permanently deletes your FieldDoc account, projects, photos, reports, and saved data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: () => void deleteAccount(),
        },
      ],
    );
  }, [deleteAccount]);

  const confirmDeviceDeletion = useCallback(() => {
    Alert.alert(
      "Remove data from this device?",
      "This removes FieldDoc projects, photos, and reports stored on this device. Your cloud account is not deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Device Data",
          style: "destructive",
          onPress: () => void removeDeviceData(),
        },
      ],
    );
  }, [removeDeviceData]);

  return (
    <AppScreen>
      <View style={styles.heading}>
        <AppText variant="label">FieldDoc</AppText>
        <AppText variant="title">Settings</AppText>
        <AppText variant="body" muted>
          Manage your account, automatic saving, reports, and privacy.
        </AppText>
      </View>

      {result ? (
        <StatusBanner
          tone={result.tone}
          title={result.title}
          message={result.message}
        />
      ) : null}

      <Card>
        <SectionHeader
          title="Account"
          detail="Sign in to keep your work available across devices."
        />
        <StatusBanner
          tone={authCopy.tone}
          title={authCopy.title}
          message={authCopy.message}
        />
        {auth.isConfigured && auth.isLoaded && !auth.isSignedIn ? (
          <AppButton
            label="Sign In"
            icon="person.crop.circle"
            onPress={() => router.push(accountSignInRoute as Href)}
          />
        ) : null}
        {auth.isSignedIn ? (
          <>
            <AppText variant="small" muted>
              Signed in as {auth.userId}
            </AppText>
            <AppButton
              label="Sign Out"
              icon="rectangle.portrait.and.arrow.right"
              variant="secondary"
              loading={working}
              onPress={() => void signOut()}
            />
          </>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="Automatic Saving"
          detail="FieldDoc saves changes in the background whenever a connection is available."
        />
        <StatusBanner
          tone={syncTone(automaticSync.status)}
          title={syncTitle(automaticSync.status)}
          message={automaticSync.message}
          actionLabel={
            automaticSync.status === "offline" ||
            automaticSync.status === "error"
              ? "Try Again"
              : undefined
          }
          onAction={() => void automaticSync.syncNow()}
        />
        {automaticSync.lastSavedAt ? (
          <AppText variant="small" muted>
            Last saved {new Date(automaticSync.lastSavedAt).toLocaleString()}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          title="Subscription"
          detail="A FieldDoc Pro subscription enables cloud saving and report sharing."
        />
        <StatusBanner
          tone={cloudGate.allowed ? "success" : subscriptionCopy.tone}
          title={
            cloudGate.allowed ? "Subscription active" : subscriptionCopy.title
          }
          message={
            cloudGate.allowed
              ? "FieldDoc Pro is active on this account."
              : simplifySubscriptionMessage(
                  cloudGate.reason ?? subscriptionCopy.message,
                )
          }
        />
        <View style={styles.actions}>
          <AppButton
            label="Refresh"
            icon="arrow.clockwise"
            variant="secondary"
            loading={working || subscription.status === "checking"}
            onPress={() => void refreshSubscription()}
            style={styles.action}
          />
          <AppButton
            label="Restore Purchases"
            icon="arrow.down.circle"
            variant="secondary"
            loading={working || subscription.status === "checking"}
            onPress={() => void restorePurchases()}
            style={styles.action}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader
          title="Report Details"
          detail="Optional details added to new FieldDoc reports."
        />
        <FormField
          label="Company Name"
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Your company"
        />
        <FormField
          label="Prepared By"
          value={preparedBy}
          onChangeText={setPreparedBy}
          placeholder="Your name"
        />
        <FormField
          label="Report Footer"
          value={footerText}
          onChangeText={setFooterText}
          placeholder="Optional footer text"
          multiline
        />
        <AppButton
          label="Save Report Details"
          icon="checkmark.circle"
          loading={savingBranding}
          onPress={() => void saveBranding()}
        />
      </Card>

      <Card>
        <SectionHeader
          title="Privacy"
          detail="Download a copy of your data or permanently remove it."
        />
        <AppButton
          label="Export My Data"
          icon="square.and.arrow.up"
          variant="secondary"
          loading={working}
          onPress={() => void exportMyData()}
        />
        <AppButton
          label="Remove Data From This Device"
          icon="iphone.slash"
          variant="secondary"
          loading={working}
          onPress={confirmDeviceDeletion}
        />
        {auth.isSignedIn ? (
          <AppButton
            label="Delete Account & All Data"
            icon="trash"
            variant="danger"
            loading={working}
            onPress={confirmAccountDeletion}
          />
        ) : null}
        <AppText variant="small" muted>
          Account deletion is permanent and removes cloud data as well as data
          saved on this device.
        </AppText>
      </Card>
    </AppScreen>
  );
}

function syncTone(status: ReturnType<typeof useAutomaticCloudSync>["status"]) {
  if (status === "saved") return "success" as const;
  if (status === "error") return "error" as const;
  if (status === "offline") return "warning" as const;
  return "info" as const;
}

function syncTitle(status: ReturnType<typeof useAutomaticCloudSync>["status"]) {
  if (status === "saved") return "Everything is saved";
  if (status === "saving") return "Saving changes";
  if (status === "offline") return "Waiting for a connection";
  if (status === "error") return "Cloud saving needs attention";
  return "Ready to save";
}

function simplifySubscriptionMessage(message: string) {
  return message
    .replaceAll("subscription entitlements", "subscription")
    .replaceAll("Subscription entitlements", "Subscription")
    .replaceAll("RevenueCat", "Subscriptions");
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const styles = StyleSheet.create({
  heading: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  action: {
    flexGrow: 1,
    minWidth: 140,
  },
});
