import { randomUUID } from "node:crypto";

import { auditEvents, createNeonDatabase } from "@fielddoc/database";

export type AuditEventInput = {
  organizationId: string | null;
  actorUserId?: string | null;
  actorExternalId?: string | null;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  createdAt?: Date;
};

export type AuditEventWriter = {
  record(event: AuditEventInput): Promise<void>;
};

export const noopAuditEventWriter: AuditEventWriter = {
  record: async () => undefined,
};

export function createNeonAuditEventWriter(
  databaseUrl: string | undefined,
  idFactory: () => string = randomUUID,
): AuditEventWriter {
  if (!databaseUrl) return noopAuditEventWriter;

  const db = createNeonDatabase(databaseUrl);

  return {
    async record(event) {
      await db.insert(auditEvents).values({
        id: idFactory(),
        organizationId: event.organizationId,
        actorUserId: event.actorUserId ?? null,
        actorExternalId: event.actorExternalId ?? null,
        eventType: event.eventType,
        entityType: event.entityType ?? null,
        entityId: event.entityId ?? null,
        metadataJson: event.metadata ?? {},
        requestId: event.requestId ?? null,
        createdAt: event.createdAt ?? new Date(),
      });
    },
  };
}

export async function safelyRecordAuditEvent(
  writer: AuditEventWriter | undefined,
  event: AuditEventInput,
): Promise<void> {
  try {
    await (writer ?? noopAuditEventWriter).record(event);
  } catch {
    // Audit writes must not block the user path; failed inserts are surfaced by
    // database monitoring and can be retried through future async workflows.
  }
}

export function getRequestId(request: Request): string | null {
  return (
    request.headers.get("x-vercel-id") ??
    request.headers.get("x-request-id") ??
    null
  );
}
