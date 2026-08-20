import { webServerEnvSchema } from "@fielddoc/config";

import {
  createNeonAuditEventWriter,
  getRequestId,
  safelyRecordAuditEvent,
} from "../../../audit/audit-log";
import { sendSentryEvent } from "../../error-reporting";
import {
  operationalAuthErrorResponse,
  OperationalAuthError,
  requireOperationalAuth,
} from "../../operational-auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = webServerEnvSchema.parse(process.env);

  if (!env.SENTRY_DSN) {
    return Response.json(
      {
        error: {
          code: "ERROR_REPORTING_NOT_CONFIGURED",
          message: "Set SENTRY_DSN before running the error reporting test.",
        },
      },
      { status: 503 },
    );
  }

  try {
    const context = await requireOperationalAuth(env.DATABASE_URL);
    const result = await sendSentryEvent({
      dsn: env.SENTRY_DSN,
      message: "Proof Packet server-side error reporting readiness test",
      environment: process.env.VERCEL_ENV ?? "development",
      tags: {
        provider: "sentry",
        check: "readiness",
      },
      extra: {
        organizationId: context.organizationId,
        externalOrganizationId: context.externalOrganizationId,
      },
    });

    await safelyRecordAuditEvent(createNeonAuditEventWriter(env.DATABASE_URL), {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      actorExternalId: context.externalUserId,
      eventType: "ops_error_reporting_test",
      entityType: "Organization",
      entityId: context.organizationId,
      metadata: {
        provider: "sentry",
        sentryEventId: result.eventId,
      },
      requestId: getRequestId(request),
    });

    return Response.json({
      status: "sent",
      provider: "sentry",
      eventId: result.eventId,
    });
  } catch (error) {
    if (error instanceof OperationalAuthError) {
      return operationalAuthErrorResponse(error);
    }

    const message =
      error instanceof Error
        ? error.message
        : "Error reporting test could not be completed.";

    return Response.json(
      {
        error: {
          code: "ERROR_REPORTING_TEST_FAILED",
          message,
        },
      },
      { status: 502 },
    );
  }
}
