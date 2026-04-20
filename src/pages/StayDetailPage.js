import React, { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import hotels from "../data/hotels";
import promotionsData from "../data/promotions";
import { useApp } from "../context/AppContext";
import { getIncentive } from "../engine/steeringEngine";
import { fetchEligiblePromotions, buildCartRequest, processEligiblePromotions, simulatePoints } from "../services/sfApi";

const roomTypes = [
  { code: "STD-K", name: "Standard King", rateMultiplier: 1.0, refundable: true },
  { code: "STD-QQ", name: "Standard 2 Queens", rateMultiplier: 1.1, refundable: true },
  { code: "DLX-K", name: "Deluxe King", rateMultiplier: 1.3, refundable: true },
  { code: "STE", name: "Junior Suite", rateMultiplier: 1.6, refundable: false },
];

export default function StayDetailPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { member } = useApp();

  const hotel = useMemo(() => hotels.find((h) => h.sku === id), [id]);
  const guests = params.get("guests") || "2";
  const nightsParam = Number(params.get("nights"));
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";
  const nights = Number.isFinite(nightsParam) && nightsParam > 0 ? nightsParam : 1;
  const incentive = hotel ? getIncentive(hotel, member, promotionsData) : null;

  const [sfPromos, setSfPromos] = useState(null);
  const [sfLoading, setSfLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    if (!hotel) return;
    setSfLoading(true);
    setSimLoading(true);
    setSimResult(null);
    const totalAmount = hotel.nightlyPriceUsd * nights;
    const cartReq = buildCartRequest(hotel, member.membershipNumber, {
      amount: totalAmount,
      destination: hotel.city,
    });

    fetchEligiblePromotions(cartReq)
      .then((data) => {
        const processed = processEligiblePromotions(data, totalAmount);
        setSfPromos(processed);
      })
      .catch((err) => {
        console.warn("[StayDetail] Eligible promotions unavailable:", err.message);
        setSfPromos(null);
      })
      .finally(() => setSfLoading(false));

    simulatePoints(member.membershipNumber, [{
      JournalTypeName: "Accrual",
      JournalSubTypeName: "Hotel Booking",
      TransactionAmount: totalAmount,
      CurrencyIsoCode: "USD",
      LOB__c: "Hotel",
      Destination_City__c: hotel.city,
      Destination_Country__c: hotel.country,
      Length_of_Stay__c: String(nights),
    }])
      .then((data) => {
        const r = data.results?.[0];
        if (r && !r.errorMessage) setSimResult(r);
      })
      .catch((err) => console.warn("[StayDetail] Earn simulation unavailable:", err.message))
      .finally(() => setSimLoading(false));
  }, [hotel, nights, member.membershipNumber, member.pointsBalance]);

  if (!hotel) {
    return (
      <div className="detail-page">
        <div className="detail-page__error">
          <h2>Property not found</h2>
          <Link to="/hotels" className="btn btn--primary">Back to search</Link>
        </div>
      </div>
    );
  }

  const rooms = roomTypes.map((r) => ({
    ...r,
    nightlyRate: Math.round(hotel.nightlyPriceUsd * r.rateMultiplier),
  }));

  const taxRate = 0.12;
  const resortFee = 18;

  const hasSfDiscounts = sfPromos && sfPromos.appliedPromotions && sfPromos.appliedPromotions.length > 0;
  const hasSfPoints = sfPromos && sfPromos.totalPointsAwarded > 0;

  return (
    <div className="detail-page">
      <div className="detail-page__breadcrumb">
        <Link to="/hotels">Hotels</Link>
        <span>/</span>
        <span>{hotel.city}</span>
        <span>/</span>
        <span>{hotel.name}</span>
      </div>

      <div className="detail-page__grid">
        <div className="detail-page__left">
          <div className="detail-page__gallery">
            <img src={hotel.thumbnailImageUrl} alt={hotel.name} className="detail-page__main-image" />
          </div>

          <div className="detail-page__sim-row">
            {simLoading && !simResult && (
              <div className="detail-page__sim detail-page__sim--loading">
                <div className="detail-page__sim-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  Estimating Points
                  <span className="detail-page__sim-source">via Salesforce</span>
                </div>
                <div className="shimmer-line shimmer-line--wide" />
                <div className="shimmer-line shimmer-line--narrow" />
              </div>
            )}

            {simResult && Object.keys(simResult.byCurrency).length > 0 && (
              <div className="detail-page__sim">
                <div className="detail-page__sim-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  Estimated Earn
                  <span className="detail-page__sim-source">via Salesforce</span>
                </div>
                {Object.entries(simResult.byCurrency).map(([curr, pts]) => (
                  <div key={curr} className="detail-page__sim-line">
                    <span>{curr}</span>
                    <strong>+{Number(pts).toLocaleString()} pts</strong>
                  </div>
                ))}
                {simResult.processName && (
                  <div className="detail-page__sim-process">{simResult.processName}</div>
                )}
              </div>
            )}

          </div>
        </div>

        <aside className="detail-page__summary">
          <div className="detail-page__summary-card">
            <p className="detail-page__city">{hotel.city}, {hotel.country}</p>
            <h1 className="detail-page__title">{hotel.name}</h1>

            <div className="detail-page__meta">
              <span className="detail-page__rating">{"★".repeat(Math.floor(hotel.rating))} {hotel.rating}</span>
              <span className="detail-page__region">{hotel.regionTag}</span>
            </div>

            <div className="detail-page__price-redeem-row">
              <div className="detail-page__pricing">
                <div className="detail-page__price">${hotel.nightlyPriceUsd}</div>
                <div className="detail-page__price-label">per night</div>
                <div className="detail-page__price-breakdown">
                  ${hotel.nightlyPriceUsd} x {nights} night{nights > 1 ? "s" : ""} = <strong>${hotel.nightlyPriceUsd * nights}</strong>
                </div>
              </div>

              {member.pointsBalance > 0 && (
                <div className="detail-page__sim detail-page__sim--burn">
                  <div className="detail-page__sim-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    Redeem Points
                  </div>
                  <div className="detail-page__sim-line">
                    <span>Full stay in points</span>
                    <strong>{(Math.round(hotel.nightlyPriceUsd * nights / 0.01)).toLocaleString()} pts</strong>
                  </div>
                  <div className="detail-page__sim-line">
                    <span>Your balance</span>
                    <strong>{member.pointsBalance.toLocaleString()} pts</strong>
                  </div>
                  <div className="detail-page__sim-process">
                    {member.pointsBalance >= Math.round(hotel.nightlyPriceUsd * nights / 0.01)
                      ? "You have enough points to cover this stay!"
                      : `Apply up to $${(member.pointsBalance * 0.01).toFixed(0)} toward this booking`}
                  </div>
                </div>
              )}
            </div>

            {incentive && (
              <div className="detail-page__points">
                <div className="detail-page__points-earn">
                  Earn <strong>{incentive.totalEarnPoints.toLocaleString()}</strong> pts/night
                </div>
                {incentive.redemptionDiscountPercent > 0 && (
                  <div className="detail-page__points-redeem">
                    Redeem at <strong>{incentive.redemptionDiscountPercent}% off</strong>
                  </div>
                )}
                {incentive.badgeText && (
                  <span className="detail-page__points-badge">{incentive.badgeText}</span>
                )}
              </div>
            )}

            {sfLoading && (
              <div className="detail-page__sf-promo detail-page__sf-promo--loading">
                <div className="detail-page__sf-spinner" />
                Checking promotions...
              </div>
            )}

            {!sfLoading && sfPromos && sfPromos.eligiblePromotions.length > 0 && (
              <div className="detail-page__sf-promo">
                <div className="detail-page__sf-promo-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                  Salesforce Promotions
                </div>
                {sfPromos.eligiblePromotions.map((p, i) => (
                  <div key={i} className="detail-page__sf-promo-item">
                    <span className="detail-page__sf-promo-name">{p.promotionName}</span>
                    <span className={`detail-page__sf-promo-value ${p.discountAmount > 0 ? "detail-page__sf-promo-value--discount" : "detail-page__sf-promo-value--points"}`}>
                      {p.discountAmount > 0
                        ? `-$${p.discountAmount.toFixed(2)}`
                        : p.pointsAwarded
                        ? `+${p.pointsAwarded.toLocaleString()} pts`
                        : p.description}
                    </span>
                  </div>
                ))}
                {hasSfDiscounts && (
                  <div className="detail-page__sf-promo-total">
                    <span>Promotional savings</span>
                    <strong>-${sfPromos.totalDiscount.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            )}

            <a href="#rooms" className="btn btn--primary detail-page__select-btn">Select a Room</a>
          </div>
        </aside>
      </div>

      <section className="detail-page__info">
        <div className="detail-page__info-main">
          <div className="detail-page__tabs">
            <span className="detail-page__tab detail-page__tab--active">Overview</span>
            <span className="detail-page__tab">Rooms</span>
            <span className="detail-page__tab">Policies</span>
          </div>
          <p className="detail-page__description">{hotel.description}</p>
          <div className="detail-page__amenities-section">
            <h3>Amenities</h3>
            <ul className="detail-page__amenities-list">
              {hotel.amenities.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="detail-page__rooms" id="rooms">
          <h3>Available Rooms</h3>
          <div className="detail-page__rooms-list">
            {rooms.map((room) => {
              const subtotal = room.nightlyRate * nights;
              const taxes = Math.round(subtotal * taxRate);
              const fees = resortFee * nights;
              const total = subtotal + taxes + fees;

              const sfDiscount = sfPromos ? sfPromos.totalDiscount * (room.rateMultiplier / 1.0) : 0;
              const adjustedTotal = Math.max(0, total - Math.round(sfDiscount));

              const qs = new URLSearchParams({
                stay: hotel.sku,
                room: room.code,
                guests,
                nights: String(nights),
                checkIn,
                checkOut,
                price: String(room.nightlyRate),
                total: String(adjustedTotal),
                ...(sfDiscount > 0 ? { sfDiscount: String(Math.round(sfDiscount * 100) / 100) } : {}),
                ...(sfPromos?.eligiblePromotions?.length ? {
                  sfPromoNames: sfPromos.eligiblePromotions.map((p) => p.promotionName).join("|"),
                } : {}),
              });

              return (
                <div key={room.code} className="room-card">
                  <div className="room-card__info">
                    <h4>{room.name}</h4>
                    <span className={`room-card__refund ${room.refundable ? "room-card__refund--yes" : ""}`}>
                      {room.refundable ? "Fully refundable" : "Non-refundable"}
                    </span>
                    <span className="room-card__total">
                      ${room.nightlyRate}/night &middot; Est. total ${total} for {nights} night{nights > 1 ? "s" : ""}
                    </span>
                    {sfDiscount > 0 && (
                      <span className="room-card__promo">
                        After promo: <strong>${adjustedTotal}</strong> (save ${Math.round(sfDiscount)})
                      </span>
                    )}
                  </div>
                  <div className="room-card__action">
                    <div className="room-card__rate">
                      {sfDiscount > 0 && <span className="room-card__rate-original">${room.nightlyRate}</span>}
                      ${sfDiscount > 0 ? Math.round(room.nightlyRate - sfDiscount / nights) : room.nightlyRate}
                    </div>
                    <Link to={`/checkout?${qs.toString()}`} className="btn btn--primary">
                      Select
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
