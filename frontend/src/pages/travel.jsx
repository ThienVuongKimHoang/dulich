import { useState, useEffect, useRef, useCallback } from "react";
import { C, globalStyles, DEMO_IMGS, API_BASE } from "../constants";
import useScrollReveal from "../hooks/useScrollReveal";
import LogoIcon from "../components/LogoIcon";
import ChatButton from "../components/ChatButton";
import LoginModal from "../components/LoginModal";
import Companion from "../components/Companion";
import ChatPanel from "../components/ChatPanel";
import AchievementPopup from "../components/AchievementPopup";
import ProfilePage from "./ProfilePage";
import ExplorePage from "./ExplorePage";
import MapPage, { MAP_PLACES } from "./MapPage";
import WorkshopMaiPage from "./WorkshopMaiPage";
import KoiPage from "./KoiPage";
import SuperAdminDashboard from "./SuperAdminDashboard";
import CommunityPage from "./CommunityPage";
import ShopPage from "./ShopPage";
import BagPage from "./BagPage";
import BookingPage from "./BookingPage";
import LangNhangPage from "./LangNhangPage";
import TamLinhPage from "./TamLinhPage";
import LangMaiPage from "./LangMaiPage";
import MietVuon4MuaPage from "./MietVuon4MuaPage";

function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// ─── FLOWER TAB DATA ───
const FLOWER_TABS = [
  { title: "Làng Mai Vàng", desc: "Ngôi làng mai lâu đời nhất Sài Gòn, lưu giữ tinh hoa nghề trồng mai vàng truyền thống qua nhiều thế hệ.", page: "lang-mai", img: "https://cdn.hstatic.net/files/200000439247/article/mai_02e6e37300be4154af6e1096000a9700.jpg", stat: "300+", statLabel: "năm lịch sử", color: "#D4AF37", icon: "🌼" },
  { title: "Hồ Cá Koi", desc: "Những hồ cá koi nhiều màu sắc — trị liệu thị giác và tâm hồn giữa không gian xanh mát thơ mộng.", page: "ho-ca-koi", img: "https://dhdlogistics.com/wp-content/uploads/2023/12/van-chuyen-ca-koi-tu-nhat-ve-viet-nam-uy-tin.jpg", stat: "1000+", statLabel: "cá koi đặc sắc", color: "#1B5E94", icon: "🐟" },
  { title: "Tâm linh & Thiền", desc: "Những ngôi chùa cổ kính, không gian thiền định thanh tịnh giữa thiên nhiên bình yên.", page: "tam-linh", img: "https://image.giacngo.vn/w950/UserImages/2020/07/24/9/BTN_0048.JPG.webp", stat: "3+", statLabel: "địa điểm tâm linh", color: "#7A5C1E", icon: "🙏" },
  { title: "Làng Nhang Thơm", desc: "Nghề làm nhang thủ công lâu đời — hương thơm thanh khiết truyền đời của làng Lê Minh Xuân.", page: "lang-nhang", img: "https://cdn.tuoitre.vn/thumb_w/1060/471584752817336320/2023/5/29/img9730-168532598423022112956.jpg", stat: "50+", statLabel: "hộ nghề truyền thống", color: "#8B1A1A", icon: "🕯️" },
  { title: "Miệt vườn sinh thái", desc: "Rau sạch, trái cây nhiệt đới quanh năm — trải nghiệm miệt vườn sông nước Nam Bộ thuần túy.", page: "miet-vuon", img: "https://cdn3.ivivu.com/2019/04/9-v%C6%B0%E1%BB%9Dn-tr%C3%A1i-c%C3%A2y-g%E1%BA%A7n-x%E1%BB%8Bt-S%C3%A0i-G%C3%B2n-ivivu-2.jpg", stat: "4 mùa", statLabel: "sinh thái xanh", color: "#2A4A2B", icon: "🌿" },
];

