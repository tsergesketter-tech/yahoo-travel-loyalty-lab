import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { publishPlatformEvents } from "../services/sfApi";

const DESTINATIONS = [
  { city: "Paris", country: "France" },
  { city: "Tokyo", country: "Japan" },
  { city: "New York", country: "United States" },
  { city: "Barcelona", country: "Spain" },
  { city: "London", country: "United Kingdom" },
  { city: "Rome", country: "Italy" },
  { city: "Sydney", country: "Australia" },
  { city: "Dubai", country: "UAE" },
  { city: "Bangkok", country: "Thailand" },
  { city: "Miami", country: "United States" },
  { city: "Cancun", country: "Mexico" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Lisbon", country: "Portugal" },
  { city: "Seoul", country: "South Korea" },
  { city: "Singapore", country: "Singapore" },
];

const HOTEL_NAMES = ["Grand Palace", "The Ritz", "Sunset Resort", "Harbor View", "Mountain Lodge", "City Central", "Seaside Inn", "Plaza Hotel"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateEvents(count, membershipNumber) {
  const events = [];
  for (let i = 0; i < count; i++) {
    const dest = pick(DESTINATIONS);
    const isHotel = Math.random() < 0.5;
    const amount = isHotel
      ? Math.round(150 + Math.random() * 1500)
      : Math.round(120 + Math.random() * 800);
    const nights = Math.ceil(Math.random() * 10);

    const evt = {
      ExternalTransactionNumber: `PE-${Date.now()}-${String(i).padStart(4, "0")}`,
      MembershipNumber: membershipNumber,
      JournalTypeName: "Accrual",
      JournalSubTypeName: isHotel ? "Hotel Booking" : "Flight Booking",
      ActivityDate: new Date().toISOString(),
      CurrencyIsoCode: "USD",
      TransactionAmount: String(amount),
      Channel: "Web",
      Payment_Type__c: "Cash",
      Cash_Paid__c: String(amount),
      LOB__c: isHotel ? "Hotel" : "Flight",
      Destination_City__c: dest.city,
      Destination_Country__c: dest.country,
      BookingDate: new Date().toISOString(),
      Comment: isHotel
        ? `${pick(HOTEL_NAMES)}, ${dest.city} — ${nights} nights`
        : `Flight to ${dest.city}`,
    };
    if (isHotel) evt.Length_of_Stay__c = String(nights);
    events.push(evt);
  }
  return events;
}

export default function PlatformEventsPage() {
  const { member, addToast } = useApp();
  const [count, setCount] = useState(10);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [runs, setRuns] = useState([]);

  const handlePublish = async () => {
    const events = generateEvents(count, member.membershipNumber);
    setPublishing(true);
    setProgress({ sent: 0, total: events.length, errors: 0 });

    const BATCH_SIZE = 25;
    const batches = [];
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      batches.push(events.slice(i, i + BATCH_SIZE));
    }

    let totalPublished = 0;
    let totalErrors = 0;
    const batchResults = [];

    for (let b = 0; b < batches.length; b++) {
      try {
        const data = await publishPlatformEvents(batches[b]);
        const ok = data.results ? data.results.filter((r) => r.success).length : 0;
        totalPublished += ok;
        totalErrors += batches[b].length - ok;
        batchResults.push({ batch: b + 1, size: batches[b].length, ok, failed: batches[b].length - ok });
      } catch (err) {
        totalErrors += batches[b].length;
        batchResults.push({ batch: b + 1, size: batches[b].length, ok: 0, failed: batches[b].length, error: err.message });
      }
      setProgress({ sent: (b + 1) * BATCH_SIZE, total: events.length, errors: totalErrors });
    }

    const hotelCount = events.filter((e) => e.LOB__c === "Hotel").length;
    const flightCount = events.filter((e) => e.LOB__c === "Flight").length;
    const cities = [...new Set(events.map((e) => e.Destination_City__c))];
    const totalAmount = events.reduce((s, e) => s + Number(e.TransactionAmount), 0);

    const run = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      total: events.length,
      published: totalPublished,
      errors: totalErrors,
      hotelCount,
      flightCount,
      cities,
      totalAmount,
      batches: batchResults,
      events,
    };

    setRuns((prev) => [run, ...prev].slice(0, 20));
    setPublishing(false);
    setProgress(null);

    if (totalErrors === 0) {
      addToast(`${totalPublished} platform events published to Salesforce`);
    } else {
      addToast(`${totalPublished} published, ${totalErrors} failed`);
    }
  };

  return (
    <div className="pe-page">
      <div className="pe-page__header">
        <div>
          <h1>Platform Events</h1>
          <p>Generate and publish <code>Booking_Event__e</code> platform events to Salesforce. Events are auto-generated with random hotel and flight bookings across 15 destinations.</p>
        </div>
      </div>

      <div className="pe-controls">
        <div className="pe-controls__input-group">
          <label>Number of events</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
          />
        </div>
        <div className="pe-controls__presets">
          {[10, 25, 50, 100, 250, 500].map((n) => (
            <button key={n} className={`pe-controls__preset ${count === n ? "pe-controls__preset--active" : ""}`} onClick={() => setCount(n)}>{n}</button>
          ))}
        </div>
        <button className="btn btn--primary pe-controls__publish" onClick={handlePublish} disabled={publishing}>
          {publishing ? "Publishing..." : `Publish ${count} Events`}
        </button>
      </div>

      {publishing && progress && (
        <div className="pe-progress">
          <div className="pe-progress__bar">
            <div className="pe-progress__fill" style={{ width: `${Math.min(100, (progress.sent / progress.total) * 100)}%` }} />
          </div>
          <span className="pe-progress__text">
            {Math.min(progress.sent, progress.total)} / {progress.total} sent
            {progress.errors > 0 && <span className="pe-progress__errors"> ({progress.errors} errors)</span>}
          </span>
        </div>
      )}

      <div className="pe-runs">
        {runs.map((run) => (
          <div key={run.id} className={`pe-run ${run.errors > 0 ? "pe-run--errors" : ""}`}>
            <div className="pe-run__header">
              <div className="pe-run__status">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {run.errors === 0
                    ? <><circle cx="12" cy="12" r="10"/><polyline points="16 8 10.5 14 8 11.5"/></>
                    : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                </svg>
                <strong>{run.published}</strong> published
                {run.errors > 0 && <span className="pe-run__fail">{run.errors} failed</span>}
              </div>
              <span className="pe-run__time">{run.time}</span>
            </div>

            <div className="pe-run__stats">
              <div className="pe-run__stat">
                <span className="pe-run__stat-value">{run.hotelCount}</span>
                <span className="pe-run__stat-label">Hotels</span>
              </div>
              <div className="pe-run__stat">
                <span className="pe-run__stat-value">{run.flightCount}</span>
                <span className="pe-run__stat-label">Flights</span>
              </div>
              <div className="pe-run__stat">
                <span className="pe-run__stat-value">${run.totalAmount.toLocaleString()}</span>
                <span className="pe-run__stat-label">Total Amount</span>
              </div>
              <div className="pe-run__stat">
                <span className="pe-run__stat-value">{run.cities.length}</span>
                <span className="pe-run__stat-label">Cities</span>
              </div>
              <div className="pe-run__stat">
                <span className="pe-run__stat-value">{run.batches.length}</span>
                <span className="pe-run__stat-label">API Calls</span>
              </div>
            </div>

            <div className="pe-run__cities">
              {run.cities.map((c) => (
                <span key={c} className="pe-run__city">{c}</span>
              ))}
            </div>

            <div className="pe-run__batches">
              {run.batches.map((b) => (
                <div key={b.batch} className={`pe-run__batch ${b.failed > 0 ? "pe-run__batch--fail" : ""}`}>
                  <span>Batch {b.batch}</span>
                  <span>{b.ok}/{b.size}</span>
                  {b.error && <span className="pe-run__batch-err">{b.error}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {runs.length === 0 && !publishing && (
        <div className="pe-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <p>No events published yet. Choose a count and hit publish to generate random hotel and flight booking events.</p>
        </div>
      )}
    </div>
  );
}
