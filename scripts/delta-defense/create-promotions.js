#!/usr/bin/env node
// Creates Promotion records in the "Delta Defense Member Rewards" loyalty program.
// Run once: node scripts/delta-defense/create-promotions.js

require("dotenv").config();

const SF_LOGIN_URL = process.env.REACT_APP_SF_LOGIN_URL;
const SF_CLIENT_ID = process.env.REACT_APP_SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.REACT_APP_SF_CLIENT_SECRET;
const API_VERSION = process.env.REACT_APP_SF_API_VERSION || "v66.0";

const LOYALTY_PROGRAM_NAME = "Delta Defense Member Rewards";

// ── Promotion definitions ──────────────────────────────────────────────────────
const PROMOTIONS = [
  {
    name: "Welcome to Delta Defense",
    objective: "Reward new members who activate their first USCCA membership purchase.",
    description:
      "As a new Delta Defense member, earn 2,500 bonus points when you complete your first membership purchase. " +
      "Your journey toward responsible self-defense starts here — this welcome bonus is our way of saying thanks " +
      "for joining the USCCA family and committing to protecting yourself and those you love.",
    imageUrl:
      "https://images.unsplash.com/photo-1549834125-82d3c38971a4?w=600&h=340&fit=crop&q=80",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: 2500,
    category: "purchases",
  },
  {
    name: "Range Training Rewards",
    objective: "Incentivize members to complete structured firearms training courses.",
    description:
      "Earn 1,500 bonus points each time you complete a USCCA-approved firearms training course. " +
      "Whether it's a classroom fundamentals session, a live-fire drill, or an advanced defensive " +
      "shooting course, every hour invested in your training earns you points toward exclusive " +
      "rewards. Valid for up to 4 qualifying courses per year.",
    imageUrl:
      "https://images.unsplash.com/photo-1580745516826-ad769a3d68f8?w=600&h=340&fit=crop&q=80",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 6000,
    category: "training",
  },
  {
    name: "Fundamentals Certification Bonus",
    objective: "Reward members who earn their USCCA Fundamentals of Concealed Carry certification.",
    description:
      "Completing the USCCA Fundamentals of Concealed Carry certification is a proud milestone — " +
      "and we want to celebrate it. Earn 3,000 bonus points upon successfully passing the " +
      "Fundamentals certification exam. This promotion recognizes your dedication to responsible " +
      "carry and safe handling principles that protect you and your community.",
    imageUrl:
      "https://images.unsplash.com/photo-1560472355-109703aa3edc?w=600&h=340&fit=crop&q=80",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 3000,
    category: "certification",
  },
  {
    name: "Advanced Skills Champion",
    objective: "Drive members toward advanced and instructor-level certifications.",
    description:
      "Push your skills further and earn milestone rewards along the way. Earn 2,000 bonus points " +
      "for completing the Advanced Skills certification, and an additional 5,000 points when you " +
      "achieve USCCA Instructor status. Each credential unlocks a new tier of rewards, reflecting " +
      "your commitment to mastery and your role as a leader in responsible gun ownership.",
    imageUrl:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=340&fit=crop&q=80",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    loyaltyPromotionType: "Cumulative",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 7000,
    category: "certification",
  },
  {
    name: "Everyday Carry Gear Bonus",
    objective: "Encourage responsible gear and accessories purchases through the USCCA store.",
    description:
      "Gear up and earn more. Earn double points — 2x — on all qualifying purchases of holsters, " +
      "safety equipment, cleaning kits, and accessories in the USCCA store. Whether you're " +
      "upgrading your everyday carry setup or stocking up on range essentials, every purchase " +
      "brings you closer to your next reward.",
    imageUrl:
      "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=600&h=340&fit=crop&q=80",
    startDate: "2026-03-01",
    endDate: "2026-09-30",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: null,
    category: "purchases",
  },
  {
    name: "Community Defender Challenge",
    objective: "Build community engagement through club events, meetups, and local chapter participation.",
    description:
      "Your community makes you stronger. Complete the Community Defender Challenge by attending " +
      "3 local USCCA chapter events, participating in 1 community safety seminar, and referring " +
      "1 new member. Finishing all three steps earns you 4,000 bonus points and a digital " +
      "Community Defender badge — recognizing your role as a pillar of responsible gun ownership in your area.",
    imageUrl:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=340&fit=crop&q=80",
    startDate: "2026-04-01",
    endDate: "2026-10-31",
    loyaltyPromotionType: "Cumulative",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 4000,
    category: "community",
  },
  {
    name: "Annual Member Loyalty Boost",
    objective: "Retain members by rewarding timely annual membership renewal.",
    description:
      "Loyalty deserves to be recognized. Renew your USCCA annual membership before your " +
      "expiration date and earn 2,000 bonus points — automatically deposited into your account. " +
      "Members who renew for 3 or more consecutive years receive an additional 1,000-point " +
      "longevity bonus, thanking you for your sustained commitment to the USCCA mission.",
    imageUrl:
      "https://images.unsplash.com/photo-1550353175-a3611868086b?w=600&h=340&fit=crop&q=80",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    loyaltyPromotionType: "Standard",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: 3000,
    category: "membership",
  },
  {
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
    startDate: "2026-02-01",
    endDate: "2026-11-30",
    loyaltyPromotionType: "Joint",
    isEnrollmentRequired: false,
    fulfillmentAction: "Points",
    maximumRewardValue: 2500,
    category: "partner",
  },
  {
    name: "USCCA Instructor Partner Network",
    objective: "Drive training enrollments through certified USCCA partner instructors and training facilities.",
    description:
      "Train with the best. When you book and complete a live training class at a USCCA-certified " +
      "partner training facility or with a registered USCCA Instructor, earn 2,000 bonus points. " +
      "Qualifying facilities offer everything from beginner pistol fundamentals to advanced " +
      "defensive shooting and low-light scenarios. Find a partner instructor near you and level up " +
      "your skills while earning rewards.",
    imageUrl:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=340&fit=crop&q=80",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    loyaltyPromotionType: "Joint",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 8000,
    category: "partner",
  },
  {
    name: "Safety Education Milestone Series",
    objective: "Encourage members to complete a full curriculum of self-defense and safety education content.",
    description:
      "Knowledge is your first line of defense. Complete the Safety Education Milestone Series — " +
      "a curated curriculum of online courses covering situational awareness, legal use of force, " +
      "first aid for gunshot wounds, and conflict avoidance — and earn up to 5,000 points in " +
      "staged milestone rewards. Each module completed unlocks the next and deposits points along " +
      "the way, celebrating your commitment to becoming a more prepared and responsible defender.",
    imageUrl:
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&h=340&fit=crop&q=80",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    loyaltyPromotionType: "Cumulative",
    isEnrollmentRequired: true,
    fulfillmentAction: "Points",
    maximumRewardValue: 5000,
    category: "education",
  },
];

