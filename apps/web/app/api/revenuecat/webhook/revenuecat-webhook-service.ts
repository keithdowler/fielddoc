import {
  revenueCatWebhookRequestSchema,
  revenueCatWebhookResponseSchema,
  type RevenueCatWebhookEvent,
  type RevenueCatWebhookResponse,
} from "@fielddoc/validation";

export type RevenueCatWebhookRepository = {
  recordWebhookEvent(
    input: RevenueCatWebhookEventRecord,
  ): Promise<"recorded" | "duplicate">;
  resolveUserMembership(appUserId: string): Promise<{
    organizationId: string;
    userId: string;
  } | null>;
  upsertEntitlement(input: RevenueCatEntitlementRecord): Promise<void>;
};

export type RevenueCatWebhookEventRecord = {
  eventId: string;
  eventType: string;
  appUserId: string;
  productId: string | null;
  entitlementIds: string[];
  payload: Record<string, unknown>;
  receivedAt: Date;
};

export type RevenueCatEntitlementRecord = {
  organizationId: string;
  userId: string;
  providerCustomerId: string;
  entitlementId: string;
  status: "active" | "inactive" | "unknown";
  productId: string | null;
  store: string | null;
  environment: string | null;
  originalTransactionId: string | null;
  purchasedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastEventAt: Date;
  payload: Record<string, unknown>;
};

export type RevenueCatWebhookDependencies = {
  webhookSecret: string | undefined;
  repository: RevenueCatWebhookRepository;
  now?: () => Date;
};

export function createRevenueCatWebhookHandler(
  dependencies: RevenueCatWebhookDependencies,
): (request: Request) => Promise<Response> {
  return async function handleRevenueCatWebhook(request) {
    if (!dependencies.webhookSecret) {
      return errorResponse(
        "REVENUECAT_WEBHOOK_NOT_CONFIGURED",
        "RevenueCat webhook verification is not configured.",
        503,
      );
    }

    if (
      !isAuthorized(
        request.headers.get("authorization"),
        dependencies.webhookSecret,
      )
    ) {
      return errorResponse(
        "UNAUTHORIZED_REVENUECAT_WEBHOOK",
        "RevenueCat webhook authorization failed.",
        401,
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = revenueCatWebhookRequestSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "INVALID_REVENUECAT_WEBHOOK",
        "RevenueCat webhook payload did not match the expected shape.",
        400,
      );
    }

    const now = dependencies.now?.() ?? new Date();
    const event = parsed.data.event;
    const entitlementIds = getEntitlementIds(event);
    const eventRecord: RevenueCatWebhookEventRecord = {
      eventId: event.id,
      eventType: event.type,
      appUserId: event.app_user_id,
      productId: event.product_id ?? null,
      entitlementIds,
      payload: parsed.data as Record<string, unknown>,
      receivedAt: now,
    };

    const eventStatus =
      await dependencies.repository.recordWebhookEvent(eventRecord);

    if (eventStatus === "duplicate") {
      return jsonResponse({
        status: "duplicate",
        eventId: event.id,
        entitlementsApplied: 0,
      });
    }

    const membership = await dependencies.repository.resolveUserMembership(
      event.app_user_id,
    );
    let entitlementsApplied = 0;

    if (membership) {
      await Promise.all(
        entitlementIds.map(async (entitlementId) => {
          await dependencies.repository.upsertEntitlement(
            createEntitlementRecord({
              event,
              entitlementId,
              membership,
              now,
              payload: parsed.data as Record<string, unknown>,
            }),
          );
          entitlementsApplied += 1;
        }),
      );
    }

    return jsonResponse({
      status: "accepted",
      eventId: event.id,
      entitlementsApplied,
    });
  };
}

export function getEntitlementIds(event: RevenueCatWebhookEvent): string[] {
  return Array.from(
    new Set(
      [
        ...(event.entitlement_ids ?? []),
        ...(event.entitlement_id ? [event.entitlement_id] : []),
      ].filter(Boolean),
    ),
  );
}

export function getRevenueCatEntitlementStatus(
  event: RevenueCatWebhookEvent,
  now: Date,
): "active" | "inactive" | "unknown" {
  const expiresAt = toDate(event.expiration_at_ms);
  const explicitlyInactive = new Set([
    "EXPIRATION",
    "REFUND",
    "SUBSCRIPTION_PAUSED",
  ]);

  if (explicitlyInactive.has(event.type)) return "inactive";
  if (expiresAt && expiresAt.getTime() <= now.getTime()) return "inactive";

  return "active";
}

function createEntitlementRecord(input: {
  event: RevenueCatWebhookEvent;
  entitlementId: string;
  membership: { organizationId: string; userId: string };
  now: Date;
  payload: Record<string, unknown>;
}): RevenueCatEntitlementRecord {
  const status = getRevenueCatEntitlementStatus(input.event, input.now);

  return {
    organizationId: input.membership.organizationId,
    userId: input.membership.userId,
    providerCustomerId: input.event.app_user_id,
    entitlementId: input.entitlementId,
    status,
    productId: input.event.product_id ?? null,
    store: input.event.store ?? null,
    environment: input.event.environment ?? null,
    originalTransactionId:
      input.event.original_transaction_id ?? input.event.transaction_id ?? null,
    purchasedAt: toDate(input.event.purchased_at_ms),
    expiresAt: toDate(input.event.expiration_at_ms),
    revokedAt: status === "inactive" ? input.now : null,
    lastEventAt: input.now,
    payload: input.payload,
  };
}

function toDate(value: number | null | undefined): Date | null {
  return typeof value === "number" ? new Date(value) : null;
}

function isAuthorized(
  authorizationHeader: string | null,
  webhookSecret: string,
): boolean {
  return (
    authorizationHeader === webhookSecret ||
    authorizationHeader === `Bearer ${webhookSecret}`
  );
}

function jsonResponse(input: RevenueCatWebhookResponse): Response {
  return Response.json(revenueCatWebhookResponseSchema.parse(input));
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return Response.json({ error: { code, message } }, { status });
}
