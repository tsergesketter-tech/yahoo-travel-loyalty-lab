import React from "react";
import { useSearchParams, Link } from "react-router-dom";
import hotels from "../data/hotels";

export default function ConfirmationPage() {
  const [params] = useSearchParams();
  const bookingId = params.get("booking") || "BK-0000";
  const bookingType = params.get("type") || "hotel";
  const isFlightBooking = bookingType === "flight";
  const total = params.get("total") || "0";

  // Hotel params
  const stayId = params.get("stay") || "";
  const roomCode = params.get("room") || "";
  const guests = params.get("guests") || "2";
  const nights = params.get("nights") || "1";
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";

  // Flight params
  const flightNumber = params.get("flightNumber") || "";
  const originCity = params.get("originCity") || "";
  const originCode = params.get("originCode") || "";
  const destCity = params.get("destCity") || "";
  const destCode = params.get("destCode") || "";
  const departure = params.get("departure") || "";
  const arrival = params.get("arrival") || "";
  const flightDate = params.get("date") || "";
  const passengers = params.get("passengers") || "1";
  const flightClass = params.get("class") || "Economy";

  const hotel = hotels.find((h) => h.sku === stayId);
  const roomName = { "STD-K": "Standard King", "STD-QQ": "Standard 2 Queens", "DLX-K": "Deluxe King", "STE": "Junior Suite" }[roomCode] || roomCode;

  return (
    <div className="confirmation-page">
      <div className="confirmation-page__card">
        <div className="confirmation-page__check">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7D2EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className="confirmation-page__title">Booking Confirmed!</h1>
        <p className="confirmation-page__subtitle">
          {isFlightBooking
            ? "Your flight has been booked. A confirmation email will be sent shortly."
            : "Your reservation has been confirmed. A confirmation email will be sent shortly."}
        </p>

        <div className="confirmation-page__details">
          <div className="confirmation-page__detail-row">
            <span>Confirmation #</span>
            <strong>{bookingId}</strong>
          </div>

          {isFlightBooking ? (
            <>
              <div className="confirmation-page__detail-row">
                <span>Flight</span>
                <strong>{flightNumber}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Route</span>
                <strong>{originCity} ({originCode}) → {destCity} ({destCode})</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Date</span>
                <strong>{flightDate || "—"}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Departure</span>
                <strong>{departure}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Arrival</span>
                <strong>{arrival}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Class</span>
                <strong>{flightClass}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Passengers</span>
                <strong>{passengers}</strong>
              </div>
            </>
          ) : (
            <>
              {hotel && (
                <>
                  <div className="confirmation-page__detail-row">
                    <span>Hotel</span>
                    <strong>{hotel.name}</strong>
                  </div>
                  <div className="confirmation-page__detail-row">
                    <span>Location</span>
                    <strong>{hotel.city}, {hotel.country}</strong>
                  </div>
                </>
              )}
              <div className="confirmation-page__detail-row">
                <span>Room</span>
                <strong>{roomName}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Check-in</span>
                <strong>{checkIn || "—"}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Check-out</span>
                <strong>{checkOut || "—"}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Guests</span>
                <strong>{guests}</strong>
              </div>
              <div className="confirmation-page__detail-row">
                <span>Nights</span>
                <strong>{nights}</strong>
              </div>
            </>
          )}

          <div className="confirmation-page__detail-row confirmation-page__detail-row--total">
            <span>Total Charged</span>
            <strong>${Number(total).toFixed(2)}</strong>
          </div>
        </div>

        <div className="confirmation-page__actions">
          <Link to="/member" className="btn btn--primary">View My Account</Link>
          <Link to="/" className="btn btn--secondary">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
