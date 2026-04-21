import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import Header from "./components/Header";
import SubNav from "./components/SubNav";
import Footer from "./components/Footer";
import ToastContainer from "./components/Toast";
import HomePage from "./pages/HomePage";
import HotelSearchPage from "./pages/HotelSearchPage";
import FlightSearchPage from "./pages/FlightSearchPage";
import StayDetailPage from "./pages/StayDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import ConfirmationPage from "./pages/ConfirmationPage";
import MemberPage from "./pages/MemberPage";
import PromotionsPage from "./pages/PromotionsPage";
import PlatformEventsPage from "./pages/PlatformEventsPage";
import "./App.css";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app">
          <Header />
          <SubNav />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/hotels" element={<HotelSearchPage />} />
              <Route path="/flights" element={<FlightSearchPage />} />
              <Route path="/stay/:id" element={<StayDetailPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/confirmation" element={<ConfirmationPage />} />
              <Route path="/member" element={<MemberPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/events" element={<PlatformEventsPage />} />
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
