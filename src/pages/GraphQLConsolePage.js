import React, { useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { runGraphQL } from "../services/sfApi";

const PRESETS = [
  {
    id: "overview",
    label: "Member Overview",
    blurb:
      "Member identity, program, contact, and every point currency in one round trip — two top-level queries, two object types.",
    query: `query memberOverview($membership: String) {
  uiapi {
    query {
      LoyaltyProgramMember(
        where: { MembershipNumber: { eq: $membership } }
        first: 1
      ) {
        edges {
          node {
            Id
            MembershipNumber { value }
            MemberStatus { value }
            EnrollmentDate { value }
            Program { Name { value } }
            Contact {
              FirstName { value }
              LastName { value }
              Email { value }
            }
          }
        }
      }
      LoyaltyMemberCurrency(
        where: { LoyaltyMember: { MembershipNumber: { eq: $membership } } }
      ) {
        edges {
          node {
            Id
            Name { value }
            PointsBalance { value }
            TotalPointsAccrued { value }
            TotalPointsRedeemed { value }
          }
        }
      }
    }
  }
}`,
  },
  {
    id: "promotions",
    label: "Active Promotions",
    blurb:
      "Promotions the member is enrolled in, with progress toward each cumulative-usage target and the underlying promotion definition.",
    query: `query memberPromotions($membership: String) {
  uiapi {
    query {
      LoyaltyProgramMbrPromotion(
        where: {
          LoyaltyProgramMember: { MembershipNumber: { eq: $membership } }
          IsEnrollmentActive: { eq: true }
        }
        first: 25
      ) {
        edges {
          node {
            Id
            IsEnrollmentActive { value }
            CumulativeUsageCompleted { value }
            CumulativeUsageTarget { value }
            CumulativeUsageCompletePercent { value }
            Promotion {
              Name { value }
              Description { value }
            }
          }
        }
      }
    }
  }
}`,
  },
  {
    id: "vouchers",
    label: "Vouchers",
    blurb:
      "Every voucher attached to the member with face value, expiration, and the voucher definition that issued it.",
    query: `query memberVouchers($membership: String) {
  uiapi {
    query {
      Voucher(
        where: { LoyaltyProgramMember: { MembershipNumber: { eq: $membership } } }
        orderBy: { ExpirationDate: { order: ASC } }
        first: 25
      ) {
        edges {
          node {
            Id
            VoucherCode { value }
            Status { value }
            FaceValue { displayValue }
            EffectiveDate { value }
            ExpirationDate { value }
            VoucherDefinition { Name { value } }
          }
        }
      }
    }
  }
}`,
  },
  {
    id: "tier",
    label: "Tier History",
    blurb:
      "Tier assignments for the member with effective and expiration dates, plus a join to the underlying tier definition.",
    query: `query memberTiers($membership: String) {
  uiapi {
    query {
      LoyaltyMemberTier(
        where: { LoyaltyMember: { MembershipNumber: { eq: $membership } } }
        orderBy: { EffectiveDate: { order: DESC } }
        first: 25
      ) {
        edges {
          node {
            Id
            Status { value }
            EnrollmentType { value }
            EffectiveDate { value }
            TierExpirationDate { value }
            ReasonForChange { value }
            LoyaltyTier { Name { value } }
          }
        }
      }
    }
  }
}`,
  },
];

function buildRequestDisplay(query, variables) {
  const indented = query
    .split("\n")
    .map((l) => "    " + l)
    .join("\n");
  const vars = JSON.stringify(variables, null, 2)
    .split("\n")
    .map((l, i) => (i === 0 ? l : "  " + l))
    .join("\n");
  return `{\n  "query": \`\n${indented}\n  \`,\n  "variables": ${vars}\n}`;
}

export default function GraphQLConsolePage() {
  const { member } = useApp();
  const [membership, setMembership] = useState(member?.membershipNumber || "YAH0000001");
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [error, setError] = useState(null);

  const preset = PRESETS.find((p) => p.id === presetId) || PRESETS[0];
  const variables = useMemo(() => ({ membership }), [membership]);
  const requestPayload = useMemo(
    () => ({ query: preset.query, variables }),
    [preset.query, variables]
  );
  const requestDisplay = useMemo(
    () => buildRequestDisplay(preset.query, variables),
    [preset.query, variables]
  );

  // Reset response when switching presets so panes don't disagree.
  useEffect(() => {
    setResult(null);
    setElapsed(null);
    setError(null);
  }, [presetId]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setElapsed(null);
    const t0 = performance.now();
    try {
      const { ok, status, data } = await runGraphQL(requestPayload);
      setElapsed(Math.round(performance.now() - t0));
      setResult({ ok, status, data });
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const onKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleRun();
  };

  const statusOk = result && result.ok && !result.data?.errors;

  return (
    <div className="gql-page">
      <div className="gql-page__header">
        <div>
          <h1>GraphQL Console</h1>
          <p>
            Send queries through the Salesforce GraphQL API
            (<code>/services/data/v66.0/graphql</code>) to read across multiple
            Loyalty objects in a single request.
          </p>
        </div>
      </div>

      <div className="gql-tabs">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`gql-tab ${p.id === presetId ? "gql-tab--active" : ""}`}
            onClick={() => setPresetId(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="gql-tabs__blurb">{preset.blurb}</p>

      <div className="gql-controls">
        <div className="gql-controls__input-group">
          <label htmlFor="gql-membership">Membership Number</label>
          <input
            id="gql-membership"
            type="text"
            value={membership}
            onChange={(e) => setMembership(e.target.value.trim())}
            onKeyDown={onKey}
            placeholder="YAH0000001"
            spellCheck={false}
          />
        </div>
        <button
          className="btn btn--primary gql-controls__run"
          onClick={handleRun}
          disabled={running || !membership}
        >
          {running ? "Running…" : "Run Query"}
        </button>
        <span className="gql-controls__hint">⌘ / Ctrl + Enter</span>
      </div>

      <div className="gql-grid">
        <section className="gql-pane">
          <header className="gql-pane__header">
            <span className="gql-pane__label">
              <span className="gql-pane__dot gql-pane__dot--req" />
              Request
            </span>
            <span className="gql-pane__meta">POST /api/loyalty/graphql</span>
          </header>
          <pre className="gql-pane__body">
            <code>{requestDisplay}</code>
          </pre>
        </section>

        <section className="gql-pane">
          <header className="gql-pane__header">
            <span className="gql-pane__label">
              <span
                className={`gql-pane__dot ${
                  result
                    ? statusOk
                      ? "gql-pane__dot--ok"
                      : "gql-pane__dot--err"
                    : "gql-pane__dot--idle"
                }`}
              />
              Response
            </span>
            <span className="gql-pane__meta">
              {result && (
                <>
                  HTTP {result.status}
                  {elapsed != null && <> · {elapsed} ms</>}
                </>
              )}
              {!result && !error && "—"}
            </span>
          </header>
          <pre className="gql-pane__body">
            <code>
              {error
                ? `// network error\n${error}`
                : result
                ? JSON.stringify(result.data, null, 2)
                : "// run the query to see the response"}
            </code>
          </pre>
        </section>
      </div>
    </div>
  );
}
