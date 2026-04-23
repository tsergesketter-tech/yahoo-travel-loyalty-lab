// Delta Defense Member Rewards — Promotion records (mirrors Salesforce data)
// Seeded into Salesforce via: scripts/delta-defense/create-promotions.js

const deltaDefensePromotions = [
  {
    id: "dd-promo-welcome",
    name: "Welcome to Delta Defense",
    objective: "Reward new members who activate their first USCCA membership purchase.",
    description:
      "As a new Delta Defense member, earn 2,500 bonus points when you complete your first " +
      "membership purchase. Your journey toward responsible self-defense starts here — this " +
      "welcome bonus is our way of saying thanks for joining the USCCA family and committing " +
      "to protecting yourself and those you love.",
    imageUrl:
      "https://images.unsplash.com/photo-1549834125-82d3c38971a4?w=600&h=340&fit=crop&q=80",
    category: "purchases",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: 2500,
    dateRange: { start: "2026-01-01", end: "2026-12-31" },
    eligibleSegments: ["NewMember"],
  },
  {
    id: "dd-promo-range-training",
    name: "Range Training Rewards",
    objective: "Incentivize members to complete structured firearms training courses.",
    description:
      "Earn 1,500 bonus points each time you complete a USCCA-approved firearms training course. " +
      "Whether it's a classroom fundamentals session, a live-fire drill, or an advanced defensive " +
      "shooting course, every hour invested in your training earns you points toward exclusive " +
      "rewards. Valid for up to 4 qualifying courses per year.",
    imageUrl:
      "https://images.unsplash.com/photo-1580745516826-ad769a3d68f8?w=600&h=340&fit=crop&q=80",
    category: "training",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 6000,
    dateRange: { start: "2026-01-01", end: "2026-12-31" },
    eligibleSegments: null,
  },
  {
    id: "dd-promo-fundamentals-cert",
    name: "Fundamentals Certification Bonus",
    objective: "Reward members who earn their USCCA Fundamentals of Concealed Carry certification.",
    description:
      "Completing the USCCA Fundamentals of Concealed Carry certification is a proud milestone — " +
      "and we want to celebrate it. Earn 3,000 bonus points upon successfully passing the " +
      "Fundamentals certification exam. This promotion recognizes your dedication to responsible " +
      "carry and safe handling principles that protect you and your community.",
    imageUrl:
      "https://images.unsplash.com/photo-1560472355-109703aa3edc?w=600&h=340&fit=crop&q=80",
    category: "certification",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 3000,
    dateRange: { start: "2026-01-01", end: "2026-12-31" },
    eligibleSegments: null,
  },
  {
    id: "dd-promo-advanced-skills",
    name: "Advanced Skills Champion",
    objective: "Drive members toward advanced and instructor-level certifications.",
    description:
      "Push your skills further and earn milestone rewards along the way. Earn 2,000 bonus points " +
      "for completing the Advanced Skills certification, and an additional 5,000 points when you " +
      "achieve USCCA Instructor status. Each credential unlocks a new tier of rewards, reflecting " +
      "your commitment to mastery and your role as a leader in responsible gun ownership.",
    imageUrl:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=340&fit=crop&q=80",
    category: "certification",
    loyaltyPromotionType: "Cumulative",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 7000,
    dateRange: { start: "2026-01-01", end: "2026-12-31" },
    eligibleSegments: null,
  },
  {
    id: "dd-promo-edc-gear",
    name: "Everyday Carry Gear Bonus",
    objective: "Encourage responsible gear and accessories purchases through the USCCA store.",
    description:
      "Gear up and earn more. Earn double points — 2x — on all qualifying purchases of holsters, " +
      "safety equipment, cleaning kits, and accessories in the USCCA store. Whether you're " +
      "upgrading your everyday carry setup or stocking up on range essentials, every purchase " +
      "brings you closer to your next reward.",
    imageUrl:
      "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=600&h=340&fit=crop&q=80",
    category: "purchases",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: null,
    dateRange: { start: "2026-03-01", end: "2026-09-30" },
    eligibleSegments: null,
  },
  {
    id: "dd-promo-community-challenge",
    name: "Community Defender Challenge",
    objective:
      "Build community engagement through chapter events, meetups, and local chapter participation.",
    description:
      "Your community makes you stronger. Complete the Community Defender Challenge by attending " +
      "3 local USCCA chapter events, participating in 1 community safety seminar, and referring " +
      "1 new member. Finishing all three steps earns you 4,000 bonus points and a digital " +
      "Community Defender badge — recognizing your role as a pillar of responsible gun ownership " +
      "in your area.",
    imageUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=340&fit=crop&q=80",
    category: "community",
    loyaltyPromotionType: "Cumulative",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 4000,
    dateRange: { start: "2026-04-01", end: "2026-10-31" },
    eligibleSegments: null,
  },
  {
    id: "dd-promo-annual-renewal",
    name: "Annual Member Loyalty Boost",
    objective: "Retain members by rewarding timely annual membership renewal.",
    description:
      "Loyalty deserves to be recognized. Renew your USCCA annual membership before your " +
      "expiration date and earn 2,000 bonus points — automatically deposited into your account. " +
      "Members who renew for 3 or more consecutive years receive an additional 1,000-point " +
      "longevity bonus, thanking you for your sustained commitment to the USCCA mission.",
    imageUrl:
      "https://images.unsplash.com/photo-1550353175-a3611868086b?w=600&h=340&fit=crop&q=80",
    category: "membership",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: 3000,
    dateRange: { start: "2026-01-01", end: "2026-12-31" },
    eligibleSegments: ["ActiveMember", "ChurnRisk"],
  },
  {
    id: "dd-promo-safe-storage-partner",
    name: "Safe Storage Partnership Bonus",
    objective: "Partner promotion with approved gun-safe and secure-storage retailers.",
    description:
      "Safe storage is responsible ownership. In partnership with leading safe-storage manufacturers, " +
      "earn 2,500 bonus points when you purchase a qualifying gun safe, quick-access pistol vault, " +
      "or secure storage solution from a USCCA partner retailer. Valid on purchases of $100 or more. " +
      "Protecting your firearms from unauthorized access is one of the most important steps a " +
      "responsible owner can take.",
    imageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=340&fit=crop&q=80",
    category: "partner",
    loyaltyPromotionType: "Joint",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: 2500,
    dateRange: { start: "2026-02-01", end: "2026-11-30" },
    eligibleSegments: null,
  },
  {
    id: "dd-promo-instructor-partner",
    name: "USCCA Instructor Partner Network",
    objective:
      "Drive training enrollments through certified USCCA partner instructors and training facilities.",
    description:
      "Train with the best. When you book and complete a live training class at a USCCA-certified " +
      "partner training facility or with a registered USCCA Instructor, earn 2,000 bonus points. " +
      "Qualifying facilities offer everything from beginner pistol fundamentals to advanced " +
      "defensive shooting and low-light scenarios. Find a partner instructor near you and level up " +
      "your skills while earning rewards.",
    imageUrl:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=340&fit=crop&q=80",
    category: "partner",
    loyaltyPromotionType: "Joint",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 8000,
    dateRange: { start: "2026-01-01", end: "2026-12-31" },
    eligibleSegments: null,
  },
  {
    id: "dd-promo-safety-education",
    name: "Safety Education Milestone Series",
    objective:
      "Encourage members to complete a full curriculum of self-defense and safety education content.",
    description:
      "Knowledge is your first line of defense. Complete the Safety Education Milestone Series — " +
      "a curated curriculum of online courses covering situational awareness, legal use of force, " +
      "first aid for gunshot wounds, and conflict avoidance — and earn up to 5,000 points in " +
      "staged milestone rewards. Each module completed unlocks the next and deposits points along " +
      "the way, celebrating your commitment to becoming a more prepared and responsible defender.",
    imageUrl:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=340&fit=crop&q=80",
    category: "education",
    loyaltyPromotionType: "Cumulative",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 5000,
    dateRange: { start: "2026-01-01", end: "2026-12-31" },
    eligibleSegments: null,
  },
];

export default deltaDefensePromotions;
