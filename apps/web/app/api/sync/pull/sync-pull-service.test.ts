import { describe, expect, it } from "vitest";

import type {
  SyncAuthPrincipal,
  SyncAuthResult,
} from "../mutations/sync-service";
import {
  createSyncPullPostHandler,
  type PullChangesInput,
  type SyncPullPersistence,
} from "./sync-pull-service";
import type { AuditEventInput } from "../../audit/audit-log";

const principal: SyncAuthPrincipal = {
  externalAuthId: "user_123",
  organizationId: "9b48b114-8efc-4c69-8dcc-e0c1a1d2ad8c",
  organizationRole: "org:admin",
};

const membership = {
  organizationId: "9b48b114-8efc-4c69-8dcc-e0c1a1d2ad8c",
  userId: "ba2ac61a-68df-4b46-9191-55ef29e27fd2",
  role: "admin",
};

const mobilePrincipalWithoutWorkspace: SyncAuthPrincipal = {
  externalAuthId: "user_123",
  organizationId: null,
  organizationRole: null,
};

const validPull = {
  clientId: "fielddoc-mobile",
  deviceId: "simulator-17-pro",
  cursor: null,
  limit: 250,
};

describe("createSyncPullPostHandler", () => {
  it("returns tenant-scoped canonical changes after auth and membership checks", async () => {
    const pulls: PullChangesInput[] = [];
    const auditEvents: AuditEventInput[] = [];
    const handler = createTestHandler({
      auditEvents,
      persistence: {
        resolveMembership: async () => membership,
        pullChanges: async (input) => {
          pulls.push(input);
          return {
            cursor: "2026-08-17T15:00:00.000Z",
            hasMore: false,
            changes: {
              projects: [
                {
                  id: "11111111-1111-4111-8111-111111111111",
                  customerId: null,
                  siteId: null,
                  name: "Synced project",
                  customerCompany: null,
                  siteAddress: null,
                  workOrderReference: null,
                  scheduledDate: null,
                  notes: null,
                  status: "active",
                  archivedAt: null,
                  createdAt: "2026-08-17T14:00:00.000Z",
                  updatedAt: "2026-08-17T15:00:00.000Z",
                  deletedAt: null,
                  serverVersion: 1,
                },
              ],
              evidenceItems: [],
              mediaAssets: [],
              annotations: [],
              documents: [],
              reportDrafts: [],
            },
          };
        },
      },
    });

    const response = await handler(createRequest(validPull));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      serverTime: "2026-08-17T15:01:00.000Z",
      cursor: "2026-08-17T15:00:00.000Z",
      hasMore: false,
    });
    expect(body.changes.projects[0].name).toBe("Synced project");
    expect(pulls[0]).toMatchObject({
      membership,
      cursor: null,
      limit: 250,
    });
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        organizationId: membership.organizationId,
        actorUserId: membership.userId,
        actorExternalId: principal.externalAuthId,
        eventType: "sync_pull",
        entityType: "SyncCursor",
        entityId: "simulator-17-pro",
        metadata: expect.objectContaining({
          clientId: "fielddoc-mobile",
          deviceId: "simulator-17-pro",
          pulledCount: 1,
        }),
      }),
    );
  });

  it("uses the resolved membership when mobile auth has no active workspace", async () => {
    const pulls: PullChangesInput[] = [];
    const handler = createTestHandler({
      auth: { ok: true, principal: mobilePrincipalWithoutWorkspace },
      persistence: {
        resolveMembership: async () => membership,
        pullChanges: async (input) => {
          pulls.push(input);
          return {
            cursor: null,
            hasMore: false,
            changes: emptyChanges(),
          };
        },
      },
    });

    const response = await handler(createRequest(validPull));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.changes).toEqual(emptyChanges());
    expect(pulls[0]?.membership).toEqual(membership);
  });

  it("explains when mobile auth has no workspace membership", async () => {
    const handler = createTestHandler({
      auth: { ok: true, principal: mobilePrincipalWithoutWorkspace },
      persistence: {
        resolveMembership: async () => ({ status: "workspace_not_found" }),
        pullChanges: async () => ({
          cursor: null,
          hasMore: false,
          changes: emptyChanges(),
        }),
      },
    });

    const response = await handler(createRequest(validPull));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toEqual({
      code: "WORKSPACE_NOT_FOUND",
      message:
        "We could not find your FieldDoc workspace. Sign out and sign in again, then try saving.",
    });
  });

  it("asks mobile users with multiple memberships to choose a workspace", async () => {
    const handler = createTestHandler({
      auth: { ok: true, principal: mobilePrincipalWithoutWorkspace },
      persistence: {
        resolveMembership: async () => ({
          status: "workspace_choice_required",
        }),
        pullChanges: async () => ({
          cursor: null,
          hasMore: false,
          changes: emptyChanges(),
        }),
      },
    });

    const response = await handler(createRequest(validPull));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toEqual({
      code: "WORKSPACE_CHOICE_REQUIRED",
      message:
        "This account has more than one FieldDoc workspace. Choose a workspace, then try again.",
    });
  });

  it("requires server-side organization membership", async () => {
    const handler = createTestHandler({
      persistence: {
        resolveMembership: async () => null,
        pullChanges: async () => ({
          cursor: null,
          hasMore: false,
          changes: emptyChanges(),
        }),
      },
    });

    const response = await handler(createRequest(validPull));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("ORGANIZATION_MEMBERSHIP_REQUIRED");
    expect(body.error.message).toBe(
      "This account is not set up for the selected FieldDoc workspace.",
    );
  });
});

function createTestHandler(
  options: {
    auth?: SyncAuthResult;
    persistence?: SyncPullPersistence;
    auditEvents?: AuditEventInput[];
  } = {},
) {
  return createSyncPullPostHandler({
    createAuthVerifier: () => ({
      verify: async () => options.auth ?? { ok: true, principal },
    }),
    createPersistence: () =>
      options.persistence ?? {
        resolveMembership: async () => membership,
        pullChanges: async () => ({
          cursor: null,
          hasMore: false,
          changes: emptyChanges(),
        }),
      },
    createAuditWriter: () => ({
      record: async (event: AuditEventInput) => {
        options.auditEvents?.push(event);
      },
    }),
    now: () => new Date("2026-08-17T15:01:00.000Z"),
  });
}

function createRequest(body: unknown): Request {
  return new Request("https://example.test/api/sync/pull", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function emptyChanges() {
  return {
    projects: [],
    evidenceItems: [],
    mediaAssets: [],
    annotations: [],
    documents: [],
    reportDrafts: [],
  };
}
