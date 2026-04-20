#!/usr/bin/env node
// Creates Yahoo_Tier_Multiplier__c via Metadata API (deploy), then populates records.
// Run once: node scripts/create-tier-multipliers.js

require("dotenv").config();

const SF_LOGIN_URL = process.env.REACT_APP_SF_LOGIN_URL;
const SF_CLIENT_ID = process.env.REACT_APP_SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.REACT_APP_SF_CLIENT_SECRET;
const API_VERSION = "v59.0";

const TIER_DATA = [
  { tier: "Purple",      hotelEarn: 5,  flightEarn: 3,  hotelBurn: 100, flightBurn: 120 },
  { tier: "Violet",      hotelEarn: 8,  flightEarn: 5,  hotelBurn: 90,  flightBurn: 110 },
  { tier: "Ultraviolet", hotelEarn: 12, flightEarn: 8,  hotelBurn: 80,  flightBurn: 95  },
  { tier: "Amethyst",    hotelEarn: 18, flightEarn: 12, hotelBurn: 65,  flightBurn: 80  },
];

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

// Metadata API via composite — create object + fields in one shot
async function createObjectViaMetadata(token) {
  console.log("\n1. Creating object via Metadata API...");

  const metadata = [{
    fullName: "Yahoo_Tier_Multiplier__c",
    label: "Yahoo Tier Multiplier",
    pluralLabel: "Yahoo Tier Multipliers",
    nameField: { label: "Multiplier Name", type: "Text" },
    deploymentStatus: "Deployed",
    sharingModel: "ReadWrite",
    description: "Lookup table for tier-based earn and burn rates across Hotels and Flights",
  }];

  const res = await sf(
    token,
    `/services/data/${API_VERSION}/tooling/sobjects/CustomObject`,
    "POST",
    { FullName: "Yahoo_Tier_Multiplier__c", Metadata: metadata[0] }
  );

  // Tooling API for CustomObject requires different payload format
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  if (res.ok) {
    console.log(`   ✓ Object created (id: ${parsed.id || parsed})`);
    return true;
  }

  // Try Metadata CRUD API instead
  console.log("   Trying Metadata CRUD API...");

  const mdRes = await fetch(`${token.instance_url}/services/data/${API_VERSION}/tooling/composite`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      allOrNone: false,
      compositeRequest: [{
        method: "POST",
        url: `/services/data/${API_VERSION}/sobjects/CustomObject__c`,
        referenceId: "createObj",
        body: metadata[0],
      }],
    }),
  });

  // That won't work either. Let's use the Metadata REST endpoint
  console.log("   Trying Metadata REST deploy...");

  // Use the metadata deploy endpoint
  const mdCreateRes = await fetch(
    `${token.instance_url}/services/data/${API_VERSION}/metadata/create`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Metadata: {
          type: "CustomObject",
          fullName: "Yahoo_Tier_Multiplier__c",
          label: "Yahoo Tier Multiplier",
          pluralLabel: "Yahoo Tier Multipliers",
          nameField: { label: "Multiplier Name", type: "Text" },
          deploymentStatus: "Deployed",
          sharingModel: "ReadWrite",
        },
      }),
    }
  );

  const mdText = await mdCreateRes.text();
  console.log(`   Metadata REST: ${mdCreateRes.status} — ${mdText.slice(0, 200)}`);
  return false;
}

// Use the MDAPI SOAP-style create via REST
async function createObjectViaMdapi(token) {
  console.log("\n1. Creating custom object via Metadata API...");

  // The correct Tooling API for custom objects requires this format
  const objectBody = {
    Metadata: {
      label: "Yahoo Tier Multiplier",
      pluralLabel: "Yahoo Tier Multipliers",
      nameField: { label: "Multiplier Name", type: "Text" },
      deploymentStatus: "Deployed",
      sharingModel: "ReadWrite",
      description: "Lookup table for tier-based earn and burn rates",
    },
    FullName: "Yahoo_Tier_Multiplier__c",
  };

  // Use Tooling API with FullName in the body (not column)
  const res = await fetch(
    `${token.instance_url}/services/data/${API_VERSION}/tooling/sobjects/CustomObject`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(objectBody),
    }
  );

  const text = await res.text();
  console.log(`   Response: ${res.status} — ${text.slice(0, 300)}`);
  return res.ok;
}

