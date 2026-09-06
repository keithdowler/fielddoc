import {
  fieldDocProEntitlementId,
  hasActiveFieldDocProEntitlement,
  isFieldDocProProductId,
  type SubscriptionEntitlement,
} from "@fielddoc/domain";

export type RevenueCatCustomerInfoLike = {
  requestDate: string;
  entitlements: {
    all: Record<
      string,
      {
        identifier: string;
        isActive: boolean;
        productIdentifier: string | null;
        expirationDate: string | null;
      }
    >;
  };
  activeSubscriptions?: readonly string[];
  allExpirationDates?: Record<string, string | null | undefined>;
  latestExpirationDate?: string | null;
};

export function mapCustomerInfoToEntitlements(
  customerInfo: RevenueCatCustomerInfoLike,
): SubscriptionEntitlement[] {
  const entitlements = Object.values(customerInfo.entitlements.all).map(
    (entitlement) => ({
      entitlementId: entitlement.identifier,
      status: entitlement.isActive
        ? ("active" as const)
        : ("inactive" as const),
      productId: entitlement.productIdentifier,
      expiresAt: entitlement.expirationDate,
      lastCheckedAt: customerInfo.requestDate,
    }),
  );

  const activeFieldDocProductId = customerInfo.activeSubscriptions?.find(
    isFieldDocProProductId,
  );

  if (
    activeFieldDocProductId &&
    !hasActiveFieldDocProEntitlement(entitlements, customerInfo.requestDate)
  ) {
    entitlements.push({
      entitlementId: fieldDocProEntitlementId,
      status: "active",
      productId: activeFieldDocProductId,
      expiresAt:
        customerInfo.allExpirationDates?.[activeFieldDocProductId] ??
        customerInfo.latestExpirationDate ??
        null,
      lastCheckedAt: customerInfo.requestDate,
    });
  }

  return entitlements;
}

export function hasRevenueCatFieldDocPro(
  entitlements: readonly SubscriptionEntitlement[],
): boolean {
  return hasActiveFieldDocProEntitlement(entitlements);
}

export function createInactiveFieldDocProMessage(
  entitlements: readonly SubscriptionEntitlement[],
): string {
  if (entitlements.length > 0) {
    return "Purchases were checked, but FieldDoc Pro is not active for this app store account. Confirm the active TestFlight subscription, then tap Refresh.";
  }

  return "No FieldDoc Pro purchase was found for this app store account. Confirm the active TestFlight subscription, then tap Refresh.";
}
