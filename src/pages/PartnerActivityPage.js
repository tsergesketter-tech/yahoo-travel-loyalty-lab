import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { postPartnerActivity, PARTNER_IDS } from "../services/sfApi";

const NEWS_ACTIVITIES = [
  "Read breaking news article",
  "Shared article on social media",
  "Commented on news story",
  "Subscribed to news alerts",
  "Read editorial column",
  "Watched news video",
  "Completed daily news quiz",
  "Read investigative report",
];

const FINANCE_ACTIVITIES = [
  "Checked stock portfolio",
  "Set price alert on ticker",
  "Read earnings report",
  "Used stock screener",
  "Reviewed market analysis",
  "Added watchlist stocks",
  "Completed financial literacy module",
  "Read quarterly forecast",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateActivities(count, partner, membershipNumber) {
  const isNews = partner === "Yahoo News";
  const activities = isNews ? NEWS_ACTIVITIES : FINANCE_ACTIVITIES;
  const subType = isNews ? "Yahoo News Activity" : "Yahoo Finance Activity";
  const partnerId = PARTNER_IDS[partner];
  const journals = [];

  for (let i = 0; i < count; i++) {
    const activity = pick(activities);
    const points = isNews
      ? [5, 10, 15, 25, 50][Math.floor(Math.random() * 5)]
      : [10, 20, 25, 50, 75, 100][Math.floor(Math.random() * 6)];

    journals.push({
      ExternalTransactionNumber: `${isNews ? "NEWS" : "FIN"}-${Date.now()}-${String(i).padStart(4, "0")}`,
      MembershipNumber: membershipNumber,
      JournalTypeName: "Accrual",
      JournalSubTypeName: subType,
      ActivityDate: new Date().toISOString(),
      CurrencyIsoCode: "USD",
      TransactionAmount: points,
      PartnerId: partnerId,
      Channel: "Web",
      LOB__c: isNews ? "News" : "Finance",
      Comment: activity,
    });
  }
  return journals;
}

export default function PartnerActivityPage() {
  const { member, addToast } = useApp();
  const [partner, setPartner] = useState("Yahoo News");
  const [count, setCount] = useState(5);
  const [sending, setSending] = useState(false);
  const [runs, setRuns] = useState([]);

  const handleSend = async () => {
    const journals = generateActivities(count, partner, member.membershipNumber);
    setSending(true);

    const BATCH = 5;
    let totalOk = 0;
    let totalFail = 0;
    const batchResults = [];

    for (let i = 0; i < journals.length; i += BATCH) {
      const batch = journals.slice(i, i + BATCH);
      try {
        const data = await postPartnerActivity({
          transactionJournals: batch,
        });
        const ok = data.journalIds ? data.journalIds.filter(Boolean).length : 0;
        totalOk += ok;
        totalFail += batch.length - ok;
        batchResults.push({ ok, failed: batch.length - ok });
      } catch (err) {
        totalFail += batch.length;
        batchResults.push({ ok: 0, failed: batch.length, error: err.message });
      }
    }

    const totalPoints = journals.reduce((s, j) => s + j.TransactionAmount, 0);
    const activities = journals.map((j) => j.Comment);

    setRuns((prev) => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      partner,
      total: journals.length,
      published: totalOk,
      errors: totalFail,
      totalPoints,
      activities: [...new Set(activities)],
      batches: batchResults,
    }, ...prev].slice(0, 20));

    setSending(false);

    if (totalFail === 0) {
      addToast(`${totalOk} ${partner} transactions sent — ${totalPoints} pts`);
    } else {
      addToast(`${totalOk} sent, ${totalFail} failed`);
    }
  };

  return (
    <div className="pa-page">
      <div className="pa-page__header">
        <div>
          <h1>Partner Activity</h1>
          <p>Send transaction journals for Yahoo News and Yahoo Finance activity. Each transaction credits points to the member via the partner billing flow.</p>
        </div>
      </div>

      <div className="pa-controls">
        <div className="pa-controls__partner-toggle">
          {["Yahoo News", "Yahoo Finance"].map((p) => (
            <button
              key={p}
              className={`pa-controls__partner-btn ${partner === p ? "pa-controls__partner-btn--active" : ""}`}
              onClick={() => setPartner(p)}
            >
              {p === "Yahoo News" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                  <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              )}
              {p}
            </button>
          ))}
        </div>

        <div className="pa-controls__row">
          <div className="pa-controls__input-group">
            <label>Number of activities</label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="pa-controls__presets">
            {[1, 5, 10, 25, 50].map((n) => (
              <button key={n} className={`pa-controls__preset ${count === n ? "pa-controls__preset--active" : ""}`} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
        </div>

        <button className="btn btn--primary pa-controls__send" onClick={handleSend} disabled={sending}>
          {sending ? "Sending..." : `Send ${count} ${partner.split(" ")[1]} Activities`}
        </button>
      </div>

      <div className="pa-partner-info">
        <div className="pa-partner-info__card">
          <span className="pa-partner-info__label">Partner</span>
          <span className="pa-partner-info__value">{partner}</span>
        </div>
        <div className="pa-partner-info__card">
          <span className="pa-partner-info__label">Partner ID</span>
          <code className="pa-partner-info__value">{PARTNER_IDS[partner]}</code>
        </div>
        <div className="pa-partner-info__card">
          <span className="pa-partner-info__label">Journal Sub-Type</span>
          <span className="pa-partner-info__value">{partner === "Yahoo News" ? "Yahoo News Activity" : "Yahoo Finance Activity"}</span>
        </div>
        <div className="pa-partner-info__card">
          <span className="pa-partner-info__label">Member</span>
          <span className="pa-partner-info__value">{member.membershipNumber}</span>
        </div>
      </div>

      <div className="pa-runs">
        {runs.map((run) => (
          <div key={run.id} className={`pa-run ${run.errors > 0 ? "pa-run--errors" : ""}`}>
            <div className="pa-run__header">
              <div className="pa-run__status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {run.errors === 0
                    ? <><circle cx="12" cy="12" r="10"/><polyline points="16 8 10.5 14 8 11.5"/></>
                    : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                </svg>
                <strong>{run.published}</strong> sent
                {run.errors > 0 && <span className="pa-run__fail">{run.errors} failed</span>}
              </div>
              <div className="pa-run__meta">
                <span className={`pa-run__partner-badge pa-run__partner-badge--${run.partner === "Yahoo News" ? "news" : "finance"}`}>
                  {run.partner}
                </span>
                <span className="pa-run__time">{run.time}</span>
              </div>
            </div>

            <div className="pa-run__stats">
              <div className="pa-run__stat">
                <span className="pa-run__stat-value">{run.totalPoints.toLocaleString()}</span>
                <span className="pa-run__stat-label">Points Credited</span>
              </div>
              <div className="pa-run__stat">
                <span className="pa-run__stat-value">{run.total}</span>
                <span className="pa-run__stat-label">Activities</span>
              </div>
              <div className="pa-run__stat">
                <span className="pa-run__stat-value">{run.activities.length}</span>
                <span className="pa-run__stat-label">Unique Types</span>
              </div>
            </div>

            <div className="pa-run__activities">
              {run.activities.map((a) => (
                <span key={a} className="pa-run__activity">{a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {runs.length === 0 && !sending && (
        <div className="pa-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
            <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/>
          </svg>
          <p>No partner activities sent yet. Pick a partner, choose a count, and send activity transactions to Salesforce.</p>
        </div>
      )}
    </div>
  );
}
