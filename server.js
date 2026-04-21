require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const SF_LOGIN_URL = process.env.REACT_APP_SF_LOGIN_URL || "https://trailsignup-78f9c4eccfa797.my.salesforce.com";
const SF_CLIENT_ID = process.env.REACT_APP_SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.REACT_APP_SF_CLIENT_SECRET;
const SF_API_VERSION = process.env.REACT_APP_SF_API_VERSION || "v66.0";
const SF_LOYALTY_PROGRAM = "Yahoo Rewards";
const PORT = process.env.PORT || process.env.API_PORT || 3002;

let tokenCache = null;

async function getToken(forceRefresh = false) {
  if (!forceRefresh && tokenCache && tokenCache.exp > Date.now()) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
  });

  const res = await fetch(`${SF_LOGIN_URL}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SF token error: ${res.status} ${text.slice(0, 300)}`);
  }

  const token = await res.json();
  tokenCache = { token, exp: Date.now() + 9 * 60 * 1000 };
  return token;
}

async function sfFetch(path, init) {
  let { access_token, instance_url } = await getToken();
  let res = await fetch(`${instance_url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401) {
    ({ access_token, instance_url } = await getToken(true));
    res = await fetch(`${instance_url}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
  }

  return res;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, program: SF_LOYALTY_PROGRAM });
});

