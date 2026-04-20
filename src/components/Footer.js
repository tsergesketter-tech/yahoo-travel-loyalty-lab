import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__main">
        <div className="footer__col">
          <h4 className="footer__heading">Yahoo Travel Rewards</h4>
          <ul className="footer__list">
            <li><Link to="/member">Overview</Link></li>
            <li><Link to="/member">Member Benefits</Link></li>
            <li><Link to="/member">Earn Points</Link></li>
            <li><Link to="/member">Redeem Points</Link></li>
            <li><Link to="/promotions">Current Offers</Link></li>
          </ul>
        </div>
        <div className="footer__col">
          <h4 className="footer__heading">Book Travel</h4>
          <ul className="footer__list">
            <li><Link to="/hotels">Hotels</Link></li>
            <li><Link to="/flights">Flights</Link></li>
            <li><a href="#">Rental Cars</a></li>
            <li><a href="#">Vacation Packages</a></li>
            <li><a href="#">Cruises</a></li>
          </ul>
        </div>
        <div className="footer__col">
          <h4 className="footer__heading">Travel Resources</h4>
          <ul className="footer__list">
            <li><a href="#">Travel Guides</a></li>
            <li><a href="#">Travel News</a></li>
            <li><a href="#">Travel Gear</a></li>
            <li><a href="#">Travel Advice</a></li>
            <li><a href="#">Destination Ideas</a></li>
          </ul>
        </div>
        <div className="footer__col">
          <h4 className="footer__heading">Company</h4>
          <ul className="footer__list">
            <li><a href="#">About Yahoo</a></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Privacy Policy</a></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Accessibility</a></li>
          </ul>
        </div>
      </div>
      <div className="footer__bottom">
        <p>&copy; 2026 Yahoo Inc. All rights reserved. This is a demo site for Salesforce integration. Do not enter real payment information.</p>
      </div>
    </footer>
  );
}
