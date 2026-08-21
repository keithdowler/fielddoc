export type AccountProvisioningInput = {
  clerkUserId: string;
  clerkOrganizationId: string;
  organizationName: string;
  email: string | null;
  role: string;
};

export type AccountProvisioningResult = {
  organizationId: string;
  userId: string;
  role: string;
};

export type AccountProvisioner = {
  ensureAccount(
    input: AccountProvisioningInput,
  ): Promise<AccountProvisioningResult>;
};

export function normalizeOrganizationName(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : "FieldDoc";
}

export function normalizeMembershipRole(value: string | null | undefined) {
  const normalized = value?.replace(/^org:/, "").trim();

  return normalized && normalized.length > 0 ? normalized : "member";
}
