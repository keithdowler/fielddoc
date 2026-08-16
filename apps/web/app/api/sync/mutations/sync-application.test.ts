import { describe, expect, it } from "vitest";

import {
  applyCanonicalMutation,
  type CanonicalMutationRepository,
} from "./sync-application";
import type { SyncMembership } from "./sync-service";

const membership: SyncMembership = {
  organizationId: "9b48b114-8efc-4c69-8dcc-e0c1a1d2ad8c",
  userId: "ba2ac61a-68df-4b46-9191-55ef29e27fd2",
  role: "admin",
};

const projectPayload = {
  id: "3f205a6f-3f5f-4f85-baba-f1dac348273a",
  customerId: null,
  siteId: null,
  name: "Unit 12 turnover",
  customerCompany: "Rivergate",
  siteAddress: "12 River Road",
  workOrderReference: null,
  scheduledDate: null,
  notes: null,
  status: "active",
  createdAt: "2026-08-16T14:00:00.000Z",
  updatedAt: "2026-08-16T14:00:00.000Z",
  archivedAt: null,
  deletedAt: null,
  syncState: "PENDING",
};

describe("applyCanonicalMutation", () => {
  it("applies project create mutations to canonical storage", async () => {
    const calls: unknown[] = [];
    const result = await applyCanonicalMutation(
      {
        membership,
        mutation: {
          mutationId: "project:3f205a6f-3f5f-4f85-baba-f1dac348273a:create:v1",
          entityType: "Project",
          entityId: projectPayload.id,
          operation: "CREATE",
          payloadRef: projectPayload.updatedAt,
          payloadJson: projectPayload,
          createdAt: projectPayload.createdAt,
          attemptCount: 0,
          syncState: "PENDING",
        },
      },
      createRepository({
        upsertProject: async (input) => {
          calls.push(input);
        },
      }),
    );

    expect(result).toEqual({ status: "applied" });
    expect(calls).toMatchObject([
      {
        organizationId: membership.organizationId,
        payload: {
          id: projectPayload.id,
          name: projectPayload.name,
          customerCompany: projectPayload.customerCompany,
          status: projectPayload.status,
        },
      },
    ]);
  });

  it("applies project archive mutations as state changes", async () => {
    const calls: unknown[] = [];
    const archivedAt = "2026-08-16T14:10:00.000Z";

    const result = await applyCanonicalMutation(
      {
        membership,
        mutation: {
          mutationId: "project:3f205a6f-3f5f-4f85-baba-f1dac348273a:archive:v1",
          entityType: "Project",
          entityId: projectPayload.id,
          operation: "ARCHIVE",
          payloadRef: archivedAt,
          payloadJson: {
            id: projectPayload.id,
            status: "archived",
            archivedAt,
          },
          createdAt: archivedAt,
          attemptCount: 0,
          syncState: "PENDING",
        },
      },
      createRepository({
        archiveProject: async (input) => {
          calls.push(input);
        },
      }),
    );

    expect(result).toEqual({ status: "applied" });
    expect(calls).toEqual([
      {
        organizationId: membership.organizationId,
        id: projectPayload.id,
        changedAt: archivedAt,
      },
    ]);
  });

  it("rejects unsupported canonical entity application", async () => {
    const result = await applyCanonicalMutation(
      {
        membership,
        mutation: {
          mutationId: "customer:3f205a6f-3f5f-4f85-baba-f1dac348273a:create:v1",
          entityType: "Customer",
          entityId: projectPayload.id,
          operation: "CREATE",
          payloadRef: projectPayload.updatedAt,
          payloadJson: { id: projectPayload.id },
          createdAt: projectPayload.createdAt,
          attemptCount: 0,
          syncState: "PENDING",
        },
      },
      createRepository(),
    );

    expect(result).toEqual({
      status: "rejected",
      code: "CANONICAL_ENTITY_NOT_SUPPORTED",
      message: "Customer sync application is not implemented yet.",
    });
  });

  it("rejects invalid payloads without calling persistence", async () => {
    const calls: unknown[] = [];
    const result = await applyCanonicalMutation(
      {
        membership,
        mutation: {
          mutationId: "project:3f205a6f-3f5f-4f85-baba-f1dac348273a:create:v1",
          entityType: "Project",
          entityId: projectPayload.id,
          operation: "CREATE",
          payloadRef: projectPayload.updatedAt,
          payloadJson: { ...projectPayload, name: "" },
          createdAt: projectPayload.createdAt,
          attemptCount: 0,
          syncState: "PENDING",
        },
      },
      createRepository({
        upsertProject: async (input) => {
          calls.push(input);
        },
      }),
    );

    expect(result).toEqual({
      status: "rejected",
      code: "INVALID_CANONICAL_PAYLOAD",
      message: "Mutation payload cannot be applied to the canonical model.",
    });
    expect(calls).toEqual([]);
  });
});

function createRepository(
  overrides: Partial<CanonicalMutationRepository> = {},
): CanonicalMutationRepository {
  return {
    upsertProject: async () => undefined,
    archiveProject: async () => undefined,
    deleteProject: async () => undefined,
    upsertEvidenceItem: async () => undefined,
    deleteEvidenceItem: async () => undefined,
    upsertMediaAsset: async () => undefined,
    deleteMediaAsset: async () => undefined,
    upsertAnnotation: async () => undefined,
    deleteAnnotation: async () => undefined,
    upsertReportDraft: async () => undefined,
    deleteReportDraft: async () => undefined,
    ...overrides,
  };
}
