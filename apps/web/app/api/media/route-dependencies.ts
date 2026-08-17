import { webServerEnvSchema } from "@fielddoc/config";

import { createNeonAuditEventWriter } from "../audit/audit-log";
import {
  createClerkSyncAuthVerifier,
  parseAuthorizedParties,
} from "../sync/mutations/clerk-auth";
import { MediaConfigurationError } from "./media-service";
import { createNeonMediaUploadRepository } from "./neon-media-repository";
import { createR2PrivateObjectStorage } from "./private-object-storage";

export function createMediaRouteDependencies() {
  const env = webServerEnvSchema.parse(process.env);

  return {
    createAuthVerifier: () =>
      createClerkSyncAuthVerifier({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        jwtKey: env.CLERK_JWT_KEY,
        authorizedParties: parseAuthorizedParties(env.CLERK_AUTHORIZED_PARTIES),
      }),
    createRepository: () => createNeonMediaUploadRepository(env.DATABASE_URL),
    createAuditWriter: () => createNeonAuditEventWriter(env.DATABASE_URL),
    createStorage: () => {
      if (
        !env.R2_ACCOUNT_ID ||
        !env.R2_BUCKET_NAME ||
        !env.R2_ACCESS_KEY_ID ||
        !env.R2_SECRET_ACCESS_KEY
      ) {
        throw new MediaConfigurationError(
          "PRIVATE_OBJECT_STORAGE_NOT_CONFIGURED",
          "Private object storage is not configured.",
          503,
        );
      }

      return createR2PrivateObjectStorage({
        accountId: env.R2_ACCOUNT_ID,
        bucketName: env.R2_BUCKET_NAME,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      });
    },
  };
}