// ─── MAIN APP ───
export default function BinhLoiLanding() {
  const [showLogin, setShowLogin] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [currentPage, setCurrentPage] = useState("home");
  const [mapInitialPlace, setMapInitialPlace] = useState(null);

  // ── History API sync ──────────────────────────────────────────────────────
  const navigate = useCallback((page, mapPlace = null) => {
    setCurrentPage(page);
    setMapInitialPlace(mapPlace);
    window.history.pushState({ page, mapPlace }, "");
    window.scrollTo(0, 0);
  }, []);

  // Seed the initial history entry so the first back-press restores home
  useEffect(() => {
    window.history.replaceState({ page: "home", mapPlace: null }, "");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle browser back / forward
  useEffect(() => {
    const onPop = (e) => {
      const { page = "home", mapPlace = null } = e.state || {};
      setCurrentPage(page);
      setMapInitialPlace(mapPlace);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [bookingQueue, setBookingQueue] = useState([]); // array of place IDs
  const [bookingHints, setBookingHints] = useState({ date: "", people: 0, notes: "" });
  const [bookingInitialTab, setBookingInitialTab] = useState("new");

  const addToBookingQueue = useCallback((placeId) => {
    setBookingQueue(q => q.includes(placeId) ? q : [...q, placeId]);
  }, []);

  const [user, setUser] = useState(() => localStorage.getItem("user_name") || null);
  const [currentUserData, setCurrentUserData] = useState(() => { try { return JSON.parse(localStorage.getItem("user_data") || "null"); } catch { return null; } });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [achievementQueue, setAchievementQueue] = useState([]);
  const [pendingCommunityTask, setPendingCommunityTask] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeFlowerTab, setActiveFlowerTab] = useState(null);
  const dropRef = useRef(null);

  useScrollReveal(currentPage);

  const handleLogout = useCallback(() => {
    setUser(null);
    setCurrentUserData(null);
    setShowDropdown(false);
    setCurrentPage("home");
    setMapInitialPlace(null);
    window.history.replaceState({ page: "home", mapPlace: null }, "");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_data");
    localStorage.removeItem("access_token");
  }, []);

  // Auto-logout when JWT expires
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const expiry = getTokenExpiry(token);
    if (!expiry) return;
    const msLeft = expiry - Date.now();
    if (msLeft <= 0) { handleLogout(); return; }
    const timer = setTimeout(handleLogout, msLeft);
    return () => clearTimeout(timer);
  }, [user, handleLogout]);

  // Handle Google OAuth callback — reads ?google_token=<jwt> from URL after redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("google_token");
    if (!googleToken) return;
    localStorage.setItem("access_token", googleToken);
    window.history.replaceState({}, "", window.location.pathname);
    fetch(`${API_BASE}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${googleToken}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(me => { if (me) handleLoginSuccess(me); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track page visit on first load
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/admin/track-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: "home" }),
    }).catch(() => { });
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLoginSuccess = useCallback((userData) => {
    const name = userData?.name || userData || "User";
    setUser(name);
    setCurrentUserData(userData);
    localStorage.setItem("user_name", name);
    localStorage.setItem("user_data", JSON.stringify(userData));
    setShowLogin(false);
    if (userData?.is_super_admin) {
      navigate("super-admin");
    }
  }, []);

  // Global achievement trigger — called from any page that has user data
  const ACH_CATALOG = [
    { id: "first", rarity: "gold", cup: "🏆", name: "Bước chân đầu tiên", desc: "Đăng ký & gia nhập cộng đồng Bình Lợi", test: () => true },
    { id: "map", rarity: "silver", cup: "🥈", name: "Người khám phá bản đồ", desc: "Mở bản đồ địa điểm Bình Lợi", test: () => true },
    { id: "wanderer", rarity: "bronze", cup: "🥉", name: "Lữ khách phương xa", desc: "Đạt cấp Lữ khách (30.000 EXP)", test: (p) => p >= 30000 },
    { id: "mai", rarity: "gold", cup: "🏃", name: "Người du hành bản địa", desc: "Tích luỹ 90.000 EXP", test: (p) => p >= 90000 },
    { id: "explorer", rarity: "gold", cup: "🔭", name: "Nhà khám phá thực thụ", desc: "Hoàn thành tất cả workshop cơ bản", test: () => ["nhang-basic", "bonsai-basic"].every(id => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes(id)) },
    { id: "ambassador", rarity: "legendary", cup: "🌟", name: "Đại sứ Bình Lợi", desc: "Đạt cấp Đại sứ Bình Lợi (810.000 EXP)", test: (p) => p >= 810000 },
    { id: "uon-mai-1", rarity: "gold", cup: "🪴", name: "Người tạo dáng tập sự", desc: "Hoàn thành workshop uốn cành mai", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("uon-mai-1") },
    { id: "bonsai-master", rarity: "legendary", cup: "🌳", img: "/img/achievement/golden_bonsai.png", name: "Bậc thầy bonsai", desc: "Hoàn thành khóa học chăm sóc mai cao cấp", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("bonsai-advanced") },
    { id: "explore-2", rarity: "silver", cup: "🧭", name: "Lữ khách phương xa", desc: "Tham gia 2 hoạt động tại Bình Lợi", test: (_, a) => a >= 2 },
    { id: "explore-4", rarity: "legendary", cup: "🌍", name: "Huyền thoại bản đồ", desc: "Hoàn thành tất cả workshop cao cấp", test: () => ["nhang-advanced", "bonsai-advanced"].every(id => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes(id)) },
    { id: "nhang-1", rarity: "bronze", cup: "🕯️", name: "Thợ nhang tập sự", desc: "Hoàn thành workshop nhang tập sự", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("nhang-1") },
    { id: "nhang-basic", rarity: "silver", cup: "🪔", name: "Thợ nhang cơ bản", desc: "Hoàn thành workshop nhang cơ bản", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("nhang-basic") },
    { id: "nhang-mid", rarity: "gold", cup: "🏮", name: "Thợ nhang trung cấp", desc: "Hoàn thành workshop nhang trung cấp", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("nhang-mid") },
    { id: "nhang-advanced", rarity: "legendary", cup: "✨", name: "Bậc thầy nhang thơm", desc: "Hoàn thành workshop nhang cao cấp", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("nhang-advanced") },
    { id: "bonsai-basic", rarity: "silver", cup: "🌱", name: "Nghệ nhân bonsai cơ bản", desc: "Hoàn thành workshop bonsai cơ bản", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("bonsai-basic") },
    { id: "bonsai-mid", rarity: "gold", cup: "🌿", name: "Nghệ nhân bonsai trung cấp", desc: "Hoàn thành workshop bonsai trung cấp", test: () => JSON.parse(localStorage.getItem("bl_completed_workshops") || "[]").includes("bonsai-mid") },
    { id: "checkin-1", rarity: "bronze", cup: "📍", name: "Người ghé thăm", desc: "Check-in tại Bình Lợi lần đầu tiên", test: () => parseInt(localStorage.getItem("bl_checkin_count") || "0") >= 1 },
    { id: "checkin-2", rarity: "silver", cup: "📌", name: "Khách thường xuyên", desc: "Check-in tại Bình Lợi 5 lần", test: () => parseInt(localStorage.getItem("bl_checkin_count") || "0") >= 5 },
    { id: "checkin-3", rarity: "gold", cup: "🏠", name: "Người con Bình Lợi", desc: "Check-in tại Bình Lợi 15 lần", test: () => parseInt(localStorage.getItem("bl_checkin_count") || "0") >= 15 },
    { id: "checkin-4", rarity: "legendary", cup: "🏡", name: "Linh hồn Bình Lợi", desc: "Check-in tại Bình Lợi 30 lần", test: () => parseInt(localStorage.getItem("bl_checkin_count") || "0") >= 30 },
    { id: "spirit-2", rarity: "silver", cup: "🙏", name: "Thiền định bên hoa", desc: "Hoàn thành 1 buổi thiền định tại Bình Lợi", test: () => false },
    { id: "spirit-3", rarity: "gold", cup: "🕊️", name: "Bình an trong tâm", desc: "Viếng 3 địa điểm tâm linh tại Bình Lợi", test: () => false },
    { id: "spirit-4", rarity: "legendary", cup: "✨", name: "Giác ngộ Bình Lợi", desc: "Hoàn thành tất cả hành trình tâm linh", test: () => false },
  ];

  const triggerAchievements = useCallback((pts, acts = 0) => {
    const seen = JSON.parse(localStorage.getItem("bl_seen_achievements") || "[]");
    const newOnes = ACH_CATALOG.filter(a => a.test(pts, acts) && !seen.includes(a.id));
    if (newOnes.length > 0) {
      setTimeout(() => setAchievementQueue(q => {
        const existingIds = new Set(q.map(x => x.id));
        return [...q, ...newOnes.filter(n => !existingIds.has(n.id))];
      }), 900);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAchievementDone = useCallback(() => {
    setAchievementQueue(q => {
      if (q[0]) {
        const seen = JSON.parse(localStorage.getItem("bl_seen_achievements") || "[]");
        if (!seen.includes(q[0].id))
          localStorage.setItem("bl_seen_achievements", JSON.stringify([...seen, q[0].id]));
      }
      return q.slice(1);
    });
  }, []);

  const GlobalPopup = achievementQueue.length > 0 ? (
    <AchievementPopup key={achievementQueue[0].id} achievement={achievementQueue[0]} onDone={handleAchievementDone} />
  ) : null;

  if (currentPage === "super-admin") {
    return <SuperAdminDashboard
      currentUser={currentUserData}
      onLogout={handleLogout}
    />;
  }

  if (currentPage === "workshop-uon-mai") {
    return <>{<WorkshopMaiPage onBack={() => window.history.back()} onTriggerAchievements={triggerAchievements} />}{GlobalPopup}</>;
  }

  if (currentPage === "ho-ca-koi") {
    return <>{<KoiPage onBack={() => window.history.back()} onNavigate={(a) => { if (a === "booking") addToBookingQueue("ho-ca-koi"); navigate(a === "workshop" ? "workshop-uon-mai" : a === "map" ? "map" : a === "booking" ? "booking" : "home", a === "map" ? "tan-phong-koi" : null); }} />}{GlobalPopup}</>;
  }

  if (currentPage === "lang-nhang") {
    return <>{<LangNhangPage onBack={() => window.history.back()} onNavigate={(a) => { if (a === "booking") addToBookingQueue("lang-nhang"); navigate(a === "workshop" ? "workshop-uon-mai" : a === "map" ? "map" : a === "booking" ? "booking" : "home", a === "map" ? "lang-nhang" : null); }} />}{GlobalPopup}</>;
  }

  if (currentPage === "tam-linh") {
    return <>{<TamLinhPage onBack={() => window.history.back()} onNavigate={(a) => { if (a === "booking") addToBookingQueue("tam-linh"); navigate(a === "workshop" ? "workshop-uon-mai" : a === "map" ? "map" : a === "booking" ? "booking" : "home", a === "map" ? "chua-thanh-tam" : null); }} />}{GlobalPopup}</>;
  }

  if (currentPage === "miet-vuon") {
    return <>{<MietVuon4MuaPage
      onBack={() => window.history.back()}
      onNavigate={(a) => { if (a === "booking") navigate("booking"); else if (a === "map") navigate("map"); }}
    />}{GlobalPopup}</>;
  }

  if (currentPage === "lang-mai") {
    return <>{<LangMaiPage
      onBack={() => window.history.back()}
      onNavigate={(a) => { if (a === "booking") addToBookingQueue("lang-mai"); navigate(a === "workshop" ? "workshop-uon-mai" : a === "map" ? "map" : a === "booking" ? "booking" : "home", a === "map" ? "lang-mai" : null); }}
    />}{GlobalPopup}</>;
  }

  if (currentPage === "profile") {
    return <>{<ProfilePage
      onBack={() => window.history.back()}
      onGoExplore={() => navigate("explore")}
      onTriggerAchievements={triggerAchievements}
      onGoToCommunity={(task) => { setPendingCommunityTask(task); navigate("community"); }}
      onUserUpdated={(updatedUser) => {
        setCurrentUserData(updatedUser);
        localStorage.setItem("user_data", JSON.stringify(updatedUser));
      }}
    />}{GlobalPopup}</>;
  }

  if (currentPage === "community") {
    return <>{<CommunityPage
      onBack={() => window.history.back()}
      currentUser={currentUserData}
      pendingTask={pendingCommunityTask}
      onClearPendingTask={() => setPendingCommunityTask(null)}
    />}{GlobalPopup}</>;
  }

  if (currentPage === "explore") {
    return <>{<ExplorePage onBack={() => window.history.back()} />}{GlobalPopup}</>;
  }

  if (currentPage === "map") {
    return <>{<MapPage onBack={() => window.history.back()} initialPlaceId={mapInitialPlace} onGoLangMai={() => navigate("lang-mai")} />}{GlobalPopup}</>;
  }

  if (currentPage === "shop") {
    return <>{<ShopPage
      onBack={() => window.history.back()}
      onGoBag={() => navigate("bag")}
      currentUser={currentUserData}
    />}{GlobalPopup}</>;
  }

  if (currentPage === "bag") {
    return <>{<BagPage
      onBack={() => window.history.back()}
      onGoShop={() => navigate("shop")}
    />}{GlobalPopup}</>;
  }

  if (currentPage === "booking") {
    return <>{<BookingPage
      onBack={() => window.history.back()}
      queue={bookingQueue}
      onClearQueue={() => setBookingQueue([])}
      onRemoveFromQueue={(id) => setBookingQueue(q => q.filter(x => x !== id))}
      onAddToQueue={addToBookingQueue}
      bookingHints={bookingHints}
      initialTab={bookingInitialTab}
      onTabUsed={() => setBookingInitialTab("new")}
      userGold={currentUserData?.gold ?? null}
      onGoldChange={(g) => setCurrentUserData(d => d ? { ...d, gold: g } : d)}
    />}{GlobalPopup}</>;
  }

  return (
    <>
      <style>{globalStyles}</style>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}

      <style>{`
        /* ── RESPONSIVE GLOBAL ── */
        * { box-sizing: border-box; }

        /* Nav */
        @media (max-width: 768px) {
          .bl-nav { padding: 0.75rem 1.25rem !important; }
          .bl-nav-links { display: none !important; }
          .bl-hamburger { display: flex !important; }
        }

        /* Hero info card grids */
        @media (max-width: 768px) {
          .hero-info-card { padding: 1.1rem !important; }
          .hero-info-card > div:first-child { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
        }

        /* Photo strip */
        @media (max-width: 640px) {
          .gallery-img:nth-child(n+3) { display: none; }
        }

        /* Bento grid */
        @media (max-width: 900px) {
          section .bento-card { grid-column: span 1 !important; grid-row: span 1 !important; }
        }

        /* Section paddings */
        @media (max-width: 768px) {
          section[style*="6rem 5rem"],
          section[style*="5rem"] { padding: 3rem 1.25rem !important; }
          section[style*="8rem"] { padding: 4rem 1.25rem !important; }
        }

        /* General reveal, workshop, explore cards */
        @media (max-width: 640px) {
          .nav-link { font-size: 0.78rem; }
        }
      `}</style>

      {/* ─── NAV ─── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 2rem", background: "rgba(254,252,248,0.97)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(200,150,62,0.15)" }} className="bl-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoIcon />
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, color: C.moss, lineHeight: 1.1 }}>
            BÌNH LỢI
            <span style={{ display: "block", fontSize: "0.6rem", fontWeight: 300, letterSpacing: "0.15em", color: C.gold, textTransform: "uppercase" }}>Healing Journey</span>
          </div>
        </div>

        {/* Desktop nav links */}
        <ul className="bl-nav-links" style={{ display: "flex", gap: "2rem", listStyle: "none", alignItems: "center", margin: 0, padding: 0 }}>
          {[["Trang chủ", "#hero"], ["Workshop", "#workshop"]].map(([l, href]) => (
            <li key={l}><a href={href} className="nav-link">{l}</a></li>
          ))}
          <li>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate("map"); setShowMobileMenu(false); }}>🗺️ Bản đồ</a>
          </li>
          <li>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate("explore"); setShowMobileMenu(false); }}>Khám phá</a>
          </li>
          <li>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate("community"); setShowMobileMenu(false); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              🌿 Cộng đồng
            </a>
          </li>
          <li>
            <a href="#" className="nav-link" onClick={e => { e.preventDefault(); navigate("booking"); setShowMobileMenu(false); }} style={{ background: C.moss, color: "white", padding: "0.5rem 1.25rem", borderRadius: "2rem", fontSize: "0.8rem" }}>Đặt lịch</a>
          </li>
          <li>
            <button onClick={() => { setShowChat(true); setShowMobileMenu(false); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1.5px solid ${C.sage}`, color: C.moss, padding: "0.45rem 1.1rem", borderRadius: "2rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", fontWeight: 500, transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.sage; e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.moss; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              Trò chuyện
            </button>
          </li>
          <li ref={dropRef} style={{ position: "relative" }}>
            {user ? (
              <>
                <button data-achievement-target onClick={() => setShowDropdown(d => !d)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1.5px solid rgba(61,90,62,0.25)", borderRadius: "2rem", padding: "0.4rem 0.9rem 0.4rem 0.5rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", fontWeight: 500, color: C.dark }}>
                  {(() => {
                    const avUrl = currentUserData?.avatar_url;
                    const frame = currentUserData?.equipped_frame;
                    const ringColor = frame === "khung-legendary" ? "#FFD700" : frame === "khung-hoa-mai" ? "#F06292" : null;
                    return (
                      <div style={{ position: "relative", width: 28, height: 28, flexShrink: 0 }}>
                        {ringColor && <div style={{ position: "absolute", inset: -2, borderRadius: "50%", border: `2px solid ${ringColor}`, boxShadow: `0 0 6px ${ringColor}66`, zIndex: 0 }} />}
                        <div style={{ position: "relative", zIndex: 1, width: 28, height: 28, borderRadius: "50%", background: avUrl ? "transparent" : C.moss, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.75rem", fontWeight: 600 }}>
                          {avUrl
                            ? <img src={`${API_BASE}${avUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : user[0].toUpperCase()
                          }
                        </div>
                      </div>
                    );
                  })()}
                  {user}
                </button>
                {showDropdown && (
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", borderRadius: 14, padding: "0.5rem", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)", minWidth: 180, animation: "fadeIn 0.2s ease forwards" }}>
                    {currentUserData?.is_super_admin && (
                      <button onClick={() => { navigate("super-admin"); setShowDropdown(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "0.6rem 0.85rem", background: "none", border: "none", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", color: C.moss, borderRadius: 9, textAlign: "left", fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.background = "#EEF5EE"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        🛡️ Quản trị hệ thống
                      </button>
                    )}
                    {[["👤", "Trang cá nhân", "profile"], ["🗓️", "Lịch đã đặt", "booking-history"], ["⚙️", "Cài đặt", null]].map(([icon, label, page]) => (
                      <button key={label}
                        onClick={() => { if (page) { if (page === "booking-history") { setBookingInitialTab("history"); navigate("booking"); } else navigate(page); setShowDropdown(false); } }}
                        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "0.6rem 0.85rem", background: "none", border: "none", cursor: page ? "pointer" : "default", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", color: page ? C.dark : "#bbb", borderRadius: 9, textAlign: "left" }}
                        onMouseEnter={e => { if (page) e.currentTarget.style.background = "#F5F0E8"; }}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        {icon} {label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0.4rem 0" }} />
                    <button onClick={handleLogout}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "0.6rem 0.85rem", background: "none", border: "none", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", color: C.rust, borderRadius: 9, textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FFF0EC"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button onClick={() => setShowLogin(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1.5px solid ${C.moss}`, color: C.moss, padding: "0.45rem 1.1rem", borderRadius: "2rem", background: "transparent", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", fontWeight: 500, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.moss; }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                Đăng nhập
              </button>
            )}
          </li>
        </ul>

        {/* Hamburger button — mobile only */}
        <button className="bl-hamburger" onClick={() => setShowMobileMenu(m => !m)}
          style={{ display: "none", flexDirection: "column", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "0.4rem" }}>
          <span style={{ display: "block", width: 24, height: 2, background: showMobileMenu ? "transparent" : C.moss, transition: "all 0.25s", transform: showMobileMenu ? "rotate(45deg) translate(5px,5px)" : "none" }} />
          <span style={{ display: "block", width: 24, height: 2, background: C.moss, transition: "all 0.25s", transform: showMobileMenu ? "rotate(-45deg)" : "none" }} />
          {!showMobileMenu && <span style={{ display: "block", width: 16, height: 2, background: C.moss }} />}
        </button>

        {/* Mobile slide-down menu */}
        {showMobileMenu && (
          <div className="bl-mobile-menu" style={{ position: "fixed", top: 60, left: 0, right: 0, background: "rgba(254,252,248,0.98)", backdropFilter: "blur(14px)", borderBottom: "2px solid rgba(200,150,62,0.2)", padding: "1rem 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.25rem", zIndex: 99 }}>
            {[
              ["🏠 Trang chủ", () => { window.location.hash = "#hero"; setShowMobileMenu(false); }],
              ["🎓 Workshop", () => { window.location.hash = "#workshop"; setShowMobileMenu(false); }],
              ["🗺️ Bản đồ", () => { navigate("map"); setShowMobileMenu(false); }],
              ["🔭 Khám phá", () => { navigate("explore"); setShowMobileMenu(false); }],
              ["🌿 Cộng đồng", () => { navigate("community"); setShowMobileMenu(false); }],
              ["📅 Đặt lịch", () => { navigate("booking"); setShowMobileMenu(false); }],
              ["💬 Trò chuyện", () => { setShowChat(true); setShowMobileMenu(false); }],
            ].map(([label, action]) => (
              <button key={label} onClick={action}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "0.85rem 1rem", background: "none", border: "none", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.92rem", color: C.dark, borderRadius: 10, textAlign: "left", fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = "#F5F0E8"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                {label}
              </button>
            ))}
            <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "0.5rem 0" }} />
            {user ? (
              <button onClick={() => { navigate("profile"); setShowMobileMenu(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "0.85rem 1rem", background: "#EEF5EE", border: "none", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.92rem", color: C.moss, borderRadius: 10, fontWeight: 600 }}>
                👤 {user}
              </button>
            ) : (
              <button onClick={() => { setShowLogin(true); setShowMobileMenu(false); }}
                style={{ width: "100%", padding: "0.9rem", background: C.moss, color: "white", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.92rem", fontWeight: 700 }}>
                Đăng nhập
              </button>
            )}
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section id="hero" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 80, paddingBottom: "3rem" }}>

        {/* Background image */}
        <img
          src="/img/main_page/forest.jpg"
          alt=""
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />

        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.48) 50%, rgba(0,0,0,0.72) 100%)", zIndex: 1 }} />

        {/* Center text content */}
        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 2rem", marginBottom: "2.5rem", marginTop: "4rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.3)", padding: "0.35rem 1.1rem", borderRadius: "2rem", marginBottom: "1.5rem" }}>
            <span style={{ color: C.gold, fontSize: "0.75rem" }}>✦</span>
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.92)", fontWeight: 500 }}>Khám phá Bình Lợi — Bình Chánh, TP.HCM</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.4rem, 4.5vw, 3.8rem)", lineHeight: 1.15, color: "white", fontWeight: 400, marginBottom: "1.25rem", textShadow: "0 2px 28px rgba(0,0,0,0.45)" }}>
            <span style={{ color: C.gold, fontWeight: 700 }}>Bình Lợi</span>, điểm đến <em style={{ fontStyle: "italic", color: "rgba(255,255,255,0.9)" }}>bình yên</em>
          </h1>
          <p style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.78)", maxWidth: 520, margin: "0 auto", lineHeight: 1.8, fontWeight: 300 }}>
            Làng mai, làng nhang, hồ koi — trải nghiệm văn hóa Nam Bộ đích thực, chỉ cách trung tâm 20km.
          </p>
        </div>

        {/* Hero info summary card */}
        <style>{`
          @keyframes pulseRing {
            0%   { transform: scale(1);   opacity: 0.7; }
            70%  { transform: scale(1.18); opacity: 0; }
            100% { transform: scale(1.18); opacity: 0; }
          }
          @keyframes floatDot {
            0%, 100% { transform: translateY(0); }
            50%       { transform: translateY(-6px); }
          }
          @keyframes shimmer {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .hero-info-card { animation: none; }
          .hero-activity-chip {
            display: flex; align-items: center; gap: 6px;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.13);
            border-radius: 10px; padding: 0.45rem 0.7rem;
            transition: all 0.2s;
          }
          .hero-activity-chip:hover {
            background: rgba(255,255,255,0.17);
            border-color: rgba(200,150,62,0.45);
            transform: translateY(-2px);
          }
          .map-btn-hero {
            position: relative;
            display: inline-flex; align-items: center; gap: 10px;
            background: linear-gradient(135deg, #C8963E 0%, #E8B84B 60%, #C8963E 100%);
            background-size: 200% auto;
            color: #1A1A1A;
            padding: 0.85rem 2.4rem;
            border-radius: 3rem;
            font-size: 0.92rem; font-weight: 700;
            border: none; cursor: pointer;
            font-family: "'Be Vietnam Pro', sans-serif";
            box-shadow: 0 6px 32px rgba(200,150,62,0.55);
            letter-spacing: 0.02em;
            transition: all 0.3s;
          }
          .map-btn-hero:hover {
            background-position: right center;
            box-shadow: 0 10px 44px rgba(200,150,62,0.75);
            transform: translateY(-2px) scale(1.03);
          }
          .map-btn-hero .pulse-ring {
            position: absolute; inset: -5px;
            border-radius: 3rem;
            border: 2px solid rgba(200,150,62,0.55);
            animation: pulseRing 2s ease-out infinite;
            pointer-events: none;
          }
          .map-btn-hero .pulse-ring-2 {
            position: absolute; inset: -10px;
            border-radius: 3rem;
            border: 1.5px solid rgba(200,150,62,0.28);
            animation: pulseRing 2s ease-out 0.6s infinite;
            pointer-events: none;
          }
          .map-pin-dot {
            width: 10px; height: 10px; border-radius: 50%;
            background: #1A1A1A;
            animation: floatDot 1.6s ease-in-out infinite;
          }
        `}</style>

        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 900, padding: "0 2rem" }}>
          <div className="hero-info-card" style={{ background: "rgba(10,20,10,0.52)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 24, padding: "1.6rem 2rem", boxShadow: "0 24px 80px rgba(0,0,0,0.4)" }}>

            {/* Top row: Location + Distance + Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.4rem" }}>
              {[
                { icon: "📍", label: "Vị trí", value: "Bình Chánh, TP.HCM", color: C.gold },
                { icon: "🚗", label: "Khoảng cách", value: "~20 km từ trung tâm", color: C.sage },
                { icon: <img src="/img/main_page/ride.gif" style={{ width: 52, height: 52, objectFit: "contain" }} alt="" />, label: "Thời gian đến", value: "30 – 45 phút lái xe", color: "#7EC8E3" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 64, height: 64, borderRadius: "50%", background: `${item.color}22`, border: `1.5px solid ${item.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: 2 }}>{item.label}</p>
                    <p style={{ fontSize: "0.82rem", color: "white", fontWeight: 600, lineHeight: 1.3 }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)", marginBottom: "1.4rem" }} />

            {/* Activities row */}
            <div style={{ marginBottom: "1.6rem" }}>
              <p style={{ fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.42)", marginBottom: "0.75rem" }}>Có gì tại Bình Lợi?</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {[
                  { icon: <img src="/img/main_page/hoa_mai.png" style={{ width: 65, height: 65, objectFit: "contain", verticalAlign: "middle" }} alt="" />, label: "Làng Mai Vàng", page: "lang-mai" },
                  { icon: <img src="https://cdn.tuoitre.vn/thumb_w/1060/471584752817336320/2023/5/29/img9730-168532598423022112956.jpg" style={{ width: 65, height: 65, objectFit: "contain", verticalAlign: "middle" }} alt="" />, label: "Làng Nhang Thơm", page: "lang-nhang" },
                  { icon: "🐟", label: "Hồ Cá Koi", page: "ho-ca-koi" },
                  { icon: "🧘", label: "Thiền định", page: null },
                  { icon: <img src="https://cdn3.ivivu.com/2019/04/9-v%C6%B0%E1%BB%9Dn-tr%C3%A1i-c%C3%A2y-g%E1%BA%A7n-x%E1%BB%8Bt-S%C3%A0i-G%C3%B2n-ivivu-2.jpg" style={{ width: 65, height: 65, objectFit: "cover", verticalAlign: "middle", borderRadius: "50%" }} alt="" />, label: "Miệt vườn sinh thái", page: "miet-vuon" },
                  { icon: <img src="/img/main_page/chua.png" style={{ width: 65, height: 65, objectFit: "contain", verticalAlign: "middle" }} alt="" />, label: "Không gian tâm linh", page: "tam-linh" },
                ].map(a => (
                  <div key={a.label} className="hero-activity-chip"
                    onClick={() => { if (a.page) { navigate(a.page); } }}
                    style={{ cursor: a.page ? "pointer" : "default" }}>
                    <span style={{ fontSize: "65px", lineHeight: 1 }}>{a.icon}</span>
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{a.label}</span>
                    {a.page && <span style={{ fontSize: "0.6rem", color: C.gold, fontWeight: 600, display: "block", marginTop: 2 }}>Xem →</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)", marginBottom: "1.4rem" }} />

            {/* Animated Map Button */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button className="map-btn-hero" onClick={() => navigate("map")}>
                <span className="pulse-ring" />
                <span className="pulse-ring-2" />
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Khám phá bản đồ Bình Lợi
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bl-stats-row" style={{ position: "relative", zIndex: 2, display: "flex", gap: 0, marginTop: "2.5rem" }}>
          {[{ n: "20km", l: "từ trung tâm" }, { n: "300+", l: "năm lịch sử" }, { n: "12+", l: "workshop/tháng" }].map((s, i) => (
            <div key={s.n} style={{ textAlign: "center", padding: "0 2.5rem", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.22)" : "none" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 600, color: C.gold }}>{s.n}</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.62)", marginTop: 4, letterSpacing: "0.04em" }}>{s.l}</div>
            </div>
          ))}
        </div>

      </section>

      {/* ─── DEMO PHOTO STRIP ─── */}
      <section className="bl-photo-strip" style={{ padding: "0", overflow: "hidden", display: "flex", height: 280, marginTop: "3rem" }}>
        {[DEMO_IMGS.koi, DEMO_IMGS.mai, DEMO_IMGS.nhang, DEMO_IMGS.temple].map((src, i) => (
          <div key={i} className="gallery-img" style={{ flex: 1, position: "relative" }}>
            <img src={src} alt="" style={{ width: "100%", height: 280, objectFit: "cover" }} />
            <div className="overlay">
              <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 500 }}>
                {["Hồ Cá Koi", "Làng Mai Vàng", "Làng Nhang", "Không gian tâm linh"][i]}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* ─── HOA MAI FEATURES ─── */}
      <section className="bl-section bl-container" style={{ padding: "6rem 5rem", background: C.cream, overflow: activeFlowerTab === null ? "hidden" : "visible", minHeight: activeFlowerTab === null ? "92vh" : "auto", transition: "min-height 0.6s" }}>
        <style>{`
          @keyframes petalSway {
            0%   { transform: scale(1)    rotate(-3deg); filter: drop-shadow(0 0 7px rgba(212,175,55,0.45)); }
            35%  { transform: scale(1.09) rotate(3deg);  filter: drop-shadow(0 0 20px rgba(212,175,55,0.85)); }
            70%  { transform: scale(1.04) rotate(-1deg); filter: drop-shadow(0 0 13px rgba(212,175,55,0.6));  }
            100% { transform: scale(1)    rotate(-3deg); filter: drop-shadow(0 0 7px rgba(212,175,55,0.45)); }
          }
          @keyframes nhuyPulse {
            0%, 100% { transform: scale(1);    filter: drop-shadow(0 0 10px rgba(212,175,55,0.5));  }
            50%       { transform: scale(1.15); filter: drop-shadow(0 0 28px rgba(212,175,55,0.95)); }
          }
          @keyframes flowerSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes charBob {
            0%, 100% { transform: translateY(0px) scale(1);    }
            50%       { transform: translateY(-7px) scale(1.08); }
          }
          @keyframes panelIn {
            from { opacity: 0; transform: translateX(28px); }
            to   { opacity: 1; transform: translateX(0);    }
          }
          @keyframes activeGlow {
            0%, 100% { transform: scale(1.12) rotate(-2deg); filter: drop-shadow(0 0 28px rgba(255,210,0,0.95)) brightness(1.3); }
            50%       { transform: scale(1.2)  rotate(2deg);  filter: drop-shadow(0 0 55px rgba(255,230,50,1))   brightness(1.5); }
          }
          .flower-petal-wrap:hover img {
            filter: drop-shadow(0 0 26px rgba(212,175,55,1)) brightness(1.22) !important;
            transform: scale(1.13) !important;
          }
        `}</style>

        <p className="reveal" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: "0.75rem" }}>✦ Điểm nổi bật</p>
        <h2 className="reveal" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: C.dark, marginBottom: "3rem", lineHeight: 1.2 }}>Bình Lợi có gì đặc biệt?</h2>

        {/* ── OUTER COLUMN: hoa căn giữa + hint bên dưới ── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>

          {/* ROW: hoa + panel (panel slide-in khi chọn cánh) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3rem", width: "100%" }}>

            {/* ── HOA MAI ── */}
            <div style={{ position: "relative", width: 750, height: 750, flexShrink: 0, transform: activeFlowerTab === null ? "scale(2)" : "scale(1)", transition: "transform 0.7s cubic-bezier(0.34,1.56,0.64,1)" }}>

              {/* Vòng chứa 5 cánh – quay chậm khi chưa chọn */}
              <div style={{
                position: "absolute", inset: 0,
                animation: activeFlowerTab !== null ? "none" : "flowerSpin 72s linear infinite",
              }}>
                {FLOWER_TABS.map((tab, i) => {
                  const angleDeg = i * 72 - 90;
                  const isActive = activeFlowerTab === i;
                  return (
                    <div key={i}
                      className="flower-petal-wrap"
                      title={tab.title}
                      onClick={() => setActiveFlowerTab(prev => prev === i ? null : i)}
                      style={{
                        position: "absolute",
                        left: 375 - 233,
                        top: 375 - 84,
                        width: 233,
                        height: 168,
                        transformOrigin: "233px 84px",
                        transform: `rotate(${angleDeg + 240}deg)`,
                        cursor: "pointer",
                        zIndex: isActive ? 3 : 2,
                      }}
                    >
                      <img
                        src="/img/main_page/canh_hoa.png"
                        alt={tab.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          animation: isActive
                            ? "activeGlow 1.1s ease-in-out infinite"
                            : `petalSway ${2.8 + i * 0.3}s ease-in-out ${i * 0.6}s infinite`,
                          transition: "filter 0.3s",
                        }}
                      />
                      {/* Tên tab – ngoài đầu nhọn cánh hoa */}
                      <div style={{
                        position: "absolute",
                        left: -6,
                        top: "50%",
                        transformOrigin: "right center",
                        transform: `translateX(-100%) translateY(-50%) rotate(${-(angleDeg + 240)}deg)`,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        color: "rgba(80,46,0,0.92)",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        textShadow: "0 1px 5px rgba(255,255,255,1)",
                        letterSpacing: "0.02em",
                        opacity: isActive ? 1 : 0.72,
                      }}>
                        {tab.icon} {tab.title}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nhân vật Mai di chuyển tới cánh hoa được chọn */}
              {(() => {
                const size = 72;
                let cLeft = 375 - size / 2, cTop = 375 - size / 2;
                if (activeFlowerTab !== null) {
                  const rad = (activeFlowerTab * 72 - 30) * Math.PI / 180;
                  cLeft = 375 + 147 * Math.cos(rad) - size / 2;
                  cTop = 375 + 147 * Math.sin(rad) - size / 2;
                }
                return (
                  <div style={{
                    position: "absolute",
                    left: cLeft,
                    top: cTop,
                    width: size,
                    height: size,
                    zIndex: 5,
                    transition: "left 0.75s cubic-bezier(0.34,1.56,0.64,1), top 0.75s cubic-bezier(0.34,1.56,0.64,1)",
                    animation: "charBob 1.4s ease-in-out infinite",
                    pointerEvents: "none",
                  }}>
                    <img
                      src="/img/avatar_chatbot.jpeg"
                      alt="Mai"
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", boxShadow: "0 4px 16px rgba(0,0,0,0.22)" }}
                    />
                  </div>
                );
              })()}

              {/* Nhụy hoa – vòng tròn trung tâm */}
              <div style={{
                position: "absolute",
                left: 375 - 69,
                top: 375 - 69,
                width: 138,
                height: 138,
                zIndex: 4,
                pointerEvents: "none",
              }}>
                <img
                  src="/img/main_page/nhuy_hoa.png"
                  alt="nhụy hoa"
                  style={{ width: "100%", height: "100%", objectFit: "contain", animation: "nhuyPulse 3.8s ease-in-out infinite" }}
                />
              </div>
            </div>{/* end HOA MAI */}

            {/* ── PANEL NỘI DUNG – luôn trong DOM, slide-in qua max-width ── */}
            <div style={{
              maxWidth: activeFlowerTab !== null ? 460 : 0,
              opacity: activeFlowerTab !== null ? 1 : 0,
              overflow: "hidden",
              flexShrink: 0,
              transition: "max-width 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s",
              pointerEvents: activeFlowerTab !== null ? "auto" : "none",
            }}>
              <div style={{ width: 460, paddingLeft: "0.5rem" }}>
                {activeFlowerTab !== null && (
                  <div key={activeFlowerTab} style={{ animation: "panelIn 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
                    <button
                      onClick={() => setActiveFlowerTab(null)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "rgba(42,42,42,0.42)", fontFamily: "'Be Vietnam Pro', sans-serif", marginBottom: "1.5rem", padding: "0.3rem 0", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = C.dark}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(42,42,42,0.42)"}
                    >
                      ← Quay lại
                    </button>

                    <div style={{ height: 210, borderRadius: 20, overflow: "hidden", marginBottom: "1.5rem", boxShadow: "0 10px 36px rgba(0,0,0,0.11)" }}>
                      <img
                        src={FLOWER_TABS[activeFlowerTab].img}
                        alt={FLOWER_TABS[activeFlowerTab].title}
                        style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.55s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: "0.35rem" }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", fontWeight: 700, color: FLOWER_TABS[activeFlowerTab].color, lineHeight: 1 }}>
                        {FLOWER_TABS[activeFlowerTab].stat}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "rgba(42,42,42,0.48)" }}>
                        {FLOWER_TABS[activeFlowerTab].statLabel}
                      </span>
                    </div>

                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: C.dark, marginBottom: "0.7rem", lineHeight: 1.25 }}>
                      {FLOWER_TABS[activeFlowerTab].icon} {FLOWER_TABS[activeFlowerTab].title}
                    </h3>
                    <p style={{ fontSize: "0.88rem", lineHeight: 1.82, color: "rgba(42,42,42,0.6)", marginBottom: "1.75rem" }}>
                      {FLOWER_TABS[activeFlowerTab].desc}
                    </p>

                    <button
                      onClick={() => navigate(FLOWER_TABS[activeFlowerTab].page)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0.85rem 1.75rem", borderRadius: "2rem", background: C.dark, color: C.cream, border: "none", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 600, transition: "opacity 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      Khám phá {FLOWER_TABS[activeFlowerTab].title} →
                    </button>
                  </div>
                )}
              </div>
            </div>{/* end PANEL */}

          </div>{/* end ROW */}

          {/* ── GỢI Ý BÊN DƯỚI HOA – hiện khi chưa chọn cánh ── */}
          <div style={{
            opacity: activeFlowerTab === null ? 1 : 0,
            maxHeight: activeFlowerTab === null ? "160px" : "0px",
            overflow: "hidden",
            transition: "opacity 0.4s, max-height 0.5s cubic-bezier(0.4,0,0.2,1)",
            textAlign: "center",
            pointerEvents: activeFlowerTab === null ? "auto" : "none",
          }}>
            <p style={{ fontSize: "0.88rem", color: "rgba(42,42,42,0.45)", marginBottom: "1rem", lineHeight: 1.7 }}>
              Chạm vào một <strong style={{ color: C.gold }}>cánh hoa</strong> để khám phá vẻ đẹp của Bình Lợi
            </p>
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", justifyContent: "center" }}>
              {FLOWER_TABS.map((t, i) => (
                <button key={i}
                  onClick={() => setActiveFlowerTab(i)}
                  style={{ background: "none", border: "1px solid rgba(212,175,55,0.38)", borderRadius: "2rem", padding: "0.3rem 0.9rem", fontSize: "0.72rem", color: "rgba(42,42,42,0.55)", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FFF8EE"; e.currentTarget.style.color = C.dark; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "rgba(42,42,42,0.55)"; }}
                >
                  {t.icon} {t.title}
                </button>
              ))}
            </div>
          </div>{/* end GỢI Ý */}

        </div>{/* end OUTER COLUMN */}
      </section>


      {/* ─── WORKSHOP ─── */}
      <section id="workshop" style={{ padding: "6rem 5rem", background: "#FEFCF8" }}>
        <p className="reveal" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: "0.75rem" }}>✦ Hoạt động & Workshop</p>
        <h2 className="reveal" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: C.dark, marginBottom: "1rem", lineHeight: 1.2 }}>Trải nghiệm cùng cộng đồng</h2>
        <p className="reveal" style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "#666", maxWidth: 500, marginBottom: "3rem" }}>Những buổi workshop nhỏ, ấm cúng — nơi bạn học nghề thủ công, kết nối thiên nhiên và chữa lành tâm hồn.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.5rem" }}>
          {[
            { img: DEMO_IMGS.workshop1, tag: "Nghề thủ công", tagColor: "#7A4F00", tagBg: "#FFF8EE", title: "Học uốn cành mai – cắm hoa truyền thống", time: "3 tiếng", max: "10", desc: "Cùng nghệ nhân học nghệ thuật uốn mai và cắm hoa truyền thống Nam Bộ.", page: "workshop-uon-mai" },
            { img: DEMO_IMGS.workshop2, tag: "Tâm lý & Thư giãn", tagColor: "#2A4A2B", tagBg: "#EEF5EE", title: "Thiền định bên hồ – buổi sáng tĩnh lặng", time: "2 tiếng", max: "15", desc: "Thiền định giữa thiên nhiên, tĩnh tâm và tìm lại bình yên bên hồ koi.", page: null },
            { img: DEMO_IMGS.workshop3, tag: "Trải nghiệm làng nghề", tagColor: "#6B2D0F", tagBg: "#FEF3E2", title: "Làm nhang thơm thủ công cùng nghệ nhân", time: "4 tiếng", max: "8", desc: "Trực tiếp tham gia quy trình làm nhang, mang về sản phẩm tự tay làm.", page: null },
          ].map((w, i) => (
            <div key={i} className={`workshop-card reveal reveal-delay${i + 1}`}>
              <div className="card-img">
                <img src={w.img} alt={w.title} />
              </div>
              <div style={{ padding: "1.5rem" }}>
                <span style={{ display: "inline-block", background: w.tagBg, color: w.tagColor, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "0.2rem 0.65rem", borderRadius: "2rem", marginBottom: "0.75rem" }}>{w.tag}</span>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: C.dark, marginBottom: "0.5rem", lineHeight: 1.4 }}>{w.title}</h3>
                <p style={{ fontSize: "0.8rem", color: "#777", lineHeight: 1.6, marginBottom: "1rem" }}>{w.desc}</p>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "0.72rem", color: C.moss, background: "#EEF5EE", padding: "0.2rem 0.65rem", borderRadius: "2rem" }}>⏱ {w.time}</span>
                  <span style={{ fontSize: "0.72rem", color: C.earth, background: "#FFF8EE", padding: "0.2rem 0.65rem", borderRadius: "2rem" }}>👥 Tối đa {w.max} người</span>
                </div>
                {w.page
                  ? <button className="workshop-btn" onClick={() => navigate(w.page)}>Xem chi tiết →</button>
                  : <button className="workshop-btn" onClick={() => setShowLogin(true)}>Đăng ký →</button>
                }
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── GALLERY ─── */}
      <section className="bl-section bl-container" style={{ padding: "6rem 5rem", background: C.cream }}>
        <p className="reveal" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: "0.75rem" }}>✦ Ảnh thực tế</p>
        <h2 className="reveal" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: C.dark, marginBottom: "3rem", lineHeight: 1.2 }}>Vẻ đẹp của Bình Lợi</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "200px 200px", gap: "1rem" }}>
          {[
            { src: DEMO_IMGS.gallery1, label: "Rừng Tràm", span: "" },
            { src: DEMO_IMGS.gallery2, label: "Hồ cá Koi", span: "row-span-2" },
            { src: DEMO_IMGS.gallery3, label: "Vườn rau", span: "" },
            { src: DEMO_IMGS.gallery4, label: "Sắc màu hoa mai", span: "" },
            { src: DEMO_IMGS.gallery5, label: "Mai vàng nở rộ", span: "" },
          ].map((g, i) => (
            <div key={i} className={`gallery-img reveal reveal-delay${(i % 3) + 1}`}
              style={{ gridRow: g.span === "row-span-2" ? "span 2" : undefined }}>
              <img src={g.src} alt={g.label} style={{ height: g.span === "row-span-2" ? 410 : 200 }} />
              <div className="overlay">
                <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 500 }}>{g.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── BẢN ĐỒ ĐỊA ĐIỂM ─── */}
      <section id="hanh-trinh" style={{ padding: "6rem 5rem", background: C.dark, color: C.cream }}>
        <p className="reveal" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: "0.75rem" }}>✦ Khám phá địa điểm</p>
        <h2 className="reveal" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: C.cream, marginBottom: "1rem", lineHeight: 1.2 }}>Bản đồ Bình Lợi</h2>
        <p className="reveal" style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "rgba(245,240,232,0.6)", maxWidth: 520, marginBottom: "3rem" }}>
          Khám phá Làng Mai và Chùa Thanh Tâm trên bản đồ tương tác — click vào từng địa điểm để xem thông tin chi tiết.
        </p>

        {/* Place preview cards */}
        <div className="reveal" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "2.5rem" }}>
          {MAP_PLACES.map((place, i) => (
            <button key={place.id} onClick={() => navigate("map")}
              className={`reveal reveal-delay${i + 1}`}
              style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", padding: "1.75rem", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.09)", cursor: "pointer", textAlign: "left", transition: "all 0.28s", fontFamily: "'Be Vietnam Pro', sans-serif", width: "100%" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)"; e.currentTarget.style.borderColor = `${C.gold}55`; e.currentTarget.style.transform = "translateY(-3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(245,240,232,0.09)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ width: 68, height: 68, borderRadius: "50%", background: place.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0, boxShadow: `0 4px 16px ${place.color}55` }}>
                {place.imgIcon ? <img src={place.imgIcon} style={{ width: 50, height: 50, objectFit: "contain" }} alt="" /> : place.icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: C.cream, margin: "0 0 3px", fontWeight: 400 }}>{place.name}</p>
                {place.sub && <p style={{ fontSize: "0.75rem", color: C.gold, fontStyle: "italic", margin: "0 0 8px" }}>{place.sub}</p>}
                <p style={{ fontSize: "0.75rem", color: "rgba(245,240,232,0.45)", margin: "0 0 10px", lineHeight: 1.5 }}>{place.address}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {place.highlights.slice(0, 2).map(h => (
                    <span key={h} style={{ background: `${place.color}20`, color: place.color === C.gold ? C.gold : C.sage, border: `1px solid ${place.color}35`, padding: "0.18rem 0.6rem", borderRadius: "2rem", fontSize: "0.68rem" }}>{h}</span>
                  ))}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(245,240,232,0.3)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 4 }}><path d="M9 18l6-6-6-6" /></svg>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="reveal" style={{ display: "flex", justifyContent: "center" }}>
          <button onClick={() => navigate("map")}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: C.gold, color: C.dark, padding: "1rem 2.5rem", borderRadius: "3rem", fontSize: "0.9rem", fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", boxShadow: `0 6px 28px ${C.gold}40`, transition: "all 0.2s", letterSpacing: "0.02em" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 36px ${C.gold}55`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 6px 28px ${C.gold}40`; }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            Mở bản đồ tương tác
          </button>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section style={{ padding: "6rem 5rem", background: "#FEFCF8" }}>
        <p className="reveal" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: "0.75rem" }}>✦ Cộng đồng nói gì</p>
        <h2 className="reveal" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: C.dark, marginBottom: "3rem", lineHeight: 1.2 }}>Những khoảnh khắc được chữa lành</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {[
            { text: "Tôi đã đến Bình Lợi vào một buổi sáng mệt mỏi sau chuỗi ngày bận rộn. Ngồi bên hồ koi, nghe tiếng nước chảy và nhìn những bông mai nở — tôi cảm thấy mình thở được lại.", emoji: "🌿", bg: "#EEF5EE", name: "Minh Trang", loc: "Quận 1, TP.HCM" },
            { text: "Workshop làm nhang thủ công là trải nghiệm tuyệt vời nhất mình từng tham gia. Không khí làng quê, nghệ nhân chia sẻ tận tình — mình mang hết cả tâm hồn về nhà.", emoji: <img src="https://cdn.tuoitre.vn/thumb_w/1060/471584752817336320/2023/5/29/img9730-168532598423022112956.jpg" style={{ width: 28, height: 28, objectFit: "contain" }} alt="" />, bg: "#FFF8EE", name: "Đức Hùng", loc: "Bình Thạnh, TP.HCM" },
          ].map(t => (
            <div key={t.name} className="testimonial-card reveal">
              <p style={{ fontSize: "0.88rem", lineHeight: 1.8, color: C.dark, marginBottom: "1.25rem", marginTop: "1rem" }}>{t.text}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>{t.emoji}</div>
                <div>
                  <p style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>{t.name}</p>
                  <p style={{ fontSize: "0.72rem", color: "#888" }}>{t.loc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SOCIAL SHARE ─── */}
      <section style={{ padding: "4rem 5rem", background: C.cream, textAlign: "center" }}>
        <p className="reveal" style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.25em", textTransform: "uppercase", color: C.gold, marginBottom: "0.75rem" }}>✦ Lan toả yêu thương</p>
        <h2 className="reveal" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: C.dark, marginBottom: "0.75rem", lineHeight: 1.2 }}>Chia sẻ Bình Lợi với bạn bè</h2>
        <p className="reveal" style={{ fontSize: "0.88rem", color: "rgba(42,42,42,0.55)", marginBottom: "2.25rem", maxWidth: 420, margin: "0 auto 2.25rem" }}>
          Biết đâu người bạn đang cần một chuyến chữa lành đang chờ bạn giới thiệu.
        </p>
        <div className="reveal" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          {/* Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent("Khám phá Bình Lợi — điểm đến bình yên giữa lòng TP.HCM 🌿")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0.85rem 1.75rem", borderRadius: "2rem", background: "#1877F2", color: "white", textDecoration: "none", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 600, transition: "opacity 0.2s", boxShadow: "0 4px 14px rgba(24,119,242,0.3)" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.024 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" /></svg>
            Chia sẻ Facebook
          </a>

          {/* TikTok */}
          <button
            onClick={async () => {
              const shareData = {
                title: "Bình Lợi — Điểm đến chữa lành",
                text: "Khám phá Bình Lợi — điểm đến bình yên giữa lòng TP.HCM 🌿 #BinhLoi #ChuaLanh #TravelVietnam",
                url: window.location.href,
              };
              if (navigator.share) {
                try { await navigator.share(shareData); } catch (_) { }
              } else {
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                setCopiedLink("tiktok");
                setTimeout(() => setCopiedLink(false), 2500);
              }
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0.85rem 1.75rem", borderRadius: "2rem", background: "#010101", color: "white", border: "none", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s", boxShadow: "0 4px 14px rgba(0,0,0,0.22)" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.78a4.85 4.85 0 0 1-1.01-.09z" /></svg>
            {copiedLink === "tiktok" ? "Đã sao chép!" : "Chia sẻ TikTok"}
          </button>

          {/* Copy link */}
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(window.location.href);
              setCopiedLink("copy");
              setTimeout(() => setCopiedLink(false), 2500);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0.85rem 1.75rem", borderRadius: "2rem", background: copiedLink === "copy" ? C.moss : "white", color: copiedLink === "copy" ? "white" : C.dark, border: `1.5px solid ${copiedLink === "copy" ? C.moss : "rgba(42,42,42,0.15)"}`, fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "all 0.25s", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}
          >
            {copiedLink === "copy"
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            }
            {copiedLink === "copy" ? "Đã sao chép!" : "Sao chép link"}
          </button>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ background: C.moss, padding: "5rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -150, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(circle, rgba(200,150,62,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
        <h2 className="reveal" style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: C.cream, marginBottom: "1rem", position: "relative" }}>Sẵn sàng chữa lành?</h2>
        <p className="reveal" style={{ fontSize: "0.95rem", color: "rgba(245,240,232,0.7)", marginBottom: "2rem", maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>Đặt lịch tham quan hoặc đăng ký workshop — chúng tôi sẽ đồng hành cùng bạn tìm lại bình yên.</p>
        <div className="reveal" style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center" }}>
          <button className="btn-primary" onClick={() => navigate("booking")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            Đặt lịch ngay
          </button>
          <button
            onClick={() => setShowChat(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid rgba(245,240,232,0.4)", color: C.cream, padding: "0.85rem 1.75rem", borderRadius: "2rem", background: "transparent", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 500, transition: "all 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,240,232,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            Chat với Mai
          </button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: C.dark, padding: "3rem 5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "0.78rem", color: "rgba(245,240,232,0.4)" }}>© 2025 Bình Lợi Healing Journey. Huyện Bình Chánh, TP.HCM</p>
        <ul style={{ display: "flex", gap: "1.5rem", listStyle: "none" }}>
          {[["Trang chủ", "#"], ["Workshop", "#"], ["Liên hệ", "#"], ["Bản đồ", "https://maps.app.goo.gl/LvenqzMBQepredYw9"]].map(([l, href]) => (
            <li key={l}><a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} style={{ fontSize: "0.78rem", color: "rgba(245,240,232,0.4)", textDecoration: "none" }}>{l}</a></li>
          ))}
        </ul>
      </footer>

      {/* ─── COMPANION ─── */}
      <Companion />

      {/* ─── CHAT BUTTON ─── */}
      <ChatButton onClick={() => setShowChat(true)} />

      {/* ─── CHAT PANEL ─── */}
      {showChat && (
        <ChatPanel
          onClose={() => setShowChat(false)}
          onNavigateToMap={(placeId) => {
            setShowChat(false);
            navigate("map", placeId);
          }}
          onBookingHints={(hints) => setBookingHints(h => ({ ...h, ...hints }))}
        />
      )}

      {GlobalPopup}
    </>
  );
}
