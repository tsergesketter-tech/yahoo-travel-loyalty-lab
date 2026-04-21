import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { publishPlatformEvents } from "../services/sfApi";

const TEMPLATES = {
  hotelAccrual: {
    label: "Hotel Booking (Accrual)",
    build: (m) => ({
      ExternalTransactionNumber: `PE-HOTEL-${Date.now()}`,
      MembershipNumber: m,
      JournalTypeName: "Accrual",
      JournalSubTypeName: "Hotel Booking",
      ActivityDate: new Date().toISOString(),
      CurrencyIsoCode: "USD",
      TransactionAmount: "520",
      Channel: "Web",
      Payment_Type__c: "Cash",
      Cash_Paid__c: "520",
      LOB__c: "Hotel",
      Destination_City__c: "Paris",
      Destination_Country__c: "France",
      Length_of_Stay__c: "4",
      StartDate: "2026-05-10T14:00:00.000Z",
      EndDate: "2026-05-14T11:00:00.000Z",
      BookingDate: new Date().toISOString(),
      Comment: "Le Marais Hotel — 4 nights",
    }),
  },
  flightAccrual: {
    label: "Flight Booking (Accrual)",
    build: (m) => ({
      ExternalTransactionNumber: `PE-FLIGHT-${Date.now()}`,
      MembershipNumber: m,
      JournalTypeName: "Accrual",
      JournalSubTypeName: "Flight Booking",
      ActivityDate: new Date().toISOString(),
      CurrencyIsoCode: "USD",
      TransactionAmount: "349",
      Channel: "Web",
      Payment_Type__c: "Cash",
      Cash_Paid__c: "349",
      LOB__c: "Flight",
      Destination_City__c: "Tokyo",
      Destination_Country__c: "Japan",
      BookingDate: new Date().toISOString(),
      Comment: "SFO → NRT — Economy",
    }),
  },
  redemption: {
    label: "Redeem Points",
    build: (m) => ({
      ExternalTransactionNumber: `PE-REDEEM-${Date.now()}`,
      MembershipNumber: m,
      JournalTypeName: "Redemption",
      JournalSubTypeName: "Redeem Points",
      ActivityDate: new Date().toISOString(),
      CurrencyIsoCode: "USD",
      TransactionAmount: "0",
      Points_to_Redeem__c: "5000",
      Channel: "Web",
      LOB__c: "Hotel",
      Destination_City__c: "New York",
      Destination_Country__c: "United States",
      Comment: "Redeemed 5,000 pts",
    }),
  },
};

const FIELD_ORDER = [
  "ExternalTransactionNumber", "MembershipNumber", "JournalTypeName", "JournalSubTypeName",
  "ActivityDate", "CurrencyIsoCode", "TransactionAmount", "Channel",
  "Payment_Type__c", "Cash_Paid__c", "LOB__c",
  "Destination_City__c", "Destination_Country__c", "Length_of_Stay__c",
  "StartDate", "EndDate", "BookingDate", "Points_to_Redeem__c", "Comment",
];

const FIELD_LABELS = {
  ExternalTransactionNumber: "External Transaction Number",
  MembershipNumber: "Membership Number",
  JournalTypeName: "Journal Type",
  JournalSubTypeName: "Journal Sub Type",
  ActivityDate: "Activity Date",
  CurrencyIsoCode: "Currency",
  TransactionAmount: "Transaction Amount",
  Channel: "Channel",
  Payment_Type__c: "Payment Type",
  Cash_Paid__c: "Cash Paid",
  LOB__c: "Line of Business",
  Destination_City__c: "Destination City",
  Destination_Country__c: "Destination Country",
  Length_of_Stay__c: "Length of Stay",
  StartDate: "Start Date",
  EndDate: "End Date",
  BookingDate: "Booking Date",
  Points_to_Redeem__c: "Points to Redeem",
  Comment: "Comment",
};

function buildEmptyEvent(membershipNumber) {
  return {
    ExternalTransactionNumber: `PE-${Date.now()}`,
    MembershipNumber: membershipNumber,
    JournalTypeName: "Accrual",
    JournalSubTypeName: "Hotel Booking",
    ActivityDate: new Date().toISOString(),
    CurrencyIsoCode: "USD",
    TransactionAmount: "",
    Channel: "Web",
    Payment_Type__c: "",
    Cash_Paid__c: "",
    LOB__c: "",
    Destination_City__c: "",
    Destination_Country__c: "",
    Length_of_Stay__c: "",
    StartDate: "",
    EndDate: "",
    BookingDate: new Date().toISOString(),
    Points_to_Redeem__c: "",
    Comment: "",
  };
}

