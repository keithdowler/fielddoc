import { describe, expect, it } from "vitest";

import { originalEvidenceMetadataSchema } from "./index";

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
