const memberJourneys = [
  {
    id: "journey-europe-explorer",
    name: "Europe Explorer Quest",
    description: "Complete 2 stays in Europe to earn a massive bonus.",
    criteria: {
      regionTag: "Europe",
      requiredStays: 2,
      requiredNights: 3,
    },
    reward: {
      bonusPoints: 5000,
      badgeLabel: "Europe Explorer",
    },
    completedStays: 0,
    completedNights: 0,
    status: "Not Started",
  },
  {
    id: "journey-apac-adventure",
    name: "APAC Adventure Trail",
    description: "Book 3 nights across any APAC destination.",
    criteria: {
      regionTag: "APAC",
      requiredStays: 1,
      requiredNights: 3,
    },
    reward: {
      bonusPoints: 3500,
      badgeLabel: "APAC Adventurer",
    },
    completedStays: 0,
    completedNights: 0,
    status: "Not Started",
  },
  {
    id: "journey-global-wanderer",
    name: "Global Wanderer Challenge",
    description: "Stay in 3 different regions to unlock the ultimate reward.",
    criteria: {
      regionTag: null,
      requiredStays: 3,
      requiredNights: 5,
    },
    reward: {
      bonusPoints: 10000,
      badgeLabel: "Global Wanderer",
    },
    completedStays: 0,
    completedNights: 0,
    status: "Not Started",
  },
];

export default memberJourneys;
