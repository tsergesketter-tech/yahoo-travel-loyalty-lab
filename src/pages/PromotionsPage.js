import React, { useState, useEffect } from "react";
import promotions from "../data/promotions";
import { useApp } from "../context/AppContext";
import { fetchPromotions, fetchEngagementTrail } from "../services/sfApi";

const REGION_VISUALS = {
  Europe: { gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6", label: "Europe" },
  APAC: { gradient: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 40%, #2d4a5e 100%)", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z", label: "Asia-Pacific" },
  US: { gradient: "linear-gradient(135deg, #1a1a2e 0%, #2d1b69 40%, #5b21b6 100%)", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", label: "United States" },
  LATAM: { gradient: "linear-gradient(135deg, #134e4a 0%, #065f46 40%, #047857 100%)", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", label: "Latin America" },
  default: { gradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", label: "Global" },
  sf: { gradient: "linear-gradient(135deg, #3b0764 0%, #6b21a8 40%, #7c3aed 100%)", icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Salesforce" },
  milestone: { gradient: "linear-gradient(135deg, #78350f 0%, #b45309 40%, #d97706 100%)", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", label: "Milestone" },
};

function getVisual(regionTag, type) {
  if (type === "sf") return REGION_VISUALS.sf;
  if (type === "milestone") return REGION_VISUALS.milestone;
  return REGION_VISUALS[regionTag] || REGION_VISUALS.default;
}

function PromoImage({ imageUrl, regionTag, type }) {
  const visual = getVisual(regionTag, type);
  if (imageUrl) {
    return (
      <div className="pc__image-wrap">
        <img src={imageUrl} alt="" className="pc__image" />
        <div className="pc__image-overlay" />
      </div>
    );
  }
  return (
    <div className="pc__image-wrap pc__image-wrap--gradient" style={{ background: visual.gradient }}>
      <div className="pc__image-pattern" />
      <svg className="pc__image-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={visual.icon} />
      </svg>
      <span className="pc__image-region">{visual.label}</span>
    </div>
  );
}

function EngagementTrailBlock({ trail }) {
  if (!trail || !trail.steps || trail.steps.length === 0) return null;
  const pct = trail.totalSteps > 0 ? (trail.completedSteps / trail.totalSteps) * 100 : 0;

  return (
    <div className="pc__trail">
      <div className="pc__trail-top">
        <div className="pc__trail-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Engagement Trail
        </div>
        <span className={`pc__trail-status pc__trail-status--${trail.overallStatus.toLowerCase()}`}>
          {trail.overallStatus === "NotStarted" ? "Not Started" : trail.overallStatus === "InProgress" ? "In Progress" : trail.overallStatus}
        </span>
      </div>
      <div className="pc__trail-bar-wrap">
        <div className="pc__trail-bar">
          <div className="pc__trail-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="pc__trail-pct">{trail.completedSteps}/{trail.totalSteps}</span>
      </div>
      <div className="pc__trail-steps">
        {trail.steps.map((step) => (
          <div key={step.id} className={`pc__trail-step pc__trail-step--${step.status.toLowerCase()}`}>
            <div className="pc__trail-step-dot">
              {step.status === "Completed" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <span>{step.stepNumber}</span>
              )}
            </div>
            <div className="pc__trail-step-info">
              <span className="pc__trail-step-name">{step.name}</span>
              <span className="pc__trail-step-count">{step.currentCount} / {step.requiredCount}</span>
            </div>
            {step.rewardPoints > 0 && (
              <span className="pc__trail-step-reward">+{step.rewardPoints.toLocaleString()}</span>
            )}
          </div>
        ))}
      </div>
      {trail.totalPossiblePoints > 0 && (
        <div className="pc__trail-total">
          <span>Reward</span>
          <strong>{trail.earnedPoints.toLocaleString()} / {trail.totalPossiblePoints.toLocaleString()} pts</strong>
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "travel", label: "Travel" },
  { key: "finance", label: "Finance" },
  { key: "fantasy", label: "Fantasy" },
  { key: "sports", label: "Sports" },
  { key: "mail", label: "Mail" },
  { key: "rewards", label: "Rewards" },
];

function categorizePromo(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("travel") || n.includes("hotel") || n.includes("flight") || n.includes("mediterranean") || n.includes("tropical") || n.includes("nomad") || n.includes("luxury") || n.includes("long haul")) return "travel";
  if (n.includes("finance") || n.includes("portfolio") || n.includes("briefing")) return "finance";
  if (n.includes("fantasy") || n.includes("madness") || n.includes("championship")) return "fantasy";
  if (n.includes("sports") || n.includes("game day")) return "sports";
  if (n.includes("mail") || n.includes("inbox")) return "mail";
  if (n.includes("reward") || n.includes("welcome") || n.includes("member")) return "rewards";
  return "other";
}

function PromotionsPage() {
  const { member } = useApp();
  const [sfPromos, setSfPromos] = useState([]);
  const [memberPromos, setMemberPromos] = useState([]);
  const [eligiblePromos, setEligiblePromos] = useState([]);
  const [engagementTrails, setEngagementTrails] = useState({});
  const [sfLoading, setSfLoading] = useState(false);
  const [sfError, setSfError] = useState(null);
  const [trailLoading, setTrailLoading] = useState({});
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");

  useEffect(() => {
    setSfLoading(true);
    fetchPromotions(member.membershipNumber)
      .then((data) => {
        setSfPromos(data.promotions || []);
        setMemberPromos(data.memberPromotions || []);
        setEligiblePromos(data.eligiblePromotions || []);
        setSfError(null);

        const allPromoIds = (data.promotions || []).map((p) => p.Id);
        const eligibleIds = (data.eligiblePromotions || [])
          .filter((ep) => ep.Configuration && ep.Configuration.toLowerCase().includes("milestone"))
          .map((ep) => ep.PromotionId);
        const enrolledIds = (data.memberPromotions || []).map((mp) => mp.PromotionId);
        const uniqueIds = [...new Set([...allPromoIds, ...eligibleIds, ...enrolledIds])];

        uniqueIds.forEach((pid) => {
          setTrailLoading((prev) => ({ ...prev, [pid]: true }));
          fetchEngagementTrail(pid, member.membershipNumber)
            .then((trail) => {
              setEngagementTrails((prev) => ({ ...prev, [pid]: trail }));
            })
            .catch(() => {})
            .finally(() => {
              setTrailLoading((prev) => ({ ...prev, [pid]: false }));
            });
        });
      })
      .catch((err) => {
        console.warn("[PromotionsPage] SF promotions unavailable:", err.message);
        setSfError(err.message);
      })
      .finally(() => setSfLoading(false));
  }, [member.membershipNumber]);

  const memberPromoMap = {};
  memberPromos.forEach((mp) => { memberPromoMap[mp.PromotionId] = mp; });

  return (
    <div className="promos">
      <div className="promos__hero">
        <h1 className="promos__title">Promotions & Offers</h1>
        <p className="promos__subtitle">
          Earn bonus points, unlock milestone rewards, and access exclusive travel deals tailored to your loyalty profile.
        </p>
      </div>

      <div className="promos__filters">
        <div className="promos__filter-cats">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`promos__filter-cat${categoryFilter === cat.key ? " promos__filter-cat--active" : ""}`}
              onClick={() => setCategoryFilter(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="promos__filter-controls">
          <select
            className="promos__filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="Standard">Standard</option>
            <option value="Cumulative">Cumulative</option>
            <option value="Joint">Joint</option>
          </select>
          <select
            className="promos__filter-select"
            value={enrollmentFilter}
            onChange={(e) => setEnrollmentFilter(e.target.value)}
          >
            <option value="all">Enrollment: Any</option>
            <option value="required">Required</option>
            <option value="open">Open</option>
          </select>
          {(categoryFilter !== "all" || typeFilter !== "all" || enrollmentFilter !== "all") && (
            <button
              className="promos__filter-clear"
              onClick={() => { setCategoryFilter("all"); setTypeFilter("all"); setEnrollmentFilter("all"); }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {sfLoading && (
        <div className="promos__loader">
          <div className="promos__loader-spinner" />
          <span>Connecting to Salesforce...</span>
        </div>
      )}

      {sfError && !sfLoading && (
        <div className="promos__error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Salesforce promotions unavailable — showing local offers only
        </div>
      )}

      {sfPromos.length > 0 && (() => {
        const filtered = sfPromos.filter((promo) => {
          if (categoryFilter !== "all" && categorizePromo(promo.Name) !== categoryFilter) return false;
          if (typeFilter !== "all" && (promo.LoyaltyPromotionType || "Standard") !== typeFilter) return false;
          if (enrollmentFilter === "required" && !promo.IsEnrollmentRequired) return false;
          if (enrollmentFilter === "open" && promo.IsEnrollmentRequired) return false;
          return true;
        });
        return (
        <section className="promos__section">
          <div className="promos__section-head">
            <h2>Salesforce Loyalty</h2>
            <div className="promos__section-head-right">
              {filtered.length !== sfPromos.length && (
                <span className="promos__pill promos__pill--count">{filtered.length} of {sfPromos.length}</span>
              )}
              <span className="promos__pill promos__pill--live">
                <span className="promos__pill-dot" />Live
              </span>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="promos__empty">No promotions match your filters.</div>
          ) : (
          <div className="promos__grid">
            {filtered.map((promo) => {
              const enrolled = memberPromoMap[promo.Id];
              const trail = engagementTrails[promo.Id];
              const isLoading = trailLoading[promo.Id];

              return (
                <article key={promo.Id} className="pc pc--sf">
                  <PromoImage imageUrl={promo.PromotionImageUrl} regionTag={null} type="sf" />
                  <div className="pc__body">
                    <div className="pc__top-row">
                      <div className="pc__tags">
                        <span className="pc__tag pc__tag--sf">{promo.LoyaltyPromotionType || "Standard"}</span>
                        {enrolled && <span className="pc__tag pc__tag--enrolled">Enrolled</span>}
                      </div>
                      {promo.StartDate && (
                        <span className="pc__dates">{promo.StartDate} – {promo.EndDate || "Ongoing"}</span>
                      )}
                    </div>
                    <h3 className="pc__name">{promo.Name}</h3>
                    {promo.Description ? (
                      <p className="pc__desc">{promo.Description}</p>
                    ) : (
                      <p className="pc__desc pc__desc--placeholder">No description provided yet.</p>
                    )}
                    <div className="pc__meta">
                      {promo.FulfillmentAction && (
                        <div className="pc__meta-item">
                          <span className="pc__meta-label">Fulfillment</span>
                          <span className="pc__meta-value">{promo.FulfillmentAction}</span>
                        </div>
                      )}
                      {promo.MaximumRewardValue && (
                        <div className="pc__meta-item">
                          <span className="pc__meta-label">Max Reward</span>
                          <span className="pc__meta-value pc__meta-value--accent">${Number(promo.MaximumRewardValue).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="pc__meta-item">
                        <span className="pc__meta-label">Enrollment</span>
                        <span className="pc__meta-value">{promo.IsEnrollmentRequired ? "Required" : "Open"}</span>
                      </div>
                    </div>

                    {enrolled && enrolled.CumulativeUsageTarget > 0 && (
                      <div className="pc__enrolled-progress">
                        <div className="pc__enrolled-head">
                          <span>Your Progress</span>
                          <span className="pc__enrolled-pct">
                            {enrolled.CumulativeUsageCompletePercent != null
                              ? `${Number(enrolled.CumulativeUsageCompletePercent).toFixed(0)}%`
                              : "—"}
                          </span>
                        </div>
                        <div className="pc__enrolled-bar">
                          <div className="pc__enrolled-bar-fill" style={{ width: `${Math.min(100, (enrolled.CumulativeUsageCompleted / enrolled.CumulativeUsageTarget) * 100)}%` }} />
                        </div>
                        <div className="pc__enrolled-stats">
                          <span>{enrolled.CumulativeUsageCompleted || 0} completed</span>
                          <span>{enrolled.CumulativeUsageTarget} target</span>
                        </div>
                      </div>
                    )}

                    <EngagementTrailBlock trail={trail} />
                    {isLoading && <div className="pc__trail-loader">Loading engagement trail...</div>}
                    <div className="pc__footer">
                      <span className="pc__id">{promo.Id}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          )}
        </section>
        );
      })()}

      {eligiblePromos.length > 0 && (
        <section className="promos__section">
          <div className="promos__section-head">
            <h2>Eligible For You</h2>
            <span className="promos__pill promos__pill--eligible">Personalized</span>
          </div>
          <div className="promos__grid">
            {eligiblePromos.map((ep) => {
              const trail = engagementTrails[ep.PromotionId];
              const isLoading = trailLoading[ep.PromotionId];
              const isMilestone = ep.Configuration && ep.Configuration.toLowerCase().includes("milestone");

              return (
                <article key={ep.Id} className="pc pc--eligible">
                  <PromoImage imageUrl={ep.PromotionImageUrl} regionTag={null} type={isMilestone ? "milestone" : "sf"} />
                  <div className="pc__body">
                    <div className="pc__top-row">
                      <div className="pc__tags">
                        <span className="pc__tag pc__tag--earn">{ep.LoyaltyPromotionType || "Eligible"}</span>
                        {isMilestone && <span className="pc__tag pc__tag--milestone">Milestone</span>}
                      </div>
                      {ep.StartDate && (
                        <span className="pc__dates">{ep.StartDate} – {ep.EndDate || "Ongoing"}</span>
                      )}
                    </div>
                    <h3 className="pc__name">{ep.PromotionName}</h3>
                    {ep.PromotionDescription ? (
                      <p className="pc__desc">{ep.PromotionDescription}</p>
                    ) : (
                      <p className="pc__desc pc__desc--placeholder">Promotion details coming soon.</p>
                    )}
                    {ep.EnrollmentStartDate && (
                      <div className="pc__meta">
                        <div className="pc__meta-item">
                          <span className="pc__meta-label">Enrollment Window</span>
                          <span className="pc__meta-value">{ep.EnrollmentStartDate} – {ep.EnrollmentEndDate || "Open"}</span>
                        </div>
                      </div>
                    )}
                    <EngagementTrailBlock trail={trail} />
                    {isLoading && <div className="pc__trail-loader">Loading engagement trail...</div>}
                    <div className="pc__footer">
                      <span className="pc__id">{ep.PromotionId}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="promos__section">
        <div className="promos__section-head">
          <h2>Steering Engine Offers</h2>
          <span className="promos__pill promos__pill--local">Local</span>
        </div>
        <div className="promos__grid">
          {promotions.map((promo) => {
            return (
              <article key={promo.id} className="pc">
                <PromoImage imageUrl={promo.imageUrl} regionTag={promo.regionTag} />
                <div className="pc__body">
                  <div className="pc__top-row">
                    <div className="pc__tags">
                      <span className={`pc__tag ${promo.type === "earnBonus" ? "pc__tag--earn" : "pc__tag--redeem"}`}>
                        {promo.type === "earnBonus" ? "Earn Bonus" : "Redemption"}
                      </span>
                      {promo.regionTag && <span className="pc__tag pc__tag--region">{promo.regionTag}</span>}
                    </div>
                    <span className="pc__dates">{promo.dateRange.start} – {promo.dateRange.end}</span>
                  </div>
                  <h3 className="pc__name">{promo.name}</h3>
                  <p className="pc__desc">{promo.description}</p>
                  <div className="pc__incentive">
                    <span className="pc__incentive-value">
                      {promo.type === "earnBonus"
                        ? `+${promo.bonusPointsPerNight.toLocaleString()}`
                        : `${promo.discountPercent}% off`}
                    </span>
                    <span className="pc__incentive-label">
                      {promo.type === "earnBonus" ? "pts / night" : "redemption rate"}
                    </span>
                  </div>
                  <div className="pc__meta">
                    <div className="pc__meta-item">
                      <span className="pc__meta-label">Segments</span>
                      <span className="pc__meta-value">
                        {promo.eligibleSegments ? promo.eligibleSegments.join(", ") : "All Members"}
                      </span>
                    </div>
                  </div>
                  <div className="pc__footer">
                    <span className="pc__id">{promo.id}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default PromotionsPage;