// ── Auth ───────────────────────────────────────────────────────────────────────
async function getToken() {
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
  if (!res.ok) throw new Error(`Token error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sf(token, path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${token.instance_url}${path}`, opts);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Delta Defense Member Rewards — Promotion Setup");
  console.log("===============================================");

  const token = await getToken();
  console.log(`Connected: ${token.instance_url}`);

  // 1. Find the loyalty program ID
  console.log(`\n1. Looking up loyalty program: "${LOYALTY_PROGRAM_NAME}"...`);
  const lpRes = await sf(
    token,
    `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
      `SELECT Id, Name FROM LoyaltyProgram WHERE Name = '${LOYALTY_PROGRAM_NAME}'`
    )}`
  );
  const lpData = await lpRes.json();

  if (!lpRes.ok || !lpData.records || lpData.records.length === 0) {
    console.error(`   ✗ Loyalty program "${LOYALTY_PROGRAM_NAME}" not found.`);
    console.error("   Make sure the program exists in your org before running this script.");
    console.error("   SF response:", JSON.stringify(lpData).slice(0, 300));
    process.exit(1);
  }

  const programId = lpData.records[0].Id;
  console.log(`   ✓ Found program (Id: ${programId})`);

  // 2. Check for existing promotions to avoid duplicates
  console.log("\n2. Checking for existing promotions...");
  const existingRes = await sf(
    token,
    `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
      `SELECT Id, Name FROM Promotion WHERE LoyaltyProgramId = '${programId}'`
    )}`
  );
  const existingData = await existingRes.json();
  const existingNames = new Set((existingData.records || []).map((r) => r.Name));
  console.log(`   Found ${existingNames.size} existing promotion(s).`);

  // 3. Insert promotions
  console.log("\n3. Creating promotions...");
  const results = [];

  for (const promo of PROMOTIONS) {
    if (existingNames.has(promo.name)) {
      console.log(`   · "${promo.name}" — already exists, skipping`);
      results.push({ name: promo.name, status: "skipped" });
      continue;
    }

    const record = {
      Name: promo.name,
      LoyaltyProgramId: programId,
      Objective: promo.objective,
      Description: promo.description,
      ImageUrl: promo.imageUrl,
      StartDate: promo.startDate,
      EndDate: promo.endDate,
      CurrencyIsoCode: "USD",
      LoyaltyPromotionType: promo.loyaltyPromotionType || null,
      IsEnrollmentRequired: promo.isEnrollmentRequired,
      ...(promo.isEnrollmentRequired
        ? { EnrollmentStartDate: promo.startDate, EnrollmentEndDate: promo.endDate }
        : {}),
      ...(promo.loyaltyPromotionType === "Cumulative"
        ? { CumulativeUsageTarget: promo.cumulativeUsageTarget || 3 }
        : {}),
      ...(promo.maximumRewardValue != null
        ? { MaximumRewardValue: promo.maximumRewardValue }
        : {}),
    };

    const res = await sf(
      token,
      `/services/data/${API_VERSION}/sobjects/Promotion`,
      "POST",
      record
    );
    const data = await res.json();

    if (res.ok && data.success) {
      console.log(`   ✓ "${promo.name}" (Id: ${data.id})`);
      results.push({ name: promo.name, status: "created", id: data.id });
    } else {
      const errMsg = Array.isArray(data)
        ? data.map((e) => e.message).join("; ")
        : data.message || JSON.stringify(data).slice(0, 200);
      console.log(`   ✗ "${promo.name}" — ${res.status}: ${errMsg}`);
      results.push({ name: promo.name, status: "error", error: errMsg });
    }
  }

  // 4. Summary
  console.log("\n4. Summary");
  console.log("──────────────────────────────────────────────────────────────────────");
  const created = results.filter((r) => r.status === "created");
  const skipped = results.filter((r) => r.status === "skipped");
  const errors = results.filter((r) => r.status === "error");

  console.log(`   Created : ${created.length}`);
  console.log(`   Skipped : ${skipped.length} (already existed)`);
  console.log(`   Errors  : ${errors.length}`);

  if (errors.length > 0) {
    console.log("\n   Errors:");
    errors.forEach((e) => console.log(`   · ${e.name}: ${e.error}`));
  }

  // 5. Verify — list all promotions in the program
  console.log("\n5. Verification — all active promotions in Delta Defense Member Rewards:");
  const verifyRes = await sf(
    token,
    `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
      `SELECT Id, Name, LoyaltyPromotionType, IsEnrollmentRequired, StartDate, EndDate, Status ` +
      `FROM Promotion WHERE LoyaltyProgramId = '${programId}' ORDER BY Name ASC`
    )}`
  );
  const verifyData = await verifyRes.json();

  if (verifyRes.ok && verifyData.records) {
    console.log("");
    const pad = (s, n) => String(s || "").padEnd(n);
    console.log(`   ${"Name".padEnd(40)} ${"Type".padEnd(12)} ${"Enroll".padEnd(8)} ${"Status"}`);
    console.log(`   ${"─".repeat(40)} ${"─".repeat(12)} ${"─".repeat(8)} ${"─".repeat(10)}`);
    for (const r of verifyData.records) {
      console.log(
        `   ${pad(r.Name, 40)} ${pad(r.LoyaltyPromotionType, 12)} ${pad(r.IsEnrollmentRequired ? "Req" : "Open", 8)} ${r.Status}`
      );
    }
    console.log(`\n   Total: ${verifyData.records.length} promotion(s)`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
