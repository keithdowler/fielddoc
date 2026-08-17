import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
} from "react-native-purchases";
import {
  fieldDocProEntitlementId,
  type SubscriptionEntitlement,
} from "@fielddoc/domain";

import { toRevenueCatState, type RevenueCatState } from "./revenuecat-state";

type RevenueCatActionResult = {
  status: "success" | "failed" | "canceled";
  message: string;
};

type RevenueCatContextInput = {
  isSignedIn: boolean;
  userId: string | null;
};

type RevenueCatContext = RevenueCatState & {
  refresh(): Promise<RevenueCatActionResult>;
  restore(): Promise<RevenueCatActionResult>;
};

const apiKey = getRevenueCatApiKey();
let configuredUserId: string | null = null;

export function useRevenueCatEntitlements({
  isSignedIn,
  userId,
}: RevenueCatContextInput): RevenueCatContext {
  const [entitlements, setEntitlements] = useState<SubscriptionEntitlement[]>(
    [],
  );
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const configure = useCallback(async () => {
    if (!apiKey || !isSignedIn || !userId) return false;

    if (configuredUserId === userId) return true;

    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey, appUserID: userId });
    configuredUserId = userId;

    return true;
  }, [isSignedIn, userId]);

  const refresh = useCallback(async (): Promise<RevenueCatActionResult> => {
    if (!apiKey) {
      return {
        status: "canceled",
        message: "RevenueCat is not configured on this build.",
      };
    }

    if (!isSignedIn || !userId) {
      return {
        status: "canceled",
        message: "Sign in before checking subscription entitlements.",
      };
    }

    setChecking(true);
    setErrorMessage(undefined);

    try {
      await configure();
      const customerInfo = await Purchases.getCustomerInfo();
      setEntitlements(mapCustomerInfoToEntitlements(customerInfo));

      return {
        status: "success",
        message: "Subscription entitlements refreshed.",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Subscription entitlements could not be refreshed.";

      setErrorMessage(message);

      return { status: "failed", message };
    } finally {
      setChecking(false);
    }
  }, [configure, isSignedIn, userId]);

  const restore = useCallback(async (): Promise<RevenueCatActionResult> => {
    if (!apiKey) {
      return {
        status: "canceled",
        message: "RevenueCat is not configured on this build.",
      };
    }

    if (!isSignedIn || !userId) {
      return {
        status: "canceled",
        message: "Sign in before restoring purchases.",
      };
    }

    setChecking(true);
    setErrorMessage(undefined);

    try {
      await configure();
      const customerInfo = await Purchases.restorePurchases();
      setEntitlements(mapCustomerInfoToEntitlements(customerInfo));

      return {
        status: "success",
        message: "Purchases restored from the app store account.",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Purchases could not be restored.";

      setErrorMessage(message);

      return { status: "failed", message };
    } finally {
      setChecking(false);
    }
  }, [configure, isSignedIn, userId]);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      setEntitlements([]);
      setErrorMessage(undefined);

      if (configuredUserId) {
        Purchases.logOut().catch(() => undefined);
        configuredUserId = null;
      }

      return;
    }

    void refresh();
  }, [isSignedIn, refresh, userId]);

  const state = useMemo(
    () =>
      checking
        ? {
            isConfigured: Boolean(apiKey),
            status: "checking" as const,
            entitlements,
            message: "Checking RevenueCat for the active entitlement.",
          }
        : toRevenueCatState({
            isConfigured: Boolean(apiKey),
            isSignedIn,
            entitlements,
            errorMessage,
          }),
    [checking, entitlements, errorMessage, isSignedIn],
  );

  return {
    ...state,
    refresh,
    restore,
  };
}

function getRevenueCatApiKey(): string | undefined {
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || undefined;
  }

  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || undefined;
  }

  return undefined;
}

function mapCustomerInfoToEntitlements(
  customerInfo: CustomerInfo,
): SubscriptionEntitlement[] {
  return Object.values(customerInfo.entitlements.all).map((entitlement) => ({
    entitlementId: entitlement.identifier,
    status: entitlement.isActive ? "active" : "inactive",
    productId: entitlement.productIdentifier,
    expiresAt: entitlement.expirationDate,
    lastCheckedAt: customerInfo.requestDate,
  }));
}

export function hasRevenueCatFieldDocPro(
  entitlements: readonly SubscriptionEntitlement[],
): boolean {
  return entitlements.some(
    (entitlement) =>
      entitlement.entitlementId === fieldDocProEntitlementId &&
      entitlement.status === "active",
  );
}
