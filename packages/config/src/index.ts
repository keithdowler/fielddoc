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
  NEXT_PUBLIC_PRIVACY_POLICY_URL: optionalUrl,
  NEXT_PUBLIC_TERMS_URL: optionalUrl,
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
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: optionalSecret,
  EXPO_PUBLIC_PRIVACY_POLICY_URL: optionalUrl,
  EXPO_PUBLIC_TERMS_URL: optionalUrl,
  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: optionalSecret,
  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: optionalSecret,
});

export type WebProductionReadinessRequirement = {
  id: string;
  label: string;
  detail: string;
  requiredFor: string;
  variableNames: readonly string[];
};

export type WebProductionReadinessCheck = WebProductionReadinessRequirement & {
  ready: boolean;
  missingVariableNames: string[];
};

export const webProductionReadinessRequirements = [
  {
    id: "web_auth",
    label: "Web authentication",
    detail:
      "Required before the Vercel app can protect organization workspace routes.",
    requiredFor: "Production web login",
    variableNames: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
  },
  {
    id: "database",
    label: "Neon database",
    detail:
      "Required before synced metadata, tenant provisioning, audit events, and reports can persist.",
    requiredFor: "Cloud metadata",
    variableNames: ["DATABASE_URL"],
  },
  {
    id: "private_storage",
    label: "Private object storage",
    detail:
      "Required before originals and generated PDFs can leave device storage.",
    requiredFor: "Media and report uploads",
    variableNames: [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ],
  },
  {
    id: "revenuecat",
    label: "RevenueCat webhook",
    detail:
      "Required before subscription entitlements can be trusted server-side.",
    requiredFor: "Paid cloud gates",
    variableNames: ["REVENUECAT_WEBHOOK_SECRET"],
  },
  {
    id: "email",
    label: "Email delivery",
    detail: "Required before sending report links or account email flows.",
    requiredFor: "Customer delivery",
    variableNames: ["RESEND_API_KEY"],
  },
  {
    id: "error_reporting",
    label: "Error reporting",
    detail: "Required before broad beta or App Store launch.",
    requiredFor: "Production support",
    variableNames: ["SENTRY_DSN"],
  },
  {
    id: "legal_urls",
    label: "Legal URLs",
    detail:
      "Required before App Store submission and customer-facing account flows.",
    requiredFor: "App Store readiness",
    variableNames: ["NEXT_PUBLIC_PRIVACY_POLICY_URL", "NEXT_PUBLIC_TERMS_URL"],
  },
] as const satisfies readonly WebProductionReadinessRequirement[];

type EnvironmentLike = Record<string, string | undefined>;

export function getWebProductionReadiness(
  env: EnvironmentLike,
): WebProductionReadinessCheck[] {
  return webProductionReadinessRequirements.map((requirement) => {
    const missingVariableNames = requirement.variableNames.filter(
      (variableName) => !env[variableName],
    );

    return {
      ...requirement,
      ready: missingVariableNames.length === 0,
      missingVariableNames,
    };
  });
}
