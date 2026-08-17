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
    title: "Cloud auth not configured",
    message: "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to enable mobile sign-in.",
  },
  loading: {
    tone: "info",
    title: "Checking cloud session",
    message: "Proof Packet is checking for a saved cloud session.",
  },
  signed_out: {
    tone: "warning",
    title: "Cloud sign-in required",
    message: "Sign in before uploading metadata or original media.",
  },
  signed_in: {
    tone: "success",
    title: "Cloud account connected",
    message: "Metadata sync and original media uploads can use your session.",
  },
} as const;
