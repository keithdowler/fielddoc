import { describe, expect, it } from "vitest";

import {
  originalEvidenceMetadataSchema,
  syncMutationUploadRequestSchema,
  syncMutationUploadResponseSchema,
} from "./index";

describe("originalEvidenceMetadataSchema", () => {
  it("accepts immutable original evidence metadata", () => {
    const parsed = originalEvidenceMetadataSchema.parse({
      id: "4b7c70cc-1deb-4897-b2f5-00db4d1ec806",
      projectId: "8210f5e3-cf4b-4cdb-ac51-6c0ae2f0588a",
      category: "BEFORE",
      capturedAt: "2026-08-12T20:00:00.000Z",
      clientCreatedAt: "2026-08-12T20:00:01.000Z",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      sha256: "a".repeat(64),
      sourceType: "CAMERA_PHOTO",
    });

    expect(parsed.category).toBe("BEFORE");
  });
});

describe("sync mutation schemas", () => {
  it("validates a sync mutation upload request", () => {
    const parsed = syncMutationUploadRequestSchema.parse({
      clientId: "ios-app",
      deviceId: "simulator-17-pro",
      sentAt: "2026-08-15T15:00:00.000Z",
      mutations: [
        {
          mutationId: "project:3f205a6f-3f5f-4f85-baba-f1dac348273a:create:v1",
          entityType: "Project",
          entityId: "3f205a6f-3f5f-4f85-baba-f1dac348273a",
          operation: "CREATE",
          payloadRef: "2026-08-15T14:59:00.000Z",
          payloadJson: { name: "Unit 12 turnover" },
          createdAt: "2026-08-15T14:59:00.000Z",
          attemptCount: 0,
          syncState: "PENDING",
        },
      ],
    });

    expect(parsed.mutations[0]?.entityType).toBe("Project");
  });

  it("rejects malformed sync mutation uploads", () => {
    const result = syncMutationUploadRequestSchema.safeParse({
      clientId: "ios-app",
      deviceId: "simulator-17-pro",
      sentAt: "2026-08-15T15:00:00.000Z",
      mutations: [
        {
          mutationId: "bad",
          entityType: "Invoice",
          entityId: "not-a-uuid",
          operation: "CREATE",
          payloadRef: "v1",
          payloadJson: {},
          createdAt: "2026-08-15T14:59:00.000Z",
          attemptCount: 0,
          syncState: "PENDING",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("validates sync mutation upload responses", () => {
    const parsed = syncMutationUploadResponseSchema.parse({
      serverTime: "2026-08-15T15:00:01.000Z",
      acceptedMutationIds: ["mutation-1"],
      duplicateMutationIds: [],
      rejectedMutations: [],
      pullCursor: null,
    });

    expect(parsed.acceptedMutationIds).toEqual(["mutation-1"]);
  });
});
