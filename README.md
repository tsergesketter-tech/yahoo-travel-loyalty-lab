# Yahoo Travel Loyalty Lab

A full-stack demo application integrating **Salesforce Loyalty Management** with a React travel booking frontend. Search hotels and flights, earn and redeem Yahoo Points, view promotions, and track transaction history — all powered by live Salesforce APIs.

**Live:** [yahoo-app on Heroku](https://yahoo-app-aeedb031fccb.herokuapp.com)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  React Frontend (port 3000 dev / served from build) │
│  - Hotel & Flight Search                            │
│  - Member Profile & Transaction Ledger              │
│  - Promotions & Engagement Trails                   │
│  - Checkout with SF Transaction Journal posting     │
└──────────────────────┬──────────────────────────────┘
                       │ fetch("/api/loyalty/...")
┌──────────────────────▼──────────────────────────────┐
│  Express API Server (server.js)                     │
│  - OAuth2 client_credentials token management       │
│  - Proxy to Salesforce REST + Connect APIs          │
│  - Response normalization                           │
└──────────────────────┬──────────────────────────────┘
                       │ SF REST API v66.0
┌──────────────────────▼──────────────────────────────┐
│  Salesforce Loyalty Management                      │
│  - Program: "Yahoo Rewards"                         │
│  - Currencies: Y! Points, Tier Points               │
│  - Promotions, Vouchers, Badges, Engagement Trails  │
│  - Transaction Journal Processing                   │
└─────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js >= 18
- A Salesforce org with Loyalty Management enabled
- Connected App credentials (client_credentials flow)

### Local Development

```bash
# 1. Clone
git clone https://github.com/tsergesketter-tech/yahoo-travel-loyalty-lab.git
cd yahoo-travel-loyalty-lab

# 2. Configure environment
cp .env.example .env
# Edit .env with your Salesforce credentials

# 3. Install dependencies
npm install

# 4. Start backend API server
npm run server          # runs on :3002

# 5. Start React dev server (separate terminal)
npm run dev             # runs on :3000
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_SF_CLIENT_ID` | Connected App consumer key | `3MVG9OGq41F...` |
| `REACT_APP_SF_CLIENT_SECRET` | Connected App consumer secret | `1257EC8143B...` |
| `REACT_APP_SF_LOGIN_URL` | Salesforce instance URL | `https://myorg.my.salesforce.com` |
| `REACT_APP_SF_API_VERSION` | SF API version | `v66.0` |
| `REACT_APP_API_URL` | Backend URL (local dev only) | `http://localhost:3002` |

### Heroku Deployment

The app is configured for Heroku out of the box:
- `heroku-postbuild` builds the React frontend
- `npm start` runs the Express server which serves the build folder + API
- Set the four `REACT_APP_SF_*` config vars in Heroku Settings
- No need to set `REACT_APP_API_URL` — defaults to same-origin

---

## API Reference

Base URL: `http://localhost:3002` (local) or your Heroku app URL

### `GET /api/health`

Health check. Returns server status and program name.

**Response:**
```json
{
  "ok": true,
  "program": "Yahoo Rewards"
}
```

---

### `GET /api/loyalty/member-profile`

Retrieve a loyalty member's full profile including points balances, tier, and enrollment info.

**SF API:** `GET /services/data/v66.0/loyalty-programs/{program}/members?membershipNumber={num}`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `membershipNumber` | query | Yes | e.g. `YAH0000001` |

**Response:**
```json
{
  "associatedContact": {
    "contactId": "003Hn00002meRspIAE",
    "email": null,
    "firstName": "Elliott",
    "lastName": "Dumville"
  },
  "enrollmentDate": "2026-04-01",
  "loyaltyProgramMemberId": "0lMHn0000011hY2MAI",
  "loyaltyProgramName": "Yahoo Rewards",
  "memberCurrencies": [
    {
      "loyaltyMemberCurrencyName": "Y! Points",
      "pointsBalance": 55391.5,
      "totalPointsAccrued": 59891.5,
      "totalPointsRedeemed": 4500,
      "lastAccrualProcessedDate": "2026-04-21T00:19:34.000Z"
    }
  ],
  "memberTiers": [
    {
      "loyaltyMemberTierName": "Explorer",
      "tierSequenceNumber": 1
    }
  ],
  "membershipNumber": "YAH0000001",
  "memberStatus": "Active"
}
```

---

### `POST /api/loyalty/transactions`

Query the Transaction Ledger Summary with filtering and pagination.

**SF API:** `GET /services/data/v66.0/loyalty/programs/{program}/members/{membership}/transaction-ledger-summary`

**Request Body:**
```json
{
  "membershipNumber": "YAH0000001",
  "pageNumber": 1,
  "journalTypeName": "Accrual",
  "journalSubTypeName": "Hotel Booking",
  "periodStartDate": "2026-04-01",
  "periodEndDate": "2026-04-30"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `membershipNumber` | string | No | Defaults to `YAH0000001` |
| `pageNumber` | number | No | Defaults to `1` |
| `journalTypeName` | string | No | `Accrual` or `Redemption` |
| `journalSubTypeName` | string | No | e.g. `Hotel Booking`, `Flight Booking`, `Redeem Points` |
| `periodStartDate` | string | No | ISO date `YYYY-MM-DD` |
| `periodEndDate` | string | No | ISO date `YYYY-MM-DD` |

**Response:**
```json
{
  "items": [
    {
      "id": "0lVHn000000kBqzMAE",
      "date": "2026-04-21T00:19:33.000Z",
      "type": "Accrual",
      "subType": "Flight Booking",
      "pointsChange": 940.5,
      "currencyName": "Y! Points",
      "status": "Processed",
      "transactionAmount": 188.1,
      "journalId": "0lVHn000000kBqzMAE",
      "journalNumber": "00001184",
      "externalTransactionNumber": "BK-1776730773525"
    }
  ],
  "page": 1,
  "totalCount": 9,
  "nextPage": null
}
```

---

### `POST /api/loyalty/transaction-journal`

Post real transaction journals to Salesforce (accrual, redemption). This is NOT a simulation — it creates actual journal records and triggers point processing rules.

**SF API:** `POST /services/data/v64.0/connect/realtime/loyalty/programs/{program}` with `isSimulation: false`

**Request Body:**
```json
{
  "transactionJournals": [
    {
      "ExternalTransactionNumber": "BK-1776719528997",
      "MembershipNumber": "YAH0000001",
      "JournalTypeName": "Accrual",
      "JournalSubTypeName": "Hotel Booking",
      "ActivityDate": "2026-04-20T21:12:08.000Z",
      "CurrencyIsoCode": "USD",
      "TransactionAmount": "3640",
      "Channel": "Web",
      "LOB__c": "Hotel",
      "Destination_City__c": "Barcelona",
      "Destination_Country__c": "Spain",
      "Length_of_Stay__c": "7",
      "Comment": "W Barcelona — 7 nights"
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "journalIds": ["0lVHn000000kBquMAE"],
  "pointsChanges": [
    {
      "changeInPointsBalance": 29120,
      "loyaltyProgramCurrencyName": "Y! Points"
    }
  ],
  "transactionJournals": [...]
}
```

---

### `POST /api/loyalty/simulate`

Simulate a transaction to preview points earned/redeemed WITHOUT creating actual records.

**SF API:** `POST /services/data/v64.0/connect/realtime/loyalty/programs/{program}` with `isSimulation: true`

**Request Body:**
```json
{
  "membershipNumber": "YAH0000001",
  "transactionJournals": [
    {
      "JournalTypeName": "Accrual",
      "JournalSubTypeName": "Hotel Booking",
      "TransactionAmount": 500,
      "CurrencyIsoCode": "USD",
      "LOB__c": "Hotel",
      "Destination_City__c": "Paris",
      "Length_of_Stay__c": "3"
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "index": 0,
      "byCurrency": {
        "Y! Points": 4000
      },
      "processName": "Hotel Booking",
      "processRules": [
        {
          "ruleName": "Base Earn Rule",
          "rewards": []
        }
      ],
      "errorMessage": null
    }
  ]
}
```

**Use Cases:**
- Show estimated earn on hotel/flight search result cards
- Preview points before checkout
- Display "what if" scenarios in the Simulator tab

---

### `GET /api/loyalty/promotions`

Fetch all active promotions, member enrollment status, and eligible promotions.

**SF API:** SOQL queries on `Promotion`, `LoyaltyProgramMbrPromotion`, and `LoyaltyPgmMbrPromEligView`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `membershipNumber` | query | No | Defaults to `YAH0000001` |

**Response:**
```json
{
  "promotions": [
    {
      "Id": "0c8Hn0000011qoJIAQ",
      "Name": "Yahoo Travel: 5% Off New York",
      "Description": null,
      "StartDate": "2026-04-01",
      "EndDate": null,
      "LoyaltyPromotionType": null,
      "IsActive": true,
      "FulfillmentAction": null,
      "IsEnrollmentRequired": false,
      "MaximumRewardValue": null
    }
  ],
  "memberPromotions": [
    {
      "Id": "0c9Hn000001abc",
      "PromotionId": "0c8Hn0000011qoJ",
      "CumulativeUsageTarget": 5,
      "CumulativeUsageCompleted": 2,
      "CumulativeUsageCompletePercent": 40,
      "IsEnrollmentActive": true
    }
  ],
  "eligiblePromotions": [
    {
      "PromotionId": "0c8Hn0000011qoJ",
      "PromotionName": "Yahoo Travel: 5% Off New York",
      "LoyaltyPromotionType": "Standard",
      "StartDate": "2026-04-01",
      "Configuration": "milestone"
    }
  ]
}
```

---

### `POST /api/loyalty/eligible-promotions`

Cart-based promotion lookup — send a cart with origin/destination to find applicable promotions and discounts.

**SF API:** `POST /services/data/v64.0/global-promotions-management/eligible-promotions`

**Request Body:**
```json
{
  "cart": {
    "cartDetails": [
      {
        "activityStartDate": "2026-05-20T00:00:00.000Z",
        "membershipNumber": "YAH0000001",
        "currencyISOCode": "USD",
        "transactionAmount": 1000,
        "origin": "San Francisco",
        "destination": "New York"
      }
    ]
  }
}
```

**Response:**
```json
{
  "eligiblePromotions": [
    {
      "displayName": "Yahoo Travel: 5% Off New York",
      "promotionId": "0c8Hn0000011qoJIAQ",
      "isAutomatic": true,
      "promotionEligibleRules": [
        {
          "ruleName": "NYC",
          "rulePriority": 1,
          "ruleRewards": [
            {
              "rewardType": "ProvideDiscount",
              "rewardDetails": {
                "discountLevel": "Cart",
                "discountType": "PercentageOff",
                "discountValue": "5.0"
              }
            }
          ]
        }
      ],
      "startDateTime": "2026-04-01T22:06:00.000Z"
    }
  ]
}
```

**Reward Types:**
- `ProvideDiscount` — percentage or fixed amount off
- `CreditFixedPoints` — bonus points awarded

---

### `GET /api/loyalty/engagement-trail/:promotionId`

Get the engagement trail (step-by-step progress) for a specific promotion.

**SF API:** `GET /services/data/v63.0/loyalty/programs/{program}/members/{membership}/engagement-trail?promotionId={id}`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `promotionId` | path | Yes | Salesforce Promotion ID |
| `membershipNumber` | query | No | Defaults to `YAH0000001` |

**Response:**
```json
{
  "promotionId": "0c8Hn0000011qWVIAY",
  "promotionName": "Engagement Trail",
  "totalSteps": 3,
  "completedSteps": 1,
  "currentStepNumber": 2,
  "overallStatus": "InProgress",
  "totalPossiblePoints": 5000,
  "earnedPoints": 1666,
  "steps": [
    {
      "id": "step-1",
      "name": "Book 3 Hotels",
      "stepNumber": 1,
      "status": "Completed",
      "requiredCount": 3,
      "currentCount": 3,
      "rewardPoints": 1666
    },
    {
      "id": "step-2",
      "name": "Book 2 Flights",
      "stepNumber": 2,
      "status": "InProgress",
      "requiredCount": 2,
      "currentCount": 1,
      "rewardPoints": 1666
    }
  ]
}
```

---

### `POST /api/loyalty/promotion-evaluation`

Evaluate and execute promotion rules for a member.

**SF API:** `POST /services/data/v64.0/loyalty/programs/{program}/promotion-evaluation-and-execution`

---

### `GET /api/loyalty/vouchers`

Retrieve member vouchers.

**SF API:** `GET /services/data/v63.0/loyalty/programs/{program}/members/{membership}/vouchers`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `membershipNumber` | query | No | Defaults to `YAH0000001` |

**Response:**
```json
{
  "vouchers": [
    {
      "id": "0kpXX0000001234",
      "type": "Discount Voucher",
      "code": "YAHOO-25OFF",
      "value": 25,
      "currency": "USD",
      "expiresOn": "2026-12-31",
      "status": "Active"
    }
  ],
  "totalCount": 1
}
```

---

### `GET /api/loyalty/badges`

Retrieve badges earned by a specific loyalty member.

**SF API:** SOQL on `LoyaltyProgramMemberBadge` joined to `LoyaltyProgramBadge`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `membershipNumber` | query | No | Defaults to `YAH0000001` |

**Response:**
```json
{
  "badges": [
    {
      "id": "0w9Hn000000XbIuIAK",
      "name": "5 Day Fantasy Streak",
      "description": "Play Fantasy 5 Days Running",
      "imageUrl": "https://trailsignup-78f9c4eccfa797.file.force.com/sfc/servlet.shepherd/version/download/068Hn00000OcpX2",
      "status": "Active"
    },
    {
      "id": "0w9Hn000000XbIvIAK",
      "name": "International Traveler",
      "description": "Book Trips to 3 Different Continents",
      "imageUrl": null,
      "status": "Active"
    },
    {
      "id": "0w9Hn000000XbItIAK",
      "name": "Mail Champ",
      "description": "Keep 0 Inbox for 7 consecutive Days!",
      "imageUrl": null,
      "status": "Active"
    },
    {
      "id": "0w9Hn000000XbIwIAK",
      "name": "Digital Oracle",
      "description": "Upgrade to Finance Premium",
      "imageUrl": null,
      "status": "Active"
    }
  ],
  "totalCount": 4
}
```

---

### `GET /api/loyalty/query`

SOQL query proxy for exploration and debugging.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | query | Yes | SOQL query string |

**Example:**
```
GET /api/loyalty/query?q=SELECT Id, Name FROM Promotion WHERE IsActive = true
```

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Featured destinations, booking shortcuts, loyalty tips |
| `/hotels` | Hotel Search | Search with date picker, SF earn simulation per result |
| `/stay/:id` | Hotel Detail | Room selection, earn/burn preview, SF promotions |
| `/flights` | Flight Search | Route search with SF simulation and eligible promotions |
| `/checkout` | Checkout | Posts transaction journals to SF on booking |
| `/confirmation` | Confirmation | Booking success with points earned summary |
| `/promotions` | Promotions | SF promotions with category/type/enrollment filters |
| `/member` | Member Profile | Profile, transactions, badges, vouchers, simulator |

---

## Salesforce Configuration

### Loyalty Program
- **Program Name:** Yahoo Rewards
- **Currencies:** Y! Points, Tier Points
- **Tiers:** Explorer, Voyager, Navigator, Globetrotter

### Custom Transaction Journal Fields
| Field | API Name | Type |
|-------|----------|------|
| Cash Paid | `Cash_Paid__c` | Text |
| Line of Business | `LOB__c` | Text |
| Destination City | `Destination_City__c` | Text |
| Destination Country | `Destination_Country__c` | Text |
| Length of Stay | `Length_of_Stay__c` | Text |
| Points to Redeem | `Points_to_Redeem__c` | Text |
| Payment Type | `Payment_Type__c` | Text |
| Booking Date | `BookingDate` | DateTime |
| Start Date | `StartDate` | DateTime |
| End Date | `EndDate` | DateTime |

### Journal Sub-Types
- **Accrual:** Hotel Booking, Flight Booking, Car Booking, Purchase
- **Redemption:** Redeem Points, Redeem Reward

---

## Direct Salesforce API Reference

The Postman collection hits Salesforce APIs directly (no proxy server). All requests require a Bearer token obtained via OAuth2.

### Authentication

```
POST {instance_url}/services/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={consumer_key}&client_secret={consumer_secret}
```

**Response:**
```json
{
  "access_token": "00DHn000...",
  "instance_url": "https://trailsignup-78f9c4eccfa797.my.salesforce.com",
  "token_type": "Bearer"
}
```

Use the `access_token` as `Authorization: Bearer {token}` on all subsequent requests.

---

### Member Profile

```
GET /services/data/v66.0/loyalty-programs/{program}/members?membershipNumber={num}
```

Returns full member profile: points balances, tier, currencies, enrollment info.

---

### Transaction Ledger Summary

```
GET /services/data/v66.0/loyalty/programs/{program}/members/{membership}/transaction-ledger-summary
```

| Query Param | Description |
|-------------|-------------|
| `pageNumber` | Page number (default 1) |
| `journalTypeName` | `Accrual` or `Redemption` |
| `journalSubTypeName` | `Hotel Booking`, `Flight Booking`, `Car Booking`, `Purchase`, `Redeem Points`, `Redeem Reward` |
| `periodStartDate` | `YYYY-MM-DD` |
| `periodEndDate` | `YYYY-MM-DD` |

**Response shape:** `{ transactionJournals: [...], totalCount, nextPage }`

Each journal has `pointsChange` as an array: `[{ changeInPoints, loyaltyMemberCurrency }]`

---

### Realtime Loyalty Program Process

```
POST /services/data/v64.0/connect/realtime/loyalty/programs/{program}
Content-Type: application/json
```

Handles both real transactions and simulations via the `isSimulation` flag.

**Request Body (Accrual):**
```json
{
  "transactionJournals": [
    {
      "ExternalTransactionNumber": "BK-001",
      "MembershipNumber": "YAH0000001",
      "JournalTypeName": "Accrual",
      "JournalSubTypeName": "Hotel Booking",
      "ActivityDate": "2026-04-20T15:00:00.000Z",
      "CurrencyIsoCode": "USD",
      "TransactionAmount": "475",
      "Channel": "Web",
      "LOB__c": "Hotel",
      "Destination_City__c": "Paris",
      "Destination_Country__c": "France",
      "Length_of_Stay__c": "3"
    }
  ],
  "runSetting": {
    "isSimulation": false
  }
}
```

Set `isSimulation: true` to preview points without creating records.

**Response (real):** Returns `transactionJournals` with `pointsChange` arrays showing points credited.

**Response (simulation):** Returns `outputResult.outputParameters.results` with simulated points per currency and matching process rules.

---

### Eligible Promotions (Global Promotions Management)

```
POST /services/data/v64.0/global-promotions-management/eligible-promotions
Content-Type: application/json
```

**Request Body:**
```json
{
  "cart": {
    "cartDetails": [
      {
        "activityStartDate": "2026-05-20T00:00:00.000Z",
        "membershipNumber": "YAH0000001",
        "currencyISOCode": "USD",
        "transactionAmount": 1000,
        "origin": "San Francisco",
        "destination": "New York"
      }
    ]
  }
}
```

> **Note:** `transactionAmount` must be > $500 for current promotion rules to match.

**Response:** Returns `eligiblePromotions[]` with `promotionEligibleRules[].ruleRewards[]` containing reward types:
- `ProvideDiscount` — percentage or fixed amount off
- `CreditFixedPoints` — bonus points awarded

---

### Engagement Trail

```
GET /services/data/v63.0/loyalty/programs/{program}/members/{membership}/engagement-trail?promotionId={id}
```

Returns step-by-step progress for milestone promotions: completed/total steps, earned/possible points, per-step status.

---

### Promotion Evaluation & Execution

```
POST /services/data/v64.0/loyalty/programs/{program}/promotion-evaluation-and-execution
Content-Type: application/json
```

```json
{
  "membershipNumber": "YAH0000001",
  "promotionId": "0c8Hn0000011qoJIAQ"
}
```

---

### Vouchers

```
GET /services/data/v63.0/loyalty/programs/{program}/members/{membership}/vouchers
```

---

### SOQL Queries

```
GET /services/data/v66.0/query?q={SOQL}
```

**Useful queries included in the Postman collection:**

| Query | Description |
|-------|-------------|
| `SELECT ... FROM Promotion WHERE IsActive = true` | Active promotions |
| `SELECT ... FROM LoyaltyProgramMbrPromotion` | Member promotion enrollments |
| `SELECT ... FROM LoyaltyPgmMbrPromEligView` | Eligible promotions view |
| `SELECT ... FROM LoyaltyProgramMemberBadge` | Member badges (joined to `LoyaltyProgramBadge`) |
| `SELECT ... FROM LoyaltyProgramBadge` | All program badges |
| `SELECT ... FROM LoyaltyProgramMember LIMIT 10` | Program members |
| `SELECT ... FROM TransactionJournal ORDER BY ActivityDate DESC` | Recent transactions |

---

## Postman Collection

Import `postman/Yahoo_Travel_Loyalty_Lab.postman_collection.json` into Postman.

The collection hits **Salesforce APIs directly** (not the proxy server). Setup:

1. Set `sf_client_id` and `sf_client_secret` from your Connected App
2. Run the **"Get Access Token"** request first — it auto-sets `sf_access_token` via test script
3. All subsequent requests use Bearer auth automatically via collection-level auth

**Collection variables:**

| Variable | Description |
|----------|-------------|
| `sf_instance_url` | Salesforce instance URL |
| `sf_client_id` | Connected App consumer key |
| `sf_client_secret` | Connected App consumer secret |
| `sf_access_token` | Auto-populated by auth request |
| `sf_api_version` | `v66.0` |
| `loyalty_program` | `Yahoo Rewards` |
| `membership_number` | `YAH0000001` |

**Sections:** Authentication, Member Profile, Transaction Ledger Summary (4 variants), Realtime Loyalty Program Process (5 requests), Promotions (4 requests), Vouchers, SOQL Queries (7 queries)

---

## Tech Stack

- **Frontend:** React 19, React Router 7, CSS (no framework)
- **Backend:** Express 5, Node.js
- **Salesforce:** Loyalty Management, Connect API, Global Promotions Management
- **Auth:** OAuth2 client_credentials flow
- **Deployment:** Heroku (GitHub pipeline)
