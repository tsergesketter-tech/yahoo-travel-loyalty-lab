import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import defaultMemberProfile from "../data/memberProfile";
import memberJourneysData from "../data/memberJourneys";
import { fetchMemberProfile, postTransactionJournal, buildAccrualJournal, buildRedemptionJournal } from "../services/sfApi";

const AppContext = createContext();

const DEFAULT_MEMBERSHIP = "YAH0000001";

function mapSfProfile(sf) {
  const contact = sf.associatedContact || {};
  const pointsCurrency = sf.memberCurrencies?.find(
    (c) => c.loyaltyMemberCurrencyName === "Y! Points"
  );
  const tier = sf.memberTiers?.[0];

  return {
    membershipNumber: sf.membershipNumber,
    name: [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Member",
    email: contact.email || null,
    contactId: contact.contactId,
    memberId: sf.loyaltyProgramMemberId,
    tier: tier?.loyaltyMemberTierName || "Purple",
    tierGroupName: tier?.tierGroupName || "Yahoo Tier Group",
    memberStatus: sf.memberStatus,
    enrollmentDate: sf.enrollmentDate,
    pointsBalance: pointsCurrency?.pointsBalance || 0,
    totalPointsAccrued: pointsCurrency?.totalPointsAccrued || 0,
    totalPointsRedeemed: pointsCurrency?.totalPointsRedeemed || 0,
    lifetimePoints: pointsCurrency?.totalPointsAccrued || 0,
    memberCurrencies: sf.memberCurrencies || [],
    segment: defaultMemberProfile.segment,
    pointsValuePerPoint: defaultMemberProfile.pointsValuePerPoint,
    activityLog: [],
  };
}

export function AppProvider({ children }) {
  const [member, setMember] = useState({ ...defaultMemberProfile });
  const [journeys, setJourneys] = useState(
    memberJourneysData.map((j) => ({ ...j }))
  );
  const [toasts, setToasts] = useState([]);
  const [sfConnected, setSfConnected] = useState(false);
  const [sfLoading, setSfLoading] = useState(true);
  const [sfError, setSfError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSfLoading(true);
    fetchMemberProfile(DEFAULT_MEMBERSHIP)
      .then((sf) => {
        if (cancelled) return;
        const mapped = mapSfProfile(sf);
        setMember((prev) => ({ ...prev, ...mapped }));
        setSfConnected(true);
        setSfError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[AppContext] SF member profile unavailable, using mock data:", err.message);
        setSfError(err.message);
        setSfConnected(false);
      })
      .finally(() => {
        if (!cancelled) setSfLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const refreshMemberProfile = useCallback(async () => {
    try {
      const sf = await fetchMemberProfile(member.membershipNumber || DEFAULT_MEMBERSHIP);
      const mapped = mapSfProfile(sf);
      setMember((prev) => ({ ...prev, ...mapped }));
      setSfConnected(true);
      setSfError(null);
    } catch (err) {
      console.warn("[AppContext] Refresh failed:", err.message);
      setSfError(err.message);
    }
  }, [member.membershipNumber]);

  const addToast = useCallback((message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const changeSegment = useCallback((newSegment) => {
    setMember((prev) => ({ ...prev, segment: newSegment }));
  }, []);

  const changeTier = useCallback((newTier) => {
    setMember((prev) => ({ ...prev, tier: newTier }));
  }, []);

  const bookHotel = useCallback(
    (hotel, incentive, nights, bookingMeta = {}) => {
      const bookingId = bookingMeta.bookingId || `BK-${Date.now()}`;
      const totalEarned =
        (hotel.basePointsPerNight + incentive.extraEarnPoints) * nights;
      const redeemedPoints = bookingMeta.redeemedPoints || 0;
      const totalPaid = bookingMeta.totalPaid || 0;

      const logEntry = {
        id: `log-${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        destination: `${hotel.city}, ${hotel.country}`,
        hotelSku: hotel.sku,
        nights,
        earnedBasePoints: hotel.basePointsPerNight * nights,
        earnedBonusPoints: incentive.extraEarnPoints * nights,
        promotionsApplied: incentive.appliedPromotions.map((pid) => pid),
        redeemedPoints,
      };

      setMember((prev) => ({
        ...prev,
        pointsBalance: prev.pointsBalance + totalEarned - redeemedPoints,
        lifetimePoints: prev.lifetimePoints + totalEarned,
        activityLog: [logEntry, ...prev.activityLog],
      }));

      setJourneys((prev) =>
        prev.map((journey) => {
          const regionMatch =
            !journey.criteria.regionTag ||
            journey.criteria.regionTag === hotel.regionTag;
          if (!regionMatch || journey.status === "Completed") return journey;

          const newStays = journey.completedStays + 1;
          const newNights = journey.completedNights + nights;
          let newStatus = "In Progress";

          if (
            newStays >= journey.criteria.requiredStays &&
            newNights >= journey.criteria.requiredNights
          ) {
            newStatus = "Completed";
            setMember((m) => ({
              ...m,
              pointsBalance: m.pointsBalance + journey.reward.bonusPoints,
              lifetimePoints: m.lifetimePoints + journey.reward.bonusPoints,
            }));
            addToast(
              `You completed ${journey.name}! +${journey.reward.bonusPoints.toLocaleString()} Yahoo Points.`
            );
          }

          return {
            ...journey,
            completedStays: newStays,
            completedNights: newNights,
            status: newStatus,
          };
        })
      );

      const memberNum = member.membershipNumber || DEFAULT_MEMBERSHIP;
      const accrualJournal = buildAccrualJournal({
        bookingId,
        membershipNumber: memberNum,
        amount: totalPaid,
        nights,
        city: hotel.city,
        country: hotel.country,
        hotelName: hotel.name,
        checkIn: bookingMeta.checkIn,
        checkOut: bookingMeta.checkOut,
      });

      const journals = [accrualJournal];

      if (redeemedPoints > 0) {
        journals.push(buildRedemptionJournal({
          bookingId,
          membershipNumber: memberNum,
          pointsRedeemed: redeemedPoints,
          city: hotel.city,
          country: hotel.country,
          hotelName: hotel.name,
          checkIn: bookingMeta.checkIn,
          checkOut: bookingMeta.checkOut,
        }));
      }

      postTransactionJournal(journals)
        .then((result) => {
          console.log("[AppContext] Transaction journals posted:", result.journalIds);
          addToast(`Transaction journal sent to Salesforce`);
        })
        .catch((err) => {
          console.warn("[AppContext] Transaction journal failed:", err.message);
        });

      addToast(
        `Booked ${hotel.name}! Earned ${totalEarned.toLocaleString()} Yahoo Points.`
      );
    },
    [addToast, member.membershipNumber]
  );

  return (
    <AppContext.Provider
      value={{
        member,
        journeys,
        toasts,
        sfConnected,
        sfLoading,
        sfError,
        changeSegment,
        changeTier,
        bookHotel,
        addToast,
        refreshMemberProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
