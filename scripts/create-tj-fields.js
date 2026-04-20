#!/usr/bin/env node
// Creates custom fields on the TransactionJournal object via Salesforce Tooling API.
// Run once: node scripts/create-tj-fields.js

require("dotenv").config();

const SF_LOGIN_URL = process.env.REACT_APP_SF_LOGIN_URL;
const SF_CLIENT_ID = process.env.REACT_APP_SF_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.REACT_APP_SF_CLIENT_SECRET;
const API_VERSION = "v59.0";

const FIELDS_TO_CREATE = [
  {
    FullName: "TransactionJournal.Destination_City__c",
    Metadata: {
      label: "Destination City",
      type: "Text",
      length: 100,
      description: "City name for the booking destination",
    },
  },
  {
    FullName: "TransactionJournal.Destination_Country__c",
    Metadata: {
      label: "Destination Country",
      type: "Text",
      length: 100,
      description: "Country name for the booking destination",
    },
  },
  {
    FullName: "TransactionJournal.LOB__c",
    Metadata: {
      label: "Line of Business",
      type: "Text",
      length: 50,
      description: "Line of business (Hotel, Flight, etc.)",
    },
  },
  {
    FullName: "TransactionJournal.Length_of_Stay__c",
    Metadata: {
      label: "Length of Stay",
      type: "Text",
      length: 10,
      description: "Number of nights for hotel stays",
    },
  },
  {
    FullName: "TransactionJournal.Cash_Paid__c",
    Metadata: {
      label: "Cash Paid",
      type: "Currency",
      precision: 18,
      scale: 2,
      description: "Cash amount paid for the booking",
    },
  },
  {
    FullName: "TransactionJournal.Payment_Type__c",
    Metadata: {
      label: "Payment Type",
      type: "Text",
      length: 50,
      description: "Payment type (Cash, Points, Mixed)",
    },
  },
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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error: ${res.status} ${text}`);
  }
  return res.json();
}

async function createField(token, fieldDef) {
  const url = `${token.instance_url}/services/data/${API_VERSION}/tooling/sobjects/CustomField`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fieldDef),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (res.ok) {
    console.log(`  ✓ Created: ${fieldDef.FullName} (id: ${data.id})`);
  } else if (res.status === 400 && JSON.stringify(data).includes("duplicate")) {
    console.log(`  · Already exists: ${fieldDef.FullName}`);
  } else {
    console.log(`  ✗ Failed: ${fieldDef.FullName} — ${res.status} ${JSON.stringify(data)}`);
  }
}

async function main() {
  console.log("Authenticating with Salesforce...");
  const token = await getToken();
  console.log(`Connected to: ${token.instance_url}\n`);

  console.log("Creating custom fields on TransactionJournal:");
  for (const field of FIELDS_TO_CREATE) {
    await createField(token, field);
  }
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
