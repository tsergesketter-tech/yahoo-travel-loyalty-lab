import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Cruises", to: "/hotels" },
  { label: "Flights", to: "/flights" },
  { label: "Hotels", to: "/hotels" },
  { label: "Rental cars", to: "/hotels" },
  { label: "Travel advice", to: "/", hasDropdown: true },
  { label: "Travel deals", to: "/promotions" },
  { label: "Platform Events", to: "/events" },
  { label: "Partner Activity", to: "/partner-activity" },
  { label: "GraphQL Console", to: "/graphql" },
  { label: "Travel gear", to: "/" },
  { label: "Travel guides", to: "/" },
  { label: "Travel news", to: "/" },
  { label: "Travel points and rewards", to: "/member" },
];

export default function SubNav() {
  return (
    <nav className="subnav">
      <div className="subnav__inner">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              `subnav__link ${isActive && item.to !== "/" ? "subnav__link--active" : ""}`
            }
          >
            {item.label}
            {item.hasDropdown && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="subnav__dropdown-icon">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
