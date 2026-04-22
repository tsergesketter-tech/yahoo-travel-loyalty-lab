import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { runGraphQL } from "../services/sfApi";

const QUERY = `query memberOverview($membership: String) {
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
}`;

export default function GraphQLConsolePage() {
  const { member } = useApp();
  const [membership, setMembership] = useState(member?.membershipNumber || "YAH0000001");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [error, setError] = useState(null);

  const requestPayload = useMemo(
    () => ({ query: QUERY, variables: { membership } }),
    [membership]
  );

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
            Send a single query through the Salesforce GraphQL API
            (<code>/services/data/v66.0/graphql</code>) to fetch a member, their program,
            contact, and point balances in one round trip.
          </p>
        </div>
      </div>

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
            <code>{JSON.stringify(requestPayload, null, 2)}</code>
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
