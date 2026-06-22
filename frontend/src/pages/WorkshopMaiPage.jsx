import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { C, API_BASE } from "../constants";
import { encryptQR } from "../utils/qrCrypto";
import LogoIcon from "../components/LogoIcon";
import AchievementPopup from "../components/AchievementPopup";

function generateSlots(durationHours, count = 8) {
  const slots = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  while (slots.length < count) {
    const day = d.getDay();
    if (day === 6 || day === 0) {
      for (const hour of [8, 14]) {
        const start = new Date(d);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start.getTime() + durationHours * 3600000);
        slots.push({ start, end, iso: start.toISOString() });
      }
    }
    d.setDate(d.getDate() + 1);
  }
  return slots;
}

function fmtSlot(slot) {
  const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const d = slot.start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const t0 = slot.start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const t1 = slot.end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${days[slot.start.getDay()]}, ${d} · ${t0} – ${t1}`;
}

function fmtISO(iso, durationHours) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationHours * 3600000);
  return fmtSlot({ start, end });
}

// ─── REGISTRATION MODAL ───
function RegisterModal({ track, onClose, onSuccess }) {
  const dh = parseFloat(track.duration);
  const slotList = generateSlots(dh, 8);
  const [selectedSlot, setSelectedSlot] = useState(slotList[0]?.iso ?? "");
  const [participants, setParticipants] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  const selectedSlotObj = slotList.find(s => s.iso === selectedSlot) ?? slotList[0];

  async function handleSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) { setError("Bạn cần đăng nhập để đăng ký workshop."); return; }
    setLoading(true); setError("");
    try {
      // 1. Create booking
      const res = await fetch(`${API_BASE}/api/v1/workshops/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workshop_slug: track.id, scheduled_at: selectedSlot, participants, note: note || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Đăng ký thất bại, thử lại sau.");
      }
      const data = await res.json();

      // 2. Encrypt QR payload
      const payload = {
        bid: data.id, ws: data.workshop_title, slug: data.workshop_slug,
        user: data.user_name, email: data.user_email,
        time: fmtSlot(selectedSlotObj), participants,
      };
      const encrypted = await encryptQR(payload);

      // 3. Save QR to DB
      await fetch(`${API_BASE}/api/v1/workshops/bookings/${data.id}/qr`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qr_encrypted: encrypted }),
      });

      // 4. Generate display image
      const url = await QRCode.toDataURL(encrypted, {
        width: 280, margin: 2,
        color: { dark: "#1C2B1D", light: "#FFFFFF" },
      });
      setBooking({ ...data, scheduled_at: selectedSlot });
      setQrDataUrl(url);

      // 5. Notify parent to update state
      onSuccess(track.id, { ...data, qr_encrypted: encrypted, scheduled_at: selectedSlot, participants });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `workshop-qr-${booking?.id ?? "binhloi"}.png`;
    a.click();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 24, width: "100%", maxWidth: 480, maxHeight: "92vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.22)", animation: "modalIn 0.3s ease" }}>
        <div style={{ background: `linear-gradient(135deg, ${C.moss}, #2A4A2B)`, padding: "1.5rem 1.75rem", borderRadius: "24px 24px 0 0", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,0.15)", border: "none", color: "white", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: "1rem" }}>×</button>
          <p style={{ fontSize: "0.6rem", fontWeight: 700, color: "rgba(245,240,232,0.6)", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 4px" }}>✦ Đăng ký workshop</p>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "white", margin: 0 }}>{track.title}</h3>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            {[["⏱", `${track.duration} tiếng`], ["💰", track.fee], ["👥", `Tối đa ${track.maxPpl} người`]].map(([ic, lb]) => (
              <span key={lb} style={{ background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.72rem", padding: "0.2rem 0.65rem", borderRadius: "2rem" }}>{ic} {lb}</span>
            ))}
          </div>
        </div>

        <div style={{ padding: "1.5rem 1.75rem" }}>
          {!booking ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>📅 Chọn thời gian học</label>
                <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)}
                  style={{ width: "100%", padding: "0.7rem 1rem", border: "1.5px solid rgba(61,90,62,0.25)", borderRadius: 12, fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", color: C.dark, background: "#FAFAF8", outline: "none" }}>
                  {slotList.map(s => <option key={s.iso} value={s.iso}>{fmtSlot(s)}</option>)}
                </select>
                <p style={{ fontSize: "0.7rem", color: "#aaa", margin: "4px 0 0 2px" }}>Lớp học vào Thứ 7 & Chủ nhật hàng tuần</p>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>👥 Số người tham gia</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button type="button" key={n} onClick={() => setParticipants(n)}
                      style={{ flex: 1, padding: "0.55rem 0", border: `1.5px solid ${participants === n ? C.moss : "rgba(0,0,0,0.12)"}`, borderRadius: 10, background: participants === n ? C.moss : "white", color: participants === n ? "white" : "#555", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", transition: "all 0.15s" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#555", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>📝 Ghi chú (không bắt buộc)</label>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Dị ứng, yêu cầu đặc biệt..."
                  style={{ width: "100%", padding: "0.65rem 1rem", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 12, fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", resize: "none", outline: "none", boxSizing: "border-box" }} />
              </div>

              {error && <div style={{ background: "#FFF0F0", color: "#C0392B", borderRadius: 10, padding: "0.6rem 0.9rem", fontSize: "0.8rem" }}>{error}</div>}

              <div style={{ background: "#F7F3ED", borderRadius: 14, padding: "0.9rem 1.1rem", fontSize: "0.82rem", color: "#555", lineHeight: 1.7 }}>
                <strong style={{ color: C.dark, display: "block", marginBottom: 4 }}>Tóm tắt đăng ký</strong>
                <div>🎓 {track.title}</div>
                <div>📅 {selectedSlotObj ? fmtSlot(selectedSlotObj) : "—"}</div>
                <div>👥 {participants} người · 💰 {(parseInt(track.fee.replace(/\D/g, "")) * participants).toLocaleString("vi-VN")} VNĐ</div>
              </div>

              <button type="submit" disabled={loading}
                style={{ background: loading ? "#ccc" : `linear-gradient(135deg, ${C.moss}, #2A4A2B)`, color: "white", border: "none", padding: "0.9rem", borderRadius: "2rem", fontSize: "0.9rem", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", boxShadow: loading ? "none" : "0 6px 24px rgba(61,90,62,0.4)", transition: "transform 0.2s" }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                {loading ? "Đang xử lý..." : "Xác nhận đăng ký →"}
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, background: "#E8F5E9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem", fontSize: "1.5rem" }}>✓</div>
                <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: C.dark, margin: "0 0 4px" }}>Đăng ký thành công!</h4>
                <p style={{ fontSize: "0.78rem", color: "#888", margin: 0 }}>Mã đặt chỗ #{booking.id} · Giữ QR này để check-in</p>
              </div>
              {qrDataUrl && (
                <div style={{ background: "#FAFAF8", border: "1.5px solid rgba(61,90,62,0.15)", borderRadius: 16, padding: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem" }}>
                  <img src={qrDataUrl} alt="QR Code đặt chỗ" style={{ width: 200, height: 200, borderRadius: 8 }} />
                  <div style={{ fontSize: "0.72rem", color: "#888", textAlign: "center", lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, color: C.dark, fontSize: "0.8rem" }}>{track.title}</div>
                    <div>{fmtSlot(selectedSlotObj)}</div>
                    <div>{participants} người · AES-256 encrypted</div>
                  </div>
                  <button onClick={handleDownload}
                    style={{ background: `linear-gradient(135deg, ${C.gold}, #E8A830)`, color: C.dark, border: "none", padding: "0.65rem 1.75rem", borderRadius: "2rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                    ⬇ Tải ảnh QR về
                  </button>
                </div>
              )}
              <button onClick={onClose}
                style={{ width: "100%", padding: "0.75rem", borderRadius: "2rem", border: `1.5px solid ${C.moss}`, background: "transparent", color: C.moss, fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
                Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WORKSHOP UỐN CÀNH MAI PAGE ───
export default function WorkshopMaiPage({ onBack }) {
  const [completedWs, setCompletedWs] = useState([]);
  const [myBookings, setMyBookings] = useState({}); // slug → booking
  const [pendingAchievement, setPendingAchievement] = useState(null);
  const [registerTrack, setRegisterTrack] = useState(null);
  const [sidebarQrUrl, setSidebarQrUrl] = useState("");

  const BONSAI_TRACK = [
    { id: "uon-mai-1",      level: "Tập sự",   icon: "🪴", color: "#CD7F32", title: "Uốn cành mai – Tập sự",  desc: "Tìm hiểu nguyên tắc tạo dáng, kỹ thuật quấn dây và tự tay uốn cành mai đầu tiên.", duration: "3", fee: "350.000 VNĐ", maxPpl: 10, pts: 3000,  badge: "Người tạo dáng tập sự",     prereq: null,          ach: { id: "uon-mai-1",    rarity: "bronze",    cup: "🪴", name: "Người tạo dáng tập sự",     desc: "Hoàn thành workshop Uốn cành mai – Tập sự" } },
    { id: "bonsai-basic",   level: "Cơ bản",   icon: "🌱", color: "#5C8A5C", title: "Bonsai cơ bản",           desc: "Học cách chọn cây giống, cắt tỉa và định hình khung xương cho cây bonsai mai.",   duration: "4", fee: "450.000 VNĐ", maxPpl: 10, pts: 5000,  badge: "Nghệ nhân bonsai cơ bản",   prereq: "uon-mai-1",   ach: { id: "bonsai-basic", rarity: "silver",    cup: "🌱", name: "Nghệ nhân bonsai cơ bản",   desc: "Hoàn thành workshop Bonsai cơ bản" } },
    { id: "bonsai-mid",     level: "Trung cấp",icon: "🌿", color: "#C8963E", title: "Bonsai trung cấp",        desc: "Thực hành ghép cành, tạo rễ nổi và kiểm soát sự phát triển của cây qua các mùa.", duration: "5", fee: "600.000 VNĐ", maxPpl: 8,  pts: 8000,  badge: "Nghệ nhân bonsai trung cấp",prereq: "bonsai-basic", ach: { id: "bonsai-mid",   rarity: "gold",      cup: "🌿", name: "Nghệ nhân bonsai trung cấp",desc: "Hoàn thành workshop Bonsai trung cấp" } },
    { id: "bonsai-advanced",level: "Cao cấp",  icon: "🌳", color: "#B8860B", title: "Bậc thầy bonsai",         desc: "Tạo tác phẩm bonsai mai hoàn chỉnh theo phong cách cổ điển và hiện đại Nam Bộ.",  duration: "6", fee: "800.000 VNĐ", maxPpl: 6,  pts: 15000, badge: "Bậc thầy bonsai",           prereq: "bonsai-mid",  ach: { id: "bonsai-master",rarity: "legendary", cup: "🌳", name: "Bậc thầy bonsai",           desc: "Hoàn thành toàn bộ lộ trình bonsai mai cao cấp" } },
  ];

  const activeTrack = BONSAI_TRACK.find(t => !completedWs.includes(t.id) && (!t.prereq || completedWs.includes(t.prereq))) ?? BONSAI_TRACK[0];

  // Load profile + bookings
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };

    fetch(`${API_BASE}/api/v1/profile/summary`, { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(s => { if (s) setCompletedWs(s.completed_workshops ?? []); })
      .catch(() => {});

    fetch(`${API_BASE}/api/v1/workshops/my-bookings`, { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const map = {};
        for (const b of list) map[b.workshop_slug] = b;
        setMyBookings(map);
      })
      .catch(() => {});
  }, []);

  // Generate sidebar QR — use stored encrypted string or regenerate + save if missing
  useEffect(() => {
    const booking = myBookings[activeTrack?.id];
    if (!booking) { setSidebarQrUrl(""); return; }

    const token = localStorage.getItem("access_token");

    async function buildQr() {
      let encrypted = booking.qr_encrypted;
      if (!encrypted) {
        // Regenerate from booking data and persist to DB
        const payload = {
          bid: booking.id,
          ws: booking.workshop_title,
          slug: booking.workshop_slug,
          user: booking.user_name,
          email: booking.user_email,
          time: fmtISO(booking.scheduled_at, parseFloat(activeTrack.duration)),
          participants: booking.participants,
        };
        encrypted = await encryptQR(payload);
        // Save to DB silently
        if (token) {
          fetch(`${API_BASE}/api/v1/workshops/bookings/${booking.id}/qr`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ qr_encrypted: encrypted }),
          }).catch(() => {});
        }
        // Update local state so next renders use the saved value
        setMyBookings(prev => ({
          ...prev,
          [activeTrack.id]: { ...prev[activeTrack.id], qr_encrypted: encrypted },
        }));
      }
      const url = await QRCode.toDataURL(encrypted, {
        width: 200, margin: 1, color: { dark: "#1C2B1D", light: "#FFFFFF" },
      });
      setSidebarQrUrl(url);
    }

    buildQr().catch(() => setSidebarQrUrl(""));
  }, [myBookings, activeTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called by modal after successful registration — only update state, let modal close itself
  function handleRegisterSuccess(slug, booking) {
    setMyBookings(prev => ({ ...prev, [slug]: booking }));
  }


  const STEPS = [
    { n: 1, icon: "📜", title: "Lịch sử & ý nghĩa", desc: "Tìm hiểu lịch sử và ý nghĩa nghệ thuật bonsai mai trong văn hoá Nam Bộ." },
    { n: 2, icon: "👀", title: "Quan sát nghệ nhân", desc: "Xem nghệ nhân trình diễn kỹ thuật quấn dây nhôm và uốn cành." },
    { n: 3, icon: "🤲", title: "Thực hành quấn dây", desc: "Tự tay quấn dây và uốn cành trên cây mai của riêng bạn." },
    { n: 4, icon: "🎨", title: "Hoàn thiện tác phẩm", desc: "Chỉnh sửa và định hình tác phẩm theo phong cách cá nhân." },
    { n: 5, icon: "📸", title: "Chụp ảnh lưu niệm", desc: "Chụp ảnh cùng thành phẩm và nhận chứng chỉ tham gia." },
  ];

  const LEARN = [
    "Hiểu các thế mai phổ biến trong nghệ thuật bonsai",
    "Nhận biết hướng phát triển tự nhiên của cành",
    "Kỹ thuật quấn dây nhôm đúng cách, không gây hại cây",
    "Cách tạo độ cong tự nhiên và cân bằng thẩm mỹ",
    "Chăm sóc và duy trì cây sau khi uốn",
  ];

  const GALLERY = [
    { src: "https://picsum.photos/seed/ws-mai-craft/600/400", label: "Kỹ thuật quấn dây nhôm" },
    { src: "https://picsum.photos/seed/ws-mai-tree/600/400",  label: "Cành mai sau khi uốn" },
    { src: "https://picsum.photos/seed/ws-mai-group/600/400", label: "Học viên thực hành" },
    { src: "https://picsum.photos/seed/ws-mai-result/600/400",label: "Tác phẩm hoàn thành" },
    { src: "https://picsum.photos/seed/ws-mai-art/600/400",   label: "Nghệ nhân trình diễn" },
    { src: "https://picsum.photos/seed/ws-mai-display/600/400",label: "Trưng bày thành phẩm" },
  ];

  const activeBooking = myBookings[activeTrack?.id];

  function downloadSidebarQr() {
    const a = document.createElement("a");
    a.href = sidebarQrUrl;
    a.download = `workshop-qr-${activeBooking?.id ?? "binhloi"}.png`;
    a.click();
  }

  return (
    <>
      <div style={{ minHeight: "100vh", background: "#F7F3ED", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');
          @keyframes wsFadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes modalIn  { from{opacity:0;transform:scale(0.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
          .ws-reveal { animation: wsFadeUp 0.5s ease both; }
          .step-card:hover { transform: translateX(6px); }
          .gallery-thumb { overflow:hidden; border-radius:14px; position:relative; cursor:pointer; }
          .gallery-thumb img { width:100%; height:100%; object-fit:cover; transition:transform 0.45s ease; }
          .gallery-thumb:hover img { transform:scale(1.06); }
          .gallery-thumb .label-overlay { position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent,rgba(0,0,0,0.6)); color:white; font-size:0.72rem; font-weight:500; padding:0.6rem 0.75rem 0.55rem; opacity:0; transition:opacity 0.3s; }
          .gallery-thumb:hover .label-overlay { opacity:1; }
          .reward-glow { box-shadow:0 0 0 2px #C8963E55, 0 8px 32px rgba(200,150,62,0.25); }
          /* Responsive */
          @media (max-width: 900px) {
            .ws-layout { grid-template-columns: 1fr !important; }
            .ws-sidebar { position: static !important; }
          }
          @media (max-width: 640px) {
            .ws-hero { height: 300px !important; }
            .ws-hero h1 { font-size: 1.6rem !important; }
            .ws-hero > div:last-of-type { padding: 0 1.25rem !important; }
            .ws-body { padding: 2rem 1rem 4rem !important; }
            .ws-gallery { grid-template-columns: 1fr 1fr !important; }
          }
        `}</style>

        {/* Nav */}
        <nav style={{ background: "rgba(254,252,248,0.97)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(200,150,62,0.15)", padding: "0 2rem", height: 60, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={onBack} style={{ background: "none", border: "1.5px solid rgba(61,90,62,0.3)", color: C.moss, padding: "0.35rem 0.85rem", borderRadius: "2rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.moss; }}>
            ← Trang chủ
          </button>
          <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.1)", margin: "0 4px" }} />
          <LogoIcon />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 600, color: C.moss }}>BÌNH LỢI</span>
          <span style={{ color: "#d0c8bc" }}>/</span>
          <span style={{ fontSize: "0.82rem", color: "#aaa" }}>Workshop</span>
          <span style={{ color: "#d0c8bc" }}>/</span>
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>Uốn cành mai</span>
        </nav>

        {/* Hero */}
        <div className="ws-hero" style={{ position: "relative", height: 440, overflow: "hidden" }}>
          <img src="https://binhloi.my.canva.site/_assets/media/6c82a90fbc0efaa63ac62d599f575345.png" alt="Workshop uốn cành mai" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(100deg,rgba(20,38,20,0.92) 0%,rgba(20,38,20,0.65) 50%,rgba(20,38,20,0.2) 100%)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center" }}>
            <div style={{ maxWidth: 580, padding: "0 4rem" }}>
              <span style={{ display: "inline-block", background: "#FFF8EE", color: "#7A4F00", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", padding: "0.25rem 0.85rem", borderRadius: "2rem", marginBottom: "1rem" }}>✦ Nghề thủ công</span>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.6rem", fontWeight: 600, color: "white", lineHeight: 1.2, margin: "0 0 1rem" }}>Học uốn cành mai<br /><em style={{ fontWeight: 400, fontSize: "0.85em" }}>– cắm hoa truyền thống</em></h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.75rem" }}>
                {[["⏱", "3 tiếng"], ["👥", "Tối đa 10 người"], ["📍", "Làng Mai Bình Lợi"], ["💰", "350.000 VNĐ/người"]].map(([ic, lb]) => (
                  <span key={lb} style={{ background: "rgba(255,255,255,0.15)", color: "white", fontSize: "0.78rem", fontWeight: 500, padding: "0.3rem 0.85rem", borderRadius: "2rem", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.2)" }}>{ic} {lb}</span>
                ))}
              </div>
              {activeBooking && !completedWs.includes(activeTrack.id) ? (
                <button disabled style={{ background: "rgba(255,255,255,0.2)", color: "white", border: "2px solid rgba(255,255,255,0.4)", padding: "0.9rem 2.25rem", borderRadius: "3rem", fontSize: "0.9rem", fontWeight: 700, cursor: "not-allowed", fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 8 }}>
                  ✓ Đã đăng ký khóa học
                </button>
              ) : (
                <button onClick={() => setRegisterTrack(activeTrack)}
                  style={{ background: `linear-gradient(135deg, ${C.gold}, #E8A830)`, color: C.dark, border: "none", padding: "0.9rem 2.25rem", borderRadius: "3rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", boxShadow: "0 6px 24px rgba(200,150,62,0.5)", transition: "transform 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                  Đăng ký tham gia →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="ws-body ws-layout" style={{ maxWidth: 1100, margin: "0 auto", padding: "3rem 2rem 5rem", display: "grid", gridTemplateColumns: "1fr 340px", gap: "3rem", alignItems: "start" }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

            {/* Giới thiệu */}
            <section className="ws-reveal">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF8EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📖</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: C.dark, margin: 0 }}>Giới thiệu workshop</h2>
              </div>
              <div style={{ background: "white", borderRadius: 18, padding: "1.75rem 2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)", lineHeight: 1.85, color: "#555", fontSize: "0.9rem" }}>
                <p style={{ margin: "0 0 1rem" }}>Cây mai không chỉ là biểu tượng ngày Tết mà còn là một <strong style={{ color: C.dark }}>loại hình nghệ thuật</strong> sống động, gắn liền với tâm hồn người Việt. Mỗi cành mai được uốn nắn kỳ công đều ẩn chứa triết lý về sự kiên nhẫn, tỉ mỉ và hòa hợp với thiên nhiên.</p>
                <p style={{ margin: 0 }}>Trong workshop này, bạn sẽ được tìm hiểu các <strong style={{ color: C.dark }}>nguyên tắc tạo dáng, kỹ thuật quấn dây</strong> và <em>tự tay uốn một cành mai</em> theo phong cách riêng — dưới sự hướng dẫn trực tiếp của nghệ nhân có hơn 25 năm kinh nghiệm.</p>
              </div>
            </section>

            {/* Học được gì */}
            <section className="ws-reveal" style={{ animationDelay: "0.1s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EEF5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🎯</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: C.dark, margin: 0 }}>Bạn sẽ học được gì?</h2>
              </div>
              <div style={{ background: "white", borderRadius: 18, padding: "1.5rem 2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)" }}>
                {LEARN.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "0.75rem 0", borderBottom: i < LEARN.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#EEF5EE", border: `2px solid ${C.moss}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#3D5A3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <span style={{ fontSize: "0.88rem", color: "#444", lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Hoạt động */}
            <section className="ws-reveal" style={{ animationDelay: "0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEF3E2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🛠️</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: C.dark, margin: 0 }}>Hoạt động trải nghiệm</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {STEPS.map((s, i) => (
                  <div key={i} className="step-card" style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", background: "white", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.05)", transition: "transform 0.2s" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.moss}, #2A4A2B)`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: "0.9rem", fontWeight: 700 }}>{s.n}</div>
                      {i < STEPS.length - 1 && <div style={{ width: 2, height: 24, background: "rgba(61,90,62,0.15)" }} />}
                    </div>
                    <div style={{ paddingTop: "0.3rem" }}>
                      <p style={{ fontWeight: 600, color: C.dark, fontSize: "0.9rem", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}>{s.icon} {s.title}</p>
                      <p style={{ fontSize: "0.82rem", color: "#777", lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Lộ trình học */}
            <section className="ws-reveal" style={{ animationDelay: "0.18s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFF8EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🎓</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: C.dark, margin: 0 }}>Lộ trình học</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {BONSAI_TRACK.map((track, i) => {
                  const isDone = completedWs.includes(track.id);
                  const isOpen = !track.prereq || completedWs.includes(track.prereq);
                  const isActive = isOpen && !isDone;
                  const hasBooking = !!myBookings[track.id] && !isDone;
                  return (
                    <div key={track.id} style={{ background: "white", borderRadius: 18, border: `1.5px solid ${isDone ? track.color + "70" : isActive ? track.color + "90" : "rgba(0,0,0,0.07)"}`, boxShadow: isDone ? `0 2px 14px ${track.color}22` : isActive ? `0 4px 20px ${track.color}22` : "none", opacity: isOpen ? 1 : 0.48, transition: "all 0.3s" }}>
                      <div style={{ padding: "1.2rem 1.5rem", display: "flex", gap: "1.1rem", alignItems: "center" }}>
                        <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: isDone ? `linear-gradient(135deg,${track.color},${track.color}cc)` : isActive ? track.color + "20" : "rgba(0,0,0,0.04)", border: `2px solid ${isDone ? track.color : isActive ? track.color + "80" : "rgba(0,0,0,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isDone ? <svg width="22" height="18" viewBox="0 0 22 18" fill="none"><path d="M2 9L8 15L20 3" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            : isOpen ? <span style={{ fontSize: "1.4rem" }}>{track.icon}</span>
                              : <span style={{ fontSize: "1.1rem" }}>🔒</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.13em", textTransform: "uppercase", color: track.color, background: track.color + "18", padding: "2px 8px", borderRadius: "2rem" }}>{track.level}</span>
                            {isDone && <span style={{ fontSize: "0.62rem", color: "#4CAF50", fontWeight: 700 }}>✓ Hoàn thành</span>}
                            {hasBooking && <span style={{ fontSize: "0.62rem", color: C.moss, fontWeight: 700, background: "#EEF5EE", padding: "1px 7px", borderRadius: "2rem" }}>📅 Đã đăng ký</span>}
                            {isActive && !hasBooking && <span style={{ fontSize: "0.62rem", color: C.gold, fontWeight: 700 }}>▶ Đang mở</span>}
                            {!isOpen && <span style={{ fontSize: "0.62rem", color: "#bbb", fontWeight: 600 }}>🔒 Chưa mở</span>}
                          </div>
                          <p style={{ fontWeight: 700, color: C.dark, fontSize: "0.88rem", margin: "0 0 3px", lineHeight: 1.3 }}>{track.title}</p>
                          <p style={{ fontSize: "0.77rem", color: "#777", margin: 0, lineHeight: 1.55 }}>{track.desc}</p>
                          {hasBooking && (
                            <p style={{ fontSize: "0.7rem", color: C.moss, margin: "4px 0 0", fontWeight: 500 }}>
                              📅 {fmtISO(myBookings[track.id].scheduled_at, parseFloat(track.duration))}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: "0.7rem", color: "#bbb", margin: "0 0 3px" }}>⏱ {track.duration} tiếng</p>
                          <p style={{ fontSize: "0.78rem", fontWeight: 700, color: isDone ? "#4CAF50" : C.gold, margin: "0 0 2px" }}>+{track.pts.toLocaleString("vi-VN")} EXP</p>
                          <p style={{ fontSize: "0.68rem", color: "#bbb", margin: 0 }}>{track.fee}</p>
                        </div>
                      </div>

                      {isActive && (
                        <div style={{ padding: "0 1.5rem 1.2rem" }}>
                          {hasBooking ? (
                            <button disabled style={{ width: "100%", background: "#EEF5EE", color: C.moss, border: `1.5px solid ${C.moss}40`, padding: "0.75rem", borderRadius: "2rem", fontSize: "0.82rem", fontWeight: 700, cursor: "not-allowed", fontFamily: "'Be Vietnam Pro',sans-serif" }}>
                              ✓ Đã đăng ký
                            </button>
                          ) : (
                            <button onClick={() => setRegisterTrack(track)}
                              style={{ width: "100%", background: `linear-gradient(135deg,${track.color},${track.color}cc)`, color: "white", border: "none", padding: "0.75rem", borderRadius: "2rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", boxShadow: `0 4px 16px ${track.color}55`, transition: "transform 0.2s" }}
                              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                              📅 Đăng ký
                            </button>
                          )}
                        </div>
                      )}

                      {isDone && (
                        <div style={{ padding: "0 1.5rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F0F8F0", borderRadius: "2rem", padding: "0.5rem 1rem" }}>
                            <span style={{ fontSize: "1rem" }}>{track.icon}</span>
                            <span style={{ fontSize: "0.77rem", fontWeight: 600, color: C.moss }}>{track.badge}</span>
                          </div>
                        </div>
                      )}
                      {i < BONSAI_TRACK.length - 1 && <div style={{ textAlign: "center", margin: "-4px 0 -4px", color: "#ddd", fontSize: "0.9rem" }}>↓</div>}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Gallery */}
            <section className="ws-reveal" style={{ animationDelay: "0.22s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F0EBE1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📸</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: C.dark, margin: 0 }}>Thư viện ảnh</h2>
              </div>
              <div className="ws-gallery" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.85rem" }}>
                {GALLERY.map((g, i) => (
                  <div key={i} className="gallery-thumb" style={{ height: i === 0 || i === 3 ? 200 : 160 }}>
                    <img src={g.src} alt={g.label} loading="lazy" />
                    <div className="label-overlay">{g.label}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT sidebar */}
          <div className="ws-sidebar" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "sticky", top: 80 }}>

            {/* Info card */}
            <div className="ws-reveal" style={{ background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ background: `linear-gradient(135deg, ${C.moss}, #2A4A2B)`, padding: "1.25rem 1.5rem" }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.6)", margin: "0 0 4px" }}>Thông tin khóa hiện tại</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "white", margin: 0 }}>{activeTrack.title}</p>
              </div>
              <div style={{ padding: "1.25rem 1.5rem" }}>
                {[
                  ["📅", "Lịch học", activeBooking && !completedWs.includes(activeTrack.id) ? fmtISO(activeBooking.scheduled_at, parseFloat(activeTrack.duration)) : "Thứ 7 & Chủ nhật"],
                  ["⏱", "Thời lượng", `${activeTrack.duration} tiếng`],
                  ["👥", "Sĩ số", `Tối đa ${activeTrack.maxPpl} học viên`],
                  ["📍", "Địa điểm", "Làng Mai Bình Lợi"],
                  ["💰", "Học phí", `${activeTrack.fee} / người`],
                ].map(([ic, lb, vl]) => (
                  <div key={lb} style={{ display: "flex", gap: 12, padding: "0.65rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <span style={{ fontSize: "1rem", flexShrink: 0, width: 20, textAlign: "center" }}>{ic}</span>
                    <div>
                      <p style={{ fontSize: "0.65rem", color: "#aaa", margin: "0 0 1px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{lb}</p>
                      <p style={{ fontSize: "0.85rem", color: C.dark, margin: 0, fontWeight: 500 }}>{vl}</p>
                    </div>
                  </div>
                ))}

                {/* QR + button area */}
                {activeBooking && !completedWs.includes(activeTrack.id) ? (
                  <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <button disabled style={{ width: "100%", background: "#EEF5EE", color: C.moss, border: `1.5px solid ${C.moss}50`, padding: "0.85rem", borderRadius: "2rem", fontSize: "0.88rem", fontWeight: 700, cursor: "not-allowed", fontFamily: "'Be Vietnam Pro',sans-serif" }}>
                      ✓ Đã đăng ký khóa học
                    </button>
                    {sidebarQrUrl && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", background: "#F7FAF7", border: `1.5px solid ${C.moss}25`, borderRadius: 16, padding: "1.1rem" }}>
                        <img src={sidebarQrUrl} alt="QR đặt chỗ" style={{ width: 170, height: 170, borderRadius: 10 }} />
                        <p style={{ fontSize: "0.68rem", color: "#aaa", margin: 0, textAlign: "center" }}>Mã #{activeBooking.id} · AES-256 encrypted</p>
                        <button onClick={downloadSidebarQr}
                          style={{ width: "100%", background: `linear-gradient(135deg,${C.gold},#E8A830)`, color: C.dark, border: "none", padding: "0.6rem", borderRadius: "2rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          ⬇ Tải ảnh QR về
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => setRegisterTrack(activeTrack)}
                    style={{ width: "100%", marginTop: "1.25rem", background: `linear-gradient(135deg, ${C.moss}, #2A4A2B)`, color: "white", border: "none", padding: "0.85rem", borderRadius: "2rem", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", boxShadow: "0 4px 16px rgba(61,90,62,0.35)" }}>
                    Đăng ký ngay →
                  </button>
                )}
              </div>
            </div>

            {/* Instructor */}
            <div className="ws-reveal" style={{ background: "white", borderRadius: 20, padding: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)", animationDelay: "0.08s" }}>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, margin: "0 0 1rem" }}>👨‍🌾 Nghệ nhân hướng dẫn</p>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1rem" }}>
                <img src="https://picsum.photos/seed/instructor-batam/100/100" alt="Chú Ba Tâm" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #EEF5EE", flexShrink: 0 }} />
                <div>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 600, color: C.dark, margin: "0 0 3px" }}>Chú Ba Tâm</p>
                  <p style={{ fontSize: "0.72rem", color: C.moss, fontWeight: 600, margin: "0 0 2px" }}>Nghệ nhân bonsai mai</p>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["25+ năm KN", "HCV hội thi tỉnh"].map(t => (
                      <span key={t} style={{ fontSize: "0.6rem", background: "#EEF5EE", color: C.moss, padding: "2px 8px", borderRadius: "2rem", fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.75, margin: 0 }}>
                Chú Ba Tâm có hơn <strong>25 năm kinh nghiệm</strong> tạo dáng mai cảnh và từng tham gia nhiều hội thi sinh vật cảnh cấp tỉnh. Chú nổi tiếng với phong cách uốn "<em>trực quân tử</em>" — cành thẳng, nhánh vươn tự nhiên như khí phách người Nam Bộ.
              </p>
            </div>

            {/* Track progress */}
            {(() => {
              const doneCount = BONSAI_TRACK.filter(t => completedWs.includes(t.id)).length;
              const activeLvl = BONSAI_TRACK.find(t => !completedWs.includes(t.id) && (!t.prereq || completedWs.includes(t.prereq)));
              return (
                <div className="ws-reveal reward-glow" style={{ background: "linear-gradient(135deg,#FFFBF0,#FFF8EE)", borderRadius: 20, padding: "1.5rem", border: "1.5px solid rgba(200,150,62,0.3)", animationDelay: "0.14s" }}>
                  <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.gold, margin: "0 0 1rem" }}>🏅 Tiến trình lộ trình</p>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                      <span style={{ fontSize: "0.72rem", color: "#888", fontWeight: 500 }}>Đã hoàn thành</span>
                      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.1rem", fontWeight: 700, color: C.gold }}>{doneCount}/4</span>
                    </div>
                    <div style={{ height: 8, background: "#f0ebe1", borderRadius: "2rem", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(doneCount / 4) * 100}%`, background: `linear-gradient(90deg,${C.gold},#E8A830)`, borderRadius: "2rem", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem" }}>
                    {BONSAI_TRACK.map(t => (
                      <div key={t.id} title={t.level} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ height: 5, borderRadius: "2rem", background: completedWs.includes(t.id) ? t.color : "#e0d8cc", marginBottom: 3, transition: "background 0.3s" }} />
                        <span style={{ fontSize: "0.52rem", color: completedWs.includes(t.id) ? t.color : "#bbb", fontWeight: 600 }}>{t.level}</span>
                      </div>
                    ))}
                  </div>
                  {activeLvl ? (
                    <>
                      <p style={{ fontSize: "0.7rem", color: "#888", margin: "0 0 0.75rem", fontWeight: 500 }}>Khóa đang mở khoá:</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", background: "rgba(200,150,62,0.1)", borderRadius: 12, padding: "0.85rem 1rem" }}>
                        <span style={{ fontSize: "1.7rem" }}>{activeLvl.icon}</span>
                        <div>
                          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.2rem", fontWeight: 700, color: C.gold, margin: 0, lineHeight: 1 }}>+{activeLvl.pts.toLocaleString("vi-VN")}</p>
                          <p style={{ fontSize: "0.7rem", color: "#8B6010", margin: 0, fontWeight: 500 }}>điểm · {activeLvl.level} · {activeLvl.fee}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "white", borderRadius: 12, padding: "0.75rem 1rem", border: "1px solid rgba(200,150,62,0.2)" }}>
                        <span style={{ fontSize: "1.4rem" }}>{activeLvl.icon}</span>
                        <div>
                          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: C.dark, margin: 0 }}>{activeLvl.badge}</p>
                          <p style={{ fontSize: "0.63rem", color: "#aaa", margin: 0 }}>Huy hiệu mở khoá khi hoàn thành</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "1.25rem 1rem", background: "#EEF5EE", borderRadius: 14 }}>
                      <span style={{ fontSize: "2.2rem" }}>🌟</span>
                      <p style={{ fontFamily: "'Playfair Display',serif", fontSize: "1rem", color: C.moss, fontWeight: 700, margin: "0.5rem 0 0" }}>Hoàn thành cả lộ trình!</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {registerTrack && (
        <RegisterModal
          track={registerTrack}
          onClose={() => setRegisterTrack(null)}
          onSuccess={handleRegisterSuccess}
        />
      )}

      {pendingAchievement && (
        <AchievementPopup achievement={pendingAchievement} onDone={() => setPendingAchievement(null)} />
      )}
    </>
  );
}