export default function PlatformEventsPage() {
  const { member, addToast } = useApp();
  const [events, setEvents] = useState([buildEmptyEvent(member.membershipNumber)]);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);

  const updateEvent = (idx, field, value) => {
    setEvents((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const addEvent = () => setEvents((prev) => [...prev, buildEmptyEvent(member.membershipNumber)]);
  const removeEvent = (idx) => setEvents((prev) => prev.filter((_, i) => i !== idx));

  const loadTemplate = (idx, key) => {
    const tpl = TEMPLATES[key];
    if (tpl) setEvents((prev) => prev.map((e, i) => i === idx ? tpl.build(member.membershipNumber) : e));
  };

  const handlePublish = async () => {
    setPublishing(true);
    setResults(null);
    try {
      const data = await publishPlatformEvents(events);
      setResults(data);
      setHistory((prev) => [{ time: new Date().toLocaleTimeString(), events: [...events], result: data }, ...prev].slice(0, 10));
      if (data.success) {
        addToast(`${data.published} platform event${data.published > 1 ? "s" : ""} published to Salesforce`);
      }
    } catch (err) {
      setResults({ success: false, error: err.message });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="pe-page">
      <div className="pe-page__header">
        <div>
          <h1>Platform Events</h1>
          <p>Publish <code>Booking_Event__e</code> platform events to Salesforce. These mirror the Transaction Journal schema and can trigger Flows to create actual journal records.</p>
        </div>
        <div className="pe-page__actions">
          <button className="btn btn--secondary" onClick={addEvent}>+ Add Event</button>
          <button className="btn btn--primary" onClick={handlePublish} disabled={publishing || events.length === 0}>
            {publishing ? "Publishing..." : `Publish ${events.length} Event${events.length > 1 ? "s" : ""}`}
          </button>
        </div>
      </div>

      <div className="pe-page__events">
        {events.map((evt, idx) => (
          <div key={idx} className="pe-card">
            <div className="pe-card__head">
              <h3>Event {idx + 1}</h3>
              <div className="pe-card__templates">
                {Object.entries(TEMPLATES).map(([key, tpl]) => (
                  <button key={key} className="pe-card__tpl-btn" onClick={() => loadTemplate(idx, key)}>{tpl.label}</button>
                ))}
              </div>
              {events.length > 1 && (
                <button className="pe-card__remove" onClick={() => removeEvent(idx)} title="Remove">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            <div className="pe-card__fields">
              {FIELD_ORDER.map((field) => (
                <div key={field} className={`pe-card__field ${field === "Comment" ? "pe-card__field--wide" : ""}`}>
                  <label>{FIELD_LABELS[field]}</label>
                  <input
                    value={evt[field] || ""}
                    onChange={(e) => updateEvent(idx, field, e.target.value)}
                    placeholder={field}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {results && (
        <div className={`pe-result ${results.success ? "pe-result--success" : "pe-result--error"}`}>
          <div className="pe-result__head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {results.success
                ? <><circle cx="12" cy="12" r="10"/><polyline points="16 8 10.5 14 8 11.5"/></>
                : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
            </svg>
            {results.success
              ? `${results.published} of ${results.total} event${results.total > 1 ? "s" : ""} published`
              : results.error || "Some events failed to publish"}
          </div>
          {results.results && (
            <div className="pe-result__details">
              {results.results.map((r, i) => (
                <div key={i} className={`pe-result__item ${r.success ? "" : "pe-result__item--fail"}`}>
                  <span>{r.referenceId}</span>
                  <span>{r.success ? r.id : r.errors?.map((e) => e.message).join(", ") || "Failed"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="pe-history">
          <h3>Recent Publishes</h3>
          <div className="pe-history__list">
            {history.map((h, i) => (
              <div key={i} className="pe-history__item">
                <span className="pe-history__time">{h.time}</span>
                <span className={`pe-history__status ${h.result.success ? "pe-history__status--ok" : "pe-history__status--fail"}`}>
                  {h.result.success ? "OK" : "FAIL"}
                </span>
                <span className="pe-history__count">{h.events.length} event{h.events.length > 1 ? "s" : ""}</span>
                <span className="pe-history__types">{h.events.map((e) => e.JournalSubTypeName).join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
