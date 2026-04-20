import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import flights, { airports } from "../data/flights";
import { useApp } from "../context/AppContext";
import { fetchEligiblePromotions, buildCartRequest, processEligiblePromotions, simulatePoints } from "../services/sfApi";
import DatePicker from "../components/DatePicker";

function generateFlightsForRoute(originCity, destCity, templateFlights) {
  const originAirport = airports.find(
    (a) => a.city.toLowerCase() === originCity.toLowerCase() || a.code.toLowerCase() === originCity.toLowerCase()
  ) || { code: originCity.slice(0, 3).toUpperCase(), city: originCity, name: `${originCity} Intl` };

  const destAirport = airports.find(
    (a) => a.city.toLowerCase() === destCity.toLowerCase() || a.code.toLowerCase() === destCity.toLowerCase()
  ) || { code: destCity.slice(0, 3).toUpperCase(), city: destCity, name: `${destCity} Intl` };

  return templateFlights.slice(0, 4).map((f, i) => ({
    ...f,
    id: `GEN-${originAirport.code}-${destAirport.code}-${i}`,
    origin: { ...originAirport },
    destination: { ...destAirport },
    flightNumber: `YA ${100 + Math.floor(Math.random() * 900)}`,
  }));
}

export default function FlightSearchPage() {
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState("price");
  const navigate = useNavigate();
  const { member } = useApp();

  const results = useMemo(() => {
    if (!hasSearched) return [];

    let filtered = [...flights];

    if (origin.trim() || dest.trim()) {
      const o = origin.toLowerCase().trim();
      const d = dest.toLowerCase().trim();

      if (o) {
        filtered = filtered.filter(
          (f) => f.origin.city.toLowerCase().includes(o) || f.origin.code.toLowerCase() === o
        );
      }
      if (d) {
        filtered = filtered.filter(
          (f) => f.destination.city.toLowerCase().includes(d) || f.destination.code.toLowerCase() === d
        );
      }

      if (filtered.length === 0 && o && d) {
        filtered = generateFlightsForRoute(origin, dest, flights);
      }
    }

    if (sortBy === "price") filtered.sort((a, b) => a.price - b.price);
    else if (sortBy === "duration") filtered.sort((a, b) => a.duration.localeCompare(b.duration));
    else if (sortBy === "departure") filtered.sort((a, b) => a.departure.localeCompare(b.departure));

    return filtered;
  }, [hasSearched, origin, dest, sortBy]);

  const [simResults, setSimResults] = useState({});
  const [simLoadingIds, setSimLoadingIds] = useState(new Set());

  const runSimForFlight = useCallback(async (flight) => {
    setSimLoadingIds((prev) => new Set(prev).add(flight.id));
    const totalAmount = flight.price * passengers;
    try {
      const data = await simulatePoints(member.membershipNumber, [{
        JournalTypeName: "Accrual",
        JournalSubTypeName: "Flight Booking",
        TransactionAmount: totalAmount,
        CurrencyIsoCode: "USD",
        LOB__c: "Flight",
        Destination_City__c: flight.destination.city,
      }]);
      const r = data.results?.[0];
      if (r && !r.errorMessage && Object.keys(r.byCurrency).length > 0) {
        setSimResults((prev) => ({ ...prev, [flight.id]: r }));
      }
    } catch {}

    setSimLoadingIds((prev) => { const n = new Set(prev); n.delete(flight.id); return n; });
  }, [member.membershipNumber, member.pointsBalance, passengers]);

  useEffect(() => {
    if (!hasSearched || results.length === 0) return;
    setSimResults({});
    setSimLoadingIds(new Set());
    results.slice(0, 6).forEach((f) => runSimForFlight(f));
  }, [hasSearched, results, runSimForFlight]);

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const handleSelectFlight = async (flight) => {
    const totalAmount = flight.price * passengers;
    let sfDiscount = 0;
    let sfPromoNames = [];

    try {
      const cartReq = buildCartRequest(flight, member.membershipNumber, {
        amount: totalAmount,
        origin: flight.origin.city,
        destination: flight.destination.city,
      });
      const sfData = await fetchEligiblePromotions(cartReq);
      const processed = processEligiblePromotions(sfData, totalAmount);
      sfDiscount = processed.totalDiscount;
      sfPromoNames = processed.appliedPromotions.map((p) => p.promotionName);
    } catch (err) {
      console.warn("[FlightSearch] Eligible promotions unavailable:", err.message);
    }

    const adjustedTotal = Math.max(0, totalAmount - sfDiscount);
    const qs = new URLSearchParams({
      type: "flight",
      flightId: flight.id,
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      originCode: flight.origin.code,
      originCity: flight.origin.city,
      destCode: flight.destination.code,
      destCity: flight.destination.city,
      departure: flight.departure,
      arrival: flight.arrival,
      duration: flight.duration,
      passengers: String(passengers),
      date: date || new Date().toISOString().split("T")[0],
      price: String(flight.price),
      total: String(adjustedTotal),
      pointsEarned: String(flight.pointsEarned),
      class: flight.class,
      ...(sfDiscount > 0 ? { sfDiscount: String(sfDiscount) } : {}),
      ...(sfPromoNames.length > 0 ? { sfPromoNames: sfPromoNames.join("|") } : {}),
    });
    navigate(`/checkout?${qs.toString()}`);
  };

  return (
    <div className="search-page">
      <div className="search-page__header">
        <h1>Find Flights</h1>
        <p>Compare prices and earn Yahoo Points on every flight.</p>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-bar__field search-bar__field--wide">
          <label>From</label>
          <input
            type="text"
            placeholder="City or airport code"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            list="origins"
          />
          <datalist id="origins">
            {airports.map((a) => (
              <option key={a.code} value={a.city}>{a.code} - {a.name}</option>
            ))}
          </datalist>
        </div>
        <div className="search-bar__field search-bar__field--wide">
          <label>To</label>
          <input
            type="text"
            placeholder="City or airport code"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            list="destinations"
          />
          <datalist id="destinations">
            {airports.map((a) => (
              <option key={a.code} value={a.city}>{a.code} - {a.name}</option>
            ))}
          </datalist>
        </div>
        <div className="search-bar__field">
          <label>Departure</label>
          <DatePicker value={date} onChange={setDate} placeholder="Select date" />
        </div>
        <div className="search-bar__field search-bar__field--narrow">
          <label>Passengers</label>
          <select value={passengers} onChange={(e) => setPassengers(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="search-bar__submit">Search</button>
      </form>

      {hasSearched && (
      <div className="search-results">
        <div className="search-results__header">
          <h2>{results.length} flight{results.length !== 1 ? "s" : ""} found</h2>
          <div className="search-results__sort">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="price">Price</option>
              <option value="duration">Duration</option>
              <option value="departure">Departure time</option>
            </select>
          </div>
        </div>

        <div className="search-results__list">
          {results.map((flight) => (
            <div key={flight.id} className="flight-card">
              <div className="flight-card__route">
                <div className="flight-card__endpoint">
                  <span className="flight-card__time">{flight.departure}</span>
                  <span className="flight-card__code">{flight.origin.code}</span>
                  <span className="flight-card__city">{flight.origin.city}</span>
                </div>
                <div className="flight-card__line">
                  <span className="flight-card__duration">{flight.duration}</span>
                  <div className="flight-card__line-bar">
                    <span className="flight-card__line-dot" />
                    <span className="flight-card__line-track" />
                    {flight.stops > 0 && <span className="flight-card__line-stop" />}
                    {flight.stops > 0 && <span className="flight-card__line-track" />}
                    <span className="flight-card__line-dot" />
                  </div>
                  <span className="flight-card__stops">
                    {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
                    {flight.stopCity && ` (${flight.stopCity})`}
                  </span>
                </div>
                <div className="flight-card__endpoint">
                  <span className="flight-card__time">{flight.arrival}</span>
                  <span className="flight-card__code">{flight.destination.code}</span>
                  <span className="flight-card__city">{flight.destination.city}</span>
                </div>
              </div>
              <div className="flight-card__details">
                <div className="flight-card__airline">
                  <span className="flight-card__flight-number">{flight.flightNumber}</span>
                  <span className="flight-card__class">{flight.class}</span>
                </div>
                <div className="flight-card__amenity-list">
                  {flight.amenities.map((a, i) => (
                    <span key={i} className="flight-card__amenity-tag">{a}</span>
                  ))}
                </div>
              </div>
              <div className="flight-card__pricing">
                <div className="flight-card__price">${flight.price}</div>
                {simLoadingIds.has(flight.id) && !simResults[flight.id] ? (
                  <div className="flight-card__points-shimmer">
                    <div className="shimmer-line shimmer-line--sm" />
                  </div>
                ) : simResults[flight.id] ? (
                  <div className="flight-card__points flight-card__points--sf">
                    Earn {Object.values(simResults[flight.id].byCurrency)[0]?.toLocaleString()} pts
                    <span className="flight-card__points-source">via SF</span>
                  </div>
                ) : (
                  <div className="flight-card__points">Earn {flight.pointsEarned.toLocaleString()} pts</div>
                )}
                {member.pointsBalance > 0 && (
                  <div className="flight-card__burn">
                    or {Math.min(member.pointsBalance, Math.round(flight.price * passengers / 0.01)).toLocaleString()} pts
                  </div>
                )}
                {flight.seatsLeft <= 5 && (
                  <div className="flight-card__seats">{flight.seatsLeft} seats left</div>
                )}
                <button
                  className="btn btn--primary"
                  onClick={() => handleSelectFlight(flight)}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div className="search-results__empty">
            <p>No flights found for this route. Try different cities.</p>
          </div>
        )}
      </div>
      )}

      {!hasSearched && (
        <div className="search-page__promo">
          <h2>Popular Routes</h2>
          <div className="search-page__destinations">
            {[
              { from: "Los Angeles", to: "New York" },
              { from: "San Francisco", to: "Chicago" },
              { from: "New York", to: "Miami" },
              { from: "Boston", to: "Los Angeles" },
            ].map((route, i) => (
              <button key={i} className="search-page__dest-card" onClick={() => { setOrigin(route.from); setDest(route.to); setHasSearched(true); }}>
                <span>{route.from} → {route.to}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
