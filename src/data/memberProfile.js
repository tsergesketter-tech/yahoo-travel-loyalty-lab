const defaultMemberProfile = {
  id: "MBR-001",
  name: "Jamie Yahoo",
  email: "j****e@yahoo.com",
  tier: "Adventurer",
  segment: "HighValueUser",
  pointsBalance: 72500,
  pointsValuePerPoint: 0.01,
  joinDate: "2023-06-15",
  lifetimePoints: 185000,
  activityLog: [
    {
      id: "log-001",
      date: "2026-03-10",
      destination: "Paris, France",
      hotelSku: "HTL-PAR-001",
      nights: 3,
      earnedBasePoints: 10350,
      earnedBonusPoints: 4500,
      promotionsApplied: ["Europe Summer Boost"],
      redeemedPoints: 0,
    },
    {
      id: "log-002",
      date: "2026-02-20",
      destination: "Tokyo, Japan",
      hotelSku: "HTL-TKY-001",
      nights: 2,
      earnedBasePoints: 5500,
      earnedBonusPoints: 0,
      promotionsApplied: [],
      redeemedPoints: 32000,
    },
    {
      id: "log-003",
      date: "2026-01-15",
      destination: "New York, United States",
      hotelSku: "HTL-NYC-001",
      nights: 1,
      earnedBasePoints: 2890,
      earnedBonusPoints: 3000,
      promotionsApplied: ["US Loyalty Accelerator"],
      redeemedPoints: 0,
    },
  ],
};

export const tiers = ["Explorer", "Adventurer", "Insider", "Icon"];

export const segments = [
  {
    id: "HighValueUser",
    label: "High-Value User",
    description: "Top-tier spender with strong engagement; ideal for premium offers and exclusive perks.",
  },
  {
    id: "RecentlyDepleted",
    label: "Recently Depleted",
    description: "Member just redeemed most of their points; good candidate for re-earn offers and bonus accelerators.",
  },
  {
    id: "LookieLoo",
    label: "Lookie-Loo",
    description: "Frequent browser who rarely books; needs compelling incentives to convert searches into stays.",
  },
  {
    id: "ChurnRisk",
    label: "Churn Risk",
    description: "Declining activity signals potential churn; prioritize retention offers and win-back campaigns.",
  },
];

export default defaultMemberProfile;