async function main() {
  console.log("Yahoo Tier Multiplier Setup");
  console.log("==========================");
  const token = await getToken();
  console.log(`Connected: ${token.instance_url}`);

  // Check if object already exists
  const checkRes = await sf(token, `/services/data/${API_VERSION}/sobjects/Yahoo_Tier_Multiplier__c/describe`);
  if (checkRes.ok) {
    console.log("\n   Object Yahoo_Tier_Multiplier__c already exists.");
  } else {
    // Try creating via Tooling API
    await createObjectViaMdapi(token);

    // Wait and retry describe
    console.log("   Waiting for deployment...");
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const retry = await sf(token, `/services/data/${API_VERSION}/sobjects/Yahoo_Tier_Multiplier__c/describe`);
      if (retry.ok) {
        console.log("   ✓ Object is live!");
        break;
      }
      if (i === 9) {
        console.log("   ✗ Object not available after 30s. It may still be deploying.");
        console.log("     Re-run this script in a minute.");
        return;
      }
      process.stdout.write(".");
    }
  }

  // 2. Create fields
  console.log("\n2. Creating custom fields...");
  const fields = [
    { name: "Tier__c", label: "Tier", type: "Text", length: 50, unique: true, externalId: true },
    { name: "Hotel_Earn_Rate__c", label: "Hotel Earn Rate", type: "Number", precision: 18, scale: 2 },
    { name: "Flight_Earn_Rate__c", label: "Flight Earn Rate", type: "Number", precision: 18, scale: 2 },
    { name: "Hotel_Burn_Rate__c", label: "Hotel Burn Rate", type: "Number", precision: 18, scale: 2 },
    { name: "Flight_Burn_Rate__c", label: "Flight Burn Rate", type: "Number", precision: 18, scale: 2 },
  ];

  // Check what fields already exist
  const descRes = await sf(token, `/services/data/${API_VERSION}/sobjects/Yahoo_Tier_Multiplier__c/describe`);
  const descData = await descRes.json();
  const existingFields = (descData.fields || []).map((f) => f.name);

  for (const f of fields) {
    if (existingFields.includes(f.name)) {
      console.log(`   · ${f.name} — already exists`);
      continue;
    }

    const fieldDef = {
      FullName: `Yahoo_Tier_Multiplier__c.${f.name}`,
      Metadata: {
        label: f.label,
        type: f.type,
        ...(f.length ? { length: f.length } : {}),
        ...(f.precision ? { precision: f.precision } : {}),
        ...(f.scale !== undefined ? { scale: f.scale } : {}),
        ...(f.unique ? { unique: f.unique } : {}),
        ...(f.externalId ? { externalId: f.externalId } : {}),
        description: `${f.label} for Yahoo Rewards tier`,
      },
    };

    const res = await fetch(
      `${token.instance_url}/services/data/${API_VERSION}/tooling/sobjects/CustomField`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fieldDef),
      }
    );

    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    if (res.ok) {
      console.log(`   ✓ ${f.name} (id: ${parsed.id})`);
    } else if (JSON.stringify(parsed).includes("duplicate")) {
      console.log(`   · ${f.name} — already exists`);
    } else {
      console.log(`   ✗ ${f.name} — ${res.status}`, JSON.stringify(parsed).slice(0, 150));
    }
  }

  // 3. Grant FLS
  console.log("\n3. Granting field-level security...");
  const psRes = await sf(
    token,
    `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
      "SELECT Id FROM PermissionSet WHERE ProfileId IN (SELECT Id FROM Profile WHERE Name = 'System Administrator') LIMIT 1"
    )}`
  );
  const psData = await psRes.json();
  const permSetId = psData.records?.[0]?.Id;

  if (permSetId) {
    for (const f of fields) {
      const fls = {
        ParentId: permSetId,
        SobjectType: "Yahoo_Tier_Multiplier__c",
        Field: `Yahoo_Tier_Multiplier__c.${f.name}`,
        PermissionsRead: true,
        PermissionsEdit: true,
      };
      const res = await sf(token, `/services/data/${API_VERSION}/sobjects/FieldPermissions`, "POST", fls);
      if (res.ok) {
        console.log(`   ✓ ${f.name}`);
      } else {
        const err = await res.text();
        if (err.includes("duplicate") || err.includes("DUPLICATE")) {
          console.log(`   · ${f.name} — already granted`);
        } else {
          console.log(`   ✗ ${f.name} — ${err.slice(0, 100)}`);
        }
      }
    }
  }

  // Wait for field deployment
  console.log("\n   Waiting for fields...");
  await new Promise((r) => setTimeout(r, 3000));

  // 4. Insert records
  console.log("\n4. Inserting tier multiplier records...");

  let existingTiers = [];
  try {
    const checkRes = await sf(
      token,
      `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
        "SELECT Tier__c FROM Yahoo_Tier_Multiplier__c"
      )}`
    );
    const checkData = await checkRes.json();
    existingTiers = (checkData.records || []).map((r) => r.Tier__c);
  } catch {}

  for (const row of TIER_DATA) {
    if (existingTiers.includes(row.tier)) {
      console.log(`   · ${row.tier} — already exists`);
      continue;
    }

    const record = {
      Name: `${row.tier} Tier Rates`,
      Tier__c: row.tier,
      Hotel_Earn_Rate__c: row.hotelEarn,
      Flight_Earn_Rate__c: row.flightEarn,
      Hotel_Burn_Rate__c: row.hotelBurn,
      Flight_Burn_Rate__c: row.flightBurn,
    };

    const res = await sf(
      token,
      `/services/data/${API_VERSION}/sobjects/Yahoo_Tier_Multiplier__c`,
      "POST",
      record
    );
    const data = await res.json();

    if (res.ok) {
      console.log(`   ✓ ${row.tier} (id: ${data.id})`);
    } else {
      console.log(`   ✗ ${row.tier} — ${res.status}`, JSON.stringify(data).slice(0, 150));
    }
  }

  // 5. Verify
  console.log("\n5. Verifying...");
  try {
    const vRes = await sf(
      token,
      `/services/data/${API_VERSION}/query?q=${encodeURIComponent(
        "SELECT Name, Tier__c, Hotel_Earn_Rate__c, Flight_Earn_Rate__c, Hotel_Burn_Rate__c, Flight_Burn_Rate__c FROM Yahoo_Tier_Multiplier__c ORDER BY Hotel_Earn_Rate__c ASC"
      )}`
    );
    const vData = await vRes.json();

    console.log("");
    console.log("   ┌──────────────┬──────────────┬───────────────┬──────────────┬───────────────┐");
    console.log("   │ Tier         │ Hotel Earn   │ Flight Earn   │ Hotel Burn   │ Flight Burn   │");
    console.log("   │              │ (pts/$)      │ (pts/$)       │ (pts/$)      │ (pts/$)       │");
    console.log("   ├──────────────┼──────────────┼───────────────┼──────────────┼───────────────┤");

    for (const r of vData.records || []) {
      const t = (r.Tier__c || "").padEnd(12);
      const he = String(r.Hotel_Earn_Rate__c ?? "-").padEnd(12);
      const fe = String(r.Flight_Earn_Rate__c ?? "-").padEnd(13);
      const hb = String(r.Hotel_Burn_Rate__c ?? "-").padEnd(12);
      const fb = String(r.Flight_Burn_Rate__c ?? "-").padEnd(13);
      console.log(`   │ ${t} │ ${he} │ ${fe} │ ${hb} │ ${fb} │`);
    }

    console.log("   └──────────────┴──────────────┴───────────────┴──────────────┴───────────────┘");
  } catch (e) {
    console.log("   Verify query failed:", e.message);
  }

  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
