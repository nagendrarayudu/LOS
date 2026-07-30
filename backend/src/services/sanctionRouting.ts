export type SanctionTier = "SINGLE" | "MAKER_CHECKER" | "COMMITTEE";

// Fallbacks used only if a tenant somehow has no BankParameter row.
export const DEFAULT_SINGLE_APPROVER_CEILING = 500000; // < ₹5L : single approver (branch manager)
export const DEFAULT_MAKER_CHECKER_CEILING = 2500000; // < ₹25L : maker-checker (regional manager)
export const DEFAULT_COMMITTEE_QUORUM = 3; // >= ₹25L : credit committee, requires 3 of 5 votes
export const DEFAULT_COMMITTEE_SIZE = 5;

export type SanctionCeilings = {
  singleApproverCeiling: number;
  makerCheckerCeiling: number;
};

const DEFAULT_CEILINGS: SanctionCeilings = {
  singleApproverCeiling: DEFAULT_SINGLE_APPROVER_CEILING,
  makerCheckerCeiling: DEFAULT_MAKER_CHECKER_CEILING,
};

export function sanctionTierFor(amount: number, ceilings: SanctionCeilings = DEFAULT_CEILINGS): SanctionTier {
  if (amount < ceilings.singleApproverCeiling) return "SINGLE";
  if (amount < ceilings.makerCheckerCeiling) return "MAKER_CHECKER";
  return "COMMITTEE";
}

export function sanctionTierLabel(tier: SanctionTier): string {
  switch (tier) {
    case "SINGLE":
      return "Sanction · single approver (L1 – Branch Manager)";
    case "MAKER_CHECKER":
      return "Sanction · maker-checker (L2 – Regional Manager)";
    case "COMMITTEE":
      return "Sanction · credit committee (L3 – HO / Credit Committee)";
  }
}

/** Which staff role(s) may act at a given sanction level. */
export function roleCanDecide(tier: SanctionTier, level: "MAKER" | "CHECKER" | "COMMITTEE", role: string): boolean {
  if (tier === "SINGLE") return level === "CHECKER" && (role === "MANAGER" || role === "ADMIN");
  if (tier === "MAKER_CHECKER") {
    if (level === "MAKER") return role === "LOAN_OFFICER" || role === "ADMIN";
    if (level === "CHECKER") return role === "MANAGER" || role === "ADMIN";
    return false;
  }
  // COMMITTEE tier: maker recommends, then committee members vote
  if (level === "MAKER") return role === "LOAN_OFFICER" || role === "MANAGER" || role === "ADMIN";
  if (level === "COMMITTEE") return role === "COMMITTEE_MEMBER" || role === "ADMIN";
  return false;
}
