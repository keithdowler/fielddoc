import { afterEach, describe, expect, it } from "vitest";

import { GET, POST } from "./route";

const originalClerkSecret = process.env.CLERK_SECRET_KEY;
const originalClerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const originalDatabaseUrl = process.env.DATABASE_URL;

const validUpload = {
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
};

describe("/api/sync/mutations", () => {
  afterEach(() => {
    restoreEnv("CLERK_SECRET_KEY", originalClerkSecret);
    restoreEnv(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      originalClerkPublishableKey,
    );
    restoreEnv("DATABASE_URL", originalDatabaseUrl);
  });

  it("describes the contract without requiring credentials", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      status: "mutation-receipt-ready",
      accepts: "POST",
    });
  });

  it("requires bearer authorization before accepting mutation uploads", async () => {
    const response = await POST(
      new Request("https://example.test/api/sync/mutations", {
        method: "POST",
        body: JSON.stringify(validUpload),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects malformed sync mutation uploads", async () => {
    const response = await POST(
      new Request("https://example.test/api/sync/mutations", {
        method: "POST",
        headers: { Authorization: "Bearer token" },
        body: JSON.stringify({ mutations: [] }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_SYNC_MUTATION_UPLOAD");
  });

  it("does not fake persistence when auth is not configured", async () => {
    process.env.CLERK_SECRET_KEY = "";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "";
    process.env.DATABASE_URL = "";

    const response = await postValidUpload();
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body.error.code).toBe("SYNC_AUTH_NOT_CONFIGURED");
  });

  it("does not fake persistence when Neon is not configured", async () => {
    process.env.CLERK_SECRET_KEY = "test-secret";
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_placeholder";
    process.env.DATABASE_URL = "";

    const response = await postValidUpload();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("SYNC_PERSISTENCE_NOT_CONFIGURED");
  });
});

function postValidUpload(): Promise<Response> {
  return POST(
    new Request("https://example.test/api/sync/mutations", {
      method: "POST",
      headers: {
        Authorization: "Bearer token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validUpload),
    }),
  );
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
