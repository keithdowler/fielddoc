import {
  fieldDocProEntitlementId,
  hasActiveFieldDocProEntitlement,
  type SubscriptionEntitlement,
} from "@fielddoc/domain";

export type RevenueCatStatus =
  | "not_configured"
  | "signed_out"
  | "checking"
  | "active"
  | "inactive"
  | "failed";

export type RevenueCatState = {
  isConfigured: boolean;
  status: RevenueCatStatus;
  entitlements: SubscriptionEntitlement[];
  message: string;
};

export function getRevenueCatStatusCopy(state: RevenueCatState): {
  tone: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
} {
  if (state.status === "active") {
    return {
      tone: "success",
      title: "Subscription active",
      message: state.message,
    };
  }

  if (state.status === "inactive") {
    return {
      tone: "warning",
      title: "Subscription required",
      message: state.message,
    };
  }

  if (state.status === "failed") {
    return {
      tone: "error",
      title: "Subscription check failed",
      message: state.message,
    };
  }

  if (state.status === "checking") {
    return {
      tone: "info",
      title: "Checking subscription",
      message: state.message,
    };
  }

  return {
    tone: "warning",
    title:
      state.status === "signed_out"
        ? "Sign in required"
        : "RevenueCat not configured",
    message: state.message,
  };
}

export function toRevenueCatState(input: {
  isConfigured: boolean;
  isSignedIn: boolean;
  entitlements: SubscriptionEntitlement[];
  errorMessage?: string;
  nowIso?: string;
}): RevenueCatState {
  if (!input.isConfigured) {
    return {
      isConfigured: false,
      status: "not_configured",
      entitlements: [],
      message:
        "Subscriptions are unavailable in this version. Please contact support.",
    };
  }

  if (!input.isSignedIn) {
    return {
      isConfigured: true,
      status: "signed_out",
      entitlements: [],
      message: "Sign in to check your subscription.",
    };
  }

  if (input.errorMessage) {
    return {
      isConfigured: true,
      status: "failed",
      entitlements: input.entitlements,
      message: input.errorMessage,
    };
  }

  if (
    hasActiveFieldDocProEntitlement(
      input.entitlements,
      input.nowIso ?? new Date().toISOString(),
    )
  ) {
    return {
      isConfigured: true,
      status: "active",
      entitlements: input.entitlements,
      message: `${fieldDocProEntitlementId} is active on this device.`,
    };
  }

  return {
    isConfigured: true,
    status: "inactive",
    entitlements: input.entitlements,
    message:
      "Cloud sync, private media archive, and report PDF archive require an active subscription.",
  };
}
