import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import {
  getMobileAuthStatus,
  type MobileAuthStatus,
} from "./mobile-auth-state";

type MobileAuthActionResult = {
  status: "success" | "canceled" | "failed";
  message: string;
};

type MobileAuthContextValue = {
  isConfigured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  status: MobileAuthStatus;
  getAccessToken(): Promise<string | null>;
  signOut(): Promise<MobileAuthActionResult>;
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const notConfiguredAuth: MobileAuthContextValue = {
  isConfigured: false,
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  status: "not_configured",
  async getAccessToken() {
    return null;
  },
  async signOut() {
    return {
      status: "canceled",
      message: "Cloud auth is not configured.",
    };
  },
};

const MobileAuthContext =
  createContext<MobileAuthContextValue>(notConfiguredAuth);

export function MobileAuthProvider({ children }: PropsWithChildren) {
  if (!publishableKey) {
    return (
      <MobileAuthContext.Provider value={notConfiguredAuth}>
        {children}
      </MobileAuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkMobileAuthBridge>{children}</ClerkMobileAuthBridge>
    </ClerkProvider>
  );
}

export function useMobileAuth() {
  return useContext(MobileAuthContext);
}

function ClerkMobileAuthBridge({ children }: PropsWithChildren) {
  const { getToken, isLoaded, isSignedIn, signOut, userId } = useAuth();

  const getAccessToken = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      return null;
    }

    return await getToken();
  }, [getToken, isLoaded, isSignedIn]);

  const startSignOut =
    useCallback(async (): Promise<MobileAuthActionResult> => {
      try {
        await signOut();

        return {
          status: "success",
          message: "Cloud session ended on this device.",
        };
      } catch (error) {
        return {
          status: "failed",
          message:
            error instanceof Error
              ? error.message
              : "Cloud sign-out could not be completed.",
        };
      }
    }, [signOut]);

  const value = useMemo<MobileAuthContextValue>(
    () => ({
      isConfigured: true,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
      status: getMobileAuthStatus({
        isConfigured: true,
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
      }),
      getAccessToken,
      signOut: startSignOut,
    }),
    [getAccessToken, isLoaded, isSignedIn, startSignOut, userId],
  );

  return (
    <MobileAuthContext.Provider value={value}>
      {children}
    </MobileAuthContext.Provider>
  );
}
