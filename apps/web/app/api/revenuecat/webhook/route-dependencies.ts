import { webServerEnvSchema } from "@fielddoc/config";

import { createNeonRevenueCatWebhookRepository } from "./neon-revenuecat-repository";

export function createRevenueCatWebhookRouteDependencies() {
  const env = webServerEnvSchema.parse(process.env);

  return {
    webhookSecret: env.REVENUECAT_WEBHOOK_SECRET,
    repository: createNeonRevenueCatWebhookRepository(env.DATABASE_URL),
  };
}
