import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import jsQR from "jsqr";
import { C, API_BASE } from "../constants";
import { decryptQR } from "../utils/qrCrypto";
import LogoIcon from "../components/LogoIcon";

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const categoryLabel = {
  tourism: "Du lịch", culture: "Văn hóa", nature: "Thiên nhiên",
  food: "Ẩm thực", workshop: "Workshop", other: "Khác",
};
const categoryColor = {
  tourism: "#2196F3", culture: "#9C27B0", nature: "#4CAF50",
  food: "#FF9800", workshop: "#F44336", other: "#607D8B",
};

// ─── QR SCANNER ───────────────────────────────────────────────────────────────
function QRScanner({ authH }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [mode, setMode] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [resultError, setResultError] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null; rafRef.current = null;
  }, []);
  useEffect(() => () => stopCamera(), [stopCamera]);

  async function verifyDecoded(encryptedStr) {
    setMode("processing"); setResult(null); setResultError(""); setVerifying(true);
    try {
      const decoded = await decryptQR(encryptedStr);
      const isTour = decoded.type === "tour" || Array.isArray(decoded.places);
      const endpoint = isTour
        ? `${API_BASE}/api/v1/admin/tour-bookings/${decoded.bid}`
        : `${API_BASE}/api/v1/admin/workshop-registrations/${decoded.bid}`;
      const res = await fetch(endpoint, { headers: authH });
      if (!res.ok) { setResultError(`Mã đặt chỗ #${decoded.bid} không tồn tại.`); setVerifying(false); setMode("idle"); return; }
      const dbRecord = await res.json();
      const checks = isTour
        ? { bid: dbRecord.bid === decoded.bid, participants: dbRecord.participants === decoded.people, total: dbRecord.total_vnd === decoded.total }
        : { email: dbRecord.user_email === decoded.email, slug: dbRecord.workshop_slug === decoded.slug, participants: dbRecord.participants === decoded.participants };
      setResult({ decoded, dbRecord, checks, allMatch: Object.values(checks).every(Boolean), isTour });
    } catch { setResultError("QR không hợp lệ hoặc đã bị giả mạo."); }
    finally { setVerifying(false); setMode("idle"); }
  }

  function scanImage(imageData, w, h) { const c = jsQR(imageData.data, w, h); return c?.data || null; }

  async function startCamera() {
    setCameraError(""); setResult(null); setResultError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream; setMode("camera");
      requestAnimationFrame(function loop() {
        const video = videoRef.current, canvas = canvasRef.current;
        if (!video || !canvas) { rafRef.current = requestAnimationFrame(loop); return; }
        if (video.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
        canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d"); ctx.drawImage(video, 0, 0);
        const raw = scanImage(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
        if (raw) { stopCamera(); verifyDecoded(raw); } else { rafRef.current = requestAnimationFrame(loop); }
      });
      videoRef.current.srcObject = stream; videoRef.current.play();
    } catch (e) { setCameraError("Không thể truy cập camera: " + e.message); }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setResult(null); setResultError("");
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0);
      const raw = scanImage(ctx.getImageData(0, 0, canvas.width, canvas.height), canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      if (raw) verifyDecoded(raw); else setResultError("Không tìm thấy mã QR trong ảnh.");
    };
    img.src = url; e.target.value = "";
  }

  const sColor = { confirmed: "#4CAF50", pending: "#FF9800", cancelled: "#F44336", completed: "#2196F3" };
  const sLabel = { confirmed: "Đã xác nhận", pending: "Chờ xử lý", cancelled: "Đã huỷ", completed: "Hoàn thành" };

  return (
    <div style={{ background: "white", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: C.dark, margin: "0 0 3px" }}>🔐 Quét & xác thực mã QR</h3>
        <p style={{ fontSize: "0.73rem", color: "#999", margin: 0 }}>Mã hóa AES-256 — chỉ hệ thống mới giải mã được</p>
      </div>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button onClick={startCamera} disabled={mode === "camera" || verifying}
          style={{ flex: 1, padding: "0.7rem", background: mode === "camera" ? "#E8F5E9" : C.moss, color: mode === "camera" ? C.moss : "white", border: `1.5px solid ${C.moss}`, borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          📷 {mode === "camera" ? "Đang quét..." : "Mở camera"}
        </button>
        <label style={{ flex: 1, padding: "0.7rem", background: "white", color: "#555", border: "1.5px solid rgba(0,0,0,0.15)", borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          🖼 Upload ảnh QR
          <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} disabled={verifying} />
        </label>
        {mode === "camera" && (
          <button onClick={() => { stopCamera(); setMode("idle"); }}
            style={{ padding: "0.7rem 1rem", background: "#FFF0F0", color: "#F44336", border: "1.5px solid #F4433640", borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.82rem", fontWeight: 600 }}>
            ✕
          </button>
        )}
      </div>
      {mode === "camera" && (
        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000", aspectRatio: "4/3" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ width: 180, height: 180, border: "2px solid rgba(200,150,62,0.9)", borderRadius: 16, boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)", position: "relative" }}>
              {[{ top: -2, left: -2, borderRight: "none", borderBottom: "none" }, { top: -2, right: -2, borderLeft: "none", borderBottom: "none" }, { bottom: -2, left: -2, borderRight: "none", borderTop: "none" }, { bottom: -2, right: -2, borderLeft: "none", borderTop: "none" }].map((s, i) => (
                <div key={i} style={{ position: "absolute", width: 20, height: 20, border: `3px solid ${C.gold}`, borderRadius: 3, ...s }} />
              ))}
            </div>
          </div>
          <p style={{ position: "absolute", bottom: 12, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", margin: 0 }}>Hướng camera vào mã QR</p>
        </div>
      )}
      {verifying && <div style={{ textAlign: "center", padding: "1rem", color: "#888", fontSize: "0.82rem" }}>🔓 Đang giải mã và xác thực...</div>}
      {cameraError && <div style={{ background: "#FFF0F0", color: "#C0392B", borderRadius: 10, padding: "0.6rem 0.9rem", fontSize: "0.78rem" }}>{cameraError}</div>}
      {resultError && <div style={{ background: "#FFF3CD", color: "#7A4F00", borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.82rem", display: "flex", gap: 8 }}><span>⚠️</span><span>{resultError}</span></div>}
      {result && (
        <div style={{ border: `2px solid ${result.allMatch ? "#4CAF50" : "#F44336"}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ background: result.allMatch ? "#4CAF50" : "#F44336", padding: "0.75rem 1.25rem", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: "1.4rem" }}>{result.allMatch ? "✅" : "❌"}</span>
            <div>
              <p style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>{result.allMatch ? "Xác thực thành công" : "Cảnh báo — thông tin KHÔNG khớp"}</p>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem", margin: 0 }}>{result.isTour ? "🗺️ Tour" : "🎓 Workshop"} · Mã #{result.decoded.bid}</p>
            </div>
          </div>
          <div style={{ padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 2rem" }}>
            {(result.isTour
              ? [["🗓️ Ngày", result.decoded.date || "—", result.dbRecord.tour_date || "—", true], ["👥 Số người", `${result.decoded.people} người`, `${result.dbRecord.participants} người`, result.checks.participants], ["💰 Tổng tiền", result.decoded.total ? `${result.decoded.total.toLocaleString("vi-VN")} đ` : "—", `${(result.dbRecord.total_vnd ?? 0).toLocaleString("vi-VN")} đ`, result.checks.total]]
              : [["👤 Học viên", result.decoded.user, result.dbRecord.user_name, true], ["📧 Email", result.decoded.email, result.dbRecord.user_email, result.checks.email], ["🎓 Khóa học", result.decoded.ws, result.dbRecord.workshop_title, true], ["👥 Số người", `${result.decoded.participants}`, `${result.dbRecord.participants}`, result.checks.participants]]
            ).map(([label, qrVal, dbVal, match]) => (
              <div key={label} style={{ background: dbVal !== null && !match ? "#FFF0F0" : "#FAFAF8", borderRadius: 8, padding: "0.5rem 0.75rem" }}>
                <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#aaa", margin: "0 0 2px", textTransform: "uppercase" }}>{label}</p>
                <p style={{ fontSize: "0.82rem", fontWeight: 600, color: match ? C.dark : "#C0392B", margin: 0 }}>{qrVal}</p>
                {dbVal !== null && <p style={{ fontSize: "0.7rem", color: match ? "#888" : "#C0392B", margin: "1px 0 0" }}>{match ? `✓ DB: ${dbVal}` : `✗ DB: ${dbVal}`}</p>}
              </div>
            ))}
          </div>
          <div style={{ padding: "0 1.25rem 1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.72rem", color: "#aaa", fontWeight: 600 }}>Trạng thái:</span>
            <span style={{ padding: "2px 10px", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: 700, background: (sColor[result.dbRecord.status] ?? "#888") + "22", color: sColor[result.dbRecord.status] ?? "#888" }}>
              {sLabel[result.dbRecord.status] ?? result.dbRecord.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUPER ADMIN DASHBOARD ────────────────────────────────────────────────────
export default function SuperAdminDashboard({ currentUser, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [locations, setLocations] = useState([]);
  const [workshopsList, setWorkshopsList] = useState([]);
  const [wsRegistrations, setWsRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [wsListLoading, setWsListLoading] = useState(false);
  const [wsLoading, setWsLoading] = useState(false);
  const [wsSearch, setWsSearch] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "khach" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const DEFAULT_BG = "#F4F6F9";
  const [bgColor, setBgColor] = useState(() => localStorage.getItem("sa_bg_color") || DEFAULT_BG);
  const [showBgPicker, setShowBgPicker] = useState(false);

  const changeBgColor = (color) => {
    setBgColor(color);
    localStorage.setItem("sa_bg_color", color);
  };

  const DEFAULT_BANNER = C.moss;
  const [bannerColor, setBannerColor] = useState(() => localStorage.getItem("sa_banner_color") || DEFAULT_BANNER);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  const changeBannerColor = (color) => {
    setBannerColor(color);
    localStorage.setItem("sa_banner_color", color);
  };

  // Darken a hex color for the gradient's end stop
  const darken = (hex, amt = 0.35) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.round(v * (1 - amt)));
    return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  };

  const token = localStorage.getItem("access_token");
  const authH = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, lRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/users`, { headers: authH }),
        fetch(`${API_BASE}/api/v1/admin/activity-logs?limit=80`, { headers: authH }),
        fetch(`${API_BASE}/api/v1/admin/stats`, { headers: authH }),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (lRes.ok) setLogs(await lRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } finally { setLoading(false); }
  }, []); // eslint-disable-line

  const loadLocations = useCallback(async () => {
    setLocLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/locations`, { headers: authH });
      if (res.ok) setLocations(await res.json());
    } finally { setLocLoading(false); }
  }, []); // eslint-disable-line

  const loadWorkshopsList = useCallback(async () => {
    setWsListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/workshops-list`, { headers: authH });
      if (res.ok) setWorkshopsList(await res.json());
    } finally { setWsListLoading(false); }
  }, []); // eslint-disable-line

  const loadWorkshopRegs = useCallback(async () => {
    setWsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/workshop-registrations`, { headers: authH });
      if (res.ok) setWsRegistrations(await res.json());
    } finally { setWsLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => {
    load();
    loadLocations();
    loadWorkshopsList();
  }, [load]); // eslint-disable-line

  useEffect(() => {
    if (tab === "workshops") loadWorkshopRegs();
  }, [tab]); // eslint-disable-line

  const handleToggleLocation = async (loc) => {
    setActionLoading("loc_" + loc.id);
    const res = await fetch(`${API_BASE}/api/v1/admin/locations/${loc.id}`, {
      method: "PATCH", headers: authH,
      body: JSON.stringify({ is_active: !loc.is_active }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLocations(prev => prev.map(l => l.id === loc.id ? updated : l));
    }
    setActionLoading(null);
  };

  const handleAddUser = async (e) => {
    e.preventDefault(); setAddError(""); setAddLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users`, { method: "POST", headers: authH, body: JSON.stringify(addForm) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || "Lỗi tạo tài khoản"); }
      setShowAddUser(false); setAddForm({ name: "", email: "", password: "", is_admin: false, is_super_admin: false }); load();
    } catch (err) { setAddError(err.message); }
    finally { setAddLoading(false); }
  };

  const handleChangeRole = async (u, newRole) => {
    setActionLoading(u.id + "_role");
    await fetch(`${API_BASE}/api/v1/admin/users/${u.id}`, { method: "PATCH", headers: authH, body: JSON.stringify({ role: newRole }) });
    setActionLoading(null); load();
  };

  const handleToggleActive = async (u) => {
    setActionLoading(u.id + "_active");
    await fetch(`${API_BASE}/api/v1/admin/users/${u.id}`, { method: "PATCH", headers: authH, body: JSON.stringify({ is_active: !u.is_active }) });
    setActionLoading(null); load();
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Xóa tài khoản ${u.email}?`)) return;
    setActionLoading(u.id + "_del");
    await fetch(`${API_BASE}/api/v1/admin/users/${u.id}`, { method: "DELETE", headers: authH });
    setActionLoading(null); load();
  };

  // ─── CHART ─────────────────────────────────────────────────────────────────
  function DailyChart({ data }) {
    if (!data?.length) return <div style={{ color: "#bbb", textAlign: "center", padding: "2rem", fontSize: "0.85rem" }}>Chưa có dữ liệu</div>;
    const W = 560, H = 140, P = { t: 10, r: 10, b: 28, l: 36 };
    const cw = W - P.l - P.r, ch = H - P.t - P.b;
    const maxV = Math.max(...data.map(d => d.count), 1);
    const xs = data.map((_, i) => P.l + (i / Math.max(data.length - 1, 1)) * cw);
    const ys = data.map(d => P.t + ch - (d.count / maxV) * ch);
    const path = data.map((_, i) => `${i === 0 ? "M" : "L"}${xs[i].toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const area = `${path} L${xs[xs.length - 1].toFixed(1)},${(P.t + ch).toFixed(1)} L${P.l.toFixed(1)},${(P.t + ch).toFixed(1)} Z`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
        {Array.from({ length: 5 }, (_, i) => {
          const y = P.t + ch - (i / 4) * ch;
          return <g key={i}><line x1={P.l} x2={W - P.r} y1={y} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" /><text x={P.l - 5} y={y + 4} textAnchor="end" fontSize="9" fill="#bbb">{Math.round((i / 4) * maxV)}</text></g>;
        })}
        <defs><linearGradient id="cFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.moss} stopOpacity="0.18" /><stop offset="100%" stopColor={C.moss} stopOpacity="0.01" /></linearGradient></defs>
        <path d={area} fill="url(#cFill)" />
        <path d={path} fill="none" stroke={C.moss} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => <circle key={i} cx={xs[i]} cy={ys[i]} r="3" fill={C.moss} />)}
        {data.map((d, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0 ? <text key={i} x={xs[i]} y={H - 6} textAnchor="middle" fontSize="9" fill="#bbb">{d.date?.slice(5)}</text> : null)}
      </svg>
    );
  }

  const actionLog = { login: "Đăng nhập", logout: "Đăng xuất", register: "Đăng ký", admin_create_user: "Tạo tài khoản", admin_update_user: "Cập nhật", admin_delete_user: "Xóa tài khoản" };
  const actionColor = { login: "#4CAF50", logout: "#FF7043", register: "#2196F3", admin_create_user: "#9C27B0", admin_update_user: "#FF9800", admin_delete_user: "#F44336" };
  const statusColor = { confirmed: "#4CAF50", pending: "#FF9800", cancelled: "#F44336", completed: "#2196F3" };
  const statusLabel = { confirmed: "Đã xác nhận", pending: "Chờ xử lý", cancelled: "Đã huỷ", completed: "Hoàn thành" };

  const S = {
    page: { minHeight: "100vh", background: bgColor, fontFamily: "'Be Vietnam Pro', sans-serif" },
    nav: { background: "white", borderBottom: "1px solid rgba(0,0,0,0.07)", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100 },
    body: { maxWidth: 1200, margin: "0 auto", padding: "2rem 1.5rem" },
    tabs: { display: "flex", gap: 6, marginBottom: "1.5rem", background: "white", borderRadius: 14, padding: "0.4rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflowX: "auto" },
    tab: (a) => ({ padding: "0.55rem 0.9rem", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.8rem", fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.2s", background: a ? C.moss : "transparent", color: a ? "white" : "#888" }),
    card: { background: "white", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" },
    th: { textAlign: "left", padding: "0.7rem 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid rgba(0,0,0,0.05)" },
    td: { padding: "0.8rem 1rem", fontSize: "0.82rem", color: C.dark, borderBottom: "1px solid rgba(0,0,0,0.04)" },
    btnSm: (color, bg) => ({ padding: "0.3rem 0.7rem", borderRadius: 8, border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, color, background: bg, fontFamily: "'Be Vietnam Pro',sans-serif" }),
    roleTag: (r) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: "2rem", fontSize: "0.65rem", fontWeight: 700, background: r === "super_admin" ? "#E8F5E9" : r === "admin" ? "#EDE7F6" : r === "thanh_vien" ? "#E3F2FD" : "#FFF3E0", color: r === "super_admin" ? C.moss : r === "admin" ? "#7E57C2" : r === "thanh_vien" ? "#1565C0" : "#E65100" }),
  };

  const TABS = [
    ["overview", "📊 Tổng quan"],
    ["places", "🏞️ Địa điểm"],
    ["map", "🗺️ Bản đồ"],
    ["events", "📅 Sự kiện"],
    ["workshops", "🎓 Workshop"],
    ["users", "👥 Tài khoản"],
    ["logs", "📋 Lịch sử"],
  ];

  // ─── OVERVIEW TAB ─────────────────────────────────────────────────────────
  const OverviewTab = () => {
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Chào buổi sáng" : hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
    const topLocations = [...locations].sort((a, b) => b.checkin_count - a.checkin_count).slice(0, 3);
    const upcomingEvents = workshopsList.filter(w => w.is_active).slice(0, 3);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Greeting banner */}
        <div style={{ background: `linear-gradient(135deg, ${bannerColor} 0%, ${darken(bannerColor)} 100%)`, borderRadius: 20, padding: "1.75rem 2rem", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div>
            <p style={{ fontSize: "0.8rem", opacity: 0.75, margin: "0 0 4px", letterSpacing: "0.05em" }}>👋 {greet},</p>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.6rem", margin: "0 0 6px", fontWeight: 700 }}>
              {currentUser?.name || "Admin"}
            </h2>
            <p style={{ fontSize: "0.78rem", opacity: 0.65, margin: 0 }}>
              {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ fontSize: "4rem", opacity: 0.15 }}>🌿</div>

          {/* Banner color picker */}
          <button onClick={() => setShowBannerPicker(v => !v)} title="Đổi màu nền banner"
            style={{ position: "absolute", top: 12, right: 14, width: 30, height: 30, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            🎨
          </button>
          {showBannerPicker && (
            <>
              <div onClick={() => setShowBannerPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 150 }} />
              <div style={{ position: "absolute", top: 48, right: 14, zIndex: 160, background: "white", borderRadius: 14, padding: "1rem", width: 230, boxShadow: "0 12px 40px rgba(0,0,0,0.18)", color: C.dark }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 700, color: C.dark, margin: "0 0 10px" }}>🎨 Màu nền banner</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 7, marginBottom: 12 }}>
                  {[DEFAULT_BANNER, "#1565C0", "#6A1B9A", "#C62828", "#E65100", "#00695C", "#37474F", "#AD1457", "#4527A0", "#2E7D32", "#B8860B", "#212121"].map(c => (
                    <button key={c} onClick={() => changeBannerColor(c)} title={c}
                      style={{ width: 28, height: 28, borderRadius: 8, cursor: "pointer", background: `linear-gradient(135deg, ${c} 0%, ${darken(c)} 100%)`, border: bannerColor.toUpperCase() === c.toUpperCase() ? `2.5px solid ${C.gold}` : "1.5px solid rgba(0,0,0,0.12)" }} />
                  ))}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", color: "#555", fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
                  <input type="color" value={bannerColor} onChange={e => changeBannerColor(e.target.value)}
                    style={{ width: 34, height: 26, border: "none", padding: 0, background: "none", cursor: "pointer" }} />
                  Màu tùy chỉnh
                </label>
                <button onClick={() => changeBannerColor(DEFAULT_BANNER)}
                  style={{ width: "100%", padding: "0.45rem", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color: "#888", cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.72rem", fontWeight: 600 }}>
                  ↺ Khôi phục mặc định
                </button>
              </div>
            </>
          )}
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          {[
            { icon: "👁️", label: "Lượt truy cập hôm nay", value: stats?.visits_today ?? 0, color: C.moss },
            { icon: "👤", label: "Người dùng hoạt động", value: stats?.active_users ?? 0, color: "#2196F3" },
            { icon: "📍", label: "Tổng địa điểm", value: locations.length || (stats?.total_users ?? 0), color: C.gold },
            { icon: "🎓", label: "Tổng lượt truy cập", value: stats?.total_visits ?? 0, color: "#9C27B0" },
          ].map(s => (
            <div key={s.label} style={{ background: "white", borderRadius: 16, padding: "1.25rem 1.5rem", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: C.dark, lineHeight: 1 }}>{s.value.toLocaleString("vi-VN")}</div>
              <div style={{ fontSize: "0.73rem", color: "#888", marginTop: 5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart + Top locations */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1rem" }}>
          <div style={S.card}>
            <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark, margin: "0 0 1.25rem" }}>📈 Lượt truy cập 30 ngày qua</h3>
            <DailyChart data={stats?.daily_visits} />
          </div>

          <div style={S.card}>
            <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark, margin: "0 0 1rem" }}>🏆 Top địa điểm check-in</h3>
            {topLocations.length === 0 ? (
              <p style={{ color: "#bbb", fontSize: "0.82rem" }}>Chưa có dữ liệu</p>
            ) : topLocations.map((loc, i) => (
              <div key={loc.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0.65rem 0", borderBottom: i < topLocations.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i === 0 ? "#FFD70022" : i === 1 ? "#C0C0C022" : "#CD7F3222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", fontWeight: 700, color: i === 0 ? "#B8860B" : i === 1 ? "#888" : "#CD7F32", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>{loc.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#aaa" }}>{loc.checkin_count.toLocaleString()} lượt check-in</div>
                </div>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: "2rem", background: (categoryColor[loc.category] ?? "#607D8B") + "20", color: categoryColor[loc.category] ?? "#607D8B" }}>
                  {categoryLabel[loc.category] ?? loc.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity + Upcoming events */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={S.card}>
            <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark, margin: "0 0 1rem" }}>🔥 Hoạt động gần đây</h3>
            {logs.slice(0, 6).map(log => (
              <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "0.55rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: actionColor[log.action] || "#ccc", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.dark }}>{log.user_name || "Ẩn danh"}</span>
                  <span style={{ fontSize: "0.78rem", color: "#888" }}> — {actionLog[log.action] || log.action}</span>
                  {log.detail && <div style={{ fontSize: "0.72rem", color: "#aaa", marginTop: 1 }}>{log.detail}</div>}
                </div>
                <span style={{ fontSize: "0.68rem", color: "#ccc", flexShrink: 0 }}>{new Date(log.created_at).toLocaleString("vi-VN")}</span>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark, margin: "0 0 1rem" }}>📅 Sự kiện / Workshop</h3>
            {upcomingEvents.length === 0 ? (
              <p style={{ color: "#bbb", fontSize: "0.82rem" }}>Chưa có dữ liệu</p>
            ) : upcomingEvents.map(ws => {
              const pct = Math.min(100, Math.round((ws.confirmed_count / Math.max(ws.max_participants, 1)) * 100));
              return (
                <div key={ws.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>{ws.title}</span>
                    <span style={{ fontSize: "0.72rem", color: "#888" }}>{ws.confirmed_count}/{ws.max_participants}</span>
                  </div>
                  <div style={{ background: "#F0F0F0", borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#F44336" : pct >= 70 ? "#FF9800" : C.moss, borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#aaa", marginTop: 3 }}>{ws.location_name} · {ws.duration_hours}h · {ws.price_vnd.toLocaleString("vi-VN")} đ</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── PLACES TAB ───────────────────────────────────────────────────────────
  const PlacesTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 3px" }}>Quản lý địa điểm</h2>
          <p style={{ fontSize: "0.78rem", color: "#888", margin: 0 }}>{locations.length} địa điểm · {locations.filter(l => l.is_active).length} đang hoạt động</p>
        </div>
        <button onClick={loadLocations} style={{ padding: "0.5rem 1rem", background: C.moss, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
          ↻ Tải lại
        </button>
      </div>

      {locLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#bbb" }}>Đang tải...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {locations.map(loc => (
            <div key={loc.id} style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", opacity: loc.is_active ? 1 : 0.6, transition: "opacity 0.2s" }}>
              {/* Card image placeholder */}
              {loc.image_url ? (
                <div style={{ height: 160, overflow: "hidden" }}>
                  <img src={loc.image_url} alt={loc.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ height: 100, background: `linear-gradient(135deg, ${categoryColor[loc.category] ?? "#607D8B"}33 0%, ${categoryColor[loc.category] ?? "#607D8B"}11 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>
                  {loc.category === "tourism" ? "🏖️" : loc.category === "culture" ? "🏛️" : loc.category === "nature" ? "🌿" : loc.category === "food" ? "🍜" : loc.category === "workshop" ? "🎓" : "📍"}
                </div>
              )}

              <div style={{ padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: C.dark, margin: 0 }}>{loc.name}</h3>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "2rem", background: (categoryColor[loc.category] ?? "#607D8B") + "20", color: categoryColor[loc.category] ?? "#607D8B", flexShrink: 0, marginLeft: 6 }}>
                    {categoryLabel[loc.category] ?? loc.category}
                  </span>
                </div>

                <p style={{ fontSize: "0.72rem", color: "#aaa", margin: "0 0 10px" }}>{loc.address}</p>

                <div style={{ display: "flex", gap: "1.5rem", marginBottom: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: C.moss }}>{loc.checkin_count.toLocaleString()}</div>
                    <div style={{ fontSize: "0.65rem", color: "#aaa" }}>Check-in</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: C.gold }}>
                      {loc.is_active ? "✓" : "✕"}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "#aaa" }}>Trạng thái</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#555" }}>{loc.latitude.toFixed(4)}</div>
                    <div style={{ fontSize: "0.65rem", color: "#aaa" }}>Vĩ độ</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ padding: "3px 10px", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: 700, background: loc.is_active ? "#E8F5E9" : "#FFEBEE", color: loc.is_active ? "#4CAF50" : "#F44336" }}>
                    {loc.is_active ? "● Đang hoạt động" : "● Đã ẩn"}
                  </span>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setTab("map")}
                    style={{ padding: "0.3rem 0.7rem", borderRadius: 8, border: `1px solid ${C.moss}40`, background: "transparent", color: C.moss, cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif" }}>
                    🗺️ Xem
                  </button>
                  <button disabled={actionLoading === "loc_" + loc.id} onClick={() => handleToggleLocation(loc)}
                    style={{ padding: "0.3rem 0.7rem", borderRadius: 8, border: "none", background: loc.is_active ? "#FFF3CD" : "#E8F5E9", color: loc.is_active ? "#E65100" : "#2E7D32", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif" }}>
                    {actionLoading === "loc_" + loc.id ? "..." : loc.is_active ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ─── MAP TAB ──────────────────────────────────────────────────────────────
  const MapTab = () => {
    const center = locations.length > 0
      ? [locations.reduce((s, l) => s + l.latitude, 0) / locations.length, locations.reduce((s, l) => s + l.longitude, 0) / locations.length]
      : [10.8231, 106.6297];

    const makeIcon = (color) => L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:rotate(-45deg)"></div>`,
      iconSize: [28, 28], iconAnchor: [14, 28],
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 3px" }}>Bản đồ địa điểm</h2>
            <p style={{ fontSize: "0.78rem", color: "#888", margin: 0 }}>Nhấp vào điểm đánh dấu để xem thông tin</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(categoryLabel).map(([k, v]) => (
              <span key={k} style={{ fontSize: "0.68rem", fontWeight: 600, padding: "3px 9px", borderRadius: "2rem", background: (categoryColor[k] ?? "#607D8B") + "20", color: categoryColor[k] ?? "#607D8B" }}>
                {v}
              </span>
            ))}
          </div>
        </div>

        {locLoading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#bbb" }}>Đang tải...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selectedLocation ? "1fr 300px" : "1fr", gap: "1rem" }}>
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.08)", height: 520 }}>
              <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locations.map(loc => (
                  <Marker
                    key={loc.id}
                    position={[loc.latitude, loc.longitude]}
                    icon={makeIcon(loc.is_active ? (categoryColor[loc.category] ?? C.moss) : "#aaa")}
                    eventHandlers={{ click: () => setSelectedLocation(loc) }}
                  >
                    <Popup>
                      <div style={{ fontFamily: "'Be Vietnam Pro',sans-serif", minWidth: 160 }}>
                        <strong style={{ fontSize: "0.85rem", color: C.dark }}>{loc.name}</strong>
                        <p style={{ fontSize: "0.72rem", color: "#888", margin: "3px 0" }}>{loc.address}</p>
                        <p style={{ fontSize: "0.72rem", margin: "3px 0" }}>📍 {loc.checkin_count} check-in</p>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: "2rem", background: (categoryColor[loc.category] ?? "#607D8B") + "20", color: categoryColor[loc.category] ?? "#607D8B" }}>
                          {categoryLabel[loc.category] ?? loc.category}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {selectedLocation && (
              <div style={{ ...S.card, height: "fit-content" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: C.dark, margin: 0 }}>{selectedLocation.name}</h3>
                  <button onClick={() => setSelectedLocation(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "1.1rem", lineHeight: 1 }}>✕</button>
                </div>
                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "2rem", background: (categoryColor[selectedLocation.category] ?? "#607D8B") + "20", color: categoryColor[selectedLocation.category] ?? "#607D8B", display: "inline-block", marginBottom: 10 }}>
                  {categoryLabel[selectedLocation.category] ?? selectedLocation.category}
                </span>
                {[
                  ["📍 Địa chỉ", selectedLocation.address],
                  ["📐 Tọa độ", `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`],
                  ["✅ Check-in", `${selectedLocation.checkin_count.toLocaleString()} lượt`],
                  ["📅 Tạo lúc", new Date(selectedLocation.created_at).toLocaleDateString("vi-VN")],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)", fontSize: "0.78rem" }}>
                    <span style={{ color: "#888" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: C.dark, textAlign: "right", maxWidth: 160 }}>{val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <span style={{ padding: "3px 10px", borderRadius: "2rem", fontSize: "0.7rem", fontWeight: 700, background: selectedLocation.is_active ? "#E8F5E9" : "#FFEBEE", color: selectedLocation.is_active ? "#4CAF50" : "#F44336" }}>
                    {selectedLocation.is_active ? "● Đang hoạt động" : "● Đã ẩn"}
                  </span>
                </div>
                <button disabled={actionLoading === "loc_" + selectedLocation.id} onClick={() => handleToggleLocation(selectedLocation)}
                  style={{ width: "100%", marginTop: 12, padding: "0.55rem", borderRadius: 10, border: "none", background: selectedLocation.is_active ? "#FFF3CD" : "#E8F5E9", color: selectedLocation.is_active ? "#E65100" : "#2E7D32", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "'Be Vietnam Pro',sans-serif" }}>
                  {selectedLocation.is_active ? "Ẩn địa điểm" : "Hiện địa điểm"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ─── EVENTS TAB ───────────────────────────────────────────────────────────
  const EventsTab = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 3px" }}>Quản lý sự kiện</h2>
          <p style={{ fontSize: "0.78rem", color: "#888", margin: 0 }}>Các workshop & sự kiện đã tạo</p>
        </div>
        <button onClick={loadWorkshopsList} style={{ padding: "0.5rem 1rem", background: C.moss, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
          ↻ Tải lại
        </button>
      </div>

      {wsListLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#bbb" }}>Đang tải...</div>
      ) : (
        <>
          {/* Table */}
          <div style={S.card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Sự kiện", "Địa điểm", "Thời lượng", "Đăng ký", "Tiến độ", "Giá", "Trạng thái"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workshopsList.map(ws => {
                    const pct = Math.min(100, Math.round((ws.confirmed_count / Math.max(ws.max_participants, 1)) * 100));
                    return (
                      <tr key={ws.id} className="admin-row">
                        <td style={S.td}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{ws.title}</div>
                          <div style={{ fontSize: "0.68rem", color: "#aaa", fontFamily: "monospace" }}>{ws.slug}</div>
                        </td>
                        <td style={{ ...S.td, fontSize: "0.78rem" }}>{ws.location_name || "—"}</td>
                        <td style={{ ...S.td, fontSize: "0.78rem" }}>{ws.duration_hours}h</td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: C.dark }}>{ws.confirmed_count}</div>
                          <div style={{ fontSize: "0.68rem", color: "#aaa" }}>/ {ws.max_participants} chỗ</div>
                        </td>
                        <td style={{ ...S.td, minWidth: 140 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, background: "#F0F0F0", borderRadius: 4, height: 8, overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#F44336" : pct >= 70 ? "#FF9800" : C.moss, borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: pct >= 90 ? "#F44336" : pct >= 70 ? "#FF9800" : C.moss, minWidth: 30 }}>{pct}%</span>
                          </div>
                          <div style={{ fontSize: "0.68rem", color: "#aaa", marginTop: 2 }}>{ws.confirmed_count}/{ws.max_participants} người</div>
                        </td>
                        <td style={{ ...S.td, fontSize: "0.78rem" }}>
                          {ws.price_vnd === 0 ? <span style={{ color: "#4CAF50", fontWeight: 600 }}>Miễn phí</span> : `${ws.price_vnd.toLocaleString("vi-VN")} đ`}
                        </td>
                        <td style={S.td}>
                          <span style={{ padding: "2px 8px", borderRadius: "2rem", fontSize: "0.65rem", fontWeight: 700, background: ws.is_active ? "#E8F5E9" : "#FFEBEE", color: ws.is_active ? "#4CAF50" : "#F44336" }}>
                            {ws.is_active ? "Hoạt động" : "Đã ẩn"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: "1rem" }}>
            {workshopsList.filter(w => w.is_active).map(ws => {
              const pct = Math.min(100, Math.round((ws.confirmed_count / Math.max(ws.max_participants, 1)) * 100));
              return (
                <div key={ws.id} style={{ ...S.card, borderTop: `3px solid ${pct >= 90 ? "#F44336" : pct >= 70 ? "#FF9800" : C.moss}` }}>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: C.dark, marginBottom: 4 }}>{ws.title}</div>
                  <div style={{ fontSize: "0.72rem", color: "#aaa", marginBottom: 12 }}>
                    {ws.location_name} · {ws.duration_hours}h · {ws.points_reward} điểm thưởng
                  </div>
                  <div style={{ background: "#F0F0F0", borderRadius: 6, height: 10, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#F44336" : pct >= 70 ? "#FF9800" : C.moss, borderRadius: 6, transition: "width 0.6s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ fontWeight: 700, color: pct >= 90 ? "#F44336" : pct >= 70 ? "#FF9800" : C.moss }}>{ws.confirmed_count} / {ws.max_participants} người</span>
                    <span style={{ color: "#aaa" }}>{pct}% đầy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // ─── WORKSHOPS TAB ────────────────────────────────────────────────────────
  const WorkshopsTab = () => {
    const filtered = wsRegistrations.filter(r => {
      if (!wsSearch) return true;
      const s = wsSearch.toLowerCase();
      return r.user_name.toLowerCase().includes(s) || r.user_email.toLowerCase().includes(s) || r.workshop_title.toLowerCase().includes(s);
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <QRScanner authH={authH} />

        {/* Workshop summary cards */}
        {workshopsList.length > 0 && (
          <div style={S.card}>
            <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark, margin: "0 0 1rem" }}>🎓 Danh sách workshop</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Tên workshop", "Người hướng dẫn/ĐĐ", "Thời lượng", "Số chỗ", "Điểm", "Trạng thái"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {workshopsList.map(ws => (
                    <tr key={ws.id} className="admin-row">
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{ws.title}</div>
                        <div style={{ fontSize: "0.68rem", color: "#aaa", fontFamily: "monospace" }}>{ws.slug}</div>
                      </td>
                      <td style={{ ...S.td, fontSize: "0.78rem" }}>{ws.location_name || "—"}</td>
                      <td style={{ ...S.td, fontSize: "0.78rem" }}>{ws.duration_hours}h</td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{ws.confirmed_count}/{ws.max_participants}</div>
                        <div style={{ background: "#F0F0F0", borderRadius: 3, height: 4, marginTop: 4, width: 60, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, (ws.confirmed_count / Math.max(ws.max_participants, 1)) * 100)}%`, height: "100%", background: C.moss }} />
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: "0.78rem" }}>{ws.points_reward} điểm</td>
                      <td style={S.td}>
                        <span style={{ padding: "2px 8px", borderRadius: "2rem", fontSize: "0.65rem", fontWeight: 700, background: ws.is_active ? "#E8F5E9" : "#FFEBEE", color: ws.is_active ? "#4CAF50" : "#F44336" }}>
                          {ws.is_active ? "Hoạt động" : "Ẩn"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registrations */}
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: C.dark, margin: "0 0 2px" }}>📋 Danh sách đăng ký</h3>
              <p style={{ fontSize: "0.72rem", color: "#aaa", margin: 0 }}>{filtered.length} / {wsRegistrations.length} đăng ký</p>
            </div>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              <input value={wsSearch} onChange={e => setWsSearch(e.target.value)} placeholder="Tìm tên, email, khóa học..."
                style={{ padding: "0.5rem 0.9rem", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 10, fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.82rem", outline: "none", width: 220 }} />
              <button onClick={loadWorkshopRegs} style={{ padding: "0.5rem 1rem", background: C.moss, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
                ↻
              </button>
            </div>
          </div>

          {wsLoading ? (
            <div style={{ textAlign: "center", padding: "2.5rem", color: "#bbb" }}>Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2.5rem", color: "#bbb" }}>
              {wsRegistrations.length === 0 ? "Chưa có đăng ký nào." : "Không tìm thấy kết quả."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["#", "Học viên", "Khóa học", "Thời gian", "Người", "Trạng thái", "Đăng ký lúc"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="admin-row">
                      <td style={S.td}><span style={{ color: "#bbb", fontWeight: 700 }}>#{r.id}</span></td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{r.user_name}</div>
                        <div style={{ fontSize: "0.72rem", color: "#aaa" }}>{r.user_email}</div>
                      </td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{r.workshop_title}</div>
                        <div style={{ fontSize: "0.68rem", color: "#aaa", fontFamily: "monospace" }}>{r.workshop_slug}</div>
                      </td>
                      <td style={{ ...S.td, fontSize: "0.75rem" }}>{new Date(r.scheduled_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>{r.participants}</td>
                      <td style={S.td}>
                        <span style={{ padding: "2px 8px", borderRadius: "2rem", fontSize: "0.65rem", fontWeight: 700, background: (statusColor[r.status] ?? "#888") + "22", color: statusColor[r.status] ?? "#888" }}>
                          {statusLabel[r.status] ?? r.status}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontSize: "0.72rem", color: "#aaa" }}>{new Date(r.created_at).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <style>{`
        .admin-row:hover td { background: #FAFBFF !important; }
        .admin-input { width:100%; padding:0.6rem 0.85rem; border:1.5px solid rgba(0,0,0,0.12); border-radius:10px; font-family:'Be Vietnam Pro',sans-serif; font-size:0.85rem; outline:none; transition:border 0.2s; }
        .admin-input:focus { border-color: #3D5A3E; }
        .leaflet-container { z-index: 1; }
      `}</style>

      <nav style={S.nav}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoIcon />
          <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, color: C.moss, fontSize: "1rem" }}>BÌNH LỢI</span>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, background: C.moss, color: "white", padding: "2px 8px", borderRadius: "2rem", letterSpacing: "0.08em" }}>SUPER ADMIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowBgPicker(v => !v)} title="Chỉnh màu nền"
              style={{ width: 34, height: 34, borderRadius: "50%", border: "1.5px solid rgba(0,0,0,0.12)", background: bgColor, cursor: "pointer", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
              🎨
            </button>
            {showBgPicker && (
              <>
                <div onClick={() => setShowBgPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 150 }} />
                <div style={{ position: "absolute", top: 42, right: 0, zIndex: 160, background: "white", borderRadius: 14, padding: "1rem", width: 230, boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}>
                  <p style={{ fontSize: "0.75rem", fontWeight: 700, color: C.dark, margin: "0 0 10px" }}>🎨 Màu nền dashboard</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 7, marginBottom: 12 }}>
                    {[DEFAULT_BG, "#FFFFFF", "#FDF6EC", "#EEF3EE", "#E8F0FE", "#FCEEF0", "#F3EEFB", "#FFF8E1", "#E0F2F1", "#ECEFF1", "#2B2B33", "#1E2A22"].map(c => (
                      <button key={c} onClick={() => changeBgColor(c)} title={c}
                        style={{ width: 28, height: 28, borderRadius: 8, cursor: "pointer", background: c, border: bgColor.toUpperCase() === c.toUpperCase() ? `2.5px solid ${C.moss}` : "1.5px solid rgba(0,0,0,0.12)" }} />
                    ))}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", color: "#555", fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
                    <input type="color" value={bgColor} onChange={e => changeBgColor(e.target.value)}
                      style={{ width: 34, height: 26, border: "none", padding: 0, background: "none", cursor: "pointer" }} />
                    Màu tùy chỉnh
                  </label>
                  <button onClick={() => changeBgColor(DEFAULT_BG)}
                    style={{ width: "100%", padding: "0.45rem", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", background: "transparent", color: "#888", cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.72rem", fontWeight: 600 }}>
                    ↺ Khôi phục mặc định
                  </button>
                </div>
              </>
            )}
          </div>
          <span style={{ fontSize: "0.82rem", color: "#888" }}>{currentUser?.email}</span>
          <button onClick={onLogout} style={{ padding: "0.4rem 1rem", borderRadius: 20, border: `1.5px solid ${C.rust}`, background: "transparent", color: C.rust, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
            Đăng xuất
          </button>
        </div>
      </nav>

      <div style={S.body}>
        <div style={S.tabs}>
          {TABS.map(([k, lbl]) => (
            <button key={k} style={S.tab(tab === k)} onClick={() => setTab(k)}>{lbl}</button>
          ))}
        </div>

        {loading && !["places", "map", "events", "workshops"].includes(tab) ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#bbb" }}>Đang tải...</div>
        ) : tab === "overview" ? (
          <OverviewTab />
        ) : tab === "places" ? (
          <PlacesTab />
        ) : tab === "map" ? (
          <MapTab />
        ) : tab === "events" ? (
          <EventsTab />
        ) : tab === "workshops" ? (
          <WorkshopsTab />
        ) : tab === "users" ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 3px" }}>Quản lý tài khoản</h2>
                <p style={{ fontSize: "0.78rem", color: "#888", margin: 0 }}>{users.length} tài khoản</p>
              </div>
              <button onClick={() => setShowAddUser(true)} style={{ padding: "0.55rem 1.25rem", background: C.moss, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.82rem", fontWeight: 600 }}>
                + Thêm tài khoản
              </button>
            </div>
            <div style={S.card}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>{["ID", "Họ tên", "Email", "Vai trò", "Trạng thái", "Điểm", "Hành động"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="admin-row">
                        <td style={S.td}><span style={{ color: "#bbb", fontWeight: 600 }}>#{u.id}</span></td>
                        <td style={S.td}>{u.name}</td>
                        <td style={S.td}><span style={{ fontSize: "0.78rem" }}>{u.email}</span></td>
                        <td style={S.td}>
                          <span style={S.roleTag(u.role || (u.is_super_admin ? "super_admin" : u.is_admin ? "admin" : "khach"))}>
                            {u.role === "super_admin" ? "🛡️ Super Admin" : u.role === "admin" ? "⚙️ Admin" : u.role === "thanh_vien" ? "✅ Thành viên" : "👤 Khách"}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{ padding: "2px 8px", borderRadius: "2rem", fontSize: "0.65rem", fontWeight: 700, background: u.is_active ? "#E8F5E9" : "#FFEBEE", color: u.is_active ? "#4CAF50" : "#F44336" }}>
                            {u.is_active ? "Hoạt động" : "Khóa"}
                          </span>
                        </td>
                        <td style={S.td}>{u.points.toLocaleString("vi-VN")}</td>
                        <td style={S.td}>
                          {!u.is_super_admin && (
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <select
                                value={u.role || "khach"}
                                disabled={actionLoading === u.id + "_role"}
                                onChange={e => handleChangeRole(u, e.target.value)}
                                style={{ padding: "0.3rem 0.5rem", borderRadius: 8, border: "1.5px solid rgba(0,0,0,0.12)", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", background: "white", color: C.dark }}
                              >
                                <option value="khach">👤 Khách</option>
                                <option value="thanh_vien">✅ Thành viên</option>
                                <option value="admin">⚙️ Admin</option>
                              </select>
                              <button disabled={actionLoading === u.id + "_active"} onClick={() => handleToggleActive(u)} style={S.btnSm(u.is_active ? "#FF7043" : "#4CAF50", u.is_active ? "#FFF3F0" : "#F0FFF4")}>
                                {u.is_active ? "Khóa" : "Mở"}
                              </button>
                              <button disabled={actionLoading === u.id + "_del"} onClick={() => handleDelete(u)} style={S.btnSm("#F44336", "#FFF0F0")}>Xóa</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {showAddUser && (
              <div onClick={() => setShowAddUser(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: "2rem", width: 420, maxWidth: "90vw", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", color: C.dark, margin: "0 0 1.5rem", fontSize: "1.2rem" }}>Thêm tài khoản mới</h3>
                  <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {[["Họ tên", "name", "text"], ["Email", "email", "email"], ["Mật khẩu", "password", "password"]].map(([lbl, key, type]) => (
                      <div key={key}>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>{lbl}</label>
                        <input className="admin-input" type={type} value={addForm[key]} required onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#555", display: "block", marginBottom: 5 }}>Vai trò</label>
                      <select
                        className="admin-input"
                        value={addForm.role}
                        onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                      >
                        <option value="khach">👤 Khách (mặc định)</option>
                        <option value="thanh_vien">✅ Thành viên</option>
                        <option value="admin">⚙️ Admin</option>
                        <option value="super_admin">🛡️ Super Admin</option>
                      </select>
                    </div>
                    {addError && <div style={{ fontSize: "0.78rem", color: "#F44336", background: "#FFF0F0", padding: "0.5rem 0.75rem", borderRadius: 8 }}>{addError}</div>}
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                      <button type="button" onClick={() => setShowAddUser(false)} style={{ flex: 1, padding: "0.65rem", borderRadius: 10, border: "1.5px solid rgba(0,0,0,0.12)", background: "transparent", cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.85rem" }}>Hủy</button>
                      <button type="submit" disabled={addLoading} style={{ flex: 1, padding: "0.65rem", borderRadius: 10, border: "none", background: addLoading ? "#ccc" : C.moss, color: "white", cursor: addLoading ? "not-allowed" : "pointer", fontFamily: "'Be Vietnam Pro',sans-serif", fontSize: "0.85rem", fontWeight: 600 }}>
                        {addLoading ? "Đang tạo..." : "Tạo tài khoản"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.3rem", color: C.dark, margin: "0 0 3px" }}>Lịch sử hoạt động</h2>
              <p style={{ fontSize: "0.78rem", color: "#888", margin: 0 }}>{logs.length} sự kiện gần đây</p>
            </div>
            <div style={S.card}>
              {logs.length === 0 ? (
                <div style={{ color: "#bbb", textAlign: "center", padding: "2rem" }}>Chưa có hoạt động nào</div>
              ) : logs.map(log => (
                <div key={log.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "0.75rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: (actionColor[log.action] || "#ccc") + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: actionColor[log.action] || "#ccc" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: C.dark }}>{log.user_name || "Ẩn danh"}</span>
                      <span style={{ fontSize: "0.68rem", color: "#bbb" }}>{log.user_email || ""}</span>
                      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "1px 7px", borderRadius: "2rem", background: (actionColor[log.action] || "#ccc") + "20", color: actionColor[log.action] || "#888" }}>
                        {actionLog[log.action] || log.action}
                      </span>
                    </div>
                    {log.detail && <div style={{ fontSize: "0.75rem", color: "#999" }}>{log.detail}</div>}
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#ccc", flexShrink: 0 }}>{new Date(log.created_at).toLocaleString("vi-VN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
