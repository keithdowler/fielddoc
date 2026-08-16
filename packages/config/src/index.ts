import { z } from "zod";

const defaultPublicProductName = "Proof Packet";
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

export const publicAppConfigSchema = z.object({
  productName: z.string().trim().min(1).default(defaultPublicProductName),
});

export type PublicAppConfig = z.infer<typeof publicAppConfigSchema>;

export function resolvePublicProductName(value: string | undefined): string {
  return publicAppConfigSchema.parse({ productName: value || undefined })
    .productName;
}

export const webServerEnvSchema = z.object({
  CLERK_SECRET_KEY: optionalSecret,
  CLERK_JWT_KEY: optionalSecret,
  CLERK_AUTHORIZED_PARTIES: optionalSecret,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: optionalSecret,
  DATABASE_URL: optionalUrl,
  R2_ACCOUNT_ID: optionalSecret,
  R2_ACCESS_KEY_ID: optionalSecret,
  R2_SECRET_ACCESS_KEY: optionalSecret,
  R2_BUCKET_NAME: optionalSecret,
  REVENUECAT_WEBHOOK_SECRET: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  SENTRY_DSN: optionalUrl,
});

export const publicWebEnvSchema = z.object({
  NEXT_PUBLIC_PRODUCT_NAME: optionalSecret,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: optionalSecret,
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: optionalSecret,
  NEXT_PUBLIC_POSTHOG_KEY: optionalSecret,
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
});

export const publicMobileEnvSchema = z.object({
  EXPO_PUBLIC_PRODUCT_NAME: optionalSecret,
  EXPO_PUBLIC_FIELDDOC_API_BASE_URL: optionalUrl,
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: optionalSecret,
});
