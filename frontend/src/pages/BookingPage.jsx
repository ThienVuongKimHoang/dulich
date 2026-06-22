import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { C, globalStyles, API_BASE } from "../constants";
import { encryptQR } from "../utils/qrCrypto";
import LogoIcon from "../components/LogoIcon";

const GoldIcon = ({ size = 16 }) => <img src="/img/main_page/gold.png" style={{ width: size, height: size, verticalAlign: "middle", objectFit: "contain", display: "inline-block" }} alt="" />;

const VOUCHER_TIERS = {
  "voucher-giam-gia-tour":    { label: "10%", discount: 10, color: "#C8963E", bg: "#FFF8E1", border: "#F9A825", badge: "#F9A825", badgeText: "#3E2000" },
  "voucher-giam-gia-tour-20": { label: "20%", discount: 20, color: "#1565C0", bg: "#E3F2FD", border: "#1976D2", badge: "#1976D2", badgeText: "#fff" },
  "voucher-giam-gia-tour-50": { label: "50%", discount: 50, color: "#6A1B9A", bg: "#F3E5F5", border: "#7B1FA2", badge: "#7B1FA2", badgeText: "#fff" },
};

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_PRICE = 50000;
const PLACE_PRICE = 20000;

const ALL_PLACES = [
  { id: "lang-mai",   name: "Làng Mai Vàng",          icon: "🌸", color: "#C8963E", bg: "#FFF8E0" },
  { id: "lang-nhang", name: "Làng Nhang Thơm",         icon: "🕯️", color: "#8B6F47", bg: "#FFF3E8" },
  { id: "ho-ca-koi",  name: "Hồ Cá Koi Tấn Phong",    icon: "🐟", color: "#4A90D9", bg: "#EBF4FF" },
  { id: "tam-linh",   name: "Không Gian Tâm Linh",     icon: "🧘", color: "#6B8F71", bg: "#EEF5EE" },
];

const TIMELINE_STOPS = [
  { time: "8:00",            label: "Xuất phát",      full: "Xuất phát từ trung tâm TP.HCM",                                                                            icon: "🏙️" },
  { time: "08:30 – 09:15",   label: "Ăn sáng",        full: "Ăn sáng tại nhà hàng chay Hoa Sen — mở đầu buổi sáng với những món ăn thanh đạm",                         icon: "🌿" },
  { time: "09:15 – 11:00",   label: "Đạp xe & WS",    full: "Đạp xe xuyên rừng Lê Minh Xuân, tham quan và làm workshop làm nhang tại Làng nghề",                       icon: "🚴" },
  { time: "11:15 – 13:00",   label: "Ăn trưa",        full: "Ăn trưa tại Nhà hàng Bến Sông Bình Lợi",                                                                  icon: "🍽️" },
  { time: "13:30 – 15:30",   label: "World Farm",      full: "Tham quan World Farm – Thế Giới Nông Trại: trải nghiệm nông nghiệp, chụp ảnh, tìm hiểu mô hình farm",     icon: "🌾" },
  { time: "15:30 – 17:00",   label: "Ven sông",        full: "Dạo xe hoặc đi bộ ven sông Vàm Cỏ Đông, ngắm đồng ruộng và làng quê Bình Lợi",                           icon: "🌊" },
  { time: "17:00 – 18:00",   label: "Hoàng hôn",      full: "Ngắm hoàng hôn bên sông và chụp ảnh",                                                                      icon: "🌅" },
  { time: "18:15 – 19:30",   label: "Ăn tối",         full: "Ăn tối tại nhà hàng sinh thái ven sông (Đất Mỹ Hường hoặc Bến Sông)",                                      icon: "🍴" },
  { time: "19:30 – 20:00",   label: "Dạo đêm",        full: "Đi dạo đêm, thưởng thức không khí yên tĩnh trước khi trở về TP.HCM",                                      icon: "🌙" },
  { time: "20:00",            label: "Về TP.HCM",      full: "Khởi hành về TP.HCM — kết thúc hành trình bình yên",                                                      icon: "🏠" },
];

