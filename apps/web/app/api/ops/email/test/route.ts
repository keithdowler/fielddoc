import { webServerEnvSchema } from "@fielddoc/config";

import {
  createNeonAuditEventWriter,
  getRequestId,
  safelyRecordAuditEvent,
} from "../../../audit/audit-log";
import { sendResendEmail } from "../../email-delivery";
import {
  operationalAuthErrorResponse,
  OperationalAuthError,
  requireOperationalAuth,
} from "../../operational-auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = webServerEnvSchema.parse(process.env);

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return Response.json(
      {
        error: {
          code: "EMAIL_DELIVERY_NOT_CONFIGURED",
          message: "Set RESEND_API_KEY and RESEND_FROM_EMAIL first.",
        },
      },
      { status: 503 },
    );
  }

  try {
    const context = await requireOperationalAuth(env.DATABASE_URL);

    if (!context.email) {
      return Response.json(
        {
          error: {
            code: "USER_EMAIL_UNAVAILABLE",
            message: "The signed-in Clerk user does not have a primary email.",
          },
        },
        { status: 422 },
      );
    }

    const result = await sendResendEmail({
      apiKey: env.RESEND_API_KEY,
      message: {
        from: env.RESEND_FROM_EMAIL,
        to: [context.email],
        subject: "FieldDoc email delivery test",
        text: "This is a FieldDoc operational readiness test. No customer data was included.",
      },
    });

    await safelyRecordAuditEvent(createNeonAuditEventWriter(env.DATABASE_URL), {
      organizationId: context.organizationId,
      actorUserId: context.userId,
      actorExternalId: context.externalUserId,
      eventType: "ops_email_delivery_test",
      entityType: "Organization",
      entityId: context.organizationId,
      metadata: {
        provider: "resend",
        messageId: result.id,
        recipientDomain: context.email.split("@").at(1) ?? null,
      },
      requestId: getRequestId(request),
    });

    return Response.json({
      status: "sent",
      provider: "resend",
      messageId: result.id,
    });
  } catch (error) {
    if (error instanceof OperationalAuthError) {
      return operationalAuthErrorResponse(error);
    }

    const message =
      error instanceof Error
        ? error.message
        : "Email delivery test could not be completed.";

    return Response.json(
      {
        error: {
          code: "EMAIL_DELIVERY_TEST_FAILED",
          message,
        },
      },
      { status: 502 },
    );
  }
}
