import React from "react";
import { Link } from "react-router-dom";

const featuredArticle = {
  image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=500&fit=crop",
  title: "The EU Entry/Exit System is here — what U.S. travelers need to know before going to Europe",
  excerpt: "The EU is rolling out new systems to vet and track visitors. Experts say travelers should prepare for a different type of border experience when heading...",
  author: "Dana Yewbank",
};

const trendingStories = [
  { title: "The best baby-friendly vacation destinations", author: "Mia Taylor", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&h=80&fit=crop" },
  { title: "The best U.S. beach vacations for families", author: "Rebecca Strong", image: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=120&h=80&fit=crop" },
  { title: "The best dog-friendly national parks", author: "Will McGough", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=120&h=80&fit=crop" },
  { title: "Don't let mosquitoes ruin your vacation — here's what to pack for...", author: "Gabriel Morgan", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=120&h=80&fit=crop" },
  { title: "What happens behind the scenes when a flight is delayed", author: "Katherine Fan", image: "https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=120&h=80&fit=crop" },
];

const travelTips = [
  { title: "Best European cities for first-time visitors", image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=260&fit=crop" },
  { title: "How to find cheap flights this summer", image: "https://images.unsplash.com/photo-1436491865332-7a61a109db56?w=400&h=260&fit=crop" },
  { title: "Top 10 national parks to visit in 2026", image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=400&h=260&fit=crop" },
  { title: "Packing tips from frequent travelers", image: "https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=400&h=260&fit=crop" },
];

export default function HomePage() {
  return (
    <div className="home">
      <section className="home__hero">
        <div className="home__hero-content">
          <h1 className="home__hero-title">Destinations and travel ideas</h1>
          <p className="home__hero-subtitle">
            Discover the best travel guides, destination tips and insider advice to inspire your next adventure.
          </p>
        </div>
      </section>

      <section className="home__featured">
        <div className="home__featured-grid">
          <article className="home__article-main">
            <img src={featuredArticle.image} alt="" className="home__article-image" />
            <div className="home__article-body">
              <h2 className="home__article-title">{featuredArticle.title}</h2>
              <p className="home__article-excerpt">{featuredArticle.excerpt}</p>
              <div className="home__article-author">
                <span className="home__author-avatar" />
                {featuredArticle.author}
              </div>
            </div>
          </article>

          <aside className="home__trending">
            <h3 className="home__trending-title">Trending travel stories</h3>
            <div className="home__trending-list">
              {trendingStories.map((story, i) => (
                <a href="#" key={i} className="home__trending-item">
                  <img src={story.image} alt="" className="home__trending-thumb" />
                  <div className="home__trending-info">
                    <span className="home__trending-headline">{story.title}</span>
                    <span className="home__trending-author">
                      <span className="home__author-dot" />
                      {story.author}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="home__booking-cta">
        <div className="home__booking-grid">
          <Link to="/hotels" className="home__booking-card">
            <div className="home__booking-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 21h18M3 7v14M21 7v14M6 11h4v4H6zM14 11h4v4h-4zM9 3h6l3 4H6l3-4z"/></svg>
            </div>
            <h3>Hotels</h3>
            <p>Find your perfect stay</p>
          </Link>
          <Link to="/flights" className="home__booking-card">
            <div className="home__booking-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </div>
            <h3>Flights</h3>
            <p>Compare and book flights</p>
          </Link>
          <Link to="/member" className="home__booking-card">
            <div className="home__booking-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <h3>Points & Rewards</h3>
            <p>Earn on every booking</p>
          </Link>
          <Link to="/promotions" className="home__booking-card">
            <div className="home__booking-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            </div>
            <h3>Travel Deals</h3>
            <p>Exclusive member offers</p>
          </Link>
        </div>
      </section>

      <section className="home__tips">
        <h2 className="home__tips-title">Travel tips and inspiration</h2>
        <div className="home__tips-grid">
          {travelTips.map((tip, i) => (
            <a href="#" key={i} className="home__tip-card">
              <img src={tip.image} alt="" className="home__tip-image" />
              <h4 className="home__tip-title">{tip.title}</h4>
            </a>
          ))}
        </div>
      </section>

      <section className="home__newsletter">
        <div className="home__newsletter-inner">
          <span>The newsletter for budget travel.</span>
          <a href="#" className="home__newsletter-link">Sign up</a>
        </div>
      </section>
    </div>
  );
}
