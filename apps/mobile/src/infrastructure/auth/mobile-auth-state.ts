export type MobileAuthStatus =
  "not_configured" | "loading" | "signed_out" | "signed_in";

export type MobileAuthSnapshot = {
  isConfigured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
};

export function getMobileAuthStatus({
  isConfigured,
  isLoaded,
  isSignedIn,
}: MobileAuthSnapshot): MobileAuthStatus {
  if (!isConfigured) {
    return "not_configured";
  }

  if (!isLoaded) {
    return "loading";
  }

  return isSignedIn ? "signed_in" : "signed_out";
}

export function getMobileAuthStatusCopy(status: MobileAuthStatus) {
  return mobileAuthStatusCopy[status];
}

const mobileAuthStatusCopy = {
  not_configured: {
    tone: "warning",
    title: "Sign-in is temporarily unavailable",
    message:
      "This version of FieldDoc cannot connect to your account. Please update the app or contact support.",
  },
  loading: {
    tone: "info",
    title: "Checking your account",
    message: "FieldDoc is reconnecting to your account.",
  },
  signed_out: {
    tone: "warning",
    title: "Sign in to continue",
    message: "Sign in to keep your work safely saved across devices.",
  },
  signed_in: {
    tone: "success",
    title: "Account connected",
    message:
      "Your work saves automatically whenever a connection is available.",
  },
} as const;
