export type AutomaticSyncStatus =
  "waiting" | "saving" | "saved" | "offline" | "error";

export type AutomaticSyncSummary = {
  status: AutomaticSyncStatus;
  message: string;
};

export type AutomaticCloudSyncResultLike = {
  status:
    | "not_configured"
    | "auth_required"
    | "idle"
    | "success"
    | "partial"
    | "failed";
  message: string;
};

export function summarizeAutomaticCloudSyncResults(
  upload: AutomaticCloudSyncResultLike,
  pull: AutomaticCloudSyncResultLike,
): AutomaticSyncSummary {
  const results = [upload, pull];

  const authRequired = results.find(
    (result) => result.status === "auth_required",
  );
  if (authRequired) {
    return {
      status: "waiting",
      message:
        authRequired.message || "Sign in to save your work across devices.",
    };
  }

  const notConfigured = results.find(
    (result) => result.status === "not_configured",
  );
  if (notConfigured) {
    return {
      status: "error",
      message:
        "This version cannot connect to FieldDoc cloud. Install the latest TestFlight build, then try again.",
    };
  }

  const failed = results.find((result) => result.status === "failed");
  if (failed) {
    return {
      status: "error",
      message: createUserSafeSyncFailureMessage(failed.message),
    };
  }

  const partial = results.find((result) => result.status === "partial");
  if (partial) {
    return {
      status: "error",
      message: createUserSafeSyncFailureMessage(partial.message),
    };
  }

  return { status: "saved", message: "All changes saved." };
}

export function createAutomaticSyncExceptionSummary(): AutomaticSyncSummary {
  return {
    status: "error",
    message:
      "FieldDoc could not save to the cloud yet. Your work is safe on this device. Tap Try Again.",
  };
}

function createUserSafeSyncFailureMessage(message: string) {
  const trimmed = message.trim();
  const normalized = trimmed.toLowerCase();

  if (normalized.includes("unauthorized") || normalized.includes("401")) {
    return "Please sign out and sign back in, then try saving again.";
  }

  if (normalized.includes("forbidden") || normalized.includes("403")) {
    return "Your account is connected, but FieldDoc could not save to this workspace. Contact support.";
  }

  if (normalized.includes("subscription")) {
    return (
      trimmed || "A FieldDoc Pro subscription is required for cloud saving."
    );
  }

  if (trimmed) {
    return `${trimmed} Your work is safe on this device.`;
  }

  return "FieldDoc could not save to the cloud yet. Your work is safe on this device. Tap Try Again.";
}
