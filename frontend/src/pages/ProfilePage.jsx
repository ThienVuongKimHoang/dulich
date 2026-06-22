import { useState, useEffect } from "react";
import { C, API_BASE } from "../constants";
import LogoIcon from "../components/LogoIcon";

const GoldIcon = ({ size = 18 }) => <img src="/img/main_page/gold.png" style={{ width: size, height: size, verticalAlign: "middle", objectFit: "contain", display: "inline-block" }} alt="" />;

// ─── PROFILE PAGE ───
const DAILY_TASKS = [
  { id: "login",           icon: "☀️", label: "Đăng nhập hôm nay",            exp: 10,  auto: true },
  { id: "quiz",            icon: "🧠", label: "Trả lời câu hỏi văn hóa",      exp: 20 },
  { id: "like",            icon: "❤️", label: "Thích 1 bài viết",              exp: 10 },
  { id: "comment",         icon: "💬", label: "Bình luận 1 bài viết",          exp: 15 },
  { id: "share",           icon: "📍", label: "Chia sẻ địa điểm yêu thích",   exp: 20 },
  { id: "review",          icon: "⭐", label: "Đánh giá workshop đã tham gia", exp: 30 },
  { id: "checkin-binhloi", icon: "🗺️", label: "Checkin Bình Lợi",              exp: 0, gold: 30000, location: true },
];

const COMMUNITY_TASKS = new Set(["like", "comment"]);

const MAX_PROOFS_PER_DAY = 3;

