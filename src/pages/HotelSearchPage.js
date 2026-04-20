import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import hotels from "../data/hotels";
import { useApp } from "../context/AppContext";
import { getIncentive } from "../engine/steeringEngine";
import promotions from "../data/promotions";
import { simulatePoints } from "../services/sfApi";
import DatePicker from "../components/DatePicker";

export default function HotelSearchPage() {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { member } = useApp();

  const uniqueCities = useMemo(() => {
    return [...new Set(hotels.map((h) => `${h.city}, ${h.country}`))].sort();
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!destination.trim()) return uniqueCities.slice(0, 6);
    const lower = destination.toLowerCase();
    return uniqueCities.filter((c) => c.toLowerCase().includes(lower));
  }, [destination, uniqueCities]);

  const results = useMemo(() => {
    if (!hasSearched) return [];
    if (!destination.trim()) return hotels;
    const lower = destination.toLowerCase();
    return hotels.filter(
      (h) =>
        h.city.toLowerCase().includes(lower) ||
        h.country.toLowerCase().includes(lower) ||
        h.regionTag.toLowerCase().includes(lower)
    );
  }, [hasSearched, destination]);

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
    setShowSuggestions(false);
  };

  const getNights = () => {
    if (checkIn && checkOut) {
      const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
      return Math.max(1, Math.round(diff));
    }
    return 1;
  };

  const [simResults, setSimResults] = useState({});
  const [simLoadingIds, setSimLoadingIds] = useState(new Set());

  const runSimForHotel = useCallback(async (hotel) => {
    setSimLoadingIds((prev) => new Set(prev).add(hotel.sku));
    const nights = getNights();
    const totalAmount = hotel.nightlyPriceUsd * nights;
    try {
      const data = await simulatePoints(member.membershipNumber, [{
        JournalTypeName: "Accrual",
        JournalSubTypeName: "Hotel Booking",
        TransactionAmount: totalAmount,
        CurrencyIsoCode: "USD",
        LOB__c: "Hotel",
        Destination_City__c: hotel.city,
        Destination_Country__c: hotel.country,
        Length_of_Stay__c: String(nights),
      }]);
      const r = data.results?.[0];
      if (r && !r.errorMessage && Object.keys(r.byCurrency).length > 0) {
        setSimResults((prev) => ({ ...prev, [hotel.sku]: r }));
      }
    } catch {}
    setSimLoadingIds((prev) => { const n = new Set(prev); n.delete(hotel.sku); return n; });
  }, [member.membershipNumber, checkIn, checkOut]);

  useEffect(() => {
    if (!hasSearched || results.length === 0) return;
    setSimResults({});
    setSimLoadingIds(new Set());
    results.slice(0, 6).forEach((h) => runSimForHotel(h));
  }, [hasSearched, results, runSimForHotel]);

  return (
    <div className="search-page">
      <div className="search-page__header">
        <h1>Find Hotels</h1>
        <p>Search from {hotels.length} properties worldwide. Earn Yahoo Points on every stay.</p>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <div className="search-bar__field search-bar__field--wide">
          <label>Where to?</label>
          <div className="search-bar__input-wrap">
            <input
              type="text"
              placeholder="City, region, or hotel name"
              value={destination}
              onChange={(e) => { setDestination(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="search-bar__suggestions">
                {filteredSuggestions.map((city) => (
                  <li key={city}>
                    <button type="button" onMouseDown={() => { setDestination(city); setShowSuggestions(false); }}>
                      {city}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="search-bar__field">
          <label>Check-in</label>
          <DatePicker value={checkIn} onChange={setCheckIn} placeholder="Check-in" />
        </div>
        <div className="search-bar__field">
          <label>Check-out</label>
          <DatePicker value={checkOut} onChange={setCheckOut} placeholder="Check-out" minDate={checkIn} />
        </div>
        <div className="search-bar__field search-bar__field--narrow">
          <label>Guests</label>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "Guest" : "Guests"}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="search-bar__submit">Search</button>
      </form>

      {hasSearched && (
        <div className="search-results">
          <div className="search-results__header">
            <h2>{results.length} {results.length === 1 ? "property" : "properties"} found</h2>
            {destination.trim() && (
              <button className="btn-text" onClick={() => { setDestination(""); setHasSearched(true); }}>
                Show all
              </button>
            )}
          </div>

          <div className="search-results__list">
            {results.map((hotel) => {
              const incentive = getIncentive(hotel, member, promotions);
              const nights = getNights();

              return (
                <div key={hotel.sku} className="result-card">
                  <div className="result-card__visual">
                    <div className="result-card__image-wrap">
                      <img src={hotel.thumbnailImageUrl} alt={hotel.name} className="result-card__image" loading="lazy" />
                      {incentive.badgeText && (
                        <span className="result-card__badge">{incentive.badgeText}</span>
                      )}
                      <span className="result-card__region">{hotel.regionTag}</span>
                    </div>
                    <div className="result-card__loyalty">
                      <div className="result-card__loyalty-earn">
                        <span className="result-card__loyalty-label">Earn</span>
                        {simLoadingIds.has(hotel.sku) && !simResults[hotel.sku] ? (
                          <div className="shimmer-line shimmer-line--sm" />
                        ) : simResults[hotel.sku] ? (
                          <>
                            <strong>{Object.values(simResults[hotel.sku].byCurrency)[0]?.toLocaleString()} pts</strong>
                            <span className="result-card__loyalty-source">via SF</span>
                          </>
                        ) : (
                          <>
                            <strong>{incentive.totalEarnPoints.toLocaleString()} pts/night</strong>
                            {incentive.extraEarnPoints > 0 && (
                              <span className="result-card__loyalty-detail">
                                ({hotel.basePointsPerNight.toLocaleString()} + {incentive.extraEarnPoints.toLocaleString()} bonus)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="result-card__loyalty-redeem">
                        <span className="result-card__loyalty-label">Redeem</span>
                        {incentive.redemptionDiscountPercent > 0 ? (
                          <>
                            <span className="result-card__strikethrough">{hotel.redemptionPointsStandard.toLocaleString()}</span>
                            <strong>{incentive.discountedRedemptionPoints.toLocaleString()} pts/night</strong>
                            <span className="result-card__savings">{incentive.redemptionDiscountPercent}% off</span>
                          </>
                        ) : (
                          <strong>{hotel.redemptionPointsStandard.toLocaleString()} pts/night</strong>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="result-card__body">
                    <div className="result-card__top">
                      <div>
                        <h3 className="result-card__name">{hotel.name}</h3>
                        <p className="result-card__location">{hotel.city}, {hotel.country}</p>
                        <div className="result-card__rating">
                          <span className="result-card__stars">{"★".repeat(Math.floor(hotel.rating))}</span>
                          <span>{hotel.rating}</span>
                        </div>
                      </div>
                      <div className="result-card__price">
                        <span className="result-card__price-amount">${hotel.nightlyPriceUsd}</span>
                        <span className="result-card__price-label">per night</span>
                        {nights > 1 && (
                          <span className="result-card__price-total">
                            ${hotel.nightlyPriceUsd * nights} total for {nights} nights
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="result-card__desc">{hotel.description}</p>
                    <div className="result-card__amenities">
                      {hotel.amenities.map((a, i) => (
                        <span key={i} className="result-card__amenity">{a}</span>
                      ))}
                    </div>
                    <div className="result-card__actions">
                      <Link
                        to={`/stay/${hotel.sku}?guests=${guests}&checkIn=${checkIn}&checkOut=${checkOut}&nights=${nights}`}
                        className="btn btn--primary"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {results.length === 0 && (
            <div className="search-results__empty">
              <p>No properties found. Try a different destination.</p>
            </div>
          )}
        </div>
      )}

      {!hasSearched && (
        <div className="search-page__promo">
          <h2>Popular Destinations</h2>
          <div className="search-page__destinations">
            {["Paris", "Tokyo", "New York", "Barcelona", "Dubai", "Bali"].map((city) => (
              <button key={city} className="search-page__dest-card" onClick={() => { setDestination(city); setHasSearched(true); }}>
                <span>{city}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
