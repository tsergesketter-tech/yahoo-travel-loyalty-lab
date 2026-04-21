import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { enrollMember } from "../services/sfApi";

export default function AuthModal({ onClose }) {
  const { signIn, addToast } = useApp();
  const [tab, setTab] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [membershipNumber, setMembershipNumber] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!membershipNumber.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await signIn(membershipNumber.trim());
      addToast(`Signed in as ${profile.name} (${profile.membershipNumber})`);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await enrollMember({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      const newNumber = data.membershipNumber;
      setSuccess(data);
      addToast(`Enrolled! Membership: ${newNumber}`);
      await signIn(newNumber);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <button className="auth-modal__close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div className="auth-modal__header">
          <img src="/YahooLogo.png" alt="Yahoo" className="auth-modal__logo" />
          <h2>{tab === "signin" ? "Sign In" : "Join Yahoo Rewards"}</h2>
        </div>

        <div className="auth-modal__tabs">
          <button className={`auth-modal__tab ${tab === "signin" ? "auth-modal__tab--active" : ""}`} onClick={() => { setTab("signin"); setError(null); setSuccess(null); }}>
            Sign In
          </button>
          <button className={`auth-modal__tab ${tab === "enroll" ? "auth-modal__tab--active" : ""}`} onClick={() => { setTab("enroll"); setError(null); setSuccess(null); }}>
            Enroll
          </button>
        </div>

        {error && (
          <div className="auth-modal__error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {success && (
          <div className="auth-modal__success">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10.5 14 8 11.5"/></svg>
            Member <strong>{success.membershipNumber}</strong> created
          </div>
        )}

        {tab === "signin" ? (
          <form className="auth-modal__form" onSubmit={handleSignIn}>
            <div className="auth-modal__field">
              <label>Membership Number</label>
              <input
                value={membershipNumber}
                onChange={(e) => setMembershipNumber(e.target.value)}
                placeholder="YAH0000001"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn--primary auth-modal__submit" disabled={loading || !membershipNumber.trim()}>
              {loading ? <><span className="auth-modal__spinner" /> Signing in...</> : "Sign In"}
            </button>
          </form>
        ) : (
          <form className="auth-modal__form" onSubmit={handleEnroll}>
            <div className="auth-modal__row">
              <div className="auth-modal__field">
                <label>First Name *</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" autoFocus />
              </div>
              <div className="auth-modal__field">
                <label>Last Name *</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>
            <div className="auth-modal__field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="auth-modal__field">
              <label>Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            <button type="submit" className="btn btn--primary auth-modal__submit" disabled={loading || !firstName.trim() || !lastName.trim()}>
              {loading ? <><span className="auth-modal__spinner" /> Enrolling...</> : "Enroll & Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
