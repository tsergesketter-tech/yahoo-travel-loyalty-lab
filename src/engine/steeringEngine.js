export function getIncentive(hotel, memberProfile, promotions) {
  let extraEarnPoints = 0;
  let redemptionDiscountPercent = 0;
  const appliedPromotions = [];
  const appliedRules = [];

  // Rule 1: High-margin hotels get a base bonus
  if (hotel.preferredMarginFlag === "high") {
    extraEarnPoints += 3000;
    appliedRules.push({
      rule: "High-Margin Bonus",
      description: "preferredMarginFlag === 'high' → +3,000 bonus points",
      effect: "+3,000 earn points",
    });
  } else if (hotel.preferredMarginFlag === "medium") {
    extraEarnPoints += 1000;
    appliedRules.push({
      rule: "Medium-Margin Bonus",
      description: "preferredMarginFlag === 'medium' → +1,000 bonus points",
      effect: "+1,000 earn points",
    });
  }

  // Rule 2: RecentlyDepleted members get bonus on APAC stays
  if (memberProfile.segment === "RecentlyDepleted" && hotel.regionTag === "APAC") {
    extraEarnPoints += 1500;
    appliedRules.push({
      rule: "Depleted APAC Re-Earn",
      description: "segment === 'RecentlyDepleted' && regionTag === 'APAC' → +1,500 bonus points",
      effect: "+1,500 earn points",
    });
  }

  // Rule 3: ChurnRisk members get bonus on all stays
  if (memberProfile.segment === "ChurnRisk") {
    extraEarnPoints += 500;
    appliedRules.push({
      rule: "Churn Risk Retention",
      description: "segment === 'ChurnRisk' → +500 bonus points on all stays",
      effect: "+500 earn points",
    });
  }

  // Rule 4: LookieLoo members get a redemption discount to drive conversion
  if (memberProfile.segment === "LookieLoo") {
    redemptionDiscountPercent = Math.max(redemptionDiscountPercent, 15);
    appliedRules.push({
      rule: "Lookie-Loo Conversion",
      description: "segment === 'LookieLoo' → 15% redemption discount",
      effect: "15% redemption discount",
    });
  }

  // Rule 5: Apply promotion-based incentives
  for (const promo of promotions) {
    const regionMatch = !promo.regionTag || promo.regionTag === hotel.regionTag;
    const segmentMatch =
      !promo.eligibleSegments || promo.eligibleSegments.includes(memberProfile.segment);

    if (regionMatch && segmentMatch) {
      if (promo.type === "earnBonus" && promo.bonusPointsPerNight) {
        extraEarnPoints += promo.bonusPointsPerNight;
        appliedPromotions.push(promo.id);
        appliedRules.push({
          rule: `Promotion: ${promo.name}`,
          description: `Region: ${promo.regionTag || "All"}, Segments: ${promo.eligibleSegments ? promo.eligibleSegments.join(", ") : "All"} → +${promo.bonusPointsPerNight.toLocaleString()} bonus points`,
          effect: `+${promo.bonusPointsPerNight.toLocaleString()} earn points`,
        });
      }

      if (promo.type === "redemptionDiscount" && promo.discountPercent) {
        redemptionDiscountPercent = Math.max(redemptionDiscountPercent, promo.discountPercent);
        appliedPromotions.push(promo.id);
        appliedRules.push({
          rule: `Promotion: ${promo.name}`,
          description: `Region: ${promo.regionTag || "All"}, Segments: ${promo.eligibleSegments ? promo.eligibleSegments.join(", ") : "All"} → ${promo.discountPercent}% redemption discount`,
          effect: `${promo.discountPercent}% redemption discount`,
        });
      }
    }
  }

  const totalEarnPoints = hotel.basePointsPerNight + extraEarnPoints;
  const discountedRedemptionPoints = Math.round(
    hotel.redemptionPointsStandard * (1 - redemptionDiscountPercent / 100)
  );

  // Build the primary badge text
  let badgeText = "";
  if (extraEarnPoints >= 3000) {
    badgeText = `+${extraEarnPoints.toLocaleString()} Bonus Yahoo Points`;
  } else if (redemptionDiscountPercent >= 25) {
    badgeText = `${redemptionDiscountPercent}% Off Redemption Tonight`;
  } else if (extraEarnPoints > 0) {
    badgeText = `+${extraEarnPoints.toLocaleString()} Bonus Points`;
  } else if (redemptionDiscountPercent > 0) {
    badgeText = `${redemptionDiscountPercent}% Redemption Savings`;
  }

  if (!badgeText && hotel.preferredMarginFlag === "high") {
    badgeText = `High-Value Deal in ${hotel.regionTag}`;
  }

  return {
    extraEarnPoints,
    totalEarnPoints,
    redemptionDiscountPercent,
    discountedRedemptionPoints,
    appliedPromotions,
    appliedRules,
    badgeText,
  };
}
