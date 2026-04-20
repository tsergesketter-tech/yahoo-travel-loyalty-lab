import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { fetchVouchers, fetchTransactions, fetchBadges, simulatePoints } from "../services/sfApi";

const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z" },
  { id: "badges", label: "Badges", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { id: "transactions", label: "Transactions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "vouchers", label: "Vouchers", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
  { id: "simulate", label: "Simulator", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
];

function NavIcon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

/* ─── Profile Tab ─── */
function ProfileTab({ member, sfConnected, sfLoading, sfError, refreshMemberProfile }) {
  const pointValue = member.pointsValuePerPoint;

  return (
    <>
      <section className="mp__profile-header">
        <div className="mp__avatar">{member.name.charAt(0)}</div>
        <div className="mp__profile-info">
          <h1 className="mp__name">{member.name}</h1>
          <p className="mp__email">{member.email || "No email on file"}</p>
          {member.membershipNumber && (
            <span className="mp__membership">Member #{member.membershipNumber}</span>
          )}
          <div className="mp__tier-row">
            <span className="mp__tier-badge">{member.tier}</span>
          </div>
        </div>
        <div className="mp__points-block">
          <div className="mp__points-num">{member.pointsBalance.toLocaleString()}</div>
          <div className="mp__points-lbl">Yahoo Points</div>
          <div className="mp__points-val">Approx ${(member.pointsBalance * pointValue).toFixed(0)} value</div>
        </div>
      </section>

      <div className="mp__sf-bar">
        <div className={`mp__sf-dot ${sfConnected ? "mp__sf-dot--on" : sfLoading ? "mp__sf-dot--loading" : ""}`} />
        <span>{sfLoading ? "Connecting to Salesforce..." : sfConnected ? "Live — Salesforce Loyalty" : "Offline — Using mock data"}</span>
        {sfError && !sfLoading && <span className="mp__sf-err">{sfError}</span>}
        {sfConnected && <button className="btn-text" onClick={refreshMemberProfile}>Refresh</button>}
      </div>

      {sfConnected && member.memberCurrencies && (
        <section className="mp__card mp__card--full mp__currencies">
          <h2>Loyalty Currencies</h2>
          <div className="mp__tier-display">
            <div>
              <div className="mp__tier-label-sm">Current Tier</div>
              <div className="mp__tier-name-lg">{member.tier}</div>
            </div>
            {member.tierGroupName && <span className="mp__tier-group">{member.tierGroupName}</span>}
          </div>
          <div className="mp__currency-grid">
            {member.memberCurrencies.map((c) => (
              <div key={c.memberCurrencyId} className="mp__currency-card">
                <div className="mp__currency-name">{c.loyaltyMemberCurrencyName}</div>
                <div className="mp__currency-bal">{c.pointsBalance.toLocaleString()}</div>
                <div className="mp__currency-meta">
                  <span>Accrued: {c.totalPointsAccrued.toLocaleString()}</span>
                  <span>Redeemed: {c.totalPointsRedeemed.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}


    </>
  );
}

/* ─── Badges Tab ─── */
function BadgesTab({ membershipNumber }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchBadges(membershipNumber)
      .then((data) => { setBadges(data.badges || []); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [membershipNumber]);

  if (loading) return <div className="mp__tab-loader"><div className="mp__spinner" />Loading badges...</div>;

  return (
    <section className="mp__tab-content">
      <div className="mp__tab-header">
        <h2>Loyalty Badges</h2>
        <p>Earn badges by completing stays, hitting milestones, and engaging with promotions.</p>
      </div>
      {error && <div className="mp__tab-error">{error}</div>}
      {badges.length === 0 ? (
        <div className="mp__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--grey-300)" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <h3>No badges yet</h3>
          <p>Complete bookings and promotions to earn your first badge.</p>
        </div>
      ) : (
        <div className="mp__badge-grid">
          {badges.map((b) => (
            <div key={b.id} className={`mp__badge-card ${b.acquired ? "mp__badge-card--acquired" : ""}`}>
              <div className="mp__badge-icon">
                {b.imageUrl ? (
                  <img src={b.imageUrl} alt={b.name} />
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                )}
              </div>
              <h4 className="mp__badge-name">{b.name}</h4>
              {b.description && <p className="mp__badge-desc">{b.description}</p>}
              {b.acquiredDate && <span className="mp__badge-date">Earned {b.acquiredDate}</span>}
              <span className={`mp__badge-status mp__badge-status--${b.acquired ? "earned" : "locked"}`}>
                {b.acquired ? "Earned" : "Locked"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Transactions Tab ─── */
const JOURNAL_TYPES = ["Accrual", "Redemption"];
const JOURNAL_SUBTYPES = {
  Accrual: ["", "Hotel Booking", "Flight Booking", "Car Booking", "Purchase"],
  Redemption: ["", "Redeem Points", "Redeem Reward"],
};

function TransactionsTab({ membershipNumber }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [journalType, setJournalType] = useState("Accrual");
  const [journalSubType, setJournalSubType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const opts = { pageNumber: page, journalTypeName: journalType };
    if (journalSubType) opts.journalSubTypeName = journalSubType;
    if (startDate) opts.periodStartDate = startDate;
    if (endDate) opts.periodEndDate = endDate;

    fetchTransactions(membershipNumber, opts)
      .then((data) => {
        setItems(data.items || []);
        setNextPage(data.nextPage);
        setTotalCount(data.totalCount || 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [membershipNumber, journalType, journalSubType, startDate, endDate, page]);

  useEffect(() => { load(); }, [load]);

  const handleTypeChange = (t) => {
    setJournalType(t);
    setJournalSubType("");
    setPage(1);
  };

  return (
    <section className="mp__tab-content">
      <div className="mp__tab-header">
        <h2>Transaction Ledger Summary</h2>
        <p>View your accrual and redemption history from Salesforce Loyalty.</p>
      </div>

      <div className="mp__txn-filter-bar">
        <div className="mp__txn-filter-group">
          <label className="mp__txn-filter-label">Journal Type</label>
          <div className="mp__txn-filters">
            {JOURNAL_TYPES.map((t) => (
              <button key={t} className={`mp__txn-filter ${journalType === t ? "mp__txn-filter--active" : ""}`}
                onClick={() => handleTypeChange(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mp__txn-filter-group">
          <label className="mp__txn-filter-label">Sub-Type</label>
          <select
            className="mp__txn-select"
            value={journalSubType}
            onChange={(e) => { setJournalSubType(e.target.value); setPage(1); }}
          >
            <option value="">All Sub-Types</option>
            {(JOURNAL_SUBTYPES[journalType] || []).filter(Boolean).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="mp__txn-filter-group">
          <label className="mp__txn-filter-label">From</label>
          <input
            type="date"
            className="mp__txn-date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          />
        </div>

        <div className="mp__txn-filter-group">
          <label className="mp__txn-filter-label">To</label>
          <input
            type="date"
            className="mp__txn-date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          />
        </div>

        {(journalSubType || startDate || endDate) && (
          <button className="mp__txn-clear" onClick={() => { setJournalSubType(""); setStartDate(""); setEndDate(""); setPage(1); }}>
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="mp__tab-error">{error}</div>}

      {loading ? (
        <div className="mp__tab-loader"><div className="mp__spinner" />Loading transactions...</div>
      ) : items.length === 0 ? (
        <div className="mp__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--grey-300)" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <h3>No {journalType.toLowerCase()} transactions{journalSubType ? ` (${journalSubType})` : ""}</h3>
          <p>Transactions will appear here after bookings are processed in Salesforce.</p>
        </div>
      ) : (
        <>
          <div className="mp__txn-summary-bar">
            <span>{totalCount} transaction{totalCount !== 1 ? "s" : ""}</span>
            {(startDate || endDate) && (
              <span className="mp__txn-date-range">
                {startDate && `From ${new Date(startDate + "T00:00:00").toLocaleDateString()}`}
                {startDate && endDate && " — "}
                {endDate && `To ${new Date(endDate + "T00:00:00").toLocaleDateString()}`}
              </span>
            )}
          </div>
          <div className="mp__txn-list">
            {items.map((t) => {
              const isAccrual = t.type === "Accrual";
              const dateStr = t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
              return (
                <div key={t.id} className={`mp__txn-card ${isAccrual ? "mp__txn-card--accrual" : "mp__txn-card--redemption"}`}>
                  <div className="mp__txn-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {isAccrual
                        ? <path d="M12 2v20M17 7l-5-5-5 5" />
                        : <path d="M12 22V2M7 17l5 5 5-5" />}
                    </svg>
                  </div>
                  <div className="mp__txn-card-main">
                    <div className="mp__txn-card-top">
                      <span className="mp__txn-card-subtype">{t.subType || t.type || "Transaction"}</span>
                      <span className={`mp__txn-card-pts ${isAccrual ? "mp__txn-card-pts--earn" : "mp__txn-card-pts--burn"}`}>
                        {isAccrual ? "+" : "−"}{Math.abs(t.pointsChange).toLocaleString()} pts
                      </span>
                    </div>
                    <div className="mp__txn-card-bottom">
                      <span className="mp__txn-card-date">{dateStr}</span>
                      <span className={`mp__txn-type mp__txn-type--${(t.type || "").toLowerCase()}`}>{t.type}</span>
                      {t.transactionAmount > 0 && <span className="mp__txn-card-amount">${Number(t.transactionAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                      {t.journalNumber && <span className="mp__txn-card-ref">#{t.journalNumber}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mp__txn-paging">
            <button
              className="mp__txn-paging-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Prev
            </button>
            <span className="mp__txn-page">Page {page} {totalCount > 0 && <span className="mp__txn-page-of">of {Math.ceil(totalCount / items.length) || 1}</span>}</span>
            <button
              className="mp__txn-paging-btn"
              disabled={!nextPage}
              onClick={() => setPage(nextPage)}
            >
              Next
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Vouchers Tab ─── */
function VouchersTab({ membershipNumber }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchVouchers(membershipNumber)
      .then((data) => { setVouchers(data.vouchers || []); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [membershipNumber]);

  if (loading) return <div className="mp__tab-loader"><div className="mp__spinner" />Loading vouchers...</div>;

  const statusColor = (s) => {
    const sl = (s || "").toLowerCase();
    if (sl === "active" || sl === "available" || sl === "issued") return "mp__voucher-status--active";
    if (sl === "used" || sl === "redeemed") return "mp__voucher-status--used";
    return "mp__voucher-status--expired";
  };

  return (
    <section className="mp__tab-content">
      <div className="mp__tab-header">
        <h2>Member Vouchers</h2>
        <p>Digital certificates, discounts, and travel credits issued to your account.</p>
      </div>
      {error && <div className="mp__tab-error">{error}</div>}
      {vouchers.length === 0 ? (
        <div className="mp__empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--grey-300)" strokeWidth="1.5"><path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg>
          <h3>No vouchers</h3>
          <p>Vouchers will appear here when issued by the loyalty program.</p>
        </div>
      ) : (
        <div className="mp__voucher-grid">
          {vouchers.map((v) => (
            <div key={v.id} className="mp__voucher-card">
              <div className="mp__voucher-top">
                <span className="mp__voucher-type">{v.type}</span>
                <span className={`mp__voucher-status ${statusColor(v.status)}`}>{v.status}</span>
              </div>
              {v.code && <div className="mp__voucher-code">{v.code}</div>}
              {v.value > 0 && (
                <div className="mp__voucher-value">
                  ${Number(v.value).toFixed(2)} <span>{v.currency}</span>
                </div>
              )}
              <div className="mp__voucher-meta">
                {v.issuedDate && <span>Issued: {v.issuedDate}</span>}
                {v.expiresOn && <span>Expires: {v.expiresOn}</span>}
              </div>
              {v.notes && <p className="mp__voucher-notes">{v.notes}</p>}
              {v.redeemedValue > 0 && (
                <div className="mp__voucher-redeemed">Redeemed: ${Number(v.redeemedValue).toFixed(2)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Simulator Tab ─── */
function SimulatorTab({ membershipNumber }) {
  const [journalType, setJournalType] = useState("Accrual");
  const [subType, setSubType] = useState("Flight Booking");
  const [amount, setAmount] = useState(500);
  const [city, setCity] = useState("New York");
  const [nights, setNights] = useState(3);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isHotel = subType === "Hotel Booking";
  const isRedemption = journalType === "Redemption";

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const journal = {
        JournalTypeName: journalType,
        JournalSubTypeName: isRedemption ? "Redeem Points" : subType,
        MembershipNumber: membershipNumber,
        TransactionAmount: isRedemption ? 0 : amount,
        CurrencyIsoCode: "USD",
        ActivityDate: new Date().toISOString(),
        ExternalTransactionNumber: `SIM-${Date.now()}`,
        Channel: "Web",
        LOB__c: isHotel ? "Hotel" : "Flight",
        Destination_City__c: city,
        ...(isHotel ? { Length_of_Stay__c: String(nights) } : {}),
        ...(isRedemption ? { Points_to_Redeem__c: String(amount) } : {}),
      };
      const data = await simulatePoints(membershipNumber, [journal]);
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mp__tab-content">
      <div className="mp__tab-header">
        <h2>Points Simulator</h2>
        <p>Estimate points earned for a hypothetical booking via the Salesforce Realtime Program Process simulation API.</p>
      </div>

      <div className="mp__sim-form">
        <div className="mp__sim-row">
          <div className="mp__sim-field">
            <label>Journal Type</label>
            <select value={journalType} onChange={(e) => setJournalType(e.target.value)}>
              <option value="Accrual">Accrual</option>
              <option value="Redemption">Redemption</option>
            </select>
          </div>
          <div className="mp__sim-field">
            <label>Booking Type</label>
            <select value={subType} onChange={(e) => setSubType(e.target.value)}>
              <option value="Hotel Booking">Hotel</option>
              <option value="Flight Booking">Flight</option>
              <option value="Car Booking">Car Rental</option>
              <option value="Purchase">General Purchase</option>
            </select>
          </div>
          <div className="mp__sim-field">
            <label>{isRedemption ? "Points to Redeem" : "Transaction Amount ($)"}</label>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min="0" step="50" />
          </div>
        </div>
        <div className="mp__sim-row">
          <div className="mp__sim-field">
            <label>Destination City</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" />
          </div>
          {isHotel && (
            <div className="mp__sim-field">
              <label>Nights</label>
              <input type="number" value={nights} onChange={(e) => setNights(Number(e.target.value))} min="1" max="30" />
            </div>
          )}
          <button className="btn btn--primary" onClick={handleSimulate} disabled={loading}>
            {loading ? "Simulating..." : "Run Simulation"}
          </button>
        </div>
      </div>

      {error && <div className="mp__tab-error">{error}</div>}

      {results && (
        <div className="mp__sim-results">
          <h3>Simulation Results</h3>
          {results.results && results.results.length > 0 ? (
            <div className="mp__sim-output">
              {results.results.map((r, i) => (
                <div key={i} className="mp__sim-result-card">
                  {r.processName && <div className="mp__sim-process">{r.processName}</div>}
                  {Object.entries(r.byCurrency).length > 0 ? (
                    <div className="mp__sim-currencies">
                      {Object.entries(r.byCurrency).map(([curr, pts]) => (
                        <div key={curr} className="mp__sim-currency">
                          <span className="mp__sim-curr-name">{curr}</span>
                          <span className="mp__sim-curr-pts">{pts > 0 ? "+" : ""}{Number(pts).toLocaleString()} pts</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mp__sim-no-pts">No points calculated — no active program process matches this journal type.</p>
                  )}
                  {r.processRules && r.processRules.length > 0 && (
                    <div className="mp__sim-rules">
                      <h4>Rules Applied</h4>
                      {r.processRules.map((rule, ri) => (
                        <div key={ri} className="mp__sim-rule">
                          <span className="mp__sim-rule-name">{rule.ruleName}</span>
                          {rule.rewards.map((rw, rwi) => (
                            <span key={rwi} className="mp__sim-rule-reward">
                              {rw.type === "CreditFixedPoints" || rw.type === "CreditPoints"
                                ? `+${rw.details?.points || 0} ${rw.details?.loyaltyProgramCurrencyName || "pts"}`
                                : rw.type}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {r.errorMessage && <div className="mp__tab-error">{r.errorMessage}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="mp__sim-raw">
              <p>Simulation completed. Raw response:</p>
              <pre>{JSON.stringify(results.raw, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ─── Main MemberPage ─── */
export default function MemberPage() {
  const { member, journeys, changeSegment, changeTier, sfConnected, sfLoading, sfError, refreshMemberProfile } = useApp();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="mp">
      <aside className="mp__nav">
        <div className="mp__nav-avatar">
          <span>{member.name.charAt(0)}</span>
        </div>
        <div className="mp__nav-name">{member.name.split(" ")[0]}</div>
        <div className="mp__nav-tier">{member.tier}</div>
        <nav className="mp__nav-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`mp__nav-link ${activeTab === item.id ? "mp__nav-link--active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <NavIcon d={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="mp__main">
        {activeTab === "profile" && (
          <ProfileTab
            member={member}
            sfConnected={sfConnected} sfLoading={sfLoading} sfError={sfError}
            refreshMemberProfile={refreshMemberProfile}
          />
        )}
        {activeTab === "badges" && <BadgesTab membershipNumber={member.membershipNumber} />}
        {activeTab === "transactions" && <TransactionsTab membershipNumber={member.membershipNumber} />}
        {activeTab === "vouchers" && <VouchersTab membershipNumber={member.membershipNumber} />}
        {activeTab === "simulate" && <SimulatorTab membershipNumber={member.membershipNumber} />}
      </main>
    </div>
  );
}
