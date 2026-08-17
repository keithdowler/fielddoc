import { createRevenueCatWebhookHandler } from "./revenuecat-webhook-service";
import { createRevenueCatWebhookRouteDependencies } from "./route-dependencies";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return await createRevenueCatWebhookHandler(
      createRevenueCatWebhookRouteDependencies(),
    )(request);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "RevenueCat webhook could not be processed.";

    return Response.json(
      {
        error: {
          code: "REVENUECAT_WEBHOOK_FAILED",
          message,
        },
      },
      { status: 500 },
    );
  }
}