const N = TIMELINE_STOPS.length - 1;
function dotXPct(i) { return 5 + (i / N) * 90; }

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function genBookingId() {
  return "TL" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

// ─── HISTORY CARD ─────────────────────────────────────────────────────────────
function BookingHistoryCard({ item }) {
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [loadingQR, setLoadingQR] = useState(false);

  async function handleShowQR() {
    if (showQR) { setShowQR(false); return; }
    setShowQR(true);
    if (!qrUrl && item.qr_encrypted) {
      setLoadingQR(true);
      try {
        const url = await QRCode.toDataURL(item.qr_encrypted, {
          width: 240, margin: 2,
          color: { dark: "#1C2B1D", light: "#FFFFFF" },
        });
        setQrUrl(url);
      } catch {}
      setLoadingQR(false);
    }
  }

  function handleDownload() {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `tour-binhloi-${item.bid}.png`;
    a.click();
  }

  const placesArr = Array.isArray(item.places) ? item.places : [];
  const statusColor = item.status === "confirmed" ? "#4CAF50" : "#F44336";
  const statusLabel = item.status === "confirmed" ? "Đã xác nhận" : item.status;

  return (
    <div style={{ background: "white", borderRadius: 18, border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 14px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: "1rem" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${C.dark}, #2A4A2B)`, padding: "0.9rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "0.62rem", color: "rgba(245,240,232,0.55)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>Mã đặt lịch</p>
          <p style={{ fontSize: "0.92rem", fontWeight: 700, color: C.gold, fontFamily: "'Playfair Display', serif", letterSpacing: "0.05em" }}>#{item.bid}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: statusColor + "22", border: `1px solid ${statusColor}55`, borderRadius: "2rem", padding: "0.25rem 0.75rem" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor }} />
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "1rem 1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
          <div>
            <p style={{ fontSize: "0.62rem", color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>📅 Ngày tham quan</p>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: C.dark }}>{item.tour_date ? fmtDate(item.tour_date) : "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: "0.62rem", color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>👥 Số người</p>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: C.dark }}>{item.participants} người</p>
          </div>
          <div>
            <p style={{ fontSize: "0.62rem", color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>💰 Tổng vàng</p>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#B8860B" }}>{(item.total_vnd ?? 0).toLocaleString("vi-VN")} <GoldIcon /></p>
          </div>
          <div>
            <p style={{ fontSize: "0.62rem", color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>🕐 Ngày đặt</p>
            <p style={{ fontSize: "0.78rem", color: "#888" }}>{new Date(item.booked_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
          </div>
        </div>

        {placesArr.length > 0 && (
          <div style={{ marginBottom: "0.85rem" }}>
            <p style={{ fontSize: "0.62rem", color: "#aaa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>🌿 Địa điểm tham quan</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {placesArr.map((pl, i) => (
                <span key={i} style={{ background: "#EEF5EE", color: C.moss, border: "1px solid rgba(61,90,62,0.18)", borderRadius: "2rem", padding: "0.22rem 0.7rem", fontSize: "0.74rem", fontWeight: 600 }}>
                  {pl}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.notes && (
          <div style={{ marginBottom: "0.85rem", background: "#FAFAF8", borderRadius: 10, padding: "0.6rem 0.85rem", border: "1px solid rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.6 }}>📝 {item.notes}</p>
          </div>
        )}

        {/* QR section */}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          {item.qr_encrypted && (
            <button onClick={handleShowQR}
              style={{ flex: 1, padding: "0.65rem", border: `1.5px solid ${showQR ? C.moss : "rgba(0,0,0,0.12)"}`, borderRadius: 12, background: showQR ? "#EEF5EE" : "transparent", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: showQR ? C.moss : "#666", transition: "all 0.2s", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              {showQR ? "▲ Ẩn QR" : "📲 Xem QR check-in"}
            </button>
          )}
        </div>

        {showQR && (
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem", padding: "1.25rem", background: "#FAFAF8", borderRadius: 14, border: "1.5px solid rgba(61,90,62,0.12)" }}>
            {loadingQR
              ? <div style={{ width: 48, height: 48, border: `3px solid ${C.moss}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : qrUrl
                ? <>
                    <img src={qrUrl} alt="QR Tour" style={{ width: 200, height: 200, borderRadius: 10 }} />
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "0.72rem", color: "#888", marginBottom: 2 }}>Xuất trình QR này khi check-in tại cổng</p>
                      <p style={{ fontSize: "0.62rem", color: "#bbb" }}>AES-256 encrypted · Dùng 1 lần</p>
                    </div>
                    <button onClick={handleDownload}
                      style={{ background: `linear-gradient(135deg, ${C.gold}, #E8A830)`, color: C.dark, border: "none", padding: "0.55rem 1.4rem", borderRadius: "2rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                      ⬇ Tải ảnh QR
                    </button>
                  </>
                : <p style={{ fontSize: "0.78rem", color: "#aaa" }}>Không có QR cho vé này</p>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BOOKING PAGE ─────────────────────────────────────────────────────────────
export default function BookingPage({ onBack, queue = [], onClearQueue, onRemoveFromQueue, onAddToQueue, bookingHints = {}, initialTab = "new", onTabUsed, userGold = null, onGoldChange }) {
  // Tab
  const [tab, setTab] = useState(initialTab); // "new" | "history"

  // Consume initialTab once so back-navigation resets to "new"
  useEffect(() => {
    if (initialTab !== "new") { setTab(initialTab); onTabUsed?.(); }
  }, [initialTab]);

  // Form
  const [form, setForm] = useState({ date: "", people: 1, notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [booking, setBooking] = useState(null);
  const [goldAfter, setGoldAfter] = useState(null);

  // Voucher
  const [ownedVouchers, setOwnedVouchers] = useState({});   // { item_id: quantity }
  const [selectedVoucher, setSelectedVoucher] = useState(null); // item_id hoặc null

  // History
  const [myBookings, setMyBookings] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Timeline
  const [activeStop, setActiveStop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [showAllStops, setShowAllStops] = useState(false);
  const timerRef = useRef(null);

  // Sync hints from chatbot
  useEffect(() => {
    if (!bookingHints) return;
    setForm(f => ({
      date:   bookingHints.date   || f.date,
      people: bookingHints.people || f.people,
      notes:  bookingHints.notes  ? (f.notes ? f.notes + " · " + bookingHints.notes : bookingHints.notes) : f.notes,
    }));
  }, [bookingHints]);

  // Load history
  const loadHistory = async () => {
    setLoadingHistory(true);
    const token = localStorage.getItem("access_token");

    // Load from localStorage (fallback / offline)
    const local = JSON.parse(localStorage.getItem("tour_bookings") || "[]");
    // Normalize local format → TourBookingOut shape
    const localNorm = local.map(b => ({
      id: b.id ?? b.bid,
      bid: b.bid,
      tour_date: b.date ?? null,
      participants: b.people ?? 1,
      places: Array.isArray(b.places) ? b.places : [],
      notes: b.notes ?? null,
      total_vnd: b.total ?? 0,
      status: "confirmed",
      qr_encrypted: b.qr_encrypted ?? null,
      booked_at: b.booked_at ?? new Date().toISOString(),
    }));

    let merged = [...localNorm];

    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/tour-bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const apiData = await res.json();
          // Merge: API data takes priority, dedup by bid
          const apiByBid = Object.fromEntries(apiData.map(b => [b.bid, b]));
          const localOnly = localNorm.filter(b => !apiByBid[b.bid]);
          merged = [...apiData, ...localOnly];
        }
      } catch {}
    }

    // Sort newest first
    merged.sort((a, b) => new Date(b.booked_at) - new Date(a.booked_at));
    setMyBookings(merged);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch(`${API_BASE}/api/v1/shop/inventory`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(inv => {
        const map = {};
        inv.forEach(i => { if (VOUCHER_TIERS[i.item_id] && i.quantity > 0) map[i.item_id] = i.quantity; });
        setOwnedVouchers(map);
      })
      .catch(() => {});
  }, []);

  // Timeline animation
  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setTimeout(() => {
      setIsMoving(true);
      setActiveStop(prev => (prev >= N ? 0 : prev + 1));
      setTimeout(() => setIsMoving(false), 700);
    }, 2600);
    return () => clearTimeout(timerRef.current);
  }, [activeStop, isPlaying]);

  const goTo = (i) => {
    clearTimeout(timerRef.current);
    setIsPlaying(false);
    setIsMoving(true);
    setActiveStop(i);
    setTimeout(() => setIsMoving(false), 700);
  };

  // Pricing
  const placePriceTotal = queue.length * PLACE_PRICE;
  const pricePerPerson = BASE_PRICE + placePriceTotal;
  const totalPrice = pricePerPerson * form.people;
  const discountPct = selectedVoucher ? (VOUCHER_TIERS[selectedVoucher]?.discount ?? 0) : 0;
  const finalPrice = discountPct > 0 ? Math.round(totalPrice * (1 - discountPct / 100)) : totalPrice;

  const stop = TIMELINE_STOPS[activeStop];
  const charX = dotXPct(activeStop);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date) return;
    setSubmitting(true);
    setSubmitError("");
    const bid = genBookingId();
    const queuedPlaces = queue.map(id => ALL_PLACES.find(p => p.id === id)?.name ?? id);
    const payload = { bid, date: form.date, people: form.people, notes: form.notes, places: queuedPlaces, total: totalPrice, voucher_item_id: selectedVoucher || null };
    const token = localStorage.getItem("access_token");
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    let dbBooking = null;
    try {
      const res = await fetch(`${API_BASE}/api/v1/tour-bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        dbBooking = await res.json();
        // Update gold balance
        if (dbBooking.gold_remaining != null) {
          setGoldAfter(dbBooking.gold_remaining);
          // Sync to localStorage user_data
          try {
            const ud = JSON.parse(localStorage.getItem("user_data") || "{}");
            ud.gold = dbBooking.gold_remaining;
            localStorage.setItem("user_data", JSON.stringify(ud));
            onGoldChange?.(dbBooking.gold_remaining);
          } catch {}
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err.detail || "Đặt lịch thất bại.");
        setSubmitting(false);
        return;
      }
    } catch {
      setSubmitError("Không thể kết nối máy chủ.");
      setSubmitting(false);
      return;
    }

    const bookingData = { ...payload, id: dbBooking.id };

    try {
      const encrypted = await encryptQR({ ...bookingData, type: "tour", id: dbBooking.id });
      const url = await QRCode.toDataURL(encrypted, {
        width: 280, margin: 2,
        color: { dark: "#1C2B1D", light: "#FFFFFF" },
      });
      setQrDataUrl(url);

      // Patch QR to DB
      fetch(`${API_BASE}/api/v1/tour-bookings/${bid}/qr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ qr_encrypted: encrypted }),
      }).catch(() => {});

      // Save to localStorage
      const saved = JSON.parse(localStorage.getItem("tour_bookings") || "[]");
      saved.unshift({ ...bookingData, qr_encrypted: encrypted, booked_at: new Date().toISOString() });
      localStorage.setItem("tour_bookings", JSON.stringify(saved.slice(0, 20)));
    } catch {}

    setBooking(bookingData);
    setTimeout(() => { setSubmitting(false); setSubmitted(true); }, 900);
  };

  function handleDownload() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `tour-binhloi-${booking?.bid ?? "qr"}.png`;
    a.click();
  }

  const inputStyle = {
    width: "100%", padding: "0.65rem 0.9rem",
    border: "1.5px solid rgba(61,90,62,0.2)", borderRadius: 10,
    fontSize: "0.85rem", fontFamily: "'Be Vietnam Pro', sans-serif",
    color: C.dark, background: "#FEFCF8", outline: "none", boxSizing: "border-box",
    transition: "border-color 0.18s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FEFCF8", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{globalStyles}</style>
      <style>{`
        @keyframes charBob  { from{transform:translateY(0px) rotate(0deg)} to{transform:translateY(-6px) rotate(1.5deg)} }
        @keyframes charMove { 0%{transform:translateY(0)} 20%{transform:translateY(-8px) rotate(-2deg)} 50%{transform:translateY(-4px) rotate(2deg)} 80%{transform:translateY(-9px) rotate(-1deg)} 100%{transform:translateY(0)} }
        @keyframes dotPulse { 0%{box-shadow:0 0 0 0 rgba(200,150,62,0.7)} 70%{box-shadow:0 0 0 12px rgba(200,150,62,0)} 100%{box-shadow:0 0 0 0 rgba(200,150,62,0)} }
        @keyframes stopFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cloudDrift { from{transform:translateX(0)} to{transform:translateX(50px)} }
        @keyframes successPop { 0%{transform:scale(0.85);opacity:0} 60%{transform:scale(1.04);opacity:1} 100%{transform:scale(1)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes placeChipIn { from{opacity:0;transform:scale(0.9) translateY(4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes hintBadgePop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* ── Top bar ── */}
      <div style={{ background: C.dark, borderBottom: "1px solid rgba(200,150,62,0.18)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 2rem", gap: "1.25rem" }}>
          <button onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: "1.5px solid rgba(245,240,232,0.22)", color: C.cream, padding: "0.45rem 1rem", borderRadius: "2rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.8rem", fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,240,232,0.22)"; e.currentTarget.style.color = C.cream; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Quay lại
          </button>
          <div style={{ width: 1, height: 24, background: "rgba(245,240,232,0.12)" }} />
          <LogoIcon />
          <div>
            <span style={{ fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, display: "block", lineHeight: 1.2 }}>Đặt lịch</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 600, color: C.cream, fontFamily: "'Playfair Display', serif" }}>Tour Bình Lợi một ngày</span>
          </div>
        </div>
        {/* Tab bar */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[["new", "✨ Đặt lịch mới"], ["history", "🎫 Lịch đã đặt"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ flex: 1, padding: "0.65rem", background: "transparent", border: "none", borderBottom: `3px solid ${tab === key ? C.gold : "transparent"}`, cursor: "pointer", color: tab === key ? C.gold : "rgba(245,240,232,0.5)", fontSize: "0.8rem", fontWeight: tab === key ? 700 : 500, fontFamily: "'Be Vietnam Pro', sans-serif", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

        {/* ── Tab: Lịch đã đặt ── */}
        {tab === "history" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: C.dark, marginBottom: "0.25rem" }}>Lịch đã đặt</h2>
                <p style={{ fontSize: "0.8rem", color: "#888" }}>{myBookings.length > 0 ? `${myBookings.length} vé tour` : "Chưa có vé nào"}</p>
              </div>
              <button onClick={loadHistory}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.5rem 1rem", border: `1.5px solid ${C.moss}`, borderRadius: "2rem", background: "transparent", color: C.moss, fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: loadingHistory ? "spin 0.8s linear infinite" : "none" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Làm mới
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <div style={{ width: 40, height: 40, border: `3px solid ${C.moss}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : myBookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", background: "white", borderRadius: 20, border: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎫</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: C.dark, marginBottom: "0.5rem" }}>Chưa có lịch đặt nào</h3>
                <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "1.5rem" }}>Đặt tour Bình Lợi ngay để trải nghiệm không gian yên bình xanh mát</p>
                <button onClick={() => setTab("new")}
                  style={{ padding: "0.7rem 1.75rem", background: C.moss, color: "white", border: "none", borderRadius: "2rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                  Đặt lịch ngay
                </button>
              </div>
            ) : (
              myBookings.map(item => <BookingHistoryCard key={item.bid} item={item} />)
            )}
          </div>
        )}

        {tab === "new" && (
        <>{/* ── Bước 1: Địa điểm tham quan ── */}
        <section style={{ marginBottom: "2.75rem" }}>
          <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: C.moss, marginBottom: "0.4rem" }}>✦ Bước 1</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: C.dark, marginBottom: "0.6rem" }}>Chọn địa điểm tham quan</h2>
          <p style={{ fontSize: "0.82rem", color: "#888", marginBottom: "1.25rem" }}>
            Giá cơ bản <strong style={{ color: C.dark }}>{BASE_PRICE.toLocaleString("vi-VN")} <GoldIcon />/người</strong> · Thêm <strong style={{ color: C.dark }}>{PLACE_PRICE.toLocaleString("vi-VN")} <GoldIcon />/người</strong> mỗi làng nghề
          </p>

          {/* Place grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {ALL_PLACES.map(p => {
              const inQueue = queue.includes(p.id);
              return (
                <button key={p.id}
                  onClick={() => inQueue ? onRemoveFromQueue(p.id) : onAddToQueue(p.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "1rem 1.1rem",
                    border: `2px solid ${inQueue ? p.color : "rgba(0,0,0,0.08)"}`,
                    borderRadius: 16,
                    background: inQueue ? p.bg : "white",
                    cursor: "pointer",
                    transition: "all 0.22s",
                    boxShadow: inQueue ? `0 4px 18px ${p.color}25` : "0 1px 6px rgba(0,0,0,0.04)",
                    transform: inQueue ? "translateY(-2px)" : "none",
                    fontFamily: "'Be Vietnam Pro', sans-serif",
                    textAlign: "left",
                    animation: inQueue ? "placeChipIn 0.25s ease" : "none",
                  }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: inQueue ? p.color + "22" : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0, transition: "all 0.2s" }}>
                    {p.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: inQueue ? p.color : C.dark, marginBottom: 2, transition: "color 0.2s" }}>{p.name}</p>
                    <p style={{ fontSize: "0.72rem", color: inQueue ? p.color + "cc" : "#aaa" }}>+{PLACE_PRICE.toLocaleString("vi-VN")} <GoldIcon size={14} />/người</p>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${inQueue ? p.color : "#ddd"}`, background: inQueue ? p.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}>
                    {inQueue && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pricing summary */}
          <div style={{ background: "white", borderRadius: 16, padding: "1.1rem 1.35rem", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888", marginBottom: "0.65rem" }}>Chi tiết giá</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: C.dark }}>
                <span>Vé vào cửa cơ bản</span>
                <span>{BASE_PRICE.toLocaleString("vi-VN")} <GoldIcon />/người</span>
              </div>
              {queue.map(id => {
                const pl = ALL_PLACES.find(p => p.id === id);
                if (!pl) return null;
                return (
                  <div key={id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: pl.color }}>
                    <span>{pl.icon} {pl.name}</span>
                    <span>+{PLACE_PRICE.toLocaleString("vi-VN")} <GoldIcon />/người</span>
                  </div>
                );
              })}
              <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0.3rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", fontWeight: 700, color: C.dark }}>
                <span>{pricePerPerson.toLocaleString("vi-VN")} <GoldIcon /> × {form.people} người</span>
                <span style={{ color: "#B8860B", fontSize: "1rem" }}>{totalPrice.toLocaleString("vi-VN")} <GoldIcon size={18} /></span>
              </div>
              {/* Voucher selection */}
              {Object.keys(ownedVouchers).length > 0 && (
                <div style={{ marginTop: "0.6rem", background: "#FAFAFA", border: "1.5px solid #e0e0e0", borderRadius: 12, padding: "0.75rem 1rem" }}>
                  <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.55rem" }}>🎟️ Voucher giảm giá — chọn 1</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                    {/* Không dùng */}
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "0.55rem 0.75rem", borderRadius: 10, border: `1.5px solid ${!selectedVoucher ? "#9E9E9E" : "transparent"}`, background: !selectedVoucher ? "#F5F5F5" : "transparent", transition: "all 0.18s" }}>
                      <input type="radio" name="voucher" checked={!selectedVoucher} onChange={() => setSelectedVoucher(null)} style={{ accentColor: "#9E9E9E" }} />
                      <span style={{ fontSize: "0.8rem", color: "#888", fontWeight: 500 }}>Không dùng voucher</span>
                    </label>
                    {/* Từng tier */}
                    {Object.entries(ownedVouchers).map(([id, qty]) => {
                      const tier = VOUCHER_TIERS[id];
                      if (!tier) return null;
                      const active = selectedVoucher === id;
                      return (
                        <label key={id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "0.55rem 0.75rem", borderRadius: 10, border: `1.5px solid ${active ? tier.border : "#e8e8e8"}`, background: active ? tier.bg : "white", transition: "all 0.18s" }}>
                          <input type="radio" name="voucher" checked={active} onChange={() => setSelectedVoucher(id)} style={{ accentColor: tier.badge }} />
                          <span style={{ fontSize: "1rem" }}>{id === "voucher-giam-gia-tour-50" ? "💜" : "🎟️"}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: tier.color }}>Giảm {tier.label}</span>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, background: tier.badge, color: tier.badgeText, padding: "1px 7px", borderRadius: "2rem" }}>{tier.label}</span>
                            </div>
                            <span style={{ fontSize: "0.68rem", color: "#aaa" }}>Số lượng: {qty} cái</span>
                          </div>
                          {active && (
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "0.72rem", color: "#aaa", textDecoration: "line-through" }}>{totalPrice.toLocaleString("vi-VN")} <GoldIcon size={12} /></div>
                              <div style={{ fontSize: "0.88rem", fontWeight: 700, color: tier.color }}>{finalPrice.toLocaleString("vi-VN")} <GoldIcon size={14} /></div>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {userGold !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: finalPrice > userGold ? "#E74C3C" : "#888", marginTop: "0.2rem" }}>
                  <span>Số dư của bạn</span>
                  <span style={{ fontWeight: 600 }}>{userGold.toLocaleString("vi-VN")} <GoldIcon />{finalPrice > userGold ? " — Không đủ" : ""}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Bước 2: Hành trình ── */}
        <section style={{ marginBottom: "2.75rem" }}>
          <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: C.moss, marginBottom: "0.4rem" }}>✦ Bước 2</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: C.dark, marginBottom: "1.1rem" }}>Hành trình một ngày tại Bình Lợi</h2>

          {/* Road canvas */}
          <div style={{ position: "relative", width: "100%", height: 230, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 28px rgba(0,0,0,0.12)", marginBottom: "1rem", userSelect: "none" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, #AED6F1 0%, #D5ECD4 58%, #7DBE6A 100%)" }} />
            <div style={{ position: "absolute", top: 16, right: 70, width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle, #FFE082 60%, #FFA000 100%)", boxShadow: "0 0 28px #FFD54F99, 0 0 60px #FFD54F44" }} />
            <div style={{ position: "absolute", top: 20, left: "12%", animation: "cloudDrift 20s ease-in-out infinite alternate" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 58, height: 18, background: "rgba(255,255,255,0.82)", borderRadius: 50 }} />
                <div style={{ width: 38, height: 15, background: "rgba(255,255,255,0.82)", borderRadius: 50, position: "absolute", top: -9, left: 8 }} />
              </div>
            </div>
            <div style={{ position: "absolute", top: 12, left: "42%", animation: "cloudDrift 28s ease-in-out infinite alternate-reverse" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 72, height: 21, background: "rgba(255,255,255,0.68)", borderRadius: 50 }} />
                <div style={{ width: 44, height: 17, background: "rgba(255,255,255,0.68)", borderRadius: 50, position: "absolute", top: -10, left: 14 }} />
              </div>
            </div>
            {[6, 18, 70, 82, 92].map((l, idx) => (
              <div key={idx} style={{ position: "absolute", bottom: "27%", left: `${l}%` }}>
                <div style={{ width: 3, height: 22 + (idx % 2) * 8, background: "#5D4037", margin: "0 auto" }} />
                <div style={{ width: 20 + (idx % 3) * 4, height: 20 + (idx % 3) * 4, borderRadius: "50%", background: idx % 2 === 0 ? "#2E7D32" : "#388E3C", marginTop: -12, marginLeft: -(10 + (idx % 3) * 2) + 1.5 }} />
              </div>
            ))}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "27%", background: "#795548" }}>
              <div style={{ position: "absolute", top: "42%", left: 0, right: 0, height: 3, background: "repeating-linear-gradient(to right, #FDD835 0, #FDD835 26px, transparent 26px, transparent 52px)" }} />
            </div>
            <div style={{ position: "absolute", bottom: 0, left: 0, height: "27%", width: `${(activeStop / N) * 100}%`, background: "rgba(200,150,62,0.25)", transition: "width 0.7s ease", zIndex: 5 }} />
            {TIMELINE_STOPS.map((_, i) => {
              const x = dotXPct(i);
              const isAct = i === activeStop;
              const isPast = i < activeStop;
              return (
                <div key={i} onClick={() => goTo(i)} style={{ position: "absolute", left: `${x}%`, bottom: "calc(27% - 1px)", transform: "translate(-50%, 50%)", width: isAct ? 20 : 11, height: isAct ? 20 : 11, borderRadius: "50%", background: isAct ? C.gold : isPast ? C.sage : "rgba(255,255,255,0.75)", border: `2.5px solid ${isAct ? "white" : "rgba(255,255,255,0.6)"}`, cursor: "pointer", transition: "all 0.3s", animation: isAct ? "dotPulse 1.6s ease-out infinite" : "none", zIndex: 15 }} />
              );
            })}
            <div style={{ position: "absolute", left: `${charX}%`, bottom: "calc(27% + 88px)", transform: "translateX(-50%)", background: "rgba(28,43,29,0.82)", color: "white", padding: "0.22rem 0.65rem", borderRadius: "2rem", fontSize: "0.63rem", fontWeight: 600, whiteSpace: "nowrap", transition: "left 0.7s cubic-bezier(0.4,0,0.2,1)", zIndex: 25, backdropFilter: "blur(4px)", pointerEvents: "none" }}>
              {stop.time}
            </div>
            <div style={{ position: "absolute", left: `calc(${charX}% - 38px)`, bottom: "calc(27% + 4px)", width: 76, height: 76, transition: "left 0.7s cubic-bezier(0.4,0,0.2,1)", animation: isMoving ? "charMove 0.7s ease-in-out" : "charBob 0.52s ease-in-out infinite alternate", zIndex: 20, filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.32))" }}>
              <img src="/img/booking/dap_xe.png" alt="cyclist" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
          </div>

          {/* Current stop card */}
          <div key={activeStop} style={{ background: "white", borderRadius: 16, padding: "1.1rem 1.35rem", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", animation: "stopFade 0.28s ease forwards", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#EEF5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>{stop.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 700, color: C.gold, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 3 }}>{stop.time}</p>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: C.dark, lineHeight: 1.45 }}>{stop.full}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: "0.62rem", color: "#bbb", fontWeight: 600, minWidth: 32, textAlign: "center" }}>{activeStop + 1}/{TIMELINE_STOPS.length}</span>
                <button onClick={() => setIsPlaying(p => !p)} style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${C.moss}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.moss }}>
                  {isPlaying
                    ? <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    : <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.9rem" }}>
              <button onClick={() => activeStop > 0 && goTo(activeStop - 1)} disabled={activeStop === 0}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 0.9rem", border: `1.5px solid ${activeStop === 0 ? "#e0e0e0" : C.moss}`, borderRadius: "2rem", background: "transparent", cursor: activeStop === 0 ? "default" : "pointer", color: activeStop === 0 ? "#ccc" : C.moss, fontSize: "0.76rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif" }}
                onMouseEnter={e => { if (activeStop > 0) { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; } }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = activeStop === 0 ? "#ccc" : C.moss; }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>Trước
              </button>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {TIMELINE_STOPS.map((_, i) => (
                  <div key={i} onClick={() => goTo(i)} style={{ width: i === activeStop ? 22 : 7, height: 7, borderRadius: 4, background: i === activeStop ? C.moss : i < activeStop ? C.sage + "99" : "#e0e0e0", cursor: "pointer", transition: "all 0.28s" }} />
                ))}
              </div>
              <button onClick={() => activeStop < N && goTo(activeStop + 1)} disabled={activeStop === N}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "0.4rem 0.9rem", border: `1.5px solid ${activeStop === N ? "#e0e0e0" : C.moss}`, borderRadius: "2rem", background: activeStop === N ? "transparent" : C.moss, cursor: activeStop === N ? "default" : "pointer", color: activeStop === N ? "#ccc" : "white", fontSize: "0.76rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                Tiếp<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>

          {/* Expand all stops */}
          <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <button onClick={() => setShowAllStops(s => !s)}
              style={{ width: "100%", padding: "0.82rem 1.2rem", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.8rem", fontWeight: 600, color: C.moss, textAlign: "left" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: "transform 0.25s", transform: showAllStops ? "rotate(90deg)" : "rotate(0deg)" }}><path d="M9 18l6-6-6-6"/></svg>
              {showAllStops ? "Ẩn bớt" : `Xem toàn bộ lịch trình (${TIMELINE_STOPS.length} điểm dừng)`}
            </button>
            {showAllStops && (
              <div style={{ padding: "0 1.2rem 0.8rem" }}>
                {TIMELINE_STOPS.map((s, i) => (
                  <div key={i} onClick={() => goTo(i)}
                    style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "0.6rem 0.5rem", borderRadius: 8, background: i === activeStop ? "#EEF5EE" : "transparent", cursor: "pointer", transition: "background 0.15s", borderBottom: i < N ? "1px solid rgba(0,0,0,0.04)" : "none" }}
                    onMouseEnter={e => { if (i !== activeStop) e.currentTarget.style.background = "#f5f5f5"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = i === activeStop ? "#EEF5EE" : "transparent"; }}>
                    <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "0.63rem", color: C.gold, fontWeight: 700, marginBottom: 2 }}>{s.time}</p>
                      <p style={{ fontSize: "0.79rem", color: C.dark, lineHeight: 1.4 }}>{s.full}</p>
                    </div>
                    {i === activeStop && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.moss, flexShrink: 0, alignSelf: "center" }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Bước 3: Form ── */}
        <section>
          <p style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: C.moss, marginBottom: "0.4rem" }}>✦ Bước 3</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: C.dark, marginBottom: "1.1rem" }}>Thông tin đặt lịch</h2>

          {submitted ? (
            /* ── Success / QR screen ── */
            <div style={{ animation: "successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
              <div style={{ background: "white", borderRadius: 20, padding: "2rem", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.4rem", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, background: "#E8F5E9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>✅</div>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: C.dark, marginBottom: "0.4rem" }}>Đặt lịch thành công!</h3>
                  <p style={{ fontSize: "0.82rem", color: "#777", lineHeight: 1.7 }}>
                    Mã đặt lịch: <strong style={{ color: C.moss }}>{booking?.bid}</strong><br/>
                    {fmtDate(booking?.date)} · {booking?.people} người<br/>
                    {booking?.places?.length > 0 && <span>Địa điểm: {booking.places.join(", ")}</span>}
                  </p>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FFF8EE", border: "1.5px solid #F0D080", borderRadius: 12, padding: "0.5rem 1rem", marginTop: "0.4rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "#8B6F47" }}>Đã trừ <strong>{(booking?.total ?? 0).toLocaleString("vi-VN")} <GoldIcon /></strong></span>
                    {goldAfter !== null && <span style={{ fontSize: "0.78rem", color: "#aaa" }}>· Còn lại: <strong style={{ color: "#B8860B" }}>{goldAfter.toLocaleString("vi-VN")} <GoldIcon /></strong></span>}
                  </div>
                </div>

                {qrDataUrl && (
                  <div style={{ background: "#FAFAF8", border: "1.5px solid rgba(61,90,62,0.15)", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                    <img src={qrDataUrl} alt="QR Tour" style={{ width: 220, height: 220, borderRadius: 10 }} />
                    <div style={{ fontSize: "0.72rem", color: "#888", lineHeight: 1.6 }}>
                      <div style={{ fontWeight: 700, color: C.dark, fontSize: "0.78rem", marginBottom: 4 }}>Xuất trình QR này khi check-in tại cổng</div>
                      <div>Đã trừ: <strong style={{ color: "#B8860B" }}>{(booking?.total ?? 0).toLocaleString("vi-VN")} <GoldIcon /></strong></div>
                      <div style={{ fontSize: "0.65rem", color: "#bbb", marginTop: 4 }}>AES-256 encrypted · Dùng 1 lần</div>
                    </div>
                    <button onClick={handleDownload}
                      style={{ background: `linear-gradient(135deg, ${C.gold}, #E8A830)`, color: C.dark, border: "none", padding: "0.65rem 1.75rem", borderRadius: "2rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                      ⬇ Tải ảnh QR về
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
                  <button onClick={() => { setTab("history"); loadHistory(); }}
                    style={{ padding: "0.75rem 1.75rem", border: "none", borderRadius: "2rem", background: C.gold, color: C.dark, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    🎫 Xem lịch đã đặt
                  </button>
                  <button onClick={onBack}
                    style={{ padding: "0.75rem 1.75rem", border: `1.5px solid ${C.moss}`, borderRadius: "2rem", background: "transparent", color: C.moss, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    Về trang chủ
                  </button>
                  <button onClick={() => { setSubmitted(false); setForm({ date: "", people: 2, notes: "" }); onClearQueue?.(); }}
                    style={{ padding: "0.75rem 1.75rem", border: `1.5px solid rgba(0,0,0,0.12)`, borderRadius: "2rem", background: "transparent", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                    Đặt lịch khác
                  </button>
                </div>

                {/* ── Nền tảng đặt lịch khác ── */}
                <div style={{ width: "100%", borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "1.25rem" }}>
                  <p style={{ fontSize: "0.65rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#bbb", marginBottom: "1rem", fontWeight: 500 }}>
                    Hoặc đặt lịch qua các nền tảng
                  </p>
                  <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                    {[
                      { name: "Vietravel", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Vietravel_logo.svg/200px-Vietravel_logo.svg.png", bg: "#003087", href: "https://www.vietravel.com" },
                      { name: "Dat Viet", logo: "https://datvietour.com.vn/images/logo.png", bg: "#E31837", href: "https://datvietour.com.vn" },
                      { name: "Traveloka", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Traveloka_logo.svg/200px-Traveloka_logo.svg.png", bg: "#0770E3", href: "https://www.traveloka.com" },
                      { name: "Klook", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Klook_logo.svg/200px-Klook_logo.svg.png", bg: "#FF5010", href: "https://www.klook.com" },
                    ].map(p => (
                      <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 7, background: p.bg, borderRadius: 10, padding: "0.45rem 1rem", textDecoration: "none", transition: "all 0.2s", boxShadow: `0 2px 8px ${p.bg}44` }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
                        <img src={p.logo} alt={p.name}
                          style={{ height: 18, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }}
                          onError={e => { e.currentTarget.style.display = "none"; }} />
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "white", fontFamily: "'Be Vietnam Pro', sans-serif", whiteSpace: "nowrap" }}>{p.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ background: "white", borderRadius: 20, padding: "1.75rem", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>

                {/* Hint badge when chatbot filled something */}
                {(bookingHints?.date || bookingHints?.people || bookingHints?.notes) && (
                  <div style={{ background: "#EEF5EE", border: "1.5px solid rgba(61,90,62,0.2)", borderRadius: 12, padding: "0.65rem 1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 8, animation: "hintBadgePop 0.4s ease" }}>
                    <span style={{ fontSize: "1rem" }}>💬</span>
                    <p style={{ fontSize: "0.76rem", color: C.moss, fontWeight: 500 }}>Thông tin từ cuộc trò chuyện với Mai đã được điền sẵn</p>
                  </div>
                )}

                {/* Ngày tham quan */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ fontSize: "0.74rem", fontWeight: 700, color: C.dark, display: "block", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>📅 Ngày tham quan *</label>
                  <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: 4 }}>
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() + i + 1);
                      const iso = d.toISOString().split("T")[0];
                      const thu = d.toLocaleDateString("vi-VN", { weekday: "short" });
                      const ngay = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
                      const active = form.date === iso;
                      return (
                        <button type="button" key={iso} onClick={() => setForm(f => ({ ...f, date: iso }))}
                          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 60, padding: "0.65rem 0.5rem", border: `2px solid ${active ? C.moss : "rgba(0,0,0,0.1)"}`, borderRadius: 14, background: active ? C.moss : "white", cursor: "pointer", transition: "all 0.18s", flexShrink: 0 }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", color: active ? "rgba(255,255,255,0.75)" : "#aaa", letterSpacing: "0.04em" }}>{thu}</span>
                          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: active ? "white" : C.dark, lineHeight: 1.1 }}>{ngay.split("/")[0]}</span>
                          <span style={{ fontSize: "0.62rem", color: active ? "rgba(255,255,255,0.7)" : "#bbb" }}>/{ngay.split("/")[1]}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!form.date && <p style={{ fontSize: "0.72rem", color: "#e57373", marginTop: 6 }}>Vui lòng chọn ngày tham quan</p>}
                </div>

                {/* Số người — stepper */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ fontSize: "0.74rem", fontWeight: 700, color: C.dark, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>👥 Số người tham gia *</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button type="button" onClick={() => setForm(f => ({ ...f, people: Math.max(1, f.people - 1) }))}
                      style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${form.people <= 1 ? "#e0e0e0" : C.moss}`, background: "transparent", cursor: form.people <= 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: form.people <= 1 ? "#ddd" : C.moss, flexShrink: 0, transition: "all 0.18s", fontSize: "1.2rem", fontWeight: 700 }}>
                      −
                    </button>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "2.2rem", fontWeight: 700, color: C.dark, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{form.people}</div>
                      <div style={{ fontSize: "0.72rem", color: "#aaa", marginTop: 2 }}>người</div>
                    </div>
                    <button type="button" onClick={() => setForm(f => ({ ...f, people: Math.min(50, f.people + 1) }))}
                      style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${C.moss}`, background: C.moss, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0, transition: "all 0.18s", fontSize: "1.2rem", fontWeight: 700 }}>
                      +
                    </button>
                  </div>
                  {/* Quick select */}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                    {[1, 2, 4, 6, 10, 20].map(n => (
                      <button type="button" key={n} onClick={() => setForm(f => ({ ...f, people: n }))}
                        style={{ padding: "0.3rem 0.75rem", border: `1.5px solid ${form.people === n ? C.moss : "#e0e0e0"}`, borderRadius: "2rem", background: form.people === n ? C.moss : "transparent", color: form.people === n ? "white" : "#888", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ghi chú */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ fontSize: "0.74rem", fontWeight: 700, color: C.dark, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>📝 Ghi chú thêm</label>
                  <textarea placeholder="Yêu cầu đặc biệt, dị ứng thức ăn, trẻ em đi cùng, sở thích..." value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                    onFocus={e => e.target.style.borderColor = C.moss} onBlur={e => e.target.style.borderColor = "rgba(61,90,62,0.2)"} />
                </div>

                {/* Order summary */}
                <div style={{ background: `linear-gradient(135deg, ${C.dark}, #2A4A2B)`, borderRadius: 14, padding: "1.1rem 1.35rem", marginBottom: "1.25rem" }}>
                  <p style={{ fontSize: "0.62rem", fontWeight: 700, color: "rgba(245,240,232,0.55)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Tóm tắt đơn đặt</p>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                    {queue.length === 0
                      ? <span style={{ fontSize: "0.78rem", color: "rgba(245,240,232,0.5)", fontStyle: "italic" }}>Chưa chọn địa điểm cụ thể</span>
                      : queue.map(id => {
                          const pl = ALL_PLACES.find(p => p.id === id);
                          return pl ? (
                            <span key={id} style={{ background: `${pl.color}33`, color: pl.color, border: `1px solid ${pl.color}55`, padding: "0.2rem 0.6rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 600 }}>
                              {pl.icon} {pl.name}
                            </span>
                          ) : null;
                        })}
                  </div>
                  {form.date && <div style={{ fontSize: "0.78rem", color: "rgba(245,240,232,0.75)", marginBottom: "0.3rem" }}>📅 {fmtDate(form.date)}</div>}
                  <div style={{ fontSize: "0.78rem", color: "rgba(245,240,232,0.75)", marginBottom: "0.5rem" }}>👥 {form.people} người</div>
                  <div style={{ borderTop: "1px solid rgba(245,240,232,0.1)", paddingTop: "0.6rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.78rem", color: "rgba(245,240,232,0.6)" }}>Thành tiền</span>
                      <div style={{ textAlign: "right" }}>
                        {discountPct > 0 && (
                          <div style={{ fontSize: "0.8rem", color: "rgba(245,240,232,0.4)", textDecoration: "line-through", marginBottom: 2 }}>
                            {totalPrice.toLocaleString("vi-VN")} <GoldIcon size={14} />
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {discountPct > 0 && <span style={{ fontSize: "0.68rem", fontWeight: 700, background: "#2D9A4E", color: "white", padding: "1px 7px", borderRadius: "2rem" }}>−{discountPct}%</span>}
                          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: C.gold, fontFamily: "'Playfair Display', serif" }}>{finalPrice.toLocaleString("vi-VN")} <GoldIcon size={22} /></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div style={{ background: "#FFF0F0", border: "1.5px solid #F44336", borderRadius: 12, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.8rem", color: "#C0392B", display: "flex", gap: 8, alignItems: "center" }}>
                    <span>⚠️</span><span>{submitError}</span>
                  </div>
                )}

                <button type="submit" disabled={submitting || (userGold !== null && finalPrice > userGold)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "0.95rem", background: submitting ? C.sage : (userGold !== null && finalPrice > userGold) ? "#ccc" : C.moss, color: "white", border: "none", borderRadius: 14, cursor: submitting ? "wait" : (userGold !== null && finalPrice > userGold) ? "not-allowed" : "pointer", fontSize: "0.92rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro', sans-serif", transition: "all 0.2s", boxShadow: "0 4px 18px rgba(61,90,62,0.28)" }}
                  onMouseEnter={e => { if (!submitting && !(userGold !== null && finalPrice > userGold)) e.currentTarget.style.background = "#2A4A2B"; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = (userGold !== null && finalPrice > userGold) ? "#ccc" : C.moss; }}>
                  {submitting ? (
                    <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.9s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Đang xử lý...</>
                  ) : (userGold !== null && finalPrice > userGold) ? (
                    <><GoldIcon /> Không đủ vàng ({userGold.toLocaleString("vi-VN")}/{finalPrice.toLocaleString("vi-VN")})</>
                  ) : (
                    <>✨ Xác nhận đặt lịch — {finalPrice.toLocaleString("vi-VN")} <GoldIcon /></>
                  )}
                </button>
                <p style={{ textAlign: "center", fontSize: "0.66rem", color: "#aaa", marginTop: "0.7rem" }}>Vàng sẽ bị trừ ngay khi xác nhận · Miễn phí hủy trước 48 giờ</p>

                {/* ── Nền tảng đặt lịch khác ── */}
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", marginTop: "1.25rem", paddingTop: "1.1rem" }}>
                  <p style={{ textAlign: "center", fontSize: "0.63rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#bbb", marginBottom: "0.85rem", fontWeight: 500 }}>
                    Hoặc đặt lịch qua các nền tảng khác
                  </p>
                  <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                    {[
                      { name: "Vietravel", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Vietravel_logo.svg/200px-Vietravel_logo.svg.png", bg: "#003087", href: "https://www.vietravel.com" },
                      { name: "Dat Viet", logo: "https://datvietour.com.vn/images/logo.png", bg: "#E31837", href: "https://datvietour.com.vn" },
                      { name: "Traveloka", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Traveloka_logo.svg/200px-Traveloka_logo.svg.png", bg: "#0770E3", href: "https://www.traveloka.com" },
                      { name: "Klook", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Klook_logo.svg/200px-Klook_logo.svg.png", bg: "#FF5010", href: "https://www.klook.com" },
                    ].map(p => (
                      <a key={p.name} href={p.href} target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 6, background: p.bg, borderRadius: 9, padding: "0.4rem 0.9rem", textDecoration: "none", transition: "all 0.18s", boxShadow: `0 2px 6px ${p.bg}44` }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = "0.82"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
                        <img src={p.logo} alt={p.name}
                          style={{ height: 16, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }}
                          onError={e => { e.currentTarget.style.display = "none"; }} />
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "white", fontFamily: "'Be Vietnam Pro', sans-serif", whiteSpace: "nowrap" }}>{p.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          )}
        </section>
        </>)}
      </div>
    </div>
  );
}
