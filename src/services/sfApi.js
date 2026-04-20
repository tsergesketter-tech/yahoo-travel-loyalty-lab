const API_BASE = process.env.REACT_APP_API_URL || "";

export async function fetchMemberProfile(membershipNumber) {
  const res = await fetch(
    `${API_BASE}/api/loyalty/member-profile?membershipNumber=${encodeURIComponent(membershipNumber)}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchPromotions(membershipNumber) {
  const qs = membershipNumber ? `?membershipNumber=${encodeURIComponent(membershipNumber)}` : "";
  const res = await fetch(`${API_BASE}/api/loyalty/promotions${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchEngagementTrail(promotionId, membershipNumber) {
  const qs = membershipNumber ? `?membershipNumber=${encodeURIComponent(membershipNumber)}` : "";
  const res = await fetch(`${API_BASE}/api/loyalty/engagement-trail/${encodeURIComponent(promotionId)}${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchEligiblePromotions(cartRequest) {
  const res = await fetch(`${API_BASE}/api/loyalty/eligible-promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cartRequest),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function evaluatePromotion(body) {
  const res = await fetch(`${API_BASE}/api/loyalty/promotion-evaluation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export function buildCartRequest(product, membershipNumber, opts = {}) {
  const { amount, origin, destination } = opts;
  return {
    cart: {
      cartDetails: [{
        activityStartDate: new Date().toISOString(),
        membershipNumber: membershipNumber || "YAH0000001",
        currencyISOCode: "USD",
        transactionAmount: amount || 0,
        origin: origin || "",
        destination: destination || product.city || "",
      }],
    },
  };
}

function transformSfPromotion(sfPromo, originalAmount) {
  const discounts = [];
  for (const rule of (sfPromo.promotionEligibleRules || [])) {
    for (const reward of (rule.ruleRewards || [])) {
      if (reward.rewardType === "ProvideDiscount") {
        const d = reward.rewardDetails || {};
        const val = parseFloat(d.discountValue || "0");
        let type, amt;
        if (d.discountType === "PercentageOff") {
          type = "PERCENTAGE"; amt = (originalAmount * val) / 100;
        } else {
          type = "FIXED_AMOUNT"; amt = val;
        }
        discounts.push({
          promotionId: sfPromo.promotionId,
          promotionName: sfPromo.displayName || rule.ruleName,
          discountType: type, discountValue: val,
          discountAmount: Math.round(amt * 100) / 100,
          description: `${val}${type === "PERCENTAGE" ? "%" : " USD"} off`,
        });
      } else if (reward.rewardType === "CreditFixedPoints") {
        const d = reward.rewardDetails || {};
        const pts = parseInt(d.points || "0", 10);
        const curr = d.loyaltyProgramCurrencyName || "Y! Points";
        discounts.push({
          promotionId: sfPromo.promotionId,
          promotionName: sfPromo.displayName || `Earn ${pts} ${curr}`,
          discountType: "POINTS", discountValue: pts,
          discountAmount: 0,
          pointsAwarded: pts, pointsCurrency: curr,
          description: `Earn ${pts.toLocaleString()} ${curr}`,
        });
      }
    }
  }
  return discounts.length > 0 ? discounts : [{
    promotionId: sfPromo.promotionId,
    promotionName: sfPromo.displayName || "Promotion",
    discountType: "FIXED_AMOUNT", discountValue: 0, discountAmount: 0,
    description: "Special promotion benefits",
  }];
}

const FALLBACK_PROMOS = [
  {
    id: "FALLBACK-SPRING",
    name: "Spring Travel Sale",
    type: "PERCENTAGE",
    value: 12,
    description: "12% off spring bookings",
    minAmount: 150,
  },
  {
    id: "FALLBACK-LOYALTY",
    name: "Yahoo Rewards Member Discount",
    type: "FIXED_AMOUNT",
    value: 25,
    description: "$25 off for loyalty members",
    minAmount: 200,
  },
  {
    id: "FALLBACK-BONUS-PTS",
    name: "Double Points Weekend",
    type: "POINTS",
    value: 500,
    description: "Earn 500 bonus Y! Points",
    minAmount: 0,
  },
];

function buildFallbackPromotions(originalAmount) {
  return FALLBACK_PROMOS
    .filter((p) => originalAmount >= p.minAmount)
    .map((p) => {
      const discountAmount = p.type === "PERCENTAGE"
        ? Math.round((originalAmount * p.value) / 100 * 100) / 100
        : p.type === "FIXED_AMOUNT" ? p.value : 0;
      return {
        promotionId: p.id,
        promotionName: p.name,
        discountType: p.type,
        discountValue: p.value,
        discountAmount,
        pointsAwarded: p.type === "POINTS" ? p.value : 0,
        pointsCurrency: p.type === "POINTS" ? "Y! Points" : undefined,
        description: p.description,
        isFallback: true,
      };
    });
}

export function processEligiblePromotions(sfResponse, originalAmount) {
  let promos = (sfResponse.eligiblePromotions || []).flatMap(
    (p) => transformSfPromotion(p, originalAmount)
  );

  if (promos.length === 0) {
    promos = buildFallbackPromotions(originalAmount);
  }

  const totalDiscount = promos.reduce((t, p) => t + (p.discountAmount || 0), 0);
  const totalPointsAwarded = promos.reduce((t, p) => t + (p.pointsAwarded || 0), 0);
  return {
    eligiblePromotions: promos,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalPointsAwarded,
    originalAmount,
    finalAmount: Math.max(0, originalAmount - totalDiscount),
    appliedPromotions: promos.filter((p) => p.discountAmount > 0),
  };
}

export async function fetchVouchers(membershipNumber) {
  const qs = membershipNumber ? `?membershipNumber=${encodeURIComponent(membershipNumber)}` : "";
  const res = await fetch(`${API_BASE}/api/loyalty/vouchers${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchTransactions(membershipNumber, opts = {}) {
  const body = { membershipNumber };
  if (opts.pageNumber) body.pageNumber = opts.pageNumber;
  if (opts.journalTypeName) body.journalTypeName = opts.journalTypeName;
  if (opts.journalSubTypeName) body.journalSubTypeName = opts.journalSubTypeName;
  if (opts.periodStartDate) body.periodStartDate = opts.periodStartDate;
  if (opts.periodEndDate) body.periodEndDate = opts.periodEndDate;

  const res = await fetch(`${API_BASE}/api/loyalty/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchBadges(membershipNumber) {
  const qs = membershipNumber ? `?membershipNumber=${encodeURIComponent(membershipNumber)}` : "";
  const res = await fetch(`${API_BASE}/api/loyalty/badges${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function simulatePoints(membershipNumber, transactionJournals) {
  const res = await fetch(`${API_BASE}/api/loyalty/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ membershipNumber, transactionJournals }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function postTransactionJournal(transactionJournals) {
  const journals = Array.isArray(transactionJournals) ? transactionJournals : [transactionJournals];
  const res = await fetch(`${API_BASE}/api/loyalty/transaction-journal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionJournals: journals }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export function buildAccrualJournal({
  bookingId, membershipNumber, amount, nights, city, country,
  hotelName, checkIn, checkOut, channel = "Web",
  journalSubTypeName = "Hotel Booking",
}) {
  return {
    ExternalTransactionNumber: bookingId,
    External_ID__c: bookingId,
    MembershipNumber: membershipNumber,
    JournalTypeName: "Accrual",
    JournalSubTypeName: journalSubTypeName,
    ActivityDate: new Date().toISOString(),
    CurrencyIsoCode: "USD",
    TransactionAmount: amount,
    Channel: channel,
    Payment_Type__c: "Cash",
    Cash_Paid__c: String(amount),
    LOB__c: "Hotel",
    Destination_City__c: city,
    Destination_Country__c: country,
    StartDate: checkIn ? `${checkIn}T14:00:00.000Z` : new Date().toISOString(),
    EndDate: checkOut ? `${checkOut}T11:00:00.000Z` : new Date().toISOString(),
    Length_of_Stay__c: String(nights || 1),
    BookingDate: new Date().toISOString(),
    Comment: `${hotelName} — ${nights} night${nights > 1 ? "s" : ""}`,
  };
}

export function buildRedemptionJournal({
  bookingId, membershipNumber, pointsRedeemed, city, country,
  hotelName, checkIn, checkOut,
}) {
  return {
    ExternalTransactionNumber: `${bookingId}-REDEEM`,
    External_ID__c: `${bookingId}-REDEEM`,
    MembershipNumber: membershipNumber,
    JournalTypeName: "Redemption",
    JournalSubTypeName: "Redeem Points",
    ActivityDate: new Date().toISOString(),
    CurrencyIsoCode: "USD",
    TransactionAmount: 0,
    Points_to_Redeem__c: String(pointsRedeemed),
    Channel: "Web",
    LOB__c: "Hotel",
    Destination_City__c: city,
    Destination_Country__c: country,
    StartDate: checkIn ? `${checkIn}T14:00:00.000Z` : new Date().toISOString(),
    EndDate: checkOut ? `${checkOut}T11:00:00.000Z` : new Date().toISOString(),
    Comment: `Redeemed ${pointsRedeemed} pts — ${hotelName}`,
  };
}
