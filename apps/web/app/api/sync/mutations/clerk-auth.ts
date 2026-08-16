import { createClerkClient } from "@clerk/backend";

import {
  SyncConfigurationError,
  type SyncAuthResult,
  type SyncMutationAuthVerifier,
} from "./sync-service";

export type ClerkSyncAuthOptions = {
  secretKey: string | undefined;
  publishableKey: string | undefined;
  jwtKey: string | undefined;
  authorizedParties: string[];
};

export function createClerkSyncAuthVerifier(
  options: ClerkSyncAuthOptions,
): SyncMutationAuthVerifier {
  if (!options.secretKey || !options.publishableKey) {
    throw new SyncConfigurationError(
      "SYNC_AUTH_NOT_CONFIGURED",
      "Server auth verification is not configured.",
      501,
    );
  }

  const clerkClient = createClerkClient({
    secretKey: options.secretKey,
    publishableKey: options.publishableKey,
    jwtKey: options.jwtKey,
  });

  return {
    async verify(request): Promise<SyncAuthResult> {
      const requestState = await clerkClient.authenticateRequest(request, {
        acceptsToken: "session_token",
        authorizedParties:
          options.authorizedParties.length > 0
            ? options.authorizedParties
            : undefined,
      });

      if (!requestState.isAuthenticated) {
        return {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Bearer token could not be verified.",
          status: 401,
        };
      }

      const auth = requestState.toAuth();

      if (!auth.orgId) {
        return {
          ok: false,
          code: "ORGANIZATION_REQUIRED",
          message: "An active organization is required to upload mutations.",
          status: 403,
        };
      }

      return {
        ok: true,
        principal: {
          externalAuthId: auth.userId,
          organizationId: auth.orgId,
          organizationRole: auth.orgRole ?? null,
        },
      };
    },
  };
}

export function parseAuthorizedParties(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((party) => party.trim())
    .filter(Boolean);
}
