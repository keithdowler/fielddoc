import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

import { useMobileAuth } from "@/infrastructure/auth/mobile-auth";
import { getLocalRepositories } from "@/infrastructure/local-store/repositories";

import { runMobileCloudSync } from "./mobile-cloud-sync";
import { runMobilePullSync } from "./mobile-pull-sync";
import { subscribeToAutomaticSync } from "./sync-events";

export type AutomaticSyncStatus =
  "waiting" | "saving" | "saved" | "offline" | "error";

type AutomaticSyncContextValue = {
  status: AutomaticSyncStatus;
  message: string;
  lastSavedAt: string | null;
  syncNow(): Promise<void>;
};

const AutomaticSyncContext = createContext<AutomaticSyncContextValue>({
  status: "waiting",
  message: "Sign in to save your work across devices.",
  lastSavedAt: null,
  async syncNow() {},
});

export function AutomaticCloudSyncProvider({ children }: PropsWithChildren) {
  const auth = useMobileAuth();
  const [status, setStatus] = useState<AutomaticSyncStatus>("waiting");
  const [message, setMessage] = useState(
    "Sign in to save your work across devices.",
  );
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const running = useRef(false);
  const queued = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const syncNow = useCallback(async () => {
    if (!auth.isSignedIn) {
      setStatus("waiting");
      setMessage("Sign in to save your work across devices.");
      return;
    }

    if (running.current) {
      queued.current = true;
      return;
    }

    running.current = true;
    setStatus("saving");
    setMessage("Saving your latest changes...");

    try {
      const repositories = await getLocalRepositories();
      const tokenProvider = { getAccessToken: auth.getAccessToken };
      const upload = await runMobileCloudSync({ repositories, tokenProvider });
      const pull = await runMobilePullSync({ repositories, tokenProvider });

      if (upload.status === "failed" || pull.status === "failed") {
        setStatus("offline");
        setMessage(
          "Saved on this device. FieldDoc will try the cloud again automatically.",
        );
      } else if (
        upload.status === "not_configured" ||
        pull.status === "not_configured"
      ) {
        setStatus("error");
        setMessage(
          "Cloud saving is unavailable in this version. Please contact support.",
        );
      } else {
        const savedAt = new Date().toISOString();
        setStatus("saved");
        setMessage("All changes saved.");
        setLastSavedAt(savedAt);
      }
    } catch {
      setStatus("offline");
      setMessage(
        "Saved on this device. FieldDoc will try the cloud again automatically.",
      );
    } finally {
      running.current = false;
      if (queued.current) {
        queued.current = false;
        void syncNow();
      }
    }
  }, [auth.getAccessToken, auth.isSignedIn]);

  const scheduleSync = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => void syncNow(), 750);
  }, [syncNow]);

  useEffect(() => subscribeToAutomaticSync(scheduleSync), [scheduleSync]);

  useEffect(() => {
    if (auth.isSignedIn) void syncNow();
  }, [auth.isSignedIn, syncNow]);

  useEffect(() => {
    const interval = setInterval(() => void syncNow(), 30_000);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void syncNow();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [syncNow]);

  const value = useMemo(
    () => ({ status, message, lastSavedAt, syncNow }),
    [lastSavedAt, message, status, syncNow],
  );

  return (
    <AutomaticSyncContext.Provider value={value}>
      {children}
    </AutomaticSyncContext.Provider>
  );
}

export function useAutomaticCloudSync() {
  return useContext(AutomaticSyncContext);
}
