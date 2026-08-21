import { createClerkClient } from "@clerk/backend";
import { webServerEnvSchema } from "@fielddoc/config";
import {
  annotations,
  auditEvents,
  createNeonDatabase,
  customers,
  documents,
  eq,
  evidenceItems,
  mediaAssets,
  organizationMembers,
  organizations,
  projects,
  receivedLocalMutations,
  reportDrafts,
  reportExports,
  reportShareLinks,
  revenueCatWebhookEvents,
  sites,
  subscriptionEntitlements,
  syncConflicts,
  users,
} from "@fielddoc/database";

import {
  createClerkSyncAuthVerifier,
  parseAuthorizedParties,
} from "../sync/mutations/clerk-auth";
import { createR2PrivateObjectStorage } from "../media/private-object-storage";

export class AccountDeletionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function deleteFieldDocAccount(request: Request) {
  const env = webServerEnvSchema.parse(process.env);
  if (!env.DATABASE_URL) {
    throw new AccountDeletionError(
      "DATABASE_NOT_CONFIGURED",
      "Account deletion is temporarily unavailable. Please contact support.",
      503,
    );
  }
  const verifier = createClerkSyncAuthVerifier({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    jwtKey: env.CLERK_JWT_KEY,
    authorizedParties: parseAuthorizedParties(env.CLERK_AUTHORIZED_PARTIES),
  });
  const auth = await verifier.verify(request);

  if (!auth.ok) {
    throw new AccountDeletionError(auth.code, auth.message, auth.status);
  }

  if (!auth.principal.organizationRole?.includes("admin")) {
    throw new AccountDeletionError(
      "ADMIN_REQUIRED",
      "Only a workspace administrator can delete this account.",
      403,
    );
  }

  const db = createNeonDatabase(env.DATABASE_URL);
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.externalAuthId, auth.principal.organizationId))
    .limit(1);
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.externalAuthId, auth.principal.externalAuthId))
    .limit(1);

  if (!organization || !user) {
    throw new AccountDeletionError(
      "ACCOUNT_NOT_FOUND",
      "The FieldDoc account could not be found.",
      404,
    );
  }

  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organization.id));

  if (members.length !== 1 || members[0]?.userId !== user.id) {
    throw new AccountDeletionError(
      "SHARED_WORKSPACE_REQUIRES_SUPPORT",
      "This workspace has more than one member. Contact support to delete it safely.",
      409,
    );
  }

  const [storedMedia, storedReports, generatedReports] = await Promise.all([
    db
      .select({ key: mediaAssets.storageObjectKey })
      .from(mediaAssets)
      .where(eq(mediaAssets.organizationId, organization.id)),
    db
      .select({ key: reportExports.storageObjectKey })
      .from(reportExports)
      .where(eq(reportExports.organizationId, organization.id)),
    db
      .select({ key: reportDrafts.generatedPdfObjectKey })
      .from(reportDrafts)
      .where(eq(reportDrafts.organizationId, organization.id)),
  ]);
  const objectKeys = [
    ...new Set(
      [...storedMedia, ...storedReports, ...generatedReports]
        .map(({ key }) => key)
        .filter((key): key is string => Boolean(key)),
    ),
  ];

  if (objectKeys.length > 0) {
    if (
      !env.R2_ACCOUNT_ID ||
      !env.R2_BUCKET_NAME ||
      !env.R2_ACCESS_KEY_ID ||
      !env.R2_SECRET_ACCESS_KEY
    ) {
      throw new AccountDeletionError(
        "STORAGE_NOT_CONFIGURED",
        "Private file storage is unavailable. Please contact support.",
        503,
      );
    }
    const storage = createR2PrivateObjectStorage({
      accountId: env.R2_ACCOUNT_ID,
      bucketName: env.R2_BUCKET_NAME,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });
    await Promise.all(objectKeys.map((key) => storage.deleteObject(key)));
  }

  await db
    .delete(syncConflicts)
    .where(eq(syncConflicts.organizationId, organization.id));
  await db
    .delete(reportShareLinks)
    .where(eq(reportShareLinks.organizationId, organization.id));
  await db
    .delete(reportExports)
    .where(eq(reportExports.organizationId, organization.id));
  await db
    .delete(annotations)
    .where(eq(annotations.organizationId, organization.id));
  await db
    .delete(documents)
    .where(eq(documents.organizationId, organization.id));
  await db
    .delete(mediaAssets)
    .where(eq(mediaAssets.organizationId, organization.id));
  await db
    .delete(evidenceItems)
    .where(eq(evidenceItems.organizationId, organization.id));
  await db
    .delete(reportDrafts)
    .where(eq(reportDrafts.organizationId, organization.id));
  await db
    .delete(receivedLocalMutations)
    .where(eq(receivedLocalMutations.organizationId, organization.id));
  await db.delete(projects).where(eq(projects.organizationId, organization.id));
  await db.delete(sites).where(eq(sites.organizationId, organization.id));
  await db
    .delete(customers)
    .where(eq(customers.organizationId, organization.id));
  await db
    .delete(subscriptionEntitlements)
    .where(eq(subscriptionEntitlements.organizationId, organization.id));
  await db
    .delete(auditEvents)
    .where(eq(auditEvents.organizationId, organization.id));
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.organizationId, organization.id));
  await db
    .delete(revenueCatWebhookEvents)
    .where(
      eq(revenueCatWebhookEvents.appUserId, auth.principal.externalAuthId),
    );
  await db.delete(organizations).where(eq(organizations.id, organization.id));
  await db.delete(users).where(eq(users.id, user.id));

  const clerk = createClerkClient({
    secretKey: env.CLERK_SECRET_KEY,
    publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
  await clerk.organizations.deleteOrganization(auth.principal.organizationId);
  await clerk.users.deleteUser(auth.principal.externalAuthId);
}
