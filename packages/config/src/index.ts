import { z } from "zod";

const defaultPublicProductName = "Proof Packet";

export const publicAppConfigSchema = z.object({
  productName: z.string().trim().min(1).default(defaultPublicProductName),
});

export type PublicAppConfig = z.infer<typeof publicAppConfigSchema>;

export function resolvePublicProductName(value: string | undefined): string {
  return publicAppConfigSchema.parse({ productName: value || undefined })
    .productName;
}

export const webServerEnvSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().url().optional(),
});

export const publicWebEnvSchema = z.object({
  NEXT_PUBLIC_PRODUCT_NAME: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
});

export const publicMobileEnvSchema = z.object({
  EXPO_PUBLIC_PRODUCT_NAME: z.string().min(1).optional(),
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: z.string().min(1).optional(),
});
