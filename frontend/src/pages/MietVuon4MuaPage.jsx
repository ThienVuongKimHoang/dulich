import { useState, useEffect, useRef, useCallback } from "react";

// ─── PALETTE ───
const P = {
  spring:  { primary: "#4CAF50", light: "#E8F5E9", dark: "#1B5E20", accent: "#8BC34A", text: "#2E7D32" },
  summer:  { primary: "#F57C00", light: "#FFF3E0", dark: "#E65100", accent: "#FFB300", text: "#BF360C" },
  autumn:  { primary: "#795548", light: "#EFEBE9", dark: "#3E2723", accent: "#A1887F", text: "#5D4037" },
  winter:  { primary: "#1565C0", light: "#E3F2FD", dark: "#0D47A1", accent: "#42A5F5", text: "#1A237E" },
};

const SEASONS = [
  {
    key: "spring",
    label: "Xuân",
    emoji: "🌱",
    img: "/img/miet_vuon/xuan.png",
    angle: 0,
    tagline: "Nảy lộc, chồi non, không khí Tết",
    desc: "Mùa xuân là lúc đất trời hồi sinh — những mầm xanh non nớt mọc lên từ lòng đất, mang theo hơi thở trong lành và niềm vui mới.",
    products: ["Rau gia vị thơm ngát", "Hoa quả non đầu vụ", "Dưa chuột sạch", "Rau mầm dinh dưỡng", "Húng quế, ngò gai"],
    activities: ["Gieo hạt cùng nông dân", "Tham quan vườn rau non", "Workshop làm salad rau vườn", "Chụp ảnh mùa xuân"],
    bgGradient: "linear-gradient(135deg, #E8F5E9 0%, #F1F8E9 50%, #DCEDC8 100%)",
  },
  {
    key: "summer",
    label: "Hạ",
    emoji: "☀️",
    img: "/img/miet_vuon/ha.png",
    angle: 90,
    tagline: "Mùa trái ngọt, nắng vàng, dã ngoại",
    desc: "Mùa hạ rực rỡ với những vườn trái cây sum suê, mật ngọt căng tròn — thời điểm lý tưởng để hái trái và tận hưởng dã ngoại xanh mát.",
    products: ["Bưởi da xanh Bình Lợi", "Xoài cát hòa lộc", "Trái cây nhiệt đới", "Nước ép trái cây tươi", "Cam mật vàng"],
    activities: ["Hái bưởi trực tiếp tại vườn", "Tour vườn xoài", "Làm nước ép trái cây", "Picnic dưới bóng cây"],
    bgGradient: "linear-gradient(135deg, #FFF8E1 0%, #FFF3E0 50%, #FFE0B2 100%)",
  },
  {
    key: "autumn",
    label: "Thu",
    emoji: "🍂",
    img: "/img/miet_vuon/thu.png",
    angle: 180,
    tagline: "Mùa lá rụng, không khí dịu mát",
    desc: "Mùa thu dịu dàng với sắc vàng nâu của lá, không khí mát trong và những vụ rau xanh tươi tốt — thời điểm thu hoạch phong phú nhất.",
    products: ["Rau ăn lá xanh tươi", "Các loại đậu hữu cơ", "Củ cải, cà rốt", "Bí đỏ, bí xanh", "Rau muống, rau dền"],
    activities: ["Thu hoạch rau theo mùa", "Học làm dưa cải truyền thống", "Workshop nấu ăn từ rau vườn", "Ngắm cảnh mùa thu"],
    bgGradient: "linear-gradient(135deg, #EFEBE9 0%, #FBE9E7 50%, #FFCCBC 100%)",
  },
  {
    key: "winter",
    label: "Đông",
    emoji: "🌿",
    img: "/img/miet_vuon/dong.png",
    angle: 270,
    tagline: "Mùa của sự ấm áp, thu hoạch",
    desc: "Mùa đông se lạnh mang đến những loại rau cải ngọt bùi, nồi lẩu ấm từ rau vườn và những buổi workshop trà thư giãn bên bếp lửa hồng.",
    products: ["Các loại rau cải ngọt", "Nông sản khô sấy tự nhiên", "Trà thảo mộc vườn nhà", "Khoai lang, khoai môn", "Cải xanh, cải ngọt"],
    activities: ["Workshop pha trà thảo mộc", "Học làm nông sản khô", "Tham quan bếp lửa truyền thống", "Nấu lẩu rau vườn"],
    bgGradient: "linear-gradient(135deg, #E3F2FD 0%, #E8EAF6 50%, #EDE7F6 100%)",
  },
];

function getCurrentSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

