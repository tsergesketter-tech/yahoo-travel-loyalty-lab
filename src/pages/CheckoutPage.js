import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import hotels from "../data/hotels";
import { useApp } from "../context/AppContext";
import { getIncentive } from "../engine/steeringEngine";
import promotionsData from "../data/promotions";
import { postTransactionJournal, buildAccrualJournal, simulatePoints } from "../services/sfApi";

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { member, bookHotel, addToast } = useApp();

  const bookingType = params.get("type") || "hotel";
  const isFlightBooking = bookingType === "flight";

  // Hotel params
  const stayId = params.get("stay") || "";
  const roomCode = params.get("room") || "";
  const guests = params.get("guests") || "2";
  const nightsParam = Number(params.get("nights"));
  const nights = Number.isFinite(nightsParam) && nightsParam > 0 ? nightsParam : 1;
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";
  const nightlyRate = Number(params.get("price")) || 0;
  const totalFromUrl = Number(params.get("total")) || 0;
  const sfDiscount = Number(params.get("sfDiscount")) || 0;
  const sfPromoNames = (params.get("sfPromoNames") || "").split("|").filter(Boolean);

  // Flight params
  const flightNumber = params.get("flightNumber") || "";
  const airline = params.get("airline") || "";
  const originCode = params.get("originCode") || "";
  const originCity = params.get("originCity") || "";
  const destCode = params.get("destCode") || "";
  const destCity = params.get("destCity") || "";
  const departure = params.get("departure") || "";
  const arrival = params.get("arrival") || "";
  const duration = params.get("duration") || "";
  const flightDate = params.get("date") || "";
  const flightClass = params.get("class") || "Economy";
  const passengers = params.get("passengers") || "1";
  const flightPrice = Number(params.get("price")) || 0;
  const flightTotal = Number(params.get("total")) || 0;
  const flightPointsEarned = Number(params.get("pointsEarned")) || 0;

  const hotel = useMemo(() => hotels.find((h) => h.sku === stayId), [stayId]);
  const incentive = hotel ? getIncentive(hotel, member, promotionsData) : null;

  const [submitting, setSubmitting] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "",
    cardNumber: "", expiry: "", cvc: "", postal: "",
  });

  const pointValue = 0.01;
  const baseTotal = isFlightBooking ? flightTotal : totalFromUrl;
  const redeemCredit = redeemPoints * pointValue;
  const finalTotal = Math.max(0, baseTotal - redeemCredit);

  const [simEarn, setSimEarn] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cashAmount = finalTotal;
      if (cashAmount <= 0) { setSimEarn(0); setSimLoading(false); return; }
      setSimLoading(true);
      const journal = isFlightBooking
        ? { JournalTypeName: "Accrual", JournalSubTypeName: "Flight Booking", TransactionAmount: cashAmount, CurrencyIsoCode: "USD", LOB__c: "Flight", Destination_City__c: destCity }
        : { JournalTypeName: "Accrual", JournalSubTypeName: "Hotel Booking", TransactionAmount: cashAmount, CurrencyIsoCode: "USD", LOB__c: "Hotel", Destination_City__c: hotel?.city || "", Destination_Country__c: hotel?.country || "", Length_of_Stay__c: String(nights) };
      simulatePoints(member.membershipNumber, [journal])
        .then((data) => {
          const r = data.results?.[0];
          if (r && !r.errorMessage && Object.keys(r.byCurrency).length > 0) {
            setSimEarn(Object.values(r.byCurrency)[0]);
          }
        })
        .catch(() => {})
        .finally(() => setSimLoading(false));
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [finalTotal, isFlightBooking, destCity, hotel, nights, member.membershipNumber]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const bookingId = `BK-${Date.now()}`;

    try {
      if (isFlightBooking) {
        const memberNum = member.membershipNumber || "YAH0000001";
        const journals = [{
          ExternalTransactionNumber: bookingId,
          External_ID__c: bookingId,
          MembershipNumber: memberNum,
          JournalTypeName: "Accrual",
          JournalSubTypeName: "Flight Booking",
          ActivityDate: new Date().toISOString(),
          CurrencyIsoCode: "USD",
          TransactionAmount: String(finalTotal),
          Channel: "Web",
          LOB__c: "Flight",
          Destination_City__c: destCity,
          StartDate: flightDate ? `${flightDate}T08:00:00.000Z` : new Date().toISOString(),
          Comment: `${airline} ${flightNumber} — ${originCity} to ${destCity}`,
        }];

        if (redeemPoints > 0) {
          journals.push({
            ExternalTransactionNumber: `${bookingId}-REDEEM`,
            External_ID__c: `${bookingId}-REDEEM`,
            MembershipNumber: memberNum,
            JournalTypeName: "Redemption",
            JournalSubTypeName: "Redeem Points",
            ActivityDate: new Date().toISOString(),
            CurrencyIsoCode: "USD",
            TransactionAmount: "0",
            Points_to_Redeem__c: String(redeemPoints),
            Channel: "Web",
            LOB__c: "Flight",
            Destination_City__c: destCity,
            Comment: `Redeemed ${redeemPoints} pts — ${airline} ${flightNumber}`,
          });
        }

        await postTransactionJournal(journals)
          .then((r) => console.log("[Checkout] Flight journals posted:", r.journalIds))
          .catch((err) => console.warn("[Checkout] Flight journal failed:", err.message));

        const earnedPts = simEarn != null ? simEarn : flightPointsEarned * Number(passengers);
        addToast(`Flight ${flightNumber} booked! Earned ${earnedPts.toLocaleString()} Yahoo Points.`);
        navigate(
          `/confirmation?booking=${bookingId}&type=flight&flightNumber=${flightNumber}&originCity=${originCity}&originCode=${originCode}&destCity=${destCity}&destCode=${destCode}&departure=${departure}&arrival=${arrival}&date=${flightDate}&passengers=${passengers}&class=${flightClass}&total=${finalTotal.toFixed(2)}`
        );
      } else {
        if (hotel && incentive) {
          await bookHotel(hotel, incentive, nights, {
            bookingId,
            redeemedPoints: redeemPoints,
            totalPaid: finalTotal,
            checkIn,
            checkOut,
          });
        }
        navigate(
          `/confirmation?booking=${bookingId}&stay=${stayId}&room=${roomCode}&guests=${guests}&nights=${nights}&checkIn=${checkIn}&checkOut=${checkOut}&total=${finalTotal.toFixed(2)}`
        );
      }
    } catch (err) {
      console.error("[Checkout] Submit failed:", err);
      setSubmitting(false);
    }
  };

  if (!isFlightBooking && !hotel) {
    return (
      <div className="checkout-page">
        <div className="checkout-page__error">
          <h2>Booking not found</h2>
          <Link to="/hotels" className="btn btn--primary">Back to search</Link>
        </div>
      </div>
    );
  }

  const roomName = { "STD-K": "Standard King", "STD-QQ": "Standard 2 Queens", "DLX-K": "Deluxe King", "STE": "Junior Suite" }[roomCode] || roomCode;

  return (
    <div className="checkout-page">
      {submitting && (
        <div className="checkout-page__overlay">
          <div className="checkout-page__overlay-card">
            <div className="checkout-page__overlay-spinner" />
            <h3>Processing Your Booking</h3>
            <p>Posting transaction journals to Salesforce Loyalty...</p>
          </div>
        </div>
      )}
      <div className="checkout-page__disclaimer">
        <strong>Demo Site</strong> — Do not enter real payment information. This is a Salesforce demo application.
      </div>

      <div className="checkout-page__grid">
        <aside className="checkout-page__summary">
          <div className="checkout-page__summary-card">
            {isFlightBooking ? (
              <>
                <p className="checkout-page__city">{originCity} → {destCity}</p>
                <h2 className="checkout-page__hotel">{airline} {flightNumber}</h2>
                <p className="checkout-page__room">{flightClass}</p>

                <div className="checkout-page__flight-route">
                  <div className="checkout-page__flight-leg">
                    <span className="checkout-page__flight-time">{departure}</span>
                    <span className="checkout-page__flight-code">{originCode}</span>
                  </div>
                  <div className="checkout-page__flight-arrow">
                    <span className="checkout-page__flight-duration">{duration}</span>
                    <div className="checkout-page__flight-line" />
                  </div>
                  <div className="checkout-page__flight-leg">
                    <span className="checkout-page__flight-time">{arrival}</span>
                    <span className="checkout-page__flight-code">{destCode}</span>
                  </div>
                </div>

                <div className="checkout-page__breakdown">
                  <div className="checkout-page__line">
                    <span>${flightPrice} x {passengers} passenger{Number(passengers) > 1 ? "s" : ""}</span>
                    <span>${flightPrice * Number(passengers)}</span>
                  </div>
                  {sfDiscount > 0 && (
                    <div className="checkout-page__line checkout-page__line--credit">
                      <span>
                        Promo discount
                        {sfPromoNames.length > 0 && <em className="checkout-page__promo-name"> ({sfPromoNames.join(", ")})</em>}
                      </span>
                      <span>-${sfDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {redeemPoints > 0 && (
                    <div className="checkout-page__line checkout-page__line--credit">
                      <span>Points credit ({redeemPoints.toLocaleString()} pts)</span>
                      <span>-${redeemCredit.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="checkout-page__line checkout-page__line--total">
                    <span>{redeemPoints > 0 || sfDiscount > 0 ? "Pay today" : "Total"}</span>
                    <span>${(redeemPoints > 0 ? finalTotal : flightTotal).toFixed(2)}</span>
                  </div>
                </div>

                <div className="checkout-page__meta">
                  <span>Passengers: {passengers}</span>
                  {flightDate && <span>Date: {flightDate}</span>}
                </div>

                <div className="checkout-page__points-earn">
                  {simLoading ? (
                    <>Estimating earn<span className="checkout-page__sim-dots">...</span></>
                  ) : (
                    <>Earn <strong>{(simEarn != null ? simEarn : flightPointsEarned * Number(passengers)).toLocaleString()}</strong> Yahoo Points</>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="checkout-page__city">{hotel.city}, {hotel.country}</p>
                <h2 className="checkout-page__hotel">{hotel.name}</h2>
                <p className="checkout-page__room">{roomName}</p>

                <div className="checkout-page__breakdown">
                  <div className="checkout-page__line">
                    <span>${nightlyRate} x {nights} night{nights > 1 ? "s" : ""}</span>
                    <span>${nightlyRate * nights}</span>
                  </div>
                  <div className="checkout-page__line">
                    <span>Taxes & fees</span>
                    <span>${(totalFromUrl + sfDiscount - nightlyRate * nights).toFixed(0)}</span>
                  </div>
                  {sfDiscount > 0 && (
                    <div className="checkout-page__line checkout-page__line--credit">
                      <span>
                        Promo discount
                        {sfPromoNames.length > 0 && <em className="checkout-page__promo-name"> ({sfPromoNames.join(", ")})</em>}
                      </span>
                      <span>-${sfDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {redeemPoints > 0 && (
                    <div className="checkout-page__line checkout-page__line--credit">
                      <span>Points credit ({redeemPoints.toLocaleString()} pts)</span>
                      <span>-${redeemCredit.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="checkout-page__line checkout-page__line--total">
                    <span>{redeemPoints > 0 || sfDiscount > 0 ? "Pay today" : "Total"}</span>
                    <span>${(redeemPoints > 0 ? finalTotal : totalFromUrl).toFixed(2)}</span>
                  </div>
                </div>

                <div className="checkout-page__meta">
                  <span>Guests: {guests}</span>
                  <span>Nights: {nights}</span>
                  {checkIn && <span>Check-in: {checkIn}</span>}
                </div>

                <div className="checkout-page__points-earn">
                  {simLoading ? (
                    <>Estimating earn<span className="checkout-page__sim-dots">...</span></>
                  ) : (
                    <>Earn <strong>{(simEarn != null ? simEarn : (incentive ? incentive.totalEarnPoints * nights : 0)).toLocaleString()}</strong> Yahoo Points</>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>

        <section className="checkout-page__form-section">
          <form onSubmit={handleSubmit} className="checkout-page__form">
            <h2>{isFlightBooking ? "Passenger Details" : "Guest Details"}</h2>
            <div className="checkout-page__row">
              <div className="checkout-page__field">
                <label>First name</label>
                <input name="firstName" value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="checkout-page__field">
                <label>Last name</label>
                <input name="lastName" value={formData.lastName} onChange={handleChange} />
              </div>
            </div>
            <div className="checkout-page__field">
              <label>Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} />
            </div>

            <h3>Apply Points (optional)</h3>
            <div className="checkout-page__redeem">
              <p>Available: <strong>{member.pointsBalance.toLocaleString()}</strong> pts (= ${(member.pointsBalance * pointValue).toFixed(0)} value)</p>
              <div className="checkout-page__redeem-row">
                <input
                  type="range"
                  min="0"
                  max={Math.min(member.pointsBalance, Math.floor(baseTotal / pointValue))}
                  step="100"
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                />
                <span className="checkout-page__redeem-value">
                  {redeemPoints.toLocaleString()} pts = ${redeemCredit.toFixed(2)}
                </span>
              </div>
            </div>

            <h3>Payment</h3>
            <div className="checkout-page__row">
              <div className="checkout-page__field">
                <label>Card number</label>
                <input name="cardNumber" value={formData.cardNumber} onChange={handleChange} placeholder="4242 4242 4242 4242" />
              </div>
              <div className="checkout-page__field">
                <label>Expiry (MM/YY)</label>
                <input name="expiry" value={formData.expiry} onChange={handleChange} placeholder="12/28" />
              </div>
            </div>
            <div className="checkout-page__row">
              <div className="checkout-page__field">
                <label>CVC</label>
                <input name="cvc" value={formData.cvc} onChange={handleChange} placeholder="123" />
              </div>
              <div className="checkout-page__field">
                <label>Postal code</label>
                <input name="postal" value={formData.postal} onChange={handleChange} placeholder="90210" />
              </div>
            </div>

            <button type="submit" className="btn btn--primary checkout-page__submit" disabled={submitting}>
              {submitting ? (
                <span className="checkout-page__submit-loading">
                  <span className="checkout-page__spinner" />
                  Processing with Salesforce...
                </span>
              ) : (
                <>Confirm & Pay {redeemPoints > 0 ? `$${finalTotal.toFixed(2)}` : ""}</>
              )}
            </button>

            <Link to={isFlightBooking ? "/flights" : `/stay/${stayId}?guests=${guests}&nights=${nights}&checkIn=${checkIn}&checkOut=${checkOut}`} className="btn-text">
              {isFlightBooking ? "Back to flights" : "Back to property"}
            </Link>
          </form>
        </section>
      </div>
    </div>
  );
}