// Member Profile API
app.get("/api/loyalty/member-profile", async (req, res) => {
  try {
    const membershipNumber = req.query.membershipNumber;
    if (!membershipNumber) {
      return res.status(400).json({ error: "membershipNumber is required" });
    }

    const path = `/services/data/${SF_API_VERSION}/loyalty-programs/${encodeURIComponent(
      SF_LOYALTY_PROGRAM
    )}/members?membershipNumber=${encodeURIComponent(membershipNumber)}`;

    const sf = await sfFetch(path, { method: "GET" });
    const data = await sf.json();

    if (!sf.ok) {
      console.error("[member-profile] SF error:", data);
      return res.status(sf.status).json(data);
    }

    res.json(data);
  } catch (e) {
    console.error("[member-profile] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Post Transaction Journal via Realtime Loyalty Program Process API
app.post("/api/loyalty/transaction-journal", async (req, res) => {
  try {
    const journals = req.body.transactionJournals;
    if (!journals || !journals.length) {
      return res.status(400).json({ error: "transactionJournals[] is required" });
    }

    const STRINGIFY_FIELDS = [
      "Cash_Paid__c", "Length_of_Booking__c", "Length_of_Stay__c",
      "Points_to_Redeem__c", "TransactionAmount",
    ];

    const normalized = journals.map((j) => {
      const out = { ...j };
      out.JournalTypeName = out.JournalTypeName || out.journalTypeName || "Accrual";
      out.JournalSubTypeName = out.JournalSubTypeName || out.journalSubTypeName || "Hotel Booking";
      delete out.journalTypeName;
      delete out.journalSubTypeName;
      STRINGIFY_FIELDS.forEach((f) => {
        if (out[f] != null && typeof out[f] !== "string") out[f] = String(out[f]);
      });
      return out;
    });

    const path = `/services/data/v64.0/connect/realtime/loyalty/programs/${encodeURIComponent(SF_LOYALTY_PROGRAM)}`;
    const payload = {
      transactionJournals: normalized,
      runSetting: { isSimulation: false },
    };

    console.log("[transaction-journal] POST →", JSON.stringify(payload, null, 2));

    const sf = await sfFetch(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const data = await sf.json();

    if (!sf.ok) {
      console.error("[transaction-journal] SF error:", data);
      return res.status(sf.status).json({
        error: data?.[0]?.message || data?.message || `HTTP ${sf.status}`,
        details: data,
      });
    }

    if (data.status === false && data.message) {
      console.error("[transaction-journal] SF rejected:", data.message);
      return res.status(422).json({ error: data.message, raw: data });
    }

    const resultJournals = data?.processResult?.transactionJournalResult || data?.transactionJournals || [];
    const journalIds = resultJournals.map((tj) => tj?.id || tj?.transactionJournalId || null);
    const pointsChanges = resultJournals.flatMap((tj) => tj?.changeInMemberPoints || []);

    console.log(`[transaction-journal] Success — journal IDs: ${journalIds.join(", ")}`);
    res.status(201).json({
      success: true,
      journalIds,
      pointsChanges,
      transactionJournals: resultJournals,
      raw: data,
    });
  } catch (e) {
    console.error("[transaction-journal] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get SF promotions + member promotion enrollment
app.get("/api/loyalty/promotions", async (req, res) => {
  try {
    const membershipNumber = req.query.membershipNumber || DEFAULT_MEMBERSHIP;

    // 1. Query Promotion records for Yahoo Rewards
    const promoQuery = encodeURIComponent(
      `SELECT Id, Name, Description, StartDate, EndDate, Status, LoyaltyPromotionType, ` +
      `IsActive, FulfillmentAction, IsEnrollmentRequired, MaximumRewardValue ` +
      `FROM Promotion WHERE LoyaltyProgramId IN ` +
      `(SELECT Id FROM LoyaltyProgram WHERE Name = '${SF_LOYALTY_PROGRAM}') AND IsActive = true`
    );
    const promoRes = await sfFetch(`/services/data/${SF_API_VERSION}/query?q=${promoQuery}`);
    const promoData = await promoRes.json();

    // 2. Query member promotion enrollments for this member
    const memberPromoQuery = encodeURIComponent(
      `SELECT Id, PromotionId, Promotion.Name, Promotion.Description, ` +
      `CumulativeUsageTarget, CumulativeUsageCompleted, CumulativeUsageCompletePercent, ` +
      `CurrentEnrollmentCount, IsEnrollmentActive, MemberId, LoyaltyProgramMemberId, ` +
      `Promotion.LoyaltyPromotionType, Promotion.Status, Promotion.StartDate, Promotion.EndDate ` +
      `FROM LoyaltyProgramMbrPromotion WHERE LoyaltyProgramMemberId IN ` +
      `(SELECT Id FROM LoyaltyProgramMember WHERE MembershipNumber = '${membershipNumber}')`
    );
    const memberPromoRes = await sfFetch(`/services/data/${SF_API_VERSION}/query?q=${memberPromoQuery}`);
    const memberPromoData = await memberPromoRes.json();

    // 3. Query LoyaltyPgmMbrPromEligView for eligible promos (if member ID is known)
    let eligibleData = { records: [] };
    if (memberPromoData.records && memberPromoData.records.length > 0) {
      const memberId = memberPromoData.records[0].LoyaltyProgramMemberId;
      if (memberId) {
        try {
          const eligQuery = encodeURIComponent(
            `SELECT Id, PromotionId, PromotionName, PromotionDescription, ` +
            `StartDate, EndDate, LoyaltyPromotionType, PromotionImageUrl, ` +
            `EnrollmentStartDate, EnrollmentEndDate, Configuration ` +
            `FROM LoyaltyPgmMbrPromEligView WHERE LoyaltyProgramMemberId = '${memberId}'`
          );
          const eligRes = await sfFetch(`/services/data/${SF_API_VERSION}/query?q=${eligQuery}`);
          eligibleData = await eligRes.json();
        } catch (e) {
          console.warn("[promotions] Eligible promos query failed:", e.message);
        }
      }
    }

    res.json({
      promotions: promoData.records || [],
      memberPromotions: memberPromoData.records || [],
      eligiblePromotions: eligibleData.records || [],
    });
  } catch (e) {
    console.error("[promotions] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Engagement Trail for a specific promotion
app.get("/api/loyalty/engagement-trail/:promotionId", async (req, res) => {
  try {
    const { promotionId } = req.params;
    const membershipNumber = req.query.membershipNumber || DEFAULT_MEMBERSHIP;

    const connectApiPath = `/services/data/v63.0/loyalty/programs/${encodeURIComponent(
      SF_LOYALTY_PROGRAM
    )}/members/${membershipNumber}/engagement-trail?promotionId=${promotionId}`;

    const sf = await sfFetch(connectApiPath, { method: "GET" });

    if (!sf.ok) {
      const errText = await sf.text();
      console.error("[engagement-trail] SF error:", errText);
      if (sf.status === 404) {
        return res.status(404).json({ error: "Engagement trail not found for this promotion" });
      }
      return res.status(sf.status).json({ error: "Failed to fetch engagement trail", details: errText });
    }

    const trailData = await sf.json();

    const attributes = trailData.memberEngagementAttributeOutputRepresentations || [];
    const rewards = trailData.rewards?.[0] || {};
    const totalPossiblePoints = rewards.pointsRewards?.[0]?.points || 0;

    const steps = attributes.map((attr, index) => {
      const currentValue = parseFloat(attr.currentValue || "0");
      const targetValue = parseFloat(attr.targetValue || "1");
      const isCompleted = currentValue >= targetValue;

      return {
        id: `step-${index + 1}`,
        name: attr.name,
        description: attr.description || `Complete ${attr.name}`,
        stepNumber: index + 1,
        status: isCompleted ? "Completed" : currentValue > 0 ? "InProgress" : "NotStarted",
        completedDate: isCompleted ? attr.startDate : undefined,
        requiredCount: targetValue,
        currentCount: currentValue,
        rewardPoints: attributes.length > 0 ? Math.floor(totalPossiblePoints / attributes.length) : 0,
      };
    });

    const completedSteps = steps.filter((s) => s.status === "Completed").length;
    const inProgressSteps = steps.filter((s) => s.status === "InProgress").length;

    res.json({
      promotionId,
      promotionName: trailData.promotionName || "Engagement Trail",
      description: "Complete all steps to earn bonus rewards",
      startDate: attributes[0]?.startDate,
      endDate: attributes[0]?.endDate,
      totalSteps: attributes.length,
      completedSteps,
      currentStepNumber: completedSteps + 1,
      overallStatus:
        completedSteps === attributes.length
          ? "Completed"
          : completedSteps > 0 || inProgressSteps > 0
          ? "InProgress"
          : "NotStarted",
      totalPossiblePoints,
      earnedPoints: attributes.length > 0 ? Math.floor((completedSteps / attributes.length) * totalPossiblePoints) : 0,
      steps,
    });
  } catch (e) {
    console.error("[engagement-trail] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Eligible Promotions — cart-based promotion lookup
app.post("/api/loyalty/eligible-promotions", async (req, res) => {
  try {
    const cartRequest = req.body;
    if (!cartRequest?.cart?.cartDetails) {
      return res.status(400).json({ error: "Expected cart.cartDetails in request body" });
    }

    const apiPath = `/services/data/v64.0/global-promotions-management/eligible-promotions`;
    console.log("[eligible-promotions] Calling SF:", apiPath);

    const sf = await sfFetch(apiPath, {
      method: "POST",
      body: JSON.stringify(cartRequest),
    });

    if (!sf.ok) {
      const errText = await sf.text();
      console.error("[eligible-promotions] SF error:", errText);
      return res.status(sf.status).json({ error: "Failed to fetch eligible promotions", details: errText });
    }

    const data = await sf.json();
    console.log("[eligible-promotions] Response:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (e) {
    console.error("[eligible-promotions] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Promotion Evaluation & Execution
app.post("/api/loyalty/promotion-evaluation", async (req, res) => {
  try {
    const body = req.body;
    const apiPath = `/services/data/v64.0/loyalty/programs/${encodeURIComponent(SF_LOYALTY_PROGRAM)}/promotion-evaluation-and-execution`;
    console.log("[promotion-eval] Calling SF:", apiPath);

    const sf = await sfFetch(apiPath, {
      method: "POST",
      body: JSON.stringify(body),
    });

    const data = await sf.json();
    if (!sf.ok) {
      console.error("[promotion-eval] SF error:", data);
      return res.status(sf.status).json({ error: "Promotion evaluation failed", details: data });
    }

    console.log("[promotion-eval] Response:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (e) {
    console.error("[promotion-eval] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Member Vouchers
app.get("/api/loyalty/vouchers", async (req, res) => {
  try {
    const membershipNumber = req.query.membershipNumber || DEFAULT_MEMBERSHIP;
    const endpointAttempts = [
      `/services/data/v63.0/loyalty/programs/${encodeURIComponent(SF_LOYALTY_PROGRAM)}/members/${membershipNumber}/vouchers`,
      `/services/data/${SF_API_VERSION}/loyalty/programs/${encodeURIComponent(SF_LOYALTY_PROGRAM)}/members/${membershipNumber}/vouchers`,
      `/services/data/v63.0/connect/loyalty/programs/${encodeURIComponent(SF_LOYALTY_PROGRAM)}/members/${membershipNumber}/vouchers`,
    ];

    let data = null;
    for (const path of endpointAttempts) {
      const sf = await sfFetch(path, { method: "GET" });
      if (sf.ok) {
        data = await sf.json();
        break;
      }
    }

    if (!data) {
      return res.json({ vouchers: [], totalCount: 0 });
    }

    const vouchers = (data.vouchers || []).map((v) => ({
      id: v.voucherId || v.id,
      type: v.voucherDefinition || v.voucherType || "Other",
      code: v.voucherCode || v.code,
      value: v.remainingValue ?? v.faceValue ?? v.voucherValue ?? 0,
      currency: v.currencyIsoCode || "USD",
      expiresOn: v.expirationDate || v.expiryDate,
      status: v.status || "Active",
      notes: v.description || v.reason,
      issuedDate: v.issuedDate,
      effectiveDate: v.effectiveDate,
      redeemedValue: v.redeemedValue || 0,
      remainingValue: v.remainingValue,
      isPartiallyRedeemable: v.isVoucherPartiallyRedeemable,
      voucherNumber: v.voucherNumber,
    }));

    res.json({ vouchers, totalCount: data.totalCount || vouchers.length });
  } catch (e) {
    console.error("[vouchers] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Transaction Ledger Summary
app.post("/api/loyalty/transactions", async (req, res) => {
  try {
    const {
      membershipNumber = DEFAULT_MEMBERSHIP,
      pageNumber = 1,
      journalTypeName,
      journalSubTypeName,
      periodStartDate,
      periodEndDate,
    } = req.body || {};

    const params = new URLSearchParams();
    params.set("pageNumber", String(pageNumber));
    if (journalTypeName) params.set("journalTypeName", journalTypeName);
    if (journalSubTypeName) params.set("journalSubTypeName", journalSubTypeName);
    if (periodStartDate) params.set("periodStartDate", periodStartDate.includes("T") ? periodStartDate : `${periodStartDate}T00:00:00.000Z`);
    if (periodEndDate) params.set("periodEndDate", periodEndDate.includes("T") ? periodEndDate : `${periodEndDate}T23:59:59.000Z`);

    const path =
      `/services/data/v66.0/loyalty/programs/${encodeURIComponent(SF_LOYALTY_PROGRAM)}` +
      `/members/${encodeURIComponent(membershipNumber)}/transaction-ledger-summary?${params.toString()}`;

    console.log("[ledger-summary] GET →", path);
    const sf = await sfFetch(path);
    const data = await sf.json();

    if (!sf.ok) {
      console.error("[ledger-summary] SF error:", JSON.stringify(data, null, 2));
      return res.status(sf.status).json({ error: data?.[0]?.message || data?.message || `HTTP ${sf.status}`, raw: data });
    }

    const items = data.transactionJournals || data.transactionLedgerSummary || data.records || [];
    const normalized = items.map((t, idx) => {
      const pts = Array.isArray(t.pointsChange) && t.pointsChange.length > 0
        ? t.pointsChange[0] : {};
      return {
        id: t.transactionJournalId || t.id || `txn-${idx}`,
        date: t.activityDate || t.transactionDate || t.createdDate || null,
        type: t.journalTypeName || t.journalType || null,
        subType: t.journalSubTypeName || t.journalSubType || null,
        pointsChange: Number(pts.changeInPoints ?? 0),
        currencyName: pts.loyaltyMemberCurrency || "Y! Points",
        status: t.status || "Processed",
        transactionAmount: Number(t.transactionAmount ?? t.amount ?? 0),
        journalId: t.transactionJournalId || t.id || null,
        journalNumber: t.transactionJournalNumber || null,
        externalTransactionNumber: t.externalTransactionNumber || null,
      };
    });

    res.json({
      items: normalized,
      page: Number(pageNumber),
      totalCount: data.transactionJournalCount || normalized.length,
      nextPage: data.nextPageUrl ? Number(pageNumber) + 1 : null,
    });
  } catch (e) {
    console.error("[ledger-summary] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Member Badges (SOQL)
app.get("/api/loyalty/badges", async (req, res) => {
  try {
    const membershipNumber = req.query.membershipNumber || DEFAULT_MEMBERSHIP;

    const q = encodeURIComponent(
      `SELECT Id, Name, ` +
      `LoyaltyProgramBadge.Name, LoyaltyProgramBadge.Description, LoyaltyProgramBadge.ImageUrl, ` +
      `Status, LoyaltyProgramMember.MembershipNumber ` +
      `FROM LoyaltyProgramMemberBadge ` +
      `WHERE LoyaltyProgramMember.MembershipNumber = '${membershipNumber}'`
    );

    const sf = await sfFetch(`/services/data/${SF_API_VERSION}/query?q=${q}`);
    const data = await sf.json();

    if (!sf.ok) {
      console.warn("[badges] Query failed:", data);
      return res.json({ badges: [], totalCount: 0 });
    }

    const badges = (data.records || []).map((b) => ({
      id: b.Id,
      name: b.LoyaltyProgramBadge?.Name || b.Name,
      description: b.LoyaltyProgramBadge?.Description || null,
      imageUrl: b.LoyaltyProgramBadge?.ImageUrl || null,
      status: b.Status,
    }));

    res.json({ badges, totalCount: data.totalSize || badges.length });
  } catch (e) {
    console.error("[badges] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Simulate points (Realtime Program Process with isSimulation=true)
app.post("/api/loyalty/simulate", async (req, res) => {
  try {
    const { membershipNumber = DEFAULT_MEMBERSHIP, transactionJournals = [] } = req.body || {};

    if (!transactionJournals.length) {
      return res.status(400).json({ error: "transactionJournals[] is required" });
    }

    const STRINGIFY_FIELDS = [
      "Cash_Paid__c", "Length_of_Stay__c", "Points_to_Redeem__c", "TransactionAmount",
    ];

    const normalized = transactionJournals.map((j) => {
      const out = { ...j };
      out.JournalTypeName = out.JournalTypeName || out.journalTypeName || "Accrual";
      out.JournalSubTypeName = out.JournalSubTypeName || out.journalSubTypeName || "Hotel Booking";
      out.MembershipNumber = out.MembershipNumber || membershipNumber;
      out.CurrencyIsoCode = out.CurrencyIsoCode || "USD";
      out.ActivityDate = out.ActivityDate || new Date().toISOString();
      out.ExternalTransactionNumber = out.ExternalTransactionNumber || `SIM-${Date.now()}`;
      delete out.journalTypeName;
      delete out.journalSubTypeName;
      STRINGIFY_FIELDS.forEach((f) => {
        if (out[f] != null && typeof out[f] !== "string") out[f] = String(out[f]);
      });
      return out;
    });

    const path = `/services/data/v64.0/connect/realtime/loyalty/programs/${encodeURIComponent(SF_LOYALTY_PROGRAM)}`;
    const payload = { transactionJournals: normalized, runSetting: { isSimulation: true } };

    console.log("[simulate] POST →", JSON.stringify(payload, null, 2));

    const sf = await sfFetch(path, { method: "POST", body: JSON.stringify(payload) });
    const data = await sf.json();

    if (!sf.ok) {
      return res.status(sf.status).json({ error: data?.[0]?.message || data?.message || `HTTP ${sf.status}`, raw: data });
    }

    const simTJs = data?.simulationResults?.transactionJournals || [];
    const results = simTJs.map((tj, i) => {
      const rules = tj?.processRules || [];
      const byCurrency = {};
      for (const rule of rules) {
        for (const reward of (rule.ruleRewards || [])) {
          if (reward.rewardType === "CreditFixedPoints" || reward.rewardType === "CreditPoints") {
            const curr = reward.rewardDetails?.loyaltyProgramCurrencyName || "Y! Points";
            const pts = parseInt(reward.rewardDetails?.points || "0", 10);
            byCurrency[curr] = (byCurrency[curr] || 0) + pts;
          }
        }
      }
      // Also check executionSummary if present
      const points = tj?.executionSummary?.pointsSummary || [];
      for (const p of points) {
        const curr = p?.loyaltyProgramCurrencyName || "PTS";
        const delta = Number(p?.changeInPointsBalance ?? p?.changeInPoints ?? 0);
        if (delta) byCurrency[curr] = (byCurrency[curr] || 0) + delta;
      }
      return {
        index: i,
        byCurrency,
        processName: tj?.processName || null,
        processRules: rules.map((r) => ({
          ruleName: r.ruleName,
          rewards: (r.ruleRewards || []).map((rw) => ({
            type: rw.rewardType,
            details: rw.rewardDetails,
          })),
        })),
        errorMessage: tj?.errorMessage || null,
      };
    });

    res.json({ results, raw: data });
  } catch (e) {
    console.error("[simulate] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// SOQL query proxy (for exploration)
app.get("/api/loyalty/query", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "q parameter required" });
    const sf = await sfFetch(`/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(q)}`);
    const data = await sf.json();
    if (!sf.ok) return res.status(sf.status).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const DEFAULT_MEMBERSHIP = "YAH0000001";

if (!SF_CLIENT_ID || !SF_CLIENT_SECRET) {
  console.error("Missing REACT_APP_SF_CLIENT_ID or REACT_APP_SF_CLIENT_SECRET in .env");
  process.exit(1);
}

const path = require("path");
app.use(express.static(path.join(__dirname, "build")));
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
  console.log(`[server] SF Login URL: ${SF_LOGIN_URL}`);
  console.log(`[server] Loyalty Program: ${SF_LOYALTY_PROGRAM}`);
});
