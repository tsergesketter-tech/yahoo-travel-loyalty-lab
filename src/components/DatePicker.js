import React, { useState, useRef, useEffect } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DatePicker({ value, onChange, label, placeholder, minDate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = value ? new Date(value + "T00:00:00") : null;
  const viewDefault = selected || today;
  const [viewYear, setViewYear] = useState(viewDefault.getFullYear());
  const [viewMonth, setViewMonth] = useState(viewDefault.getMonth());

  useEffect(() => {
    if (open && value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open, value]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const minD = minDate ? new Date(minDate + "T00:00:00") : today;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const canGoPrev = new Date(viewYear, viewMonth, 1) > minD;

  const handleSelect = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(formatDate(d));
    setOpen(false);
  };

  return (
    <div className="dp" ref={ref}>
      <button type="button" className={`dp__trigger ${value ? "dp__trigger--filled" : ""}`} onClick={() => setOpen(!open)}>
        <svg className="dp__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className={value ? "dp__value" : "dp__placeholder"}>
          {value ? formatDisplay(value) : (placeholder || "Select date")}
        </span>
        <svg className="dp__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="dp__dropdown">
          <div className="dp__nav">
            <button type="button" className="dp__nav-btn" onClick={prevMonth} disabled={!canGoPrev}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <span className="dp__nav-label">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dp__nav-btn" onClick={nextMonth}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 6 15 12 9 18" /></svg>
            </button>
          </div>

          <div className="dp__grid">
            {DAYS.map((d) => <span key={d} className="dp__day-label">{d}</span>)}
            {Array.from({ length: firstDay }, (_, i) => <span key={`e-${i}`} className="dp__cell dp__cell--empty" />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = new Date(viewYear, viewMonth, day);
              const isToday = date.toDateString() === today.toDateString();
              const isSelected = selected && date.toDateString() === selected.toDateString();
              const isPast = date < minD;

              return (
                <button
                  key={day}
                  type="button"
                  className={`dp__cell ${isToday ? "dp__cell--today" : ""} ${isSelected ? "dp__cell--selected" : ""} ${isPast ? "dp__cell--disabled" : ""}`}
                  disabled={isPast}
                  onClick={() => handleSelect(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {value && (
            <button type="button" className="dp__clear" onClick={() => { onChange(""); setOpen(false); }}>
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