// ─── SEASON WHEEL ───
function SeasonWheel({ activeSeason, onSelect }) {
  const [rotating, setRotating] = useState(false);
  const [rotation, setRotation] = useState(0);

  const handleSelect = (season, idx) => {
    if (rotating) return;
    setRotating(true);
    const target = idx * 90;
    setRotation(target);
    setTimeout(() => { onSelect(season.key); setRotating(false); }, 600);
  };

  const pal = P[activeSeason];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ position: "relative", width: 280, height: 280 }}>
        {/* Center circle */}
        <div style={{
          position: "absolute", inset: "50%", transform: "translate(-50%,-50%)",
          width: 90, height: 90, borderRadius: "50%",
          background: pal.primary,
          boxShadow: `0 0 0 6px white, 0 0 0 8px ${pal.primary}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10, transition: "background 0.6s",
        }}>
          <img src={SEASONS.find(s => s.key === activeSeason)?.img} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: "50%" }} />
        </div>

        {/* Season segments */}
        {SEASONS.map((s, i) => {
          const angle = i * 90 - 45;
          const rad = (angle * Math.PI) / 180;
          const r = 105;
          const x = 140 + r * Math.cos(rad);
          const y = 140 + r * Math.sin(rad);
          const isActive = s.key === activeSeason;

          return (
            <button
              key={s.key}
              onClick={() => handleSelect(s, i)}
              style={{
                position: "absolute",
                left: x - 36, top: y - 36,
                width: 72, height: 72,
                borderRadius: "50%",
                background: isActive ? P[s.key].primary : "white",
                border: `3px solid ${P[s.key].primary}`,
                cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                boxShadow: isActive ? `0 6px 24px ${P[s.key].primary}66` : "0 2px 10px rgba(0,0,0,0.1)",
                transform: isActive ? "scale(1.15)" : "scale(1)",
                transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                zIndex: isActive ? 5 : 2,
              }}
            >
              <img src={s.img} alt={s.label} style={{ width: 38, height: 38, objectFit: "cover", borderRadius: "50%" }} />
              <span style={{ fontSize: "0.58rem", fontWeight: 700, color: isActive ? "white" : P[s.key].text, letterSpacing: "0.05em" }}>{s.label}</span>
            </button>
          );
        })}

        {/* Connecting lines */}
        <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width="280" height="280">
          {SEASONS.map((s, i) => {
            const angle = i * 90 - 45;
            const rad = (angle * Math.PI) / 180;
            const r1 = 45, r2 = 68;
            const x1 = 140 + r1 * Math.cos(rad), y1 = 140 + r1 * Math.sin(rad);
            const x2 = 140 + r2 * Math.cos(rad), y2 = 140 + r2 * Math.sin(rad);
            return (
              <line key={s.key} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={s.key === activeSeason ? P[s.key].primary : "#ddd"}
                strokeWidth="2" strokeDasharray={s.key === activeSeason ? "none" : "4,3"}
              />
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {SEASONS.map(s => (
          <div key={s.key} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: s.key === activeSeason ? P[s.key].primary : "#ddd",
            transition: "background 0.4s",
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── LIVE STATUS WIDGET ───
function LiveStatusWidget({ activeSeason }) {
  const [time, setTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Determine open status
  const hour = time.getHours();
  const isOpen = hour >= 7 && hour < 18;
  const pal = P[activeSeason];

  // Mock weather based on season & time
  useEffect(() => {
    const seasonWeather = {
      spring: { temp: 27, humidity: 72, condition: "Mưa nhẹ" },
      summer: { temp: 34, humidity: 65, condition: "Nắng to" },
      autumn: { temp: 29, humidity: 68, condition: "Mây rải rác" },
      winter: { temp: 24, humidity: 80, condition: "Mát mẻ" },
    };
    setWeatherData(seasonWeather[activeSeason]);
  }, [activeSeason]);

  const timeStr = time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = time.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{
      background: "white", borderRadius: 20, padding: "1.5rem",
      border: `2px solid ${pal.primary}33`,
      boxShadow: `0 8px 32px ${pal.primary}15`,
      transition: "border-color 0.6s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: isOpen ? "#4CAF50" : "#F44336", animation: "pulse 1.5s infinite" }} />
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isOpen ? "#2E7D32" : "#C62828", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {isOpen ? "🟢 Vườn đang mở cửa" : "🔴 Vườn đang đóng cửa"}
        </span>
      </div>

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: pal.primary, fontWeight: 600, marginBottom: 4, transition: "color 0.6s" }}>
        {timeStr}
      </div>
      <div style={{ fontSize: "0.7rem", color: "#888", marginBottom: "1.2rem" }}>{dateStr}</div>

      {weatherData && (
        <div style={{ display: "flex", gap: "1rem" }}>
          {[
            { icon: "🌡️", label: "Nhiệt độ", val: `${weatherData.temp}°C` },
            { icon: "💧", label: "Độ ẩm", val: `${weatherData.humidity}%` },
            { icon: "☁️", label: "Thời tiết", val: weatherData.condition },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, textAlign: "center", padding: "0.6rem", background: pal.light, borderRadius: 10, transition: "background 0.6s" }}>
              <div style={{ fontSize: "1.1rem", marginBottom: 2 }}>{item.icon}</div>
              <div style={{ fontSize: "0.68rem", color: "#999", marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: pal.text, transition: "color 0.6s" }}>{item.val}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "1rem", padding: "0.6rem 0.9rem", background: pal.light, borderRadius: 10, fontSize: "0.75rem", color: pal.text, transition: "all 0.6s" }}>
        📍 <strong>Bình Lợi, Bình Chánh, TP.HCM</strong> · Giờ mở cửa: 7:00 – 18:00
      </div>
    </div>
  );
}

// ─── FARMING DIARY MODAL ───
function FarmingDiaryModal({ onClose }) {
  const diaryEntries = [
    { week: "Tuần 3, Tháng 6", crop: "Bưởi da xanh", stage: "Thu hoạch", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTNf9uEwIeiNaON0Ri7gashvj2NmWr0rbkKWu5EyWlAqsswc2hPtLMVww&s=10", desc: "Bưởi đã chín vàng đều, vị ngọt thanh mát. Chuẩn bị thu hoạch đợt đầu." },
    { week: "Tuần 2, Tháng 6", crop: "Rau muống sạch", stage: "Chăm sóc", img: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQsW843lVlmO63VuzWQ1RMBFKG2H0YPpDIoE4SNVxaqRGkhQ5PuZLrsHOs&s=10", desc: "Tưới nước và bón phân hữu cơ, rau phát triển xanh tốt đúng tiêu chuẩn VietGAP." },
    { week: "Tuần 1, Tháng 6", crop: "Cà chua bi", stage: "Ra quả", img: "https://cdn.eva.vn/upload/1-2021/images/2021-02-11/mua-ca-chua-bi-nen-chon-qua-tron-hay-nhon-dau-bep-mach-meo-chon-deu-ngot-va-ngon-4d3ce98dd2cf482a873a4808a08575a0-1613000711-258-width700height580.jpg", desc: "Cà chua bắt đầu đậu quả, màu sắc tươi đỏ. Dự kiến thu hoạch sau 2 tuần nữa." },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 24, maxWidth: 560, width: "100%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "#1C2B1D", marginBottom: 4 }}>📔 Nhật ký canh tác</h3>
            <p style={{ fontSize: "0.75rem", color: "#888" }}>Cập nhật hàng tuần từ vườn Bình Lợi</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f5f5f5", cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>
        <div style={{ padding: "1rem 1.5rem 1.5rem" }}>
          {diaryEntries.map((e, i) => (
            <div key={i} style={{ marginBottom: "1.25rem", borderRadius: 14, overflow: "hidden", border: "1px solid #f0f0f0" }}>
              <img src={e.img} alt={e.crop} style={{ width: "100%", height: 160, objectFit: "cover" }} />
              <div style={{ padding: "0.9rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: "0.62rem", background: "#E8F5E9", color: "#2E7D32", padding: "0.2rem 0.6rem", borderRadius: "2rem", fontWeight: 600 }}>{e.stage}</span>
                  <span style={{ fontSize: "0.65rem", color: "#aaa" }}>{e.week}</span>
                </div>
                <h4 style={{ fontSize: "0.9rem", color: "#1C2B1D", marginBottom: 4, fontWeight: 600 }}>{e.crop}</h4>
                <p style={{ fontSize: "0.78rem", color: "#666", lineHeight: 1.6 }}>{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SUBSCRIPTION MODAL ───
function SubscriptionModal({ onClose }) {
  const [selected, setSelected] = useState("weekly");
  const plans = [
    { id: "weekly", label: "Mỗi tuần", price: "250.000đ", desc: "Gói rau sạch 3–4 loại, đủ cho gia đình 4 người/tuần", popular: true },
    { id: "biweekly", label: "2 tuần/lần", price: "450.000đ", desc: "Gói rau sạch 5–6 loại + 1 loại trái cây theo mùa" },
    { id: "monthly", label: "Hàng tháng", price: "800.000đ", desc: "Gói đầy đủ: rau sạch + trái cây + nông sản đặc biệt" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "white", borderRadius: 24, maxWidth: 480, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: "#1C2B1D", marginBottom: 4 }}>📦 Đăng ký định kỳ</h3>
            <p style={{ fontSize: "0.75rem", color: "#888" }}>Rau sạch tự động giao tận nhà</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f5f5f5", cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem" }}>
          {plans.map(plan => (
            <button key={plan.id} onClick={() => setSelected(plan.id)}
              style={{ width: "100%", padding: "1rem", borderRadius: 14, border: `2px solid ${selected === plan.id ? "#3D5A3E" : "#eee"}`, background: selected === plan.id ? "#EEF5EE" : "white", cursor: "pointer", textAlign: "left", marginBottom: 10, transition: "all 0.2s", position: "relative", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              {plan.popular && (
                <span style={{ position: "absolute", top: 10, right: 10, fontSize: "0.6rem", background: "#C8963E", color: "white", padding: "0.2rem 0.55rem", borderRadius: "2rem", fontWeight: 600 }}>PHỔ BIẾN</span>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1C2B1D" }}>{plan.label}</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: "#3D5A3E", fontWeight: 600 }}>{plan.price}</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#777", margin: 0 }}>{plan.desc}</p>
            </button>
          ))}
          <button style={{ width: "100%", padding: "0.9rem", background: "#3D5A3E", color: "white", border: "none", borderRadius: 14, fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
            Đăng ký gói {plans.find(p => p.id === selected)?.label}
          </button>
          <p style={{ textAlign: "center", fontSize: "0.7rem", color: "#aaa", marginTop: 10 }}>Hủy bất cứ lúc nào · Giao hàng thứ 6 hàng tuần</p>
        </div>
      </div>
    </div>
  );
}

// ─── INTERACTIVE GARDEN MAP ───
const GARDEN_ZONES = [
  {
    id: "rau-sach", name: "Khu Rau Sạch", icon: "🥬",
    color: "#43A047", hoverColor: "#2E7D32",
    area: "1.8 ha", count: "20+ loại rau",
    desc: "Khu canh tác rau theo tiêu chuẩn VietGAP với hệ thống tưới nhỏ giọt tự động. Không phân bón hoá học, không thuốc trừ sâu.",
    products: { spring: ["Húng quế", "Ngò gai", "Dưa chuột", "Rau mầm"], summer: ["Rau muống", "Mồng tơi", "Rau dền", "Bí đao"], autumn: ["Cải xanh", "Cải ngọt", "Xà lách"], winter: ["Cải bẹ", "Cải thìa", "Xà lách xoong"] },
    shape: "rect", x: 20, y: 22, w: 340, h: 175, patternId: "gm-vegbed", labelX: 190, labelY: 95,
  },
  {
    id: "cay-an-trai", name: "Vườn Cây Ăn Trái", icon: "🍊",
    color: "#F57C00", hoverColor: "#E65100",
    area: "2.2 ha", count: "12 loại cây",
    desc: "Vườn trồng bưởi da xanh, xoài cát hoà lộc, cam mật, ổi xá lỵ. Cây đã đạt tuổi thu hoạch ổn định 5–15 năm.",
    products: { spring: ["Ổi xá lỵ", "Mãng cầu non"], summer: ["Bưởi da xanh", "Xoài cát", "Cam mật"], autumn: ["Mãng cầu ta", "Ổi", "Đu đủ"], winter: ["Bưởi", "Cam", "Quýt đường"] },
    shape: "rect", x: 422, y: 22, w: 358, h: 175, patternId: "gm-trees", labelX: 601, labelY: 95,
  },
  {
    id: "tiep-khach", name: "Khu Đón Tiếp", icon: "🏠",
    color: "#455A64", hoverColor: "#263238",
    area: "0.2 ha", count: "Nhà hàng & Cửa hàng",
    desc: "Khu đón tiếp du khách với nhà hàng farm-to-table và cửa hàng mua nông sản tươi mang về nhà.",
    products: { spring: [], summer: [], autumn: [], winter: [] },
    shape: "rect", x: 20, y: 247, w: 110, h: 168, patternId: null, labelX: 75, labelY: 322,
  },
  {
    id: "ao-ca", name: "Ao Cá Sinh Thái", icon: "🐟",
    color: "#1E88E5", hoverColor: "#1565C0",
    area: "0.5 ha", count: "6 loại cá",
    desc: "Ao nuôi cá tự nhiên theo hướng sinh thái. Nước lọc qua thực vật thủy sinh, không dùng kháng sinh.",
    products: { spring: ["Cá rô phi", "Cá diêu hồng"], summer: ["Cá lóc", "Cá trê vàng"], autumn: ["Cá chép", "Cá rô phi"], winter: ["Cá lóc", "Cá bống kèo"] },
    shape: "ellipse", cx: 193, cy: 332, rx: 58, ry: 58, patternId: "gm-water", labelX: 193, labelY: 328,
  },
  {
    id: "thao-moc", name: "Vườn Thảo Mộc", icon: "🌿",
    color: "#6D4C41", hoverColor: "#4E342E",
    area: "0.6 ha", count: "15 loại cây",
    desc: "Vùng trồng cây thảo mộc: sả, gừng, nghệ, bạc hà, atiso. Nguyên liệu cho workshop trà và các món đặc sản.",
    products: { spring: ["Sả tươi", "Gừng non"], summer: ["Bạc hà", "Nghệ tươi", "Sả"], autumn: ["Gừng", "Nghệ", "Atiso"], winter: ["Sả khô", "Trà gừng mật ong"] },
    shape: "rect", x: 258, y: 247, w: 112, h: 168, patternId: "gm-herb", labelX: 314, labelY: 322,
  },
  {
    id: "nha-kinh", name: "Nhà Kính Hữu Cơ", icon: "🏡",
    color: "#7B1FA2", hoverColor: "#4A148C",
    area: "0.4 ha", count: "Rau mầm & Nấm",
    desc: "Nhà kính kiểm soát vi khí hậu tự động. Trồng rau mầm, nấm sạch và rau thủy canh quanh năm.",
    products: { spring: ["Rau mầm", "Cải thủy canh"], summer: ["Nấm rơm", "Rau mầm nhiều màu"], autumn: ["Nấm đùi gà", "Cải Brussels"], winter: ["Rau mầm", "Nấm đùi gà"] },
    shape: "rect", x: 422, y: 247, w: 358, h: 168, patternId: "gm-glass", labelX: 601, labelY: 322,
  },
];

function GardenMapInteractive({ activeSeason }) {
  const [selectedZone, setSelectedZone] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);
  const selectedData = GARDEN_ZONES.find(z => z.id === selectedZone);
  const toggle = (id) => setSelectedZone(prev => prev === id ? null : id);

  const zoneProps = (z) => ({
    fill: hoveredZone === z.id || selectedZone === z.id ? z.hoverColor : z.color,
    fillOpacity: selectedZone === z.id ? 0.93 : hoveredZone === z.id ? 0.88 : 0.78,
    stroke: selectedZone === z.id ? "white" : "rgba(255,255,255,0.5)",
    strokeWidth: selectedZone === z.id ? 3 : 1.2,
    style: { cursor: "pointer", transition: "fill 0.2s, fill-opacity 0.2s" },
    onMouseEnter: () => setHoveredZone(z.id),
    onMouseLeave: () => setHoveredZone(null),
    onClick: () => toggle(z.id),
  });

  return (
    <div style={{ background: "white", borderRadius: 20, overflow: "hidden", border: "1px solid #eee", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
      {/* Header + legend */}
      <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: "#1C2B1D", marginBottom: 2 }}>🗺️ Bản đồ khu vườn tương tác</h3>
          <p style={{ fontSize: "0.67rem", color: "#aaa" }}>Click vào từng khu để xem chi tiết · 5 hecta · VietGAP</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {GARDEN_ZONES.map(z => (
            <button key={z.id} onClick={() => toggle(z.id)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: "2rem", border: `1.5px solid ${z.color}55`, background: selectedZone === z.id ? z.color : "transparent", color: selectedZone === z.id ? "white" : z.color, fontSize: "0.62rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: selectedZone === z.id ? "white" : z.color, flexShrink: 0 }} />
              {z.name.replace(/^(Khu |Vườn |Nhà |Ao )/, "")}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Map */}
      <div style={{ userSelect: "none" }}>
        <svg viewBox="0 0 800 470" style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <pattern id="gm-grass" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="4" cy="4" r="1.3" fill="#A5D6A7" opacity="0.45" />
              <circle cx="14" cy="14" r="1" fill="#81C784" opacity="0.35" />
              <circle cx="19" cy="5" r="0.8" fill="#A5D6A7" opacity="0.3" />
            </pattern>
            <pattern id="gm-vegbed" x="0" y="0" width="18" height="14" patternUnits="userSpaceOnUse">
              <rect x="2" y="1" width="14" height="5" rx="2" fill="#1B5E20" opacity="0.22" />
              <rect x="2" y="8" width="14" height="5" rx="2" fill="#1B5E20" opacity="0.22" />
            </pattern>
            <pattern id="gm-trees" x="0" y="0" width="52" height="52" patternUnits="userSpaceOnUse">
              <circle cx="26" cy="26" r="16" fill="#2E7D32" opacity="0.28" />
              <circle cx="26" cy="23" r="10" fill="#388E3C" opacity="0.33" />
            </pattern>
            <pattern id="gm-water" x="0" y="0" width="44" height="20" patternUnits="userSpaceOnUse">
              <path d="M0,10 Q11,2 22,10 Q33,18 44,10" fill="none" stroke="#0D47A1" strokeWidth="1.2" opacity="0.35" />
            </pattern>
            <pattern id="gm-herb" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="3.5" fill="#3E2723" opacity="0.22" />
              <circle cx="3" cy="3" r="2" fill="#4E342E" opacity="0.18" />
              <circle cx="17" cy="17" r="2" fill="#4E342E" opacity="0.18" />
            </pattern>
            <pattern id="gm-glass" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="28" y2="28" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <line x1="28" y1="0" x2="0" y2="28" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </pattern>
            <filter id="gm-shadow">
              <feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Backgrounds */}
          <rect width="800" height="470" fill="#C8E6C9" />
          <rect width="800" height="470" fill="url(#gm-grass)" />

          {/* Vertical road */}
          <rect x="378" y="0" width="44" height="428" fill="#D7CCC8" />
          <line x1="400" y1="0" x2="400" y2="428" stroke="#BCAAA4" strokeWidth="1.5" strokeDasharray="14,10" />

          {/* Cross roads */}
          <rect x="0" y="208" width="378" height="28" fill="#D7CCC8" />
          <rect x="422" y="208" width="378" height="28" fill="#D7CCC8" />

          {/* Entrance */}
          <rect x="0" y="428" width="800" height="42" fill="#A1887F" />
          <rect x="338" y="415" width="124" height="55" rx="6" fill="#5D4037" filter="url(#gm-shadow)" />
          <rect x="338" y="415" width="12" height="40" rx="2" fill="#4E342E" />
          <rect x="450" y="415" width="12" height="40" rx="2" fill="#4E342E" />
          <text x="400" y="447" textAnchor="middle" fill="white" fontSize="11.5" fontWeight="700" fontFamily="sans-serif">CỔNG VÀO</text>

          {/* Zones */}
          {GARDEN_ZONES.map(z => (
            <g key={z.id}>
              {z.shape === "rect"
                ? <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" {...zoneProps(z)} />
                : <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} {...zoneProps(z)} />}
              {z.patternId && (
                z.shape === "rect"
                  ? <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="10" fill={`url(#${z.patternId})`} style={{ pointerEvents: "none" }} />
                  : <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill={`url(#${z.patternId})`} style={{ pointerEvents: "none" }} />
              )}
              {selectedZone === z.id && (
                z.shape === "rect"
                  ? <rect x={z.x - 4} y={z.y - 4} width={z.w + 8} height={z.h + 8} rx="14" fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="8,5" style={{ pointerEvents: "none" }} />
                  : <ellipse cx={z.cx} cy={z.cy} rx={z.rx + 6} ry={z.ry + 6} fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="8,5" style={{ pointerEvents: "none" }} />
              )}
            </g>
          ))}

          {/* Labels */}
          {GARDEN_ZONES.map(z => (
            <g key={`lbl-${z.id}`} style={{ pointerEvents: "none" }}>
              <text x={z.labelX} y={z.labelY} textAnchor="middle" fontSize="18">{z.icon}</text>
              <text x={z.labelX} y={z.labelY + 22} textAnchor="middle" fill="white" fontSize={z.w < 130 || z.shape === "ellipse" ? 10 : 13} fontWeight="700" fontFamily="sans-serif">{z.name.replace(/^(Khu |Vườn |Nhà |Ao )/, "")}</text>
              <text x={z.labelX} y={z.labelY + 37} textAnchor="middle" fill="rgba(255,255,255,0.82)" fontSize={z.w < 130 ? 8.5 : 10} fontFamily="sans-serif">{z.area}</text>
            </g>
          ))}

          {/* Decorative trees along road */}
          {[[368,65],[368,145],[412,85],[412,160],[368,280],[368,365],[412,300],[412,385]].map(([tx,ty],i) => (
            <g key={`tree-${i}`} style={{ pointerEvents: "none" }}>
              <circle cx={tx} cy={ty} r="9" fill="#2E7D32" opacity="0.55" />
              <circle cx={tx} cy={ty - 2} r="5.5" fill="#388E3C" opacity="0.65" />
            </g>
          ))}

          {/* Compass */}
          <g transform="translate(756, 38)">
            <circle cx="0" cy="0" r="22" fill="rgba(255,255,255,0.9)" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
            <polygon points="0,-15 3.5,2 0,8 -3.5,2" fill="#D32F2F" />
            <polygon points="0,15 3.5,-2 0,-8 -3.5,-2" fill="#aaa" />
            <circle cx="0" cy="0" r="2.5" fill="white" />
            <text x="0" y="-18" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#D32F2F" fontFamily="sans-serif">N</text>
          </g>

          {/* Scale bar */}
          <g transform="translate(16, 452)">
            <rect x="0" y="-1" width="72" height="5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
            <rect x="0" y="-1" width="36" height="5" fill="rgba(255,255,255,0.55)" />
            <text x="36" y="-5" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="8" fontFamily="sans-serif">50m</text>
            <text x="72" y="-5" textAnchor="end" fill="rgba(255,255,255,0.9)" fontSize="8" fontFamily="sans-serif">100m</text>
          </g>
        </svg>
      </div>

      {/* Detail panel */}
      {selectedData && (
        <div style={{ padding: "1.25rem 1.5rem", borderTop: "2px solid #f5f5f5", background: `linear-gradient(135deg, ${selectedData.color}08, white)`, animation: "fadeUp 0.25s ease forwards" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: `${selectedData.color}18`, border: `2px solid ${selectedData.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
              {selectedData.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#1C2B1D" }}>{selectedData.name}</h4>
                <span style={{ fontSize: "0.62rem", background: `${selectedData.color}18`, color: selectedData.color, padding: "2px 8px", borderRadius: "2rem", fontWeight: 600 }}>{selectedData.area}</span>
                <span style={{ fontSize: "0.62rem", color: "#aaa" }}>{selectedData.count}</span>
              </div>
              <p style={{ fontSize: "0.77rem", color: "#555", lineHeight: 1.7, marginBottom: "0.65rem" }}>{selectedData.desc}</p>
              {selectedData.products[activeSeason]?.length > 0 && (
                <div>
                  <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#bbb", marginBottom: 6 }}>Sản phẩm đang có — Mùa này</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedData.products[activeSeason].map(p => (
                      <span key={p} style={{ fontSize: "0.72rem", padding: "3px 10px", background: `${selectedData.color}14`, color: selectedData.color, borderRadius: "2rem", fontWeight: 500, border: `1px solid ${selectedData.color}28` }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setSelectedZone(null)}
              style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#f0f0f0", cursor: "pointer", color: "#888", fontSize: "0.8rem", flexShrink: 0 }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ───
export default function MietVuon4MuaPage({ onBack, onNavigate }) {
  const [activeSeason, setActiveSeason] = useState(getCurrentSeason);
  const [showDiary, setShowDiary] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [toast, setToast] = useState(null);

  const pal = P[activeSeason];
  const season = SEASONS.find(s => s.key === activeSeason);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const seasonCombos = {
    spring: [
      { name: "Set Vườn Xuân", price: "180.000đ", items: ["Rau gia vị thơm (500g)", "Hoa quả non đầu vụ", "Dưa chuột sạch (1kg)", "Rau mầm mix (200g)"], img: "/img/miet_vuon/set_vuon_xuan.jpeg" },
      { name: "Set Gia Vị Tết", price: "220.000đ", items: ["Húng quế (300g)", "Ngò gai (200g)", "Lá lốt (300g)", "Rau sống mix (500g)", "Ớt sạch (200g)"], img: "/img/miet_vuon/set_gia_vi_tet.jpeg" },
    ],
    summer: [
      { name: "Set Vị Ngọt Mùa Hạ", price: "320.000đ", items: ["Bưởi da xanh (2 quả)", "Cam mật (1kg)", "Xoài cát hòa lộc (500g)", "Nước ép trái cây tươi (500ml)"], img: "/img/miet_vuon/set_vi_ngot_mua_ha.jpeg" },
      { name: "Set Tropical Mix", price: "280.000đ", items: ["Trái cây nhiệt đới mix (2kg)", "Ổi xá lỵ (500g)", "Mãng cầu (300g)"], img: "/img/miet_vuon/set_tropical_mix.jpeg" },
    ],
    autumn: [
      { name: "Set Thu Hoạch", price: "195.000đ", items: ["Rau ăn lá mix (1kg)", "Đậu cô ve (500g)", "Cà rốt sạch (1kg)", "Củ cải trắng (500g)"], img: "/img/miet_vuon/set_thu_hoach.jpeg" },
      { name: "Set Củ Quả Mùa Thu", price: "245.000đ", items: ["Bí đỏ (1 quả ~1.5kg)", "Khoai lang mật (1kg)", "Bí xanh (1kg)", "Đậu bắp (500g)"], img: "/img/miet_vuon/set_qua_cu_mua_thu.jpeg" },
    ],
    winter: [
      { name: "Set Rau Cải Đông", price: "165.000đ", items: ["Cải xanh (500g)", "Cải ngọt (500g)", "Cải thìa (300g)", "Cải bẹ trắng (500g)"], img: "/img/miet_vuon/set_rau_cai_dong.jpeg" },
      { name: "Set Trà Thảo Mộc", price: "210.000đ", items: ["Trà gừng sả (100g)", "Trà atiso (100g)", "Nông sản khô (300g)", "Khoai môn sấy (200g)"], img: "/img/miet_vuon/set_tra_thao_moc.jpeg" },
    ],
  };

  const tours = [
    { name: "Tour Tham Quan Vườn", duration: "3 tiếng", price: "150.000đ/người", max: 15, desc: "Dạo quanh toàn bộ khu vườn sinh thái, tìm hiểu quy trình trồng rau sạch VietGAP.", emoji: "🌿" },
    { name: "Hái Trái Cây Tại Chỗ", duration: "2 tiếng", price: "120.000đ/người", max: 20, desc: "Tự tay hái trái cây tươi ngay tại vườn, mang về túi quà do chính tay thu hoạch.", emoji: "🍊" },
    { name: "Workshop Làm Bánh Từ Vườn", duration: "4 tiếng", price: "280.000đ/người", max: 10, desc: "Học làm bánh truyền thống từ nguyên liệu tươi của vườn dưới sự hướng dẫn của đầu bếp.", emoji: "🥐" },
    { name: "Workshop Nấu Ăn Miệt Vườn", duration: "3.5 tiếng", price: "260.000đ/người", max: 12, desc: "Học các món ăn đặc trưng Nam Bộ từ rau củ vườn: canh chua, lẩu mắm, gỏi cuốn.", emoji: "🍲" },
  ];

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'Be Vietnam Pro', sans-serif", transition: "background 0.8s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spinIn { from{transform:rotate(-90deg) scale(0.8);opacity:0} to{transform:rotate(0) scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .mv-combo-card { transition: transform 0.3s, box-shadow 0.3s; cursor: pointer; }
        .mv-combo-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.12); }
        .mv-tour-card { transition: transform 0.28s, box-shadow 0.28s; }
        .mv-tour-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .mv-season-tab { transition: all 0.3s; }
        .mv-season-tab:hover { opacity: 0.85; transform: scale(1.05); }
      `}</style>

      {/* ─── BACK BUTTON ─── */}
      <button onClick={onBack} style={{ position: "fixed", top: 20, left: 20, zIndex: 200, display: "flex", alignItems: "center", gap: 8, padding: "0.55rem 1rem", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "2rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", color: "#1C2B1D", boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        Quay lại
      </button>

      {/* ─── HERO / WHEEL SECTION ─── */}
      <section style={{ background: season.bgGradient, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "5rem 2rem 4rem", position: "relative", overflow: "hidden", transition: "background 0.8s" }}>

        {/* Decorative floating blobs */}
        <div style={{ position: "absolute", top: "15%", left: "8%", width: 200, height: 200, borderRadius: "50%", background: `${pal.primary}18`, filter: "blur(40px)", pointerEvents: "none", transition: "background 0.8s" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "6%", width: 280, height: 280, borderRadius: "50%", background: `${pal.accent}22`, filter: "blur(60px)", pointerEvents: "none", transition: "background 0.8s" }} />

        <div style={{ textAlign: "center", maxWidth: 900, width: "100%", position: "relative", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${pal.primary}18`, border: `1px solid ${pal.primary}44`, padding: "0.35rem 1.1rem", borderRadius: "2rem", marginBottom: "1.5rem", transition: "all 0.6s" }}>
            <span style={{ color: pal.primary, fontSize: "0.75rem", fontWeight: 700 }}>✦</span>
            <span style={{ fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", color: pal.text, fontWeight: 500, transition: "color 0.6s" }}>Miệt Vườn Sinh Thái Bình Lợi</span>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 4.5vw, 3.5rem)", lineHeight: 1.15, color: pal.dark, fontWeight: 400, marginBottom: "0.75rem", transition: "color 0.6s" }}>
            Vòng Quay <span style={{ color: pal.primary, fontWeight: 700, transition: "color 0.6s" }}>4 Mùa</span>
          </h1>
          <p style={{ fontSize: "1rem", color: pal.text, maxWidth: 480, margin: "0 auto 2.5rem", lineHeight: 1.8, transition: "color 0.6s" }}>
            {season.tagline}
          </p>

          {/* Wheel + Live widget layout */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3rem", flexWrap: "wrap" }}>
            <div style={{ animation: "fadeUp 0.6s ease forwards" }}>
              <SeasonWheel activeSeason={activeSeason} onSelect={setActiveSeason} />
              <p style={{ textAlign: "center", fontSize: "0.72rem", color: pal.text, marginTop: 12, opacity: 0.7, transition: "color 0.6s" }}>Click mùa để khám phá</p>
            </div>

            <div style={{ maxWidth: 300, width: "100%", animation: "fadeUp 0.8s ease 0.2s both" }}>
              <LiveStatusWidget activeSeason={activeSeason} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── SEASON CONTENT BANNER ─── */}
      <section style={{ background: pal.primary, padding: "2rem 3rem", transition: "background 0.8s" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <img src={season.img} alt={season.label} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.5)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "white", marginBottom: 6 }}>
              Mùa {season.label} tại Bình Lợi
            </h2>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>{season.desc}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {season.activities.slice(0, 2).map(act => (
              <span key={act} style={{ background: "rgba(255,255,255,0.2)", color: "white", padding: "0.35rem 0.85rem", borderRadius: "2rem", fontSize: "0.72rem", fontWeight: 500, backdropFilter: "blur(8px)" }}>{act}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VƯỜN SINH THÁI / ECO-FARM ─── */}
      <section style={{ padding: "5rem 3rem", background: "#FEFCF8" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#C8963E", marginBottom: "0.75rem" }}>✦ Eco-Farm</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#1C2B1D", marginBottom: "1rem", lineHeight: 1.2 }}>Vườn Sinh Thái</h2>
          <p style={{ fontSize: "0.9rem", color: "#666", maxWidth: 520, marginBottom: "3rem", lineHeight: 1.8 }}>
            Khu vườn rộng 5 hecta với các khu trồng rau sạch VietGAP, cây ăn trái nhiệt đới và thảo mộc tự nhiên. Tất cả không phân bón hóa học.
          </p>

          {/* ── Interactive garden map – full width ── */}
          <div style={{ marginBottom: "1.5rem" }}>
            <GardenMapInteractive activeSeason={activeSeason} />
          </div>

          {/* ── Farming Diary – horizontal card ── */}
          <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid #eee", background: "white", display: "flex", marginBottom: "2rem" }}>
            <div style={{ width: 280, flexShrink: 0, position: "relative", overflow: "hidden" }}>
              <img src="https://picsum.photos/seed/diary2/600/400" alt="Nhật ký canh tác" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 80%)" }} />
              <div style={{ position: "absolute", bottom: 14, left: 16 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.3)", padding: "0.3rem 0.8rem", borderRadius: "2rem" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4CAF50", animation: "pulse 1.5s infinite" }} />
                  <span style={{ fontSize: "0.65rem", color: "white", fontWeight: 600 }}>Cập nhật hàng tuần</span>
                </span>
              </div>
            </div>
            <div style={{ padding: "1.5rem 1.75rem", flex: 1 }}>
              <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#C8963E", marginBottom: 8 }}>✦ Nhật ký canh tác</p>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#1C2B1D", marginBottom: 8 }}>📔 Minh bạch từ đất đến bàn ăn</h3>
              <p style={{ fontSize: "0.8rem", color: "#777", lineHeight: 1.7, marginBottom: "1.25rem" }}>
                Video & hình ảnh cập nhật quy trình chăm sóc rau sạch và trái cây mỗi tuần. Bạn biết chính xác rau mình ăn được trồng như thế nào, từng ngày.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {["🌱 Gieo hạt", "💧 Chăm sóc", "🌿 Thu hoạch", "📦 Đóng gói"].map(tag => (
                  <span key={tag} style={{ fontSize: "0.7rem", padding: "3px 10px", background: "#EEF5EE", color: "#3D5A3E", borderRadius: "2rem", fontWeight: 500 }}>{tag}</span>
                ))}
              </div>
              <button onClick={() => setShowDiary(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.6rem 1.4rem", background: "#EEF5EE", color: "#3D5A3E", border: "1.5px solid #3D5A3E44", borderRadius: "2rem", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.8rem", fontWeight: 600, transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#3D5A3E"; e.currentTarget.style.color = "white"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#EEF5EE"; e.currentTarget.style.color = "#3D5A3E"; }}>
                Xem nhật ký →
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {[
              { n: "5 ha", l: "Diện tích vườn", icon: "🌾" },
              { n: "20+", l: "Loại rau sạch", icon: "🥬" },
              { n: "VietGAP", l: "Tiêu chuẩn canh tác", icon: "✅" },
              { n: "0", l: "Phân bón hóa học", icon: "🌿" },
            ].map(s => (
              <div key={s.l} style={{ textAlign: "center", padding: "1.25rem", background: pal.light, borderRadius: 16, transition: "background 0.6s" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: pal.primary, fontWeight: 600, marginBottom: 4, transition: "color 0.6s" }}>{s.n}</div>
                <div style={{ fontSize: "0.7rem", color: "#888" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── GIỎ HÀNG 4 MÙA / STORE ─── */}
      <section style={{ padding: "5rem 3rem", background: pal.light, transition: "background 0.8s" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: pal.primary, marginBottom: "0.75rem", transition: "color 0.6s" }}>✦ Store · Mùa {season.label}</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#1C2B1D", marginBottom: "1rem" }}>Giỏ Hàng 4 Mùa</h2>
          <p style={{ fontSize: "0.9rem", color: "#666", maxWidth: 520, marginBottom: "3rem", lineHeight: 1.8 }}>
            Sản phẩm đóng gói theo combo mùa vụ — tươi ngon, đúng thời điểm, giao tận nhà.
          </p>

          {/* Season tabs */}
          <div style={{ display: "flex", gap: 10, marginBottom: "2rem", flexWrap: "wrap" }}>
            {SEASONS.map(s => (
              <button key={s.key} className="mv-season-tab" onClick={() => setActiveSeason(s.key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "0.45rem 1rem", borderRadius: "2rem", border: `2px solid ${activeSeason === s.key ? P[s.key].primary : "#ddd"}`, background: activeSeason === s.key ? P[s.key].primary : "white", color: activeSeason === s.key ? "white" : "#555", cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
                <img src={s.img} alt={s.label} style={{ width: 20, height: 20, objectFit: "cover", borderRadius: "50%" }} />{s.label}
              </button>
            ))}
          </div>

          {/* Combo cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2.5rem" }}>
            {(seasonCombos[activeSeason] || []).map((combo, i) => (
              <div key={i} className="mv-combo-card"
                onClick={() => { setSelectedCombo(combo); showToast(`Đã thêm "${combo.name}" vào giỏ hàng`); }}
                style={{ borderRadius: 18, overflow: "hidden", border: `2px solid ${selectedCombo?.name === combo.name ? pal.primary : "#eee"}`, background: "white" }}>
                <div style={{ height: 180, overflow: "hidden" }}>
                  <img src={combo.img} alt={combo.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                </div>
                <div style={{ padding: "1.1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#1C2B1D" }}>{combo.name}</h3>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: pal.primary, fontWeight: 600, transition: "color 0.6s" }}>{combo.price}</span>
                  </div>
                  <ul style={{ paddingLeft: "1rem", margin: "0 0 0.9rem" }}>
                    {combo.items.map(item => (
                      <li key={item} style={{ fontSize: "0.72rem", color: "#666", marginBottom: 3 }}>{item}</li>
                    ))}
                  </ul>
                  <button style={{ width: "100%", padding: "0.5rem", background: pal.primary, color: "white", border: "none", borderRadius: 10, fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "background 0.3s" }}>
                    Thêm vào giỏ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Subscription CTA */}
          <div style={{ background: "white", borderRadius: 20, padding: "1.75rem 2rem", border: `2px dashed ${pal.primary}66`, display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ fontSize: "2.5rem" }}>📦</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "#1C2B1D", marginBottom: 6 }}>Đăng ký định kỳ</h3>
              <p style={{ fontSize: "0.8rem", color: "#666", lineHeight: 1.6 }}>Đặt gói "Rau sạch mỗi tuần" — hệ thống tự động giao hàng đúng thứ 6 hàng tuần. Không cần nhớ đặt lại.</p>
            </div>
            <button onClick={() => setShowSubscription(true)}
              style={{ padding: "0.75rem 1.75rem", background: pal.primary, color: "white", border: "none", borderRadius: "2rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.3s", boxShadow: `0 4px 16px ${pal.primary}44` }}>
              Đăng ký ngay →
            </button>
          </div>
        </div>
      </section>

      {/* ─── 4 SEASONS TABLE ─── */}
      <section style={{ padding: "5rem 3rem", background: "#1C2B1D" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#C8963E", marginBottom: "0.75rem" }}>✦ Lịch mùa vụ</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#F5F0E8", marginBottom: "1rem" }}>Trải nghiệm 4 Mùa</h2>
          <p style={{ fontSize: "0.9rem", color: "rgba(245,240,232,0.6)", maxWidth: 520, marginBottom: "3rem", lineHeight: 1.8 }}>
            Nội dung và sản phẩm thay đổi theo từng mùa — mỗi lần đến lại là một trải nghiệm hoàn toàn mới.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            {SEASONS.map(s => {
              const sp = P[s.key];
              const isActive = s.key === activeSeason;
              return (
                <div key={s.key} onClick={() => setActiveSeason(s.key)}
                  style={{ borderRadius: 18, padding: "1.5rem", background: isActive ? sp.primary : "rgba(255,255,255,0.04)", border: `2px solid ${isActive ? sp.primary : "rgba(255,255,255,0.08)"}`, cursor: "pointer", transition: "all 0.4s", transform: isActive ? "translateY(-4px)" : "none", boxShadow: isActive ? `0 12px 32px ${sp.primary}44` : "none" }}>
                  <img src={s.img} alt={s.label} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 14, marginBottom: 10, border: isActive ? "2px solid rgba(255,255,255,0.5)" : "2px solid rgba(255,255,255,0.1)" }} />
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: isActive ? "white" : "#F5F0E8", marginBottom: 6 }}>Mùa {s.label}</h3>
                  <p style={{ fontSize: "0.72rem", color: isActive ? "rgba(255,255,255,0.85)" : "rgba(245,240,232,0.5)", lineHeight: 1.6, marginBottom: "1rem" }}>{s.tagline}</p>
                  <div>
                    <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: isActive ? "rgba(255,255,255,0.7)" : "rgba(245,240,232,0.35)", marginBottom: 6 }}>Sản phẩm nổi bật</p>
                    {s.products.slice(0, 3).map(prod => (
                      <p key={prod} style={{ fontSize: "0.72rem", color: isActive ? "rgba(255,255,255,0.9)" : "rgba(245,240,232,0.6)", marginBottom: 3 }}>· {prod}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TRẢI NGHIỆM THỰC TẾ / BOOKING ─── */}
      <section style={{ padding: "5rem 3rem", background: "#FEFCF8" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#C8963E", marginBottom: "0.75rem" }}>✦ Booking</p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#1C2B1D", marginBottom: "1rem" }}>Trải Nghiệm Thực Tế</h2>
          <p style={{ fontSize: "0.9rem", color: "#666", maxWidth: 520, marginBottom: "3rem", lineHeight: 1.8 }}>
            Đặt lịch tham quan vườn, hái trái cây tại chỗ, workshop làm bánh và nấu ăn từ nguyên liệu vườn.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {tours.map((tour, i) => (
              <div key={i} className="mv-tour-card"
                style={{ background: "white", borderRadius: 18, padding: "1.5rem", border: "1px solid #eee" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: pal.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0, transition: "background 0.6s" }}>
                    {tour.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#1C2B1D", marginBottom: 6 }}>{tour.name}</h3>
                    <p style={{ fontSize: "0.78rem", color: "#777", lineHeight: 1.6, marginBottom: "0.9rem" }}>{tour.desc}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "1rem" }}>
                      <span style={{ fontSize: "0.68rem", background: "#EEF5EE", color: "#3D5A3E", padding: "0.2rem 0.6rem", borderRadius: "2rem" }}>⏱ {tour.duration}</span>
                      <span style={{ fontSize: "0.68rem", background: "#FFF8EE", color: "#8B5E3C", padding: "0.2rem 0.6rem", borderRadius: "2rem" }}>👥 Tối đa {tour.max} người</span>
                      <span style={{ fontSize: "0.68rem", background: pal.light, color: pal.text, padding: "0.2rem 0.6rem", borderRadius: "2rem", transition: "all 0.6s" }}>💰 {tour.price}</span>
                    </div>
                    <button onClick={() => { if (onNavigate) onNavigate("booking"); }}
                      style={{ padding: "0.45rem 1.1rem", background: "transparent", color: "#3D5A3E", border: "1.5px solid #3D5A3E", borderRadius: "2rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#3D5A3E"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3D5A3E"; }}>
                      Đặt lịch →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Booking CTA */}
          <div style={{ marginTop: "2.5rem", textAlign: "center", padding: "2.5rem", background: pal.light, borderRadius: 20, transition: "background 0.6s" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "#1C2B1D", marginBottom: 10 }}>Sẵn sàng khám phá miệt vườn?</h3>
            <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem", lineHeight: 1.7 }}>Đặt lịch ngay hôm nay — nhóm tối thiểu 2 người, được xác nhận trong 24h.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { if (onNavigate) onNavigate("booking"); }}
                style={{ padding: "0.85rem 2rem", background: pal.primary, color: "white", border: "none", borderRadius: "2rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 18px ${pal.primary}44`, transition: "all 0.3s" }}>
                📅 Đặt lịch ngay
              </button>
              <button onClick={() => { if (onNavigate) onNavigate("map"); }}
                style={{ padding: "0.85rem 2rem", background: "transparent", color: "#3D5A3E", border: "2px solid #3D5A3E44", borderRadius: "2rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                🗺️ Xem trên bản đồ
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER CTA ─── */}
      <section style={{ padding: "3rem", background: pal.primary, textAlign: "center", transition: "background 0.8s" }}>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", marginBottom: 6 }}>Miệt Vườn Sinh Thái · Bình Lợi, Bình Chánh, TP.HCM</p>
        <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>Mở cửa hàng ngày 7:00 – 18:00 · Liên hệ: 0901 234 567</p>
      </section>

      {/* ─── MODALS ─── */}
      {showDiary && <FarmingDiaryModal onClose={() => setShowDiary(false)} />}
      {showSubscription && <SubscriptionModal onClose={() => setShowSubscription(false)} />}

      {/* ─── TOAST ─── */}
      {toast && (
        <div style={{ position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)", background: "#1C2B1D", color: "white", padding: "0.75rem 1.5rem", borderRadius: "2rem", fontSize: "0.82rem", fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 300, animation: "fadeUp 0.3s ease forwards", whiteSpace: "nowrap" }}>
          ✅ {toast}
        </div>
      )}
    </div>
  );
}
