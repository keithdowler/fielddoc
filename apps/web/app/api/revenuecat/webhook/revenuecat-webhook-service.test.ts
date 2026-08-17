import { describe, expect, it, vi } from "vitest";

import {
  createRevenueCatWebhookHandler,
  getRevenueCatEntitlementStatus,
  type RevenueCatEntitlementRecord,
  type RevenueCatWebhookEventRecord,
  type RevenueCatWebhookRepository,
} from "./revenuecat-webhook-service";

const now = new Date("2026-08-17T16:00:00.000Z");

describe("createRevenueCatWebhookHandler", () => {
  it("rejects unsigned webhook requests", async () => {
    const response = await createRevenueCatWebhookHandler({
      webhookSecret: "secret",
      repository: createMemoryRepository(),
      now: () => now,
    })(createWebhookRequest({ authorization: "Bearer wrong" }));

    expect(response.status).toBe(401);
  });

  it("stores webhook receipts and applies mapped entitlements", async () => {
    const repository = createMemoryRepository({
      membership: {
        organizationId: "8210f5e3-cf4b-4cdb-ac51-6c0ae2f0588a",
        userId: "4b7c70cc-1deb-4897-b2f5-00db4d1ec806",
      },
    });

    const response = await createRevenueCatWebhookHandler({
      webhookSecret: "secret",
      repository,
      now: () => now,
    })(createWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "accepted",
      eventId: "event_123",
      entitlementsApplied: 1,
    });
    expect(repository.webhookEvents).toHaveLength(1);
    expect(repository.entitlements[0]).toMatchObject({
      entitlementId: "fielddoc_pro",
      providerCustomerId: "user_abc",
      status: "active",
    });
  });

  it("keeps duplicate webhook receipts idempotent", async () => {
    const repository = createMemoryRepository({
      membership: {
        organizationId: "8210f5e3-cf4b-4cdb-ac51-6c0ae2f0588a",
        userId: "4b7c70cc-1deb-4897-b2f5-00db4d1ec806",
      },
    });
    const handler = createRevenueCatWebhookHandler({
      webhookSecret: "secret",
      repository,
      now: () => now,
    });

    await handler(createWebhookRequest());
    const duplicateResponse = await handler(createWebhookRequest());
    const body = await duplicateResponse.json();

    expect(body).toEqual({
      status: "duplicate",
      eventId: "event_123",
      entitlementsApplied: 0,
    });
    expect(repository.entitlements).toHaveLength(1);
  });
});

describe("getRevenueCatEntitlementStatus", () => {
  it("marks expired entitlement events inactive", () => {
    expect(
      getRevenueCatEntitlementStatus(
        {
          id: "event_expired",
          type: "RENEWAL",
          app_user_id: "user_abc",
          expiration_at_ms: Date.parse("2026-08-01T00:00:00.000Z"),
        },
        now,
      ),
    ).toBe("inactive");
  });
});

function createWebhookRequest(input?: { authorization?: string }) {
  return new Request("https://fielddoc.test/api/revenuecat/webhook", {
    method: "POST",
    headers: {
      Authorization: input?.authorization ?? "Bearer secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: {
        id: "event_123",
        type: "INITIAL_PURCHASE",
        app_user_id: "user_abc",
        product_id: "fielddoc_pro_monthly",
        entitlement_ids: ["fielddoc_pro"],
        purchased_at_ms: Date.parse("2026-08-17T15:00:00.000Z"),
        expiration_at_ms: Date.parse("2026-09-17T15:00:00.000Z"),
        store: "APP_STORE",
        environment: "PRODUCTION",
      },
    }),
  });
}

function createMemoryRepository(input?: {
  membership?: { organizationId: string; userId: string };
}): RevenueCatWebhookRepository & {
  webhookEvents: RevenueCatWebhookEventRecord[];
  entitlements: RevenueCatEntitlementRecord[];
} {
  const webhookEvents: RevenueCatWebhookEventRecord[] = [];
  const entitlements: RevenueCatEntitlementRecord[] = [];

  return {
    webhookEvents,
    entitlements,
    recordWebhookEvent: vi.fn(async (event) => {
      if (
        webhookEvents.some(
          (storedEvent) => storedEvent.eventId === event.eventId,
        )
      ) {
        return "duplicate";
      }

      webhookEvents.push(event);
      return "recorded";
    }),
    resolveUserMembership: vi.fn(async () => input?.membership ?? null),
    upsertEntitlement: vi.fn(async (entitlement) => {
      const index = entitlements.findIndex(
        (storedEntitlement) =>
          storedEntitlement.providerCustomerId ===
            entitlement.providerCustomerId &&
          storedEntitlement.entitlementId === entitlement.entitlementId,
      );

      if (index === -1) {
        entitlements.push(entitlement);
        return;
      }

      entitlements[index] = entitlement;
    }),
  };
}