// Tọa độ trung tâm xã Bình Lợi và bán kính cho phép (km)
const BINHLOI_CENTER = [10.7814, 106.5135];
const BINHLOI_RADIUS_KM = 5;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ProfilePage({ onBack, onGoExplore, onTriggerAchievements, onGoToCommunity, onUserUpdated }) {
  const [profile, setProfile] = useState(null);
  const [doneTasks, setDoneTasks] = useState([]);
  const [expPopups, setExpPopups] = useState({});
  const [taskLoading, setTaskLoading] = useState({});
  const [history, setHistory] = useState([]);
  const [completedWs, setCompletedWs] = useState([]);
  const [checkIns, setCheckIns] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noToken, setNoToken] = useState(false);
  const [shopItems, setShopItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [shopModal, setShopModal] = useState(null); // null | "shop" | "bag"
  const [shopBuying, setShopBuying] = useState(null);
  const [shopToast, setShopToast] = useState(null);
  const [selectedInvItem, setSelectedInvItem] = useState(null);
  const [avatarModal, setAvatarModal] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [frameEquipping, setFrameEquipping] = useState(null);
  const [locationChecking, setLocationChecking] = useState(false);
  const [locationMsg, setLocationMsg] = useState(null); // { type: "success"|"error", text: string }
  const [fbProofs, setFbProofs] = useState([]);
  const [fbUploading, setFbUploading] = useState(false);
  const [fbError, setFbError] = useState("");
  const [fbPreview, setFbPreview] = useState(null);
  const [fbExpToast, setFbExpToast] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setNoToken(true); setLoading(false); return; }
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_BASE}/api/v1/users/me`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/v1/profile/activity-feed`, { headers: h }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/profile/summary`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/v1/profile/daily-tasks/today`, { headers: h }).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/api/v1/shop/items`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/shop/inventory`, { headers: h }).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/social/facebook/my-proofs`, { headers: h }).then(r => r.ok ? r.json() : []),
    ]).then(async ([me, hist, summary, dailyStatus, sItems, inv, fbPosts]) => {
      setFbProofs(fbPosts || []);
      setShopItems(sItems || []);
      setInventory(inv || []);
      if (!me) { setNoToken(true); setLoading(false); return; }
      setProfile(me);
      setHistory(hist || []);
      if (summary) {
        setCompletedWs(summary.completed_workshops ?? []);
        setCheckIns(summary.checkin_count ?? 0);
      }

      // Load trạng thái nhiệm vụ hôm nay từ DB
      let currentDone = dailyStatus?.done_task_ids ?? [];
      setDoneTasks(currentDone);

      // Auto-complete login task nếu chưa làm hôm nay
      if (!currentDone.includes("login")) {
        try {
          const loginTask = DAILY_TASKS.find(t => t.id === "login");
          const res = await fetch(`${API_BASE}/api/v1/profile/daily-tasks/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...h },
            body: JSON.stringify({ task_id: "login", exp: loginTask.exp }),
          });
          if (res.ok) {
            const data = await res.json();
            currentDone = data.done_task_ids;
            setDoneTasks(data.done_task_ids);
            setProfile(prev => prev ? { ...prev, points: data.points } : prev);
            onTriggerAchievements?.(data.points, (hist || []).length);
          }
        } catch {}
      }

      setLoading(false);
      onTriggerAchievements?.(me.points ?? 0, (hist || []).length);
    }).catch(() => { setNoToken(true); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completeTask = async (id) => {
    const task = DAILY_TASKS.find(t => t.id === id);
    if (!task || doneTasks.includes(id) || taskLoading[id]) return;

    setTaskLoading(prev => ({ ...prev, [id]: true }));
    // Optimistic update
    setDoneTasks(prev => prev.includes(id) ? prev : [...prev, id]);

    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE}/api/v1/profile/daily-tasks/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ task_id: id, exp: task.exp ?? 0, gold: task.gold ?? 0 }),
        });
        if (res.ok) {
          const data = await res.json();
          setDoneTasks(data.done_task_ids);
          setProfile(prev => prev ? { ...prev, points: data.points, gold: data.gold ?? prev.gold } : prev);
          onTriggerAchievements?.(data.points, history.length);
        }
      } catch {}
    }

    setExpPopups(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setExpPopups(prev => ({ ...prev, [id]: false })), 1600);
    setTaskLoading(prev => ({ ...prev, [id]: false }));
  };

  const handleCheckinBinhLoi = () => {
    if (doneTasks.includes("checkin-binhloi") || locationChecking) return;
    if (!navigator.geolocation) {
      setLocationMsg({ type: "error", text: "Trình duyệt không hỗ trợ định vị." });
      setTimeout(() => setLocationMsg(null), 4000);
      return;
    }
    setLocationChecking(true);
    setLocationMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversineKm(pos.coords.latitude, pos.coords.longitude, BINHLOI_CENTER[0], BINHLOI_CENTER[1]);
        setLocationChecking(false);
        if (dist <= BINHLOI_RADIUS_KM) {
          setLocationMsg({ type: "success", text: "Xác nhận thành công! Bạn đang ở Bình Lợi 🎉" });
          setTimeout(() => setLocationMsg(null), 3500);
          completeTask("checkin-binhloi");
        } else {
          setLocationMsg({ type: "error", text: `Bạn đang cách Bình Lợi ${dist.toFixed(1)} km. Hãy đến đây để checkin!` });
          setTimeout(() => setLocationMsg(null), 5000);
        }
      },
      (err) => {
        setLocationChecking(false);
        const msg = err.code === 1 ? "Bạn đã từ chối quyền định vị." : "Không lấy được vị trí. Thử lại sau.";
        setLocationMsg({ type: "error", text: msg });
        setTimeout(() => setLocationMsg(null), 4000);
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  };

  const showShopToast = (msg, ok = true) => {
    setShopToast({ msg, ok });
    setTimeout(() => setShopToast(null), 2500);
  };

  const buyItem = async (item) => {
    if (shopBuying) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setShopBuying(item.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/shop/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ item_id: item.id }),
      });
      const data = await res.json();
      if (!res.ok) { showShopToast(data.detail || "Mua thất bại", false); return; }
      setProfile(prev => prev ? { ...prev, gold: data.gold } : prev);
      setInventory(prev => {
        const idx = prev.findIndex(i => i.item_id === item.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [data.item, ...prev];
      });
      showShopToast(`Đã mua "${item.name}"! 🎉`);
    } catch {
      showShopToast("Lỗi kết nối", false);
    } finally {
      setShopBuying(null);
    }
  };

  // ── Viền avatar ────────────────────────────────────────────────────────────
  const FRAME_STYLES = {
    none: {
      outer: "3px solid rgba(200,150,62,0.45)",
      shadow: "0 6px 20px rgba(200,150,62,0.45), 0 0 0 4px rgba(200,150,62,0.18)",
      label: "Mặc định", emoji: "⭕",
    },
    "khung-hoa-mai": {
      outer: "3px solid #F06292",
      shadow: "0 6px 22px rgba(240,98,146,0.5), 0 0 0 5px #FCE4EC",
      label: "Hoa Mai", emoji: "🌸",
      gradient: "linear-gradient(135deg,#FCE4EC,#F8BBD0,#F06292,#F8BBD0,#FCE4EC)",
    },
    "khung-legendary": {
      outer: "3px solid #FFD700",
      shadow: "0 0 0 4px rgba(255,215,0,0.25), 0 6px 30px rgba(255,215,0,0.7), 0 0 24px rgba(255,215,0,0.4)",
      label: "Huyền Thoại 👑", emoji: "👑",
      gradient: "linear-gradient(135deg,#FFF9C4,#FFE082,#FFD700,#FFE082,#FFF9C4)",
    },
  };

  const currentFrameId = profile?.equipped_frame || "none";
  const currentFrame = FRAME_STYLES[currentFrameId] || FRAME_STYLES.none;

  const ownedFrameIds = ["none", ...inventory.filter(i => i.category === "avatar").map(i => i.item_id)];

  const uploadAvatar = async (file) => {
    if (!file) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/v1/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => {
          const next = prev ? { ...prev, avatar_url: data.avatar_url } : prev;
          onUserUpdated?.(next);
          return next;
        });
        showShopToast("Đã cập nhật ảnh đại diện! 🎉");
      } else {
        const err = await res.json();
        showShopToast(err.detail || "Upload thất bại", false);
      }
    } catch {
      showShopToast("Lỗi kết nối", false);
    } finally {
      setAvatarUploading(false);
    }
  };

  const equipFrame = async (frameId) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setFrameEquipping(frameId);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ equipped_frame: frameId === "none" ? null : frameId }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(prev => {
          const next = prev ? { ...prev, equipped_frame: data.equipped_frame } : prev;
          onUserUpdated?.(next);
          return next;
        });
        showShopToast(`Đã trang bị viền "${FRAME_STYLES[frameId]?.label || frameId}"! ✨`);
      }
    } catch {
      showShopToast("Lỗi kết nối", false);
    } finally {
      setFrameEquipping(null);
    }
  };

  const points = profile?.points ?? 0;
  const gold   = profile?.gold   ?? 0;
  const totalActivities = history.length;

  // Thresholds: 3^level × 10 000 (30k, 90k, 270k, 810k)
  const LEVELS = [
    { id: 0, name: "Mầm non", icon: "🌱", color: "#7A9E7E", bg: "#EEF5EE", min: 0, desc: "Bước chân đầu tiên lên vùng đất Bình Lợi" },
    { id: 1, name: "Lữ khách", icon: "🎒", color: "#8B7355", bg: "#F5F0E8", min: 30000, desc: "Bắt đầu hành trình khám phá miền quê" },
    { id: 2, name: "Nhà khám phá", icon: "🧭", color: "#C8963E", bg: "#FFF8EE", min: 90000, desc: "Hiểu biết sâu về văn hoá và làng nghề" },
    { id: 3, name: "Nghệ nhân", icon: "🏺", color: "#9B3A1A", bg: "#FEF3E2", min: 270000, desc: "Gắn bó và đóng góp cho cộng đồng làng nghề" },
    { id: 4, name: "Đại sứ Bình Lợi", icon: "🌟", color: "#C8963E", bg: "#FFFBF0", min: 810000, desc: "Người truyền cảm hứng yêu mến Bình Lợi" },
  ];

  const currentLevel = [...LEVELS].reverse().find(l => points >= l.min) ?? LEVELS[0];
  const nextLevel = LEVELS[currentLevel.id + 1];
  const levelPct = nextLevel ? Math.min(((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100, 100) : 100;

  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("vi-VN", { month: "long", year: "numeric" }) : "Hội viên mới";

  // Achievement board — rows = category, columns = tier (tập sự → trung cấp → cao cấp → bậc thầy)

  const TIER_META = {
    apprentice: { label: "Tập sự", color: "#7A4A1A", bg: "linear-gradient(135deg,#fdf0e6,#e8c49a,#cd7f32 50%,#e8c49a,#fdf0e6)", border: "#CD7F32", glow: "0 0 10px rgba(205,127,50,0.35), 0 4px 12px rgba(0,0,0,0.07)", shimmer: false },
    intermediate: { label: "Trung cấp", color: "#555", bg: "linear-gradient(135deg,#f5f5f5,#e0e0e0,#cacaca 50%,#e0e0e0,#f5f5f5)", border: "#bbb", glow: "0 0 10px rgba(170,170,170,0.3), 0 4px 12px rgba(0,0,0,0.06)", shimmer: false },
    advanced: { label: "Cao cấp", color: "#8B6010", bg: "linear-gradient(135deg,#fff8e6,#fde8a0,#f5c842 50%,#fde8a0,#fff8e6)", border: "#C8963E", glow: "0 0 16px rgba(200,150,62,0.5), 0 4px 14px rgba(0,0,0,0.08)", shimmer: true },
    master: { label: "Bậc thầy", color: "#B8860B", bg: "linear-gradient(135deg,#fff9e6,#ffe680,#ffd700 50%,#ffe680,#fff9e6)", border: "#FFD700", glow: "0 0 22px rgba(255,215,0,0.65), 0 4px 16px rgba(0,0,0,0.1)", shimmer: true },
  };

  const BASIC_WS = ["nhang-basic", "bonsai-basic"];
  const ADVANCED_WS = ["nhang-advanced", "bonsai-advanced"];

  const ACHIEVEMENT_ROWS = [
    {
      id: "journey", label: "Hành trình", icon: "👣",
      tiers: [
        { id: "first", tier: "apprentice", icon: "👣", name: "Bước chân đầu tiên", desc: "Đăng ký & gia nhập cộng đồng Bình Lợi", earned: true },
        { id: "wanderer", tier: "intermediate", icon: "🚶", name: "Lữ hành khắp nơi", desc: "Tích luỹ 30.000 EXP", earned: points >= 30000 },
        { id: "mai", tier: "advanced", icon: "🏃", name: "Người du hành bản địa", desc: "Tích luỹ 90.000 EXP", earned: points >= 90000 },
        { id: "ambassador", tier: "master", icon: "🌟", name: "Đại sứ Bình Lợi", desc: "Tích luỹ 810.000 EXP", earned: points >= 810000 },
      ]
    },
    {
      id: "explore", label: "Khám phá", icon: "🗺️",
      tiers: [
        { id: "map", tier: "apprentice", icon: "🗺️", name: "Người khám phá bản đồ", desc: "Mở bản đồ địa điểm Bình Lợi", earned: true },
        { id: "explore-2", tier: "intermediate", icon: "🧭", name: "Lữ khách phương xa", desc: "Tham gia 2 hoạt động tại Bình Lợi", earned: totalActivities >= 2 },
        { id: "explorer", tier: "advanced", icon: "🔭", name: "Nhà khám phá thực thụ", desc: "Hoàn thành tất cả các workshop cơ bản", earned: BASIC_WS.every(id => completedWs.includes(id)) },
        { id: "explore-4", tier: "master", icon: "🌍", name: "Huyền thoại bản đồ", desc: "Hoàn thành tất cả các workshop cao cấp", earned: ADVANCED_WS.every(id => completedWs.includes(id)) },
      ]
    },
    {
      id: "nhang", label: "Nhang thơm", icon: <img src="/img/main_page/nhang.jpeg" style={{ width: 20, height: 20, objectFit: "contain", verticalAlign: "middle" }} alt="" />,
      tiers: [
        { id: "nhang-1", tier: "apprentice", img: "/img/main_page/nhang.jpeg", name: "Thợ nhang tập sự", desc: "Hoàn thành workshop nhang tập sự", earned: completedWs.includes("nhang-1") },
        { id: "nhang-basic", tier: "intermediate", icon: "🪔", name: "Thợ nhang cơ bản", desc: "Hoàn thành workshop nhang cơ bản", earned: completedWs.includes("nhang-basic") },
        { id: "nhang-mid", tier: "advanced", icon: "🏮", name: "Thợ nhang trung cấp", desc: "Hoàn thành workshop nhang trung cấp", earned: completedWs.includes("nhang-mid") },
        { id: "nhang-advanced", tier: "master", icon: "✨", name: "Bậc thầy nhang thơm", desc: "Hoàn thành workshop nhang cao cấp", earned: completedWs.includes("nhang-advanced") },
      ]
    },
    {
      id: "bonsai", label: "Bonsai Mai", icon: "🪴",
      tiers: [
        { id: "uon-mai-1", tier: "apprentice", icon: "🪴", name: "Người tạo dáng tập sự", desc: "Hoàn thành workshop uốn cành mai tập sự", earned: completedWs.includes("uon-mai-1") },
        { id: "bonsai-basic", tier: "intermediate", icon: "🌱", name: "Nghệ nhân bonsai cơ bản", desc: "Hoàn thành workshop bonsai cơ bản", earned: completedWs.includes("bonsai-basic") },
        { id: "bonsai-mid", tier: "advanced", icon: "🌿", name: "Nghệ nhân bonsai trung cấp", desc: "Hoàn thành workshop bonsai trung cấp", earned: completedWs.includes("bonsai-mid") },
        { id: "bonsai-master", tier: "master", img: "/img/achievement/golden_bonsai.png", name: "Bậc thầy bonsai", desc: "Hoàn thành workshop bonsai cao cấp", earned: completedWs.includes("bonsai-advanced") },
      ]
    },
    {
      id: "checkin", label: "Check-in", icon: "📍",
      tiers: [
        { id: "checkin-1", tier: "apprentice", icon: "📍", name: "Người ghé thăm", desc: "Check-in tại Bình Lợi lần đầu tiên", earned: checkIns >= 1 },
        { id: "checkin-2", tier: "intermediate", icon: "📌", name: "Khách thường xuyên", desc: "Check-in tại Bình Lợi 5 lần", earned: checkIns >= 5 },
        { id: "checkin-3", tier: "advanced", icon: "🏠", name: "Người con Bình Lợi", desc: "Check-in tại Bình Lợi 15 lần", earned: checkIns >= 15 },
        { id: "checkin-4", tier: "master", icon: "🏡", name: "Linh hồn Bình Lợi", desc: "Check-in tại Bình Lợi 30 lần", earned: checkIns >= 30 },
      ]
    },
    {
      id: "spiritual", label: "Tâm linh", icon: <img src="/img/main_page/chua.png" style={{ width: 20, height: 20, objectFit: "contain", verticalAlign: "middle" }} alt="" />,
      tiers: [
        { id: "chua", tier: "apprentice", img: "/img/main_page/chua.png", name: "Tâm hồn thanh tịnh", desc: "Viếng Chùa Thanh Tâm (Phật Cô Đơn)", earned: false },
        { id: "spirit-2", tier: "intermediate", icon: "🙏", name: "Thiền định bên hoa", desc: "Hoàn thành 1 buổi thiền định tại Bình Lợi", earned: false },
        { id: "spirit-3", tier: "advanced", icon: "🕊️", name: "Bình an trong tâm", desc: "Viếng 3 địa điểm tâm linh tại Bình Lợi", earned: false },
        { id: "spirit-4", tier: "master", icon: "✨", name: "Giác ngộ Bình Lợi", desc: "Hoàn thành tất cả hành trình tâm linh", earned: false },
      ]
    },
  ];

  const allAchs = ACHIEVEMENT_ROWS.flatMap(r => r.tiers);
  const earnedCount = allAchs.filter(a => a.earned).length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F7F3ED", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmerCard { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes cupFloat { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-5px) rotate(2deg)} }
        @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
        @keyframes expFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 80%{opacity:1;transform:translateY(-28px) scale(1.1)} 100%{opacity:0;transform:translateY(-40px) scale(0.9)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp2 { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes modalIn { from{opacity:0;transform:translate(-50%,-48%) scale(0.95)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .avatar-edit-btn { opacity:0; transition:opacity 0.2s; }
        .avatar-wrap:hover .avatar-edit-btn { opacity:1; }
        .p-card { animation: fadeUp 0.45s ease both; }
        .cup-float { animation: cupFloat 3.5s ease-in-out infinite; }
        .achievement-earned { transition: transform 0.22s, box-shadow 0.22s; }
        .achievement-earned:hover { transform: translateY(-4px) scale(1.02); }
        .shimmer-bg { background-size: 200% auto; animation: shimmerCard 2.8s linear infinite; }
        .exp-popup { position:absolute; right:0; top:-8px; font-size:0.78rem; font-weight:800; color:#C8963E; white-space:nowrap; pointer-events:none; animation: expFloat 1.6s ease forwards; z-index:10; }
      `}</style>

      {/* Nav */}
      <nav style={{ background: "rgba(254,252,248,0.97)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(200,150,62,0.15)", padding: "0 2rem", height: 60, display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "1.5px solid rgba(61,90,62,0.3)", color: C.moss, padding: "0.35rem 0.85rem", borderRadius: "2rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif", display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.moss; }}>
          ← Trang chủ
        </button>
        <div style={{ width: 1, height: 20, background: "rgba(0,0,0,0.1)", margin: "0 4px" }} />
        <LogoIcon />
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", fontWeight: 600, color: C.moss }}>BÌNH LỢI</span>
        <span style={{ color: "#d0c8bc" }}>/</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: C.dark }}>Trang cá nhân</span>
      </nav>

      {/* ══ MODAL CHỈNH SỬA AVATAR ══ */}
      {avatarModal && profile && (() => {
        const frameId = profile?.equipped_frame || "none";
        const frame = FRAME_STYLES[frameId] || FRAME_STYLES.none;
        return (
          <>
            <div onClick={() => setAvatarModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", zIndex: 600 }} />
            <div style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: "min(480px,94vw)", background: "white", borderRadius: 24,
              zIndex: 601, overflow: "hidden",
              boxShadow: "0 28px 80px rgba(0,0,0,0.3)",
              animation: "modalIn 0.3s cubic-bezier(.22,.68,0,1.15) forwards",
            }}>
              {/* Header */}
              <div style={{ padding: "1.1rem 1.4rem", borderBottom: "1px solid #F0EBE3", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FAFAF8" }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: "1.05rem", color: "#3E2723" }}>Chỉnh sửa avatar</div>
                <button onClick={() => setAvatarModal(false)} style={{ background: "none", border: "1.5px solid #D7CCC8", color: "#A1887F", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: "1.5rem 1.4rem 1.75rem" }}>
                {/* Preview avatar hiện tại */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.85rem", marginBottom: "1.75rem" }}>
                  <div style={{ position: "relative", width: 110, height: 110 }}>
                    {frame.gradient && (
                      <div style={{ position: "absolute", inset: -6, borderRadius: "50%", background: frame.gradient }} />
                    )}
                    <div style={{
                      position: "relative", zIndex: 1,
                      width: 100, height: 100, top: frame.gradient ? 5 : 0,
                      margin: "auto", borderRadius: "50%",
                      border: frame.outer, boxShadow: frame.shadow, overflow: "hidden",
                      background: profile.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, #E8B04A)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "2.4rem", fontWeight: 700, color: C.dark,
                    }}>
                      {profile.avatar_url
                        ? <img src={`${API_BASE}${profile.avatar_url}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : profile.name?.[0]?.toUpperCase() ?? "U"
                      }
                    </div>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#A1887F" }}>
                    Đang dùng viền: <strong>{frame.label}</strong>
                  </div>
                </div>

                {/* Upload ảnh */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#8D6E63", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.65rem" }}>📷 Ảnh đại diện</div>
                  <label style={{
                    display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.9rem 1.1rem",
                    border: "2px dashed #D7CCC8", borderRadius: 16, cursor: "pointer",
                    background: "#FAFAF8", transition: "all 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.background = "#FFF8E1"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#D7CCC8"; e.currentTarget.style.background = "#FAFAF8"; }}
                  >
                    <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                      onChange={e => uploadAvatar(e.target.files[0])} disabled={avatarUploading} />
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>
                      {avatarUploading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> : "📤"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#3E2723" }}>
                        {avatarUploading ? "Đang tải lên..." : "Tải ảnh lên"}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#BCAAA4" }}>JPG, PNG, WEBP · tối đa 5MB</div>
                    </div>
                  </label>
                </div>

                {/* Chọn viền */}
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#8D6E63", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.65rem" }}>🖼️ Viền avatar</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" /* bl-grid-3 injected below */ }}>
                    {ownedFrameIds.map(fid => {
                      const fs = FRAME_STYLES[fid] || FRAME_STYLES.none;
                      const isActive = frameId === fid;
                      const isSaving = frameEquipping === fid;
                      return (
                        <button key={fid} onClick={() => !isActive && equipFrame(fid)} disabled={isSaving} style={{
                          border: `2px solid ${isActive ? C.gold : "#E0D8D0"}`,
                          borderRadius: 16, padding: "0.85rem 0.5rem",
                          background: isActive ? "#FFF8E1" : "#FAFAF8",
                          cursor: isActive ? "default" : "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "0.45rem",
                          boxShadow: isActive ? `0 0 0 3px rgba(200,150,62,0.25)` : "none",
                          transition: "all 0.2s", fontFamily: "'Be Vietnam Pro',sans-serif",
                          opacity: isSaving ? 0.6 : 1,
                        }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = C.gold; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = "#E0D8D0"; }}
                        >
                          {/* Mini preview */}
                          <div style={{ position: "relative", width: 52, height: 52 }}>
                            {fs.gradient && <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: fs.gradient }} />}
                            <div style={{
                              position: "relative", zIndex: 1,
                              width: 46, height: 46, top: fs.gradient ? 3 : 0, margin: "auto",
                              borderRadius: "50%", border: fs.outer, boxShadow: fs.shadow, overflow: "hidden",
                              background: profile.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, #E8B04A)`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "1.1rem", fontWeight: 700, color: C.dark,
                            }}>
                              {profile.avatar_url
                                ? <img src={`${API_BASE}${profile.avatar_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : profile.name?.[0]?.toUpperCase() ?? "U"
                              }
                            </div>
                          </div>
                          <div style={{ fontSize: "0.68rem", fontWeight: isActive ? 700 : 500, color: isActive ? C.gold : "#8D6E63", textAlign: "center", lineHeight: 1.3 }}>
                            {isSaving ? "..." : fs.label}
                          </div>
                          {isActive && <div style={{ fontSize: "0.6rem", color: C.gold, fontWeight: 700 }}>✓ Đang dùng</div>}
                        </button>
                      );
                    })}
                  </div>
                  {ownedFrameIds.length <= 1 && (
                    <p style={{ fontSize: "0.72rem", color: "#BCAAA4", marginTop: "0.75rem", textAlign: "center" }}>
                      Mua khung avatar trong <span onClick={() => { setAvatarModal(false); setShopModal("shop"); }} style={{ color: C.gold, cursor: "pointer", fontWeight: 600 }}>Cửa hàng</span> để có thêm lựa chọn!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#aaa", fontSize: "0.9rem" }}>Đang tải...</p>
        </div>
      ) : !profile ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
          <div style={{ fontSize: "3rem" }}>{noToken ? "🔐" : "⚠️"}</div>
          <p style={{ color: "#555", fontSize: "0.92rem", fontWeight: 500 }}>{noToken ? "Vui lòng đăng nhập để xem trang cá nhân." : "Không thể tải thông tin. Vui lòng thử lại."}</p>
          <button onClick={onBack} style={{ background: C.moss, color: "white", border: "none", padding: "0.65rem 1.75rem", borderRadius: "2rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500, fontFamily: "'Be Vietnam Pro', sans-serif" }}>Quay về trang chủ</button>
        </div>
      ) : (
        <div style={{ flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

          {/* ══ HERO CARD ══ */}
          <div className="p-card" style={{ background: `linear-gradient(135deg, ${C.moss} 0%, #1C3320 100%)`, borderRadius: 28, padding: "2.5rem 2.5rem 2rem", marginBottom: "1.5rem", boxShadow: "0 12px 40px rgba(61,90,62,0.3)", position: "relative", overflow: "hidden" }}>
            {/* bg decor */}
            <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, background: "radial-gradient(circle, rgba(200,150,62,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -30, left: "40%", width: 160, height: 160, background: "radial-gradient(circle, rgba(122,158,126,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", gap: "1.75rem", flexWrap: "wrap", marginBottom: "2rem" }}>
              {/* Avatar + frame */}
              <div className="avatar-wrap" onClick={() => setAvatarModal(true)} data-achievement-target
                style={{ position: "relative", flexShrink: 0, cursor: "pointer", width: 90, height: 90 }}>
                {/* Frame ring (nếu có gradient) */}
                {currentFrame.gradient && (
                  <div style={{ position: "absolute", inset: -5, borderRadius: "50%", background: currentFrame.gradient, zIndex: 0 }} />
                )}
                {/* Avatar circle */}
                <div style={{
                  position: "relative", zIndex: 1,
                  width: 82, height: 82, borderRadius: "50%", margin: "auto",
                  top: currentFrame.gradient ? 4 : 0,
                  border: currentFrame.outer,
                  boxShadow: currentFrame.shadow,
                  overflow: "hidden",
                  background: profile.avatar_url ? "transparent" : `linear-gradient(135deg, ${C.gold}, #E8B04A)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2rem", fontWeight: 700, color: C.dark,
                }}>
                  {profile.avatar_url
                    ? <img src={`${API_BASE}${profile.avatar_url}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : profile.name?.[0]?.toUpperCase() ?? "U"
                  }
                </div>
                {/* Hover edit overlay */}
                <div className="avatar-edit-btn" style={{
                  position: "absolute", inset: 0, zIndex: 2, borderRadius: "50%",
                  background: "rgba(0,0,0,0.45)", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                  <span style={{ fontSize: "1.2rem" }}>✏️</span>
                  <span style={{ fontSize: "0.55rem", color: "white", fontWeight: 600 }}>Chỉnh sửa</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(245,240,232,0.55)", margin: "0 0 4px" }}>Hội viên Bình Lợi · {joinDate}</p>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.7rem", fontWeight: 600, color: "white", lineHeight: 1.15, margin: "0 0 4px" }}>{profile.name}</h2>
                <p style={{ fontSize: "0.8rem", color: "rgba(245,240,232,0.55)", margin: 0 }}>{profile.email}</p>
              </div>
              {/* Current level badge */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                <div style={{ textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: 16, padding: "0.85rem 1.25rem", border: "1px solid rgba(200,150,62,0.3)" }}>
                  <div className="cup-float" style={{ fontSize: "2.5rem", lineHeight: 1, marginBottom: 6 }}>{currentLevel.icon}</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: currentLevel.color, letterSpacing: "0.05em" }}>{currentLevel.name}</div>
                  <div style={{ fontSize: "0.62rem", color: "rgba(245,240,232,0.45)", marginTop: 2 }}>Cấp {currentLevel.id + 1} / 5</div>
                </div>
                {/* Gold badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(184,134,11,0.18)", borderRadius: 12, padding: "0.5rem 1rem", border: "1px solid rgba(184,134,11,0.4)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#B8860B" stroke="#FFD700" strokeWidth="1.5"/>
                    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#FFD700">G</text>
                  </svg>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#FFD700", letterSpacing: "0.03em" }}>{gold.toLocaleString("vi-VN")}</span>
                  <span style={{ fontSize: "0.6rem", color: "rgba(255,215,0,0.6)", fontWeight: 500 }}>Gold</span>
                </div>
              </div>
            </div>

            {/* ── Level Path ── */}
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 16, padding: "1.25rem 1.5rem" }}>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,240,232,0.5)", margin: "0 0 1rem" }}>Hành trình cấp độ</p>
              <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {LEVELS.map((lv, i) => {
                  const done = points >= lv.min;
                  const current = currentLevel.id === lv.id;
                  const isLast = i === LEVELS.length - 1;
                  return (
                    <div key={lv.id} style={{ display: "flex", alignItems: "center", flex: isLast ? 0 : 1 }}>
                      {/* node */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, position: "relative" }}>
                        <div style={{ width: current ? 48 : 38, height: current ? 48 : 38, borderRadius: "50%", background: done ? lv.color : "rgba(255,255,255,0.1)", border: current ? `3px solid ${C.gold}` : `2px solid ${done ? lv.color : "rgba(255,255,255,0.15)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: current ? "1.4rem" : "1.1rem", transition: "all 0.3s", boxShadow: current ? `0 0 16px ${lv.color}88` : "none", flexShrink: 0 }}>
                          {done ? lv.icon : <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>{lv.icon}</span>}
                        </div>
                        <span style={{ fontSize: "0.6rem", color: current ? C.gold : done ? "rgba(245,240,232,0.75)" : "rgba(245,240,232,0.3)", fontWeight: current ? 700 : 500, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>{lv.name}</span>
                        <span style={{ fontSize: "0.55rem", color: "rgba(245,240,232,0.3)", whiteSpace: "nowrap" }}>{lv.min.toLocaleString()} EXP</span>
                      </div>
                      {/* connector */}
                      {!isLast && (
                        <div style={{ flex: 1, height: 3, background: points >= LEVELS[i + 1].min ? `linear-gradient(90deg, ${lv.color}, ${LEVELS[i + 1].color})` : "rgba(255,255,255,0.1)", borderRadius: 2, margin: "0 4px", marginBottom: 28 }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {/* progress bar to next level */}
              {nextLevel && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: "0.68rem", color: "rgba(245,240,232,0.5)" }}>{points.toLocaleString("vi-VN")} EXP</span>
                    <span style={{ fontSize: "0.68rem", color: "rgba(245,240,232,0.5)" }}>Còn {(nextLevel.min - points).toLocaleString("vi-VN")} EXP → <strong style={{ color: nextLevel.color }}>{nextLevel.name}</strong></span>
                  </div>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${levelPct}%`, background: `linear-gradient(90deg, ${currentLevel.color}, ${nextLevel.color})`, borderRadius: 4, transition: "width 1s ease" }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══ TOURISM STATS ══ */}
          <div className="p-card bl-grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "1.5rem", animationDelay: "0.08s" }}>
            {[
              { icon: "✨", label: "EXP", value: points.toLocaleString("vi-VN"), color: C.gold, bg: "#FFF8EE" },
              {
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#B8860B" stroke="#FFD700" strokeWidth="1.5"/>
                    <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#FFD700">G</text>
                  </svg>
                ),
                label: "Gold", value: gold.toLocaleString("vi-VN"), color: "#B8860B", bg: "#FFFBF0",
              },
              { icon: "🗺️", label: "Địa điểm khám phá", value: profile.places_visited ?? "0", color: C.moss, bg: "#EEF5EE" },
              { icon: <img src="/img/main_page/hoa_mai.png" style={{ width: 26, height: 26, objectFit: "contain" }} alt="" />, label: "Workshop đã đăng ký", value: profile.workshops_joined ?? totalActivities, color: "#9B3A1A", bg: "#FEF3E2" },
              { icon: "📅", label: "Ngày tham gia", value: joinDate, color: "#666", bg: "#F7F3ED", small: true },
            ].map(({ icon, label, value, color, bg, small }) => (
              <div key={label} style={{ background: bg, borderRadius: 18, padding: "1.4rem 1.1rem", textAlign: "center", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem", display: "flex", justifyContent: "center", alignItems: "center" }}>{icon}</div>
                <div style={{ fontFamily: small ? "'Be Vietnam Pro'" : "'Playfair Display', serif", fontSize: small ? "0.82rem" : "1.55rem", fontWeight: 600, color, lineHeight: 1.2, marginBottom: "0.3rem" }}>{value}</div>
                <div style={{ fontSize: "0.68rem", color: "#aaa", fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ══ NHIỆM VỤ HẰNG NGÀY ══ */}
          {(() => {
            const totalExp = doneTasks.reduce((s, id) => s + (DAILY_TASKS.find(t => t.id === id)?.exp ?? 0), 0);
            const maxExp   = DAILY_TASKS.reduce((s, t) => s + t.exp, 0);
            return (
              <div className="p-card" style={{ background: "white", borderRadius: 22, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)", marginBottom: "1.5rem", animationDelay: "0.11s" }}>
                {/* header */}
                <div style={{ padding: "1.4rem 1.75rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "linear-gradient(90deg, #EEF5F0 0%, #F7F3ED 100%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.5rem" }}>📋</span>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: C.dark, margin: 0 }}>Nhiệm vụ hằng ngày</h3>
                      <p style={{ fontSize: "0.68rem", color: "#aaa", margin: 0 }}>Làm mới lúc 00:00 mỗi ngày</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ background: C.moss, color: "white", padding: "0.3rem 0.85rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 700, marginBottom: 6 }}>
                      {doneTasks.length} / {DAILY_TASKS.length} hoàn thành
                    </div>
                    {/* progress bar */}
                    <div style={{ width: 140, height: 5, background: "rgba(0,0,0,0.08)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(doneTasks.length / DAILY_TASKS.length) * 100}%`, background: `linear-gradient(90deg, ${C.moss}, ${C.sage})`, borderRadius: 4, transition: "width 0.5s ease" }} />
                    </div>
                    <p style={{ fontSize: "0.6rem", color: "#aaa", margin: "4px 0 0", textAlign: "right" }}>
                      {totalExp} / {maxExp} EXP hôm nay
                    </p>
                  </div>
                </div>

                {/* task list */}
                <div style={{ padding: "0.75rem 1.75rem 1.25rem" }}>
                  {DAILY_TASKS.map((task, i) => {
                    const done = doneTasks.includes(task.id);
                    return (
                      <div key={task.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "0.8rem 0",
                        borderBottom: i < DAILY_TASKS.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                        opacity: done ? 0.7 : 1,
                        transition: "opacity 0.3s",
                        position: "relative",
                      }}>
                        {/* checkbox */}
                        <div style={{
                          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                          background: done ? C.moss : "transparent",
                          border: `2px solid ${done ? C.moss : "rgba(0,0,0,0.2)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.25s",
                        }}>
                          {done && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        {/* icon + label */}
                        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{task.icon}</span>
                        <span style={{
                          flex: 1, fontSize: "0.86rem", fontWeight: 500, color: C.dark,
                          textDecoration: done ? "line-through" : "none",
                        }}>
                          {task.label}
                        </span>

                        {/* Reward badge: vàng hoặc EXP */}
                        {task.gold ? (
                          <span style={{
                            display: "flex", alignItems: "center", gap: 4,
                            fontSize: "0.72rem", fontWeight: 700,
                            color: done ? "#aaa" : "#B8860B",
                            background: done ? "#F5F5F5" : "#FFF8E1",
                            padding: "0.2rem 0.6rem", borderRadius: "2rem",
                            border: `1px solid ${done ? "#E0E0E0" : "rgba(184,134,11,0.3)"}`,
                            flexShrink: 0, transition: "all 0.3s",
                          }}>
                            <GoldIcon size={13} />
                            +{task.gold.toLocaleString("vi-VN")}
                          </span>
                        ) : (
                          <span style={{
                            fontSize: "0.72rem", fontWeight: 700,
                            color: done ? "#aaa" : C.gold,
                            background: done ? "#F5F5F5" : "#FFF8EE",
                            padding: "0.2rem 0.6rem", borderRadius: "2rem",
                            border: `1px solid ${done ? "#E0E0E0" : "rgba(200,150,62,0.25)"}`,
                            flexShrink: 0, transition: "all 0.3s",
                          }}>
                            +{task.exp} EXP
                          </span>
                        )}

                        {/* Floating popup */}
                        {expPopups[task.id] && (
                          <span className="exp-popup">
                            {task.gold ? `+${task.gold.toLocaleString("vi-VN")} 🪙` : `+${task.exp} EXP ✨`}
                          </span>
                        )}

                        {/* action button */}
                        {!task.auto && (
                          task.location ? (
                            /* ── Nút checkin định vị ── */
                            <button
                              onClick={handleCheckinBinhLoi}
                              disabled={done || locationChecking}
                              style={{
                                padding: "0.28rem 0.75rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 600,
                                border: `1.5px solid ${done ? "#ddd" : "#B8860B"}`,
                                background: done ? "#F5F5F5" : locationChecking ? "#FFF8E1" : "transparent",
                                color: done ? "#bbb" : "#B8860B",
                                cursor: (done || locationChecking) ? "default" : "pointer",
                                fontFamily: "'Be Vietnam Pro', sans-serif",
                                transition: "all 0.2s", flexShrink: 0,
                                opacity: locationChecking ? 0.7 : 1,
                              }}
                              onMouseEnter={e => { if (!done && !locationChecking) { e.currentTarget.style.background = "#B8860B"; e.currentTarget.style.color = "white"; } }}
                              onMouseLeave={e => { if (!done && !locationChecking) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#B8860B"; } }}
                            >
                              {done ? "Đã checkin ✓" : locationChecking ? "Đang xác định..." : "📍 Bật định vị"}
                            </button>
                          ) : COMMUNITY_TASKS.has(task.id) ? (
                            <button
                              onClick={() => !done && onGoToCommunity?.({ id: task.id, exp: task.exp })}
                              disabled={done}
                              style={{
                                padding: "0.28rem 0.75rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 600,
                                border: `1.5px solid ${done ? "#ddd" : C.moss}`,
                                background: done ? "#F5F5F5" : "transparent",
                                color: done ? "#bbb" : C.moss,
                                cursor: done ? "default" : "pointer",
                                fontFamily: "'Be Vietnam Pro', sans-serif",
                                transition: "all 0.2s", flexShrink: 0,
                              }}
                              onMouseEnter={e => { if (!done) { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; } }}
                              onMouseLeave={e => { if (!done) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.moss; } }}
                            >
                              {done ? "Đã xong" : "Đến cộng đồng →"}
                            </button>
                          ) : (
                            <button
                              onClick={() => completeTask(task.id)}
                              disabled={done || taskLoading[task.id]}
                              style={{
                                padding: "0.28rem 0.75rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 600,
                                border: `1.5px solid ${done ? "#ddd" : C.moss}`,
                                background: done ? "#F5F5F5" : "transparent",
                                color: done ? "#bbb" : C.moss,
                                cursor: (done || taskLoading[task.id]) ? "default" : "pointer",
                                fontFamily: "'Be Vietnam Pro', sans-serif",
                                transition: "all 0.2s", flexShrink: 0,
                                opacity: taskLoading[task.id] ? 0.6 : 1,
                              }}
                              onMouseEnter={e => { if (!done && !taskLoading[task.id]) { e.currentTarget.style.background = C.moss; e.currentTarget.style.color = "white"; } }}
                              onMouseLeave={e => { if (!done && !taskLoading[task.id]) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.moss; } }}
                            >
                              {taskLoading[task.id] ? "..." : done ? "Đã xong" : "Hoàn thành"}
                            </button>
                          )
                        )}
                        {task.auto && done && (
                          <span style={{ fontSize: "0.72rem", color: "#aaa", flexShrink: 0 }}>Tự động</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Thông báo định vị */}
                {locationMsg && (
                  <div style={{
                    margin: "0 1.75rem 1rem",
                    padding: "0.65rem 1rem",
                    borderRadius: 10,
                    fontSize: "0.8rem", fontWeight: 500,
                    background: locationMsg.type === "success" ? "#EEF5EE" : "#FEF0EC",
                    color: locationMsg.type === "success" ? C.moss : "#C0392B",
                    border: `1px solid ${locationMsg.type === "success" ? "rgba(61,90,62,0.2)" : "rgba(192,57,43,0.2)"}`,
                    animation: "toastIn 0.3s ease",
                  }}>
                    {locationMsg.type === "success" ? "✅" : "⚠️"} {locationMsg.text}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ══ NHIỆM VỤ FACEBOOK ══ */}
          {(() => {
            const token = localStorage.getItem("access_token");

            const uploadProof = async (file) => {
              if (!file) return;
              setFbUploading(true); setFbError("");
              const form = new FormData();
              form.append("screenshot", file);
              try {
                const res = await fetch(`${API_BASE}/api/v1/social/facebook/submit-proof`, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                  body: form,
                });
                const data = await res.json();
                if (!res.ok) { setFbError(data.detail || "Lỗi khi phân tích ảnh"); setFbPreview(null); return; }
                setFbProofs(prev => [data, ...prev]);
                setFbPreview(null);
                if (data.exp_awarded > 0) {
                  setFbExpToast(data.exp_awarded);
                  setProfile(prev => prev ? { ...prev, points: (prev.points ?? 0) + data.exp_awarded } : prev);
                  setTimeout(() => setFbExpToast(null), 3500);
                }
              } catch { setFbError("Không thể kết nối server"); }
              finally { setFbUploading(false); }
            };

            const deleteProof = async (id) => {
              await fetch(`${API_BASE}/api/v1/social/facebook/proof/${id}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${token}` },
              });
              setFbProofs(prev => prev.filter(x => x.id !== id));
            };

            const totalExp = fbProofs.reduce((s, x) => s + x.exp_awarded, 0);

            return (
              <div className="p-card" style={{ background: "white", borderRadius: 22, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)", marginBottom: "1.5rem", animationDelay: "0.12s" }}>
                {/* Header */}
                <div style={{ padding: "1.4rem 1.75rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "linear-gradient(135deg, #1877F2 0%, #0D5FCA 100%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.024 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.885v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                    <div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "white", margin: 0 }}>Chia sẻ Facebook</h3>
                      <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.65)", margin: 0 }}>Chụp màn hình bài đăng có #BinhLoi · 1 like = 1 điểm EXP</p>
                    </div>
                  </div>
                  {totalExp > 0 && (
                    <div style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 14, padding: "0.3rem 0.85rem", textAlign: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "white" }}>+{totalExp.toLocaleString("vi-VN")}</div>
                      <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.6)" }}>EXP đã nhận</div>
                    </div>
                  )}
                </div>

                <div style={{ padding: "1.25rem 1.75rem" }}>
                  {/* EXP toast */}
                  {fbExpToast && (
                    <div style={{ background: "#EEF5EE", border: "1.5px solid rgba(61,90,62,0.25)", borderRadius: 12, padding: "0.65rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8, animation: "toastIn 0.3s ease" }}>
                      <span style={{ fontSize: "1.2rem" }}>✨</span>
                      <span style={{ fontSize: "0.88rem", fontWeight: 700, color: C.moss }}>+{fbExpToast.toLocaleString("vi-VN")} EXP nhận được!</span>
                    </div>
                  )}

                  {/* Upload zone */}
                  <div style={{ marginBottom: "1.25rem" }}>
                    <p style={{ fontSize: "0.72rem", color: "#888", marginBottom: "0.85rem", lineHeight: 1.7 }}>
                      Đăng bài Facebook có hashtag <strong style={{ color: "#1877F2" }}>#BinhLoi</strong> → chụp màn hình hiển thị rõ số like, bình luận, chia sẻ → tải lên để nhận điểm.
                    </p>

                    {/* Dropzone */}
                    <label style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      gap: "0.6rem", border: `2px dashed ${fbUploading ? "#1877F2" : "rgba(24,119,242,0.3)"}`,
                      borderRadius: 16, padding: "1.5rem", cursor: fbUploading ? "wait" : "pointer",
                      background: fbUploading ? "rgba(24,119,242,0.04)" : "#F8FAFF",
                      transition: "all 0.2s", minHeight: 110,
                    }}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "#1877F2"; e.currentTarget.style.background = "rgba(24,119,242,0.07)"; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = "rgba(24,119,242,0.3)"; e.currentTarget.style.background = "#F8FAFF"; }}
                      onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = "rgba(24,119,242,0.3)";
                        e.currentTarget.style.background = "#F8FAFF";
                        const file = e.dataTransfer.files[0];
                        if (file) { setFbPreview(URL.createObjectURL(file)); uploadProof(file); }
                      }}
                    >
                      <input type="file" accept="image/*" style={{ display: "none" }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) { setFbPreview(URL.createObjectURL(file)); uploadProof(file); }
                          e.target.value = "";
                        }}
                        disabled={fbUploading}
                      />
                      {fbUploading ? (
                        <>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          <p style={{ fontSize: "0.82rem", color: "#1877F2", fontWeight: 600 }}>AI đang phân tích ảnh...</p>
                          <p style={{ fontSize: "0.7rem", color: "#aaa" }}>Groq đang đọc số like, bình luận, chia sẻ</p>
                        </>
                      ) : fbPreview ? (
                        <img src={fbPreview} alt="preview" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 10, objectFit: "contain" }} />
                      ) : (
                        <>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1877F2" strokeWidth="1.5" opacity="0.6"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          <p style={{ fontSize: "0.82rem", color: "#555", fontWeight: 500 }}>Kéo thả hoặc <span style={{ color: "#1877F2", fontWeight: 700 }}>chọn ảnh</span></p>
                          <p style={{ fontSize: "0.68rem", color: "#bbb" }}>JPG, PNG · Tối đa 8MB · {MAX_PROOFS_PER_DAY} ảnh/ngày</p>
                        </>
                      )}
                    </label>

                    {fbError && (
                      <div style={{ marginTop: "0.6rem", background: "#FEF0EC", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "0.55rem 0.9rem", fontSize: "0.76rem", color: "#C0392B" }}>
                        ⚠️ {fbError}
                      </div>
                    )}
                  </div>

                  {/* History */}
                  {fbProofs.length > 0 && (
                    <>
                      <p style={{ fontSize: "0.65rem", fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>Lịch sử nộp ảnh</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                        {fbProofs.map(proof => (
                          <div key={proof.id} style={{ display: "flex", gap: "0.85rem", alignItems: "center", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "0.7rem 0.9rem", background: "#FAFAFA" }}>
                            {/* Thumbnail */}
                            <img src={`${API_BASE}${proof.screenshot_url}`} alt=""
                              style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid rgba(0,0,0,0.08)" }} />

                            {/* Stats */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: 4 }}>
                                {[
                                  { icon: "👍", val: proof.like_count, label: "like" },
                                  { icon: "💬", val: proof.comment_count, label: "bình luận" },
                                  { icon: "↗️", val: proof.share_count, label: "chia sẻ" },
                                ].map(s => (
                                  <span key={s.label} style={{ fontSize: "0.78rem", color: C.dark }}>
                                    {s.icon} <strong>{s.val.toLocaleString("vi-VN")}</strong> <span style={{ color: "#aaa", fontSize: "0.65rem" }}>{s.label}</span>
                                  </span>
                                ))}
                              </div>
                              <p style={{ fontSize: "0.62rem", color: "#bbb" }}>
                                {new Date(proof.submitted_at).toLocaleString("vi-VN")}
                              </p>
                            </div>

                            {/* EXP badge */}
                            <div style={{ textAlign: "center", flexShrink: 0 }}>
                              <div style={{ background: "#EEF5EE", border: "1px solid rgba(61,90,62,0.2)", borderRadius: 10, padding: "0.25rem 0.65rem" }}>
                                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: C.moss }}>+{proof.exp_awarded}</div>
                                <div style={{ fontSize: "0.58rem", color: "#888" }}>EXP</div>
                              </div>
                            </div>

                            <button onClick={() => deleteProof(proof.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: "0.85rem", padding: "0 2px", flexShrink: 0 }}
                              title="Xóa">✕</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <p style={{ fontSize: "0.62rem", color: "#ccc", marginTop: "1rem", textAlign: "center" }}>
                    Tối đa {MAX_PROOFS_PER_DAY} ảnh/ngày · Groq AI tự đọc số liệu · 1 like = 1 EXP (tối đa 500 EXP/ảnh)
                  </p>
                </div>
              </div>
            );
          })()}

          {/* ══ CỬA HÀNG & TÚI ĐỒ — 2 icon lớn ══ */}
          {(() => {
            const currentGold = profile?.gold ?? 0;
            return (
              <div className="p-card" style={{ background: "white", borderRadius: 22, padding: "1.5rem 1.75rem", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)", marginBottom: "1.5rem", animationDelay: "0.13s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                  <div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: C.dark, margin: "0 0 2px" }}>Cửa hàng & Túi đồ</h3>
                    <p style={{ fontSize: "0.67rem", color: "#aaa", margin: 0 }}>Đổi Gold lấy vật phẩm đặc biệt của Bình Lợi</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#FFF8E1", border: "1.5px solid #F9A825", borderRadius: 14, padding: "0.3rem 0.85rem" }}>
                    <GoldIcon size={20} />
                    <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#E65100" }}>{currentGold.toLocaleString("vi-VN")}</span>
                    <span style={{ fontSize: "0.65rem", color: "#BCAAA4", fontWeight: 500 }}>Gold</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1.25rem" }}>
                  {/* Cửa hàng */}
                  <button onClick={() => setShopModal("shop")} style={{
                    flex: 1, border: "2px solid #F9A825", borderRadius: 20, background: "linear-gradient(145deg,#FFF8E1,#FFF3CD)", cursor: "pointer",
                    padding: "1.5rem 1rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.65rem",
                    boxShadow: "0 4px 18px rgba(249,168,37,0.2)", transition: "all 0.2s", fontFamily: "'Be Vietnam Pro', sans-serif",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(249,168,37,0.35)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 18px rgba(249,168,37,0.2)"; }}
                  >
                    <img src="/img/main_page/cua_hang.jpeg" alt="Cửa hàng" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 18, border: "3px solid #F9A825", boxShadow: "0 4px 14px rgba(249,168,37,0.35)" }} />
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#3E2723" }}>Cửa hàng</div>
                    <div style={{ fontSize: "0.72rem", color: "#8D6E63", lineHeight: 1.4, textAlign: "center" }}>Mua vật phẩm<br/>& đặc sản Bình Lợi</div>
                    <div style={{ background: "#F9A825", color: "#3E2723", fontWeight: 700, fontSize: "0.72rem", padding: "0.3rem 1rem", borderRadius: 20, marginTop: "0.25rem" }}>
                      {shopItems.length} vật phẩm
                    </div>
                  </button>

                  {/* Túi đồ */}
                  <button onClick={() => setShopModal("bag")} style={{
                    flex: 1, border: "2px solid #A1887F", borderRadius: 20, background: "linear-gradient(145deg,#EFEBE9,#E8E0DB)", cursor: "pointer",
                    padding: "1.5rem 1rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.65rem",
                    boxShadow: "0 4px 18px rgba(121,85,72,0.15)", transition: "all 0.2s", fontFamily: "'Be Vietnam Pro', sans-serif",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(121,85,72,0.28)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 18px rgba(121,85,72,0.15)"; }}
                  >
                    <img src="/img/main_page/tui_do.png" alt="Túi đồ" style={{ width: 90, height: 90, objectFit: "contain", filter: "drop-shadow(0 4px 10px rgba(121,85,72,0.3))" }} />
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "#3E2723" }}>Túi đồ</div>
                    <div style={{ fontSize: "0.72rem", color: "#8D6E63", lineHeight: 1.4, textAlign: "center" }}>Vật phẩm<br/>đã sở hữu</div>
                    <div style={{ background: inventory.length > 0 ? "#795548" : "#D7CCC8", color: inventory.length > 0 ? "#FFF8E1" : "#A1887F", fontWeight: 700, fontSize: "0.72rem", padding: "0.3rem 1rem", borderRadius: 20, marginTop: "0.25rem" }}>
                      {inventory.length > 0 ? `${inventory.length} vật phẩm` : "Trống"}
                    </div>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ══ MODAL CỬA HÀNG & TÚI ĐỒ ══ */}
          {shopModal && (() => {
            const RARITY = {
              common:    { label: "Phổ thông",   color: "#78909C", bg: "#ECEFF1" },
              uncommon:  { label: "Hiếm",         color: "#43A047", bg: "#E8F5E9" },
              rare:      { label: "Quý hiếm",     color: "#1E88E5", bg: "#E3F2FD" },
              epic:      { label: "Huyền bí",     color: "#8E24AA", bg: "#F3E5F5" },
              legendary: { label: "Huyền thoại",  color: "#F57F17", bg: "#FFF8E1" },
            };
            const ownedMap = Object.fromEntries(inventory.map(i => [i.item_id, i.quantity]));
            const currentGold = profile?.gold ?? 0;
            const isShop = shopModal === "shop";

            return (
              <>
                {/* Backdrop */}
                <div onClick={() => { setShopModal(null); setSelectedInvItem(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)", zIndex: 400 }} />

                {/* Panel */}
                <div style={{
                  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                  width: "min(860px, 94vw)", maxHeight: "85vh",
                  background: "white", borderRadius: 24, zIndex: 401,
                  display: "flex", flexDirection: "column",
                  boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
                  animation: "slideUp2 0.28s cubic-bezier(.22,.68,0,1.2)",
                  overflow: "hidden",
                }}>
                  {/* Modal header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", background: isShop ? "linear-gradient(90deg,#FFF8E1,#FFF3CD)" : "linear-gradient(90deg,#EFEBE9,#F5F5F5)", flexShrink: 0 }}>
                    <img src={isShop ? "/img/main_page/cua_hang.jpeg" : "/img/main_page/tui_do.png"} alt=""
                      style={{ width: 44, height: 44, objectFit: isShop ? "cover" : "contain", borderRadius: isShop ? 10 : 0, border: isShop ? "2px solid #F9A825" : "none" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: "1.1rem", color: "#3E2723" }}>{isShop ? "Cửa hàng" : "Túi đồ"}</div>
                      <div style={{ fontSize: "0.68rem", color: "#A1887F" }}>{isShop ? "Đổi Gold lấy vật phẩm đặc biệt" : `${inventory.length} vật phẩm đang sở hữu`}</div>
                    </div>
                    {/* Gold */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#FFF8E1", border: "1.5px solid #F9A825", borderRadius: 14, padding: "0.3rem 0.85rem" }}>
                      <GoldIcon size={20} />
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#E65100" }}>{currentGold.toLocaleString("vi-VN")}</span>
                    </div>
                    {/* Tab switcher */}
                    <div style={{ display: "flex", background: "#F5F0E8", borderRadius: 12, padding: 3, gap: 2 }}>
                      {[["shop", "🛍️ Cửa hàng"], ["bag", "🎒 Túi đồ"]].map(([t, l]) => (
                        <button key={t} onClick={() => { setShopModal(t); setSelectedInvItem(null); }} style={{
                          border: "none", cursor: "pointer", padding: "0.3rem 0.9rem", borderRadius: 9,
                          background: shopModal === t ? "white" : "transparent",
                          color: shopModal === t ? "#3E2723" : "#A1887F",
                          fontWeight: shopModal === t ? 700 : 500, fontSize: "0.78rem",
                          boxShadow: shopModal === t ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                          fontFamily: "'Be Vietnam Pro',sans-serif", transition: "all 0.2s",
                        }}>{l}</button>
                      ))}
                    </div>
                    {/* Close */}
                    <button onClick={() => { setShopModal(null); setSelectedInvItem(null); }} style={{ background: "none", border: "1.5px solid #D7CCC8", color: "#A1887F", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
                  </div>

                  {/* Modal body — scrollable */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem 1.5rem" }}>

                    {/* ── CỬA HÀNG ── */}
                    {isShop && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem" }}>
                        {shopItems.map(item => {
                          const rm = RARITY[item.rarity] || RARITY.common;
                          const owned = ownedMap[item.id] ?? 0;
                          const canAfford = currentGold >= item.price;
                          const isBuying = shopBuying === item.id;
                          return (
                            <div key={item.id} style={{
                              borderRadius: 16, border: `1.5px solid ${owned ? "#43A047" : rm.color}22`,
                              background: "#FAFAFA", overflow: "hidden", position: "relative",
                              boxShadow: owned ? "0 3px 14px rgba(67,160,71,0.14)" : "0 2px 10px rgba(0,0,0,0.06)",
                              transition: "transform 0.15s, box-shadow 0.15s",
                            }}
                              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = owned ? "0 3px 14px rgba(67,160,71,0.14)" : "0 2px 10px rgba(0,0,0,0.06)"; }}
                            >
                              {owned > 0 && (
                                <div style={{ position: "absolute", top: 8, right: 8, background: "#43A047", color: "#fff", fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.45rem", borderRadius: 9, zIndex: 1 }}>
                                  ✓{owned > 1 ? ` x${owned}` : ""}
                                </div>
                              )}
                              <div style={{ background: rm.bg, display: "flex", alignItems: "center", justifyContent: "center", height: 96, fontSize: "3rem" }}>{item.icon}</div>
                              <div style={{ padding: "0.65rem 0.75rem" }}>
                                <div style={{ display: "inline-block", background: rm.bg, color: rm.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 7, marginBottom: "0.3rem" }}>{rm.label}</div>
                                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#3E2723", lineHeight: 1.3, marginBottom: "0.2rem" }}>{item.name}</div>
                                <div style={{ fontSize: "0.68rem", color: "#999", lineHeight: 1.45, marginBottom: "0.55rem" }}>{item.description}</div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#E65100" }}><GoldIcon size={16} /> {item.price}</span>
                                  <button onClick={() => buyItem(item)} disabled={isBuying || !canAfford} style={{
                                    border: "none", cursor: canAfford ? "pointer" : "not-allowed",
                                    background: canAfford ? "#F9A825" : "#E0E0E0",
                                    color: canAfford ? "#3E2723" : "#aaa",
                                    fontWeight: 700, fontSize: "0.72rem", padding: "0.32rem 0.7rem", borderRadius: 11,
                                    opacity: isBuying ? 0.6 : 1, transition: "all 0.15s",
                                    fontFamily: "'Be Vietnam Pro',sans-serif",
                                  }}>
                                    {isBuying ? "..." : canAfford ? "Mua" : <>Không đủ <GoldIcon size={14} /></>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── TÚI ĐỒ ── */}
                    {!isShop && (
                      inventory.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                          <img src="/img/main_page/tui_do.png" alt="" style={{ width: 80, opacity: 0.3, marginBottom: "1rem" }} />
                          <p style={{ color: "#bbb", fontWeight: 600, margin: "0 0 0.5rem" }}>Túi đồ trống rỗng</p>
                          <p style={{ color: "#ccc", fontSize: "0.8rem", margin: "0 0 1.25rem" }}>Hãy ghé cửa hàng mua vật phẩm đầu tiên!</p>
                          <button onClick={() => setShopModal("shop")} style={{ border: "none", background: "#F9A825", color: "#3E2723", fontWeight: 700, padding: "0.55rem 1.5rem", borderRadius: 18, cursor: "pointer", fontFamily: "'Be Vietnam Pro',sans-serif" }}>
                            🛍️ Đến cửa hàng
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
                            {inventory.map(item => {
                              const rm = RARITY[item.rarity] || RARITY.common;
                              const isSelected = selectedInvItem?.item_id === item.item_id;
                              return (
                                <div key={item.item_id} onClick={() => setSelectedInvItem(isSelected ? null : item)} style={{
                                  borderRadius: 16, border: `1.5px solid ${isSelected ? rm.color : rm.color + "33"}`,
                                  background: isSelected ? rm.bg : "#FAFAFA", overflow: "hidden", cursor: "pointer",
                                  boxShadow: isSelected ? `0 6px 22px ${rm.color}33` : "0 2px 10px rgba(0,0,0,0.06)",
                                  transform: isSelected ? "translateY(-4px)" : "", transition: "all 0.2s",
                                }}>
                                  <div style={{ background: rm.bg, display: "flex", alignItems: "center", justifyContent: "center", height: 96, fontSize: "3rem", position: "relative" }}>
                                    {item.icon}
                                    {item.quantity > 1 && (
                                      <div style={{ position: "absolute", bottom: 7, right: 9, background: "#3E2723", color: "#F9A825", fontSize: "0.62rem", fontWeight: 700, padding: "0.12rem 0.4rem", borderRadius: 8 }}>x{item.quantity}</div>
                                    )}
                                  </div>
                                  <div style={{ padding: "0.6rem 0.75rem" }}>
                                    <div style={{ display: "inline-block", background: rm.bg, color: rm.color, fontSize: "0.6rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 7, marginBottom: "0.25rem" }}>{rm.label}</div>
                                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#3E2723", lineHeight: 1.3 }}>{item.name}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {selectedInvItem && (() => {
                            const rm = RARITY[selectedInvItem.rarity] || RARITY.common;
                            return (
                              <div style={{ marginTop: "1.25rem", background: rm.bg, borderRadius: 18, padding: "1.1rem 1.35rem", border: `1.5px solid ${rm.color}55`, animation: "slideUp2 0.2s ease", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                                <div style={{ fontSize: "2.8rem", flexShrink: 0, width: 64, height: 64, background: "rgba(255,255,255,0.75)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{selectedInvItem.icon}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#3E2723", marginBottom: "0.25rem" }}>{selectedInvItem.name}</div>
                                  <div style={{ fontSize: "0.75rem", color: "#777", lineHeight: 1.55, marginBottom: "0.55rem" }}>{selectedInvItem.description}</div>
                                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                    <span style={{ background: "rgba(255,255,255,0.85)", color: rm.color, fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 9 }}>{rm.label}</span>
                                    <span style={{ background: "rgba(255,255,255,0.85)", color: "#666", fontSize: "0.65rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 9 }}>Số lượng: {selectedInvItem.quantity}</span>
                                    <span style={{ background: "rgba(255,255,255,0.85)", color: "#999", fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: 9 }}>
                                      {new Date(selectedInvItem.acquired_at).toLocaleDateString("vi-VN")}
                                    </span>
                                  </div>
                                </div>
                                <button onClick={() => setSelectedInvItem(null)} style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", fontSize: "1.1rem", padding: "0.2rem", flexShrink: 0 }}>✕</button>
                              </div>
                            );
                          })()}
                        </>
                      )
                    )}
                  </div>
                </div>

                {/* Toast */}
                {shopToast && (
                  <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", background: shopToast.ok ? "#43A047" : "#E53935", color: "#fff", padding: "0.7rem 1.5rem", borderRadius: 22, fontWeight: 600, fontSize: "0.88rem", boxShadow: "0 6px 24px rgba(0,0,0,0.2)", zIndex: 500, whiteSpace: "nowrap", animation: "toastIn 0.25s ease" }}>
                    {shopToast.msg}
                  </div>
                )}
              </>
            );
          })()}


          {/* ══ THÀNH TÍCH ══ */}
          <div className="p-card" style={{ background: "white", borderRadius: 22, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)", marginBottom: "1.5rem", animationDelay: "0.14s" }}>
            {/* header */}
            <div style={{ padding: "1.4rem 1.75rem", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg, #FFFBF0 0%, #F7F3ED 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.5rem" }}>🏆</span>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: C.dark, margin: 0 }}>Bảng thành tích</h3>
                  <p style={{ fontSize: "0.68rem", color: "#aaa", margin: 0 }}>Mở khoá thành tích qua hoạt động du lịch</p>
                </div>
              </div>
              <div style={{ background: C.gold, color: "white", padding: "0.3rem 0.85rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 700 }}>{earnedCount} / {allAchs.length}</div>
            </div>

            {/* tier column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.65rem", padding: "0.75rem 1.75rem", borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)" }}>
              {Object.values(TIER_META).map(t => (
                <div key={t.label} style={{ textAlign: "center", fontSize: "0.57rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: t.color, padding: "0.25rem 0.3rem", background: "rgba(255,255,255,0.75)", borderRadius: 6, border: `1px solid ${t.border}44` }}>{t.label}</div>
              ))}
            </div>

            {/* category rows */}
            {ACHIEVEMENT_ROWS.map(row => (
              <div key={row.id} style={{ padding: "1rem 1.75rem", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: "0.65rem" }}>
                  <span style={{ fontSize: "0.9rem" }}>{row.icon}</span>
                  <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#bbb", letterSpacing: "0.16em", textTransform: "uppercase" }}>{row.label}</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.65rem" }}>
                  {row.tiers.map(ach => {
                    const ts = TIER_META[ach.tier];
                    return (
                      <div key={ach.id} className={ach.earned ? "achievement-earned" : ""} style={{ borderRadius: 14, padding: "0.85rem 0.55rem", textAlign: "center", position: "relative", overflow: "hidden", background: ach.earned ? ts.bg : "#F5F5F5", border: `1.5px solid ${ach.earned ? ts.border : "#E0E0E0"}`, boxShadow: ach.earned ? ts.glow : "none", opacity: ach.earned ? 1 : 0.45, backgroundSize: ach.earned && ts.shimmer ? "200% auto" : undefined }}>
                        {ach.earned && ts.shimmer && <div className="shimmer-bg" style={{ position: "absolute", inset: 0, background: ts.bg, backgroundSize: "200% auto", pointerEvents: "none", opacity: 0.65, borderRadius: 12 }} />}
                        <div className={ach.earned ? "cup-float" : ""} style={{ marginBottom: "0.3rem", position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {ach.img
                            ? <img src={ach.img} alt={ach.name} style={{ width: 40, height: 40, objectFit: "contain", filter: ach.earned ? "drop-shadow(0 2px 8px rgba(200,150,62,0.5))" : "grayscale(1) opacity(0.4)" }} />
                            : <span style={{ fontSize: "1.65rem", filter: ach.earned ? undefined : "grayscale(1)" }}>{ach.icon}</span>
                          }
                        </div>
                        <p style={{ fontSize: "0.67rem", fontWeight: 700, color: ach.earned ? C.dark : "#bbb", margin: "0 0 3px", position: "relative", zIndex: 1, lineHeight: 1.3 }}>{ach.name}</p>
                        <p style={{ fontSize: "0.56rem", color: ach.earned ? "#888" : "#ccc", margin: 0, lineHeight: 1.4, position: "relative", zIndex: 1 }}>{ach.desc}</p>
                        {!ach.earned && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#ddd" }}>🔒</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ══ HOẠT ĐỘNG GẦN ĐÂY ══ */}
          <div className="p-card" style={{ background: "white", borderRadius: 22, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.05)", marginBottom: "1.5rem", animationDelay: "0.2s" }}>
            <div style={{ padding: "1.25rem 1.75rem", borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: C.dark, margin: 0 }}>Hoạt động gần đây</h3>
              <span style={{ fontSize: "0.7rem", color: "#bbb" }}>{totalActivities} hoạt động</span>
            </div>
            {history.length === 0 ? (
              <div style={{ padding: "2.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🌿</div>
                <p style={{ fontSize: "0.85rem", color: "#bbb", marginBottom: "0.5rem" }}>Chưa có hoạt động nào.</p>
                <span style={{ color: C.moss, cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }} onClick={onGoExplore}>Khám phá ngay →</span>
              </div>
            ) : (
              history.map((h, i) => {
                const d = new Date(h.created_at);
                const dateStr = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                // Colors and icons per type
                const amtColor = h.sign === "+" ? C.gold : "#8B6F47";
                const bgIcon = h.type === "game" ? "#F0F7F0" : h.type === "tour_booking" ? "#FFF8EE" : "#FFF5E0";
                const amtDisplay = h.sign === "+" ? `+${Number(h.amount).toLocaleString("vi-VN")} ${h.unit}` : `-${Number(h.amount).toLocaleString("vi-VN")} ${h.unit}`;
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", padding: "0.9rem 1.75rem", borderBottom: i < history.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", gap: "1rem" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: bgIcon, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                      {h.type === "game" ? <img src="/img/main_page/hoa_mai.png" style={{ width: 24, height: 24, objectFit: "contain" }} alt="" /> : h.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.82rem", fontWeight: 500, color: C.dark, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.label}</p>
                      <p style={{ fontSize: "0.68rem", color: "#bbb", margin: 0 }}>{dateStr}{h.detail ? ` · ${h.detail}` : ""}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: amtColor, margin: "0 0 1px", whiteSpace: "nowrap" }}>{amtDisplay}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ══ CTA ══ */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button onClick={onGoExplore} style={{ flex: 1, minWidth: 180, background: `linear-gradient(135deg, ${C.moss}, #1C3320)`, color: "white", border: "none", padding: "0.9rem 1.5rem", borderRadius: "2rem", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", boxShadow: "0 6px 20px rgba(61,90,62,0.35)" }}>
              🎮 Tích điểm &amp; Khám phá
            </button>
            <button onClick={onBack} style={{ flex: 1, minWidth: 180, background: "white", color: C.dark, border: "1.5px solid rgba(0,0,0,0.1)", padding: "0.9rem 1.5rem", borderRadius: "2rem", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              🏡 Về trang chủ
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
