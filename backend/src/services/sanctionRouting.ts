export type SanctionTier = "SINGLE" | "MAKER_CHECKER" | "COMMITTEE";

const SINGLE_APPROVER_CEILING = 500000; // < ₹5L : single approver (branch manager)
const MAKER_CHECKER_CEILING = 2500000; // < ₹25L : maker-checker (regional manager)
// >= ₹25L : credit committee, requires 3 of 5 votes
export const COMMITTEE_QUORUM = 3;
export const COMMITTEE_SIZE = 5;

export function sanctionTierFor(amount: number): SanctionTier {
  if (amount < SINGLE_APPROVER_CEILING) return "SINGLE";
  if (amount < MAKER_CHECKER_CEILING) return "MAKER_CHECKER";
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
