import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import AuthModal from "./AuthModal";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const { member } = useApp();
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo">
          <img src="/YahooLogo.png" alt="Yahoo Travel" className="header__logo-img" />
        </Link>

        <div className="header__search">
          <input
            type="text"
            className="header__search-input"
            placeholder="Search the web"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="header__search-btn" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        <nav className="header__nav">
          <a href="#" className="header__nav-link">News</a>
          <a href="#" className="header__nav-link">Finance</a>
          <a href="#" className="header__nav-link">Sports</a>
          <button className="header__nav-link header__nav-more">
            More
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </nav>

        <div className="header__actions">
          <button className="header__mail-btn" onClick={() => navigate("/member")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Mail
          </button>
          <button className="header__signin-btn" onClick={() => setShowAuth(true)}>
            {member.membershipNumber ? member.name || "Member" : "Sign in"}
          </button>
        </div>

        <button className="header__mobile-toggle" aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
}
