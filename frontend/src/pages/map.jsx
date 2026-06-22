import { useState, useEffect } from "react";

const spots = [
  {
    id: 1, name: "Làng mai vàng", tag: "Sắc vàng rực rỡ mỗi dịp Tết",
    icon: "🌸", iconImg: "/img/main_page/hoa_mai.png", bg: "#FFF0C0", border: "#F5C840", x: 27, y: 52,
    type: "Thiên nhiên", typeColor: "#2AA87A", typeBg: "#E8F5EE", typeBorder: "#A8DDB8",
    desc: "Vườn mai vàng bát ngát bừng sáng mỗi mùa xuân. Tản bộ giữa biển hoa vàng óng, chụp ảnh và thưởng thức không khí Tết đậm chất miền Nam đặc trưng của Bình Lợi.",
    tips: ["🗓 Tháng 1–2", "🎟 Miễn phí", "⏰ 8h–17h"],
  },
  {
    id: 2, name: "Nghề làm nhang", tag: "Hương thơm trăm năm còn đó",
    icon: "🕯", bg: "#FFE4D0", border: "#E8603C", x: 56, y: 38,
    type: "Làng nghề", typeColor: "#A05010", typeBg: "#FEF3E2", typeBorder: "#FDDCAA",
    desc: "Hàng trăm năm lịch sử, những bó nhang đỏ rực phơi dọc đường làng tạo nên khung cảnh hiếm có. Du khách có thể trực tiếp tham gia làm nhang cùng người dân.",
    tips: ["🗓 Quanh năm", "🚶 Tự do tham quan", "⏰ Sáng sớm đẹp nhất"],
  },
  {
    id: 3, name: "Công viên Láng Le", tag: "Xanh mát giữa lòng đô thị",
    icon: "🌿", bg: "#D8F5E0", border: "#2AA87A", x: 72, y: 58,
    type: "Thiên nhiên", typeColor: "#2AA87A", typeBg: "#E8F5EE", typeBorder: "#A8DDB8",
    desc: "Kênh rạch, đồng lúa và rừng tràm xen kẽ. Lý tưởng cho picnic, đạp xe, chèo thuyền kayak và ngắm chim — một góc thiên nhiên yên bình hiếm có ngay sát Sài Gòn.",
    tips: ["🗓 Quanh năm", "🎟 ~20.000đ", "⏰ 6h–18h"],
  },
  {
    id: 4, name: "Chùa Phật Cô Đơn", tag: "Tượng Phật bình yên giữa đồng",
    icon: "🏛", bg: "#FFE4D0", border: "#E8603C", x: 22, y: 72,
    type: "Di tích", typeColor: "#A32D2D", typeBg: "#FCEBEB", typeBorder: "#F09595",
    desc: "Ngôi chùa cổ với tượng Phật đứng uy nghiêm giữa cánh đồng bát ngát, vừa linh thiêng vừa thơ mộng. Đặc biệt đẹp vào buổi sáng sớm khi sương còn phủ nhẹ.",
    tips: ["🗓 Quanh năm", "🎟 Miễn phí", "⏰ 5h–19h"],
  },
  {
    id: 5, name: "Cánh đồng lúa", tag: "Thảm xanh trải dài đến chân trời",
    icon: "🌾", bg: "#F0FFD8", border: "#78C030", x: 48, y: 78,
    type: "Thiên nhiên", typeColor: "#2AA87A", typeBg: "#E8F5EE", typeBorder: "#A8DDB8",
    desc: "Sắc xanh mơn mởn vào mùa mạ, vàng rực vào mùa gặt. Background ruộng lúa trải dài, mây trời phản chiếu — vẻ đẹp mộc mạc thuần Việt cực kỳ photogenic.",
    tips: ["🗓 Tháng 3–5 & 9–11", "🎟 Miễn phí", "⏰ Chiều tà đẹp nhất"],
  },
  {
    id: 6, name: "Kênh rạch miệt vườn", tag: "Chèo thuyền khám phá kênh xưa",
    icon: "🛶", bg: "#D0F0FF", border: "#28A8D8", x: 80, y: 78,
    type: "Thiên nhiên", typeColor: "#2AA87A", typeBg: "#E8F5EE", typeBorder: "#A8DDB8",
    desc: "Kênh rạch chằng chịt với hai bên bờ là vườn cây ăn trái xanh um. Thuê thuyền nhỏ, hít thở không khí trong lành, thưởng thức trái cây tươi hái thẳng từ vườn.",
    tips: ["🗓 Quanh năm", "🎟 ~50.000đ/thuyền", "⏰ 7h–16h"],
  },
];

const trees = [
  { top: "28%", left: "2%", w: 36, h: 50, sway: "ts" },
  { top: "32%", left: "7%", w: 28, h: 40, sway: "ts2" },
  { top: "28%", right: "3%", w: 32, h: 44, sway: "ts" },
  { top: "32%", right: "9%", w: 24, h: 36, sway: "ts2" },
  { bottom: "24%", left: "3%", w: 30, h: 42, sway: "ts" },
  { bottom: "22%", right: "5%", w: 26, h: 38, sway: "ts2" },
];

function Tree({ style, w, h, sway }) {
  const animStyle =
    sway === "ts"
      ? { animation: "treeSway 3s ease-in-out infinite", transformOrigin: "bottom center" }
      : { animation: "treeSway2 3.5s ease-in-out infinite", transformOrigin: "bottom center" };
  return (
    <svg style={{ position: "absolute", pointerEvents: "none", ...style }} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <g style={animStyle}>
        <ellipse cx={w / 2} cy={h * 0.28} rx={w * 0.46} ry={h * 0.24} fill="#4AAE28" />
        <ellipse cx={w / 2} cy={h * 0.38} rx={w * 0.38} ry={h * 0.19} fill="#3A9E18" />
        <rect x={w * 0.38} y={h * 0.5} width={w * 0.24} height={h * 0.45} rx="2" fill="#7A5030" />
      </g>
    </svg>
  );
}

function Cloud({ style, w, h, animClass }) {
  const animMap = {
    c1: { animation: "cloudDrift 18s ease-in-out infinite alternate" },
    c2: { animation: "cloudDrift2 22s ease-in-out infinite alternate" },
    c3: { animation: "cloudDrift 14s ease-in-out infinite alternate" },
  };
  return (
    <svg style={{ position: "absolute", pointerEvents: "none", ...animMap[animClass], ...style }} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <ellipse cx={w * 0.5} cy={h * 0.72} rx={w * 0.43} ry={h * 0.42} fill="white" opacity="0.92" />
      <ellipse cx={w * 0.32} cy={h * 0.6} rx={w * 0.26} ry={h * 0.46} fill="white" opacity="0.92" />
      <ellipse cx={w * 0.68} cy={h * 0.56} rx={w * 0.22} ry={h * 0.42} fill="white" opacity="0.92" />
      <ellipse cx={w * 0.5} cy={h * 0.52} rx={w * 0.34} ry={h * 0.46} fill="white" opacity="0.92" />
    </svg>
  );
}

function Pin({ spot, isActive, onClick }) {
  return (
    <div
      id={`pin-${spot.id}`}
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        transform: "translate(-50%, -50%)",
        cursor: "pointer",
        zIndex: isActive ? 30 : 20,
        animation: isActive
          ? "pinBounceActive 0.8s ease-in-out infinite"
          : `pinBounce 2.2s ease-in-out infinite`,
        animationDelay: `${spot.id * 0.3}s`,
        userSelect: "none",
      }}
    >
      <div style={{ width: 48, height: 54, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 46, height: 46,
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
          background: spot.bg,
          border: `3px solid ${spot.border}`,
          position: "relative",
          boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
        }}>
          {spot.iconImg
            ? <img src={spot.iconImg} style={{ width: 28, height: 28, objectFit: "contain" }} alt="" />
            : <span>{spot.icon}</span>}
          <div style={{
            position: "absolute", top: -6, right: -6,
            width: 20, height: 20, borderRadius: "50%",
            background: "#fff", color: "#1C1008",
            fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid rgba(0,0,0,0.1)",
          }}>
            {spot.id}
          </div>
        </div>
        <div style={{
          position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: `10px solid ${spot.border}`,
        }} />
      </div>
      <div style={{
        position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
        whiteSpace: "nowrap",
        fontSize: 10, fontWeight: 700,
        background: "rgba(255,255,255,0.92)", color: "#3D2008",
        padding: "3px 8px", borderRadius: 10,
        border: "1.5px solid rgba(255,255,255,0.6)",
        pointerEvents: "none",
      }}>
        {spot.name}
      </div>
    </div>
  );
}

function DetailPanel({ spot, onClose }) {
  if (!spot) return null;
  return (
    <div style={{
      position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
      width: "94%", maxWidth: 600,
      background: "#FFFDF7",
      border: "2.5px solid rgba(232,144,60,0.4)",
      borderRadius: 20,
      padding: "18px 22px",
      zIndex: 50,
      animation: "panelIn 0.25s ease",
      fontFamily: "'Be Vietnam Pro', sans-serif",
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, flexShrink: 0,
          background: spot.bg,
          border: `2px solid ${spot.border}`,
        }}>
          {spot.iconImg
            ? <img src={spot.iconImg} style={{ width: 36, height: 36, objectFit: "contain" }} alt="" />
            : spot.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#3D2008", lineHeight: 1.2 }}>{spot.name}</div>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: 12, color: "#B06030", marginTop: 3 }}>{spot.tag}</div>
        </div>
        <button onClick={onClose} style={{
          background: "#F5EDE0", border: "none", color: "#B06030",
          width: 30, height: 30, borderRadius: "50%", cursor: "pointer",
          fontSize: 15, fontWeight: 700, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>
      <p style={{ fontSize: 13, color: "#5A3820", lineHeight: 1.72, marginBottom: 14 }}>{spot.desc}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {spot.tips.map((t) => (
          <div key={t} style={{
            padding: "5px 12px", borderRadius: 20,
            fontSize: 11, fontWeight: 700,
            background: "#FEF3E2", color: "#A05010",
            border: "1.5px solid #FDDCAA",
          }}>{t}</div>
        ))}
        <div style={{
          padding: "5px 12px", borderRadius: 20,
          fontSize: 11, fontWeight: 700,
          background: spot.typeBg, color: spot.typeColor,
          border: `1.5px solid ${spot.typeBorder}`,
          marginLeft: "auto",
        }}>{spot.type}</div>
      </div>
    </div>
  );
}

export default function TreasureMap() {
  const [activeId, setActiveId] = useState(null);
  const activeSpot = spots.find((s) => s.id === activeId) || null;

  const handlePin = (id) => setActiveId((prev) => (prev === id ? null : id));

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro', 'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&family=Playfair+Display:ital@1&display=swap');
        @keyframes cloudDrift  { 0%{transform:translateX(0)} 100%{transform:translateX(60px)} }
        @keyframes cloudDrift2 { 0%{transform:translateX(0)} 100%{transform:translateX(-50px)} }
        @keyframes treeSway    { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
        @keyframes treeSway2   { 0%,100%{transform:rotate(2deg)} 50%{transform:rotate(-2deg)} }
        @keyframes pinBounce   { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.15)} }
        @keyframes pinBounceActive { 0%,100%{transform:translate(-50%,-50%) scale(1.2)} 50%{transform:translate(-50%,-50%) scale(1.35)} }
        @keyframes sunSpin     { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes waterFlow   { 0%{stroke-dashoffset:0} 100%{stroke-dashoffset:-40} }
        @keyframes birdFly     { 0%{transform:translate(0,0)} 100%{transform:translate(320px,-20px)} }
        @keyframes birdFly2    { 0%{transform:translate(0,0)} 100%{transform:translate(300px,-30px)} }
        @keyframes panelIn     { from{opacity:0;transform:translateX(-50%) translateY(14px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
      `}</style>

      <div style={{
        background: "#B8E4F0",
        minHeight: 700,
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
      }}>

        {/* ── MAP SVG BACKGROUND ── */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 680 700" preserveAspectRatio="none">
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE066" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFE066" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="680" height="700" fill="#B8E4F0" />
          <ellipse cx="580" cy="80" rx="70" ry="70" fill="url(#sunGlow)" />
          <circle cx="580" cy="80" r="34" fill="#FFD93D" />
          <g style={{ transformOrigin: "580px 80px", animation: "sunSpin 20s linear infinite" }}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 580 + Math.cos(rad) * 42;
              const y1 = 80 + Math.sin(rad) * 42;
              const x2 = 580 + Math.cos(rad) * 52;
              const y2 = 80 + Math.sin(rad) * 52;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFD93D" strokeWidth={i % 2 === 0 ? 4 : 3} strokeLinecap="round" />;
            })}
          </g>
          <rect x="0" y="320" width="680" height="380" fill="#A8D878" />
          <ellipse cx="340" cy="322" rx="380" ry="30" fill="#8CC85A" />
          <path d="M 80 340 Q 160 320 200 360 Q 240 400 180 420 Q 120 440 80 410 Z" fill="#78B840" opacity="0.6" />
          <path d="M 420 350 Q 500 330 540 370 Q 570 400 520 425 Q 460 450 420 420 Z" fill="#78B840" opacity="0.5" />
          <path d="M 260 490 Q 340 470 400 500 Q 440 520 400 545 Q 340 565 260 545 Z" fill="#6AAD32" opacity="0.5" />
          <path d="M 50 420 Q 120 400 160 440 Q 200 480 280 470 Q 360 460 400 500 Q 450 540 520 530 Q 580 520 640 540 L 640 700 L 50 700 Z" fill="#5A9E28" />
          <path d="M 100 350 Q 200 330 250 380 Q 310 440 280 480 Q 240 520 180 510 Q 110 495 90 440 Q 75 395 100 350 Z" fill="#68C8A8" opacity="0.55" />
          <path d="M 110 360 Q 180 345 230 385 Q 270 420 250 460" stroke="#48A888" strokeWidth="2" strokeDasharray="8 5" fill="none" style={{ animation: "waterFlow 3s linear infinite" }} />
          <text x="138" y="430" fontSize="10" fill="#2A7858" fontWeight="700" fontFamily="'Be Vietnam Pro',sans-serif" opacity="0.8">Kênh rạch</text>
          <path d="M 380 400 Q 440 390 480 430 Q 510 460 490 490 Q 460 520 420 510 Q 380 495 370 460 Q 360 425 380 400 Z" fill="#90D8F0" opacity="0.5" />
          <path d="M 385 415 Q 430 405 468 435" stroke="#60B8D8" strokeWidth="2" strokeDasharray="6 4" fill="none" style={{ animation: "waterFlow 4s linear infinite" }} />
          <path d="M 200 320 Q 250 300 280 340 Q 300 370 270 395 Q 240 415 210 395 Q 185 370 200 320 Z" fill="#F8C878" opacity="0.7" />
          <text x="215" y="375" fontSize="9" fill="#A06820" fontWeight="700" fontFamily="'Be Vietnam Pro',sans-serif" opacity="0.9">Đồng lúa</text>
          <path d="M 480 330 Q 520 315 550 345 Q 570 368 550 388 Q 525 408 498 395 Q 472 378 480 330 Z" fill="#F0B870" opacity="0.65" />
          <text x="493" y="370" fontSize="9" fill="#A05010" fontWeight="700" fontFamily="'Be Vietnam Pro',sans-serif" opacity="0.9">Vườn cây</text>
          <path d="M 200 320 Q 260 310 310 330 Q 380 355 420 340 Q 480 320 540 345" stroke="#D4A96A" strokeWidth="1.5" strokeDasharray="6 5" fill="none" opacity="0.5" />
          <path d="M 130 420 Q 200 400 260 430 Q 320 460 380 445 Q 440 430 490 455" stroke="#D4A96A" strokeWidth="1.5" strokeDasharray="6 5" fill="none" opacity="0.4" />
        </svg>

        {/* ── BIRDS ── */}
        <svg style={{ position: "absolute", top: 200, left: "20%", width: 32, height: 28, pointerEvents: "none", animation: "birdFly 12s linear infinite" }} viewBox="0 0 32 28">
          <path d="M 16 14 Q 6 8 0 12" stroke="#3A6030" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 16 14 Q 26 8 32 12" stroke="#3A6030" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
        <svg style={{ position: "absolute", top: 245, left: "10%", width: 24, height: 20, pointerEvents: "none", animation: "birdFly2 16s linear infinite 4s" }} viewBox="0 0 24 20">
          <path d="M 12 10 Q 4 5 0 8" stroke="#3A6030" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 12 10 Q 20 5 24 8" stroke="#3A6030" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>

        {/* ── CLOUDS ── */}
        <Cloud style={{ top: 30, left: 30 }} w={130} h={50} animClass="c1" />
        <Cloud style={{ top: 15, left: 200 }} w={100} h={40} animClass="c2" />
        <Cloud style={{ top: 50, right: 160 }} w={90} h={36} animClass="c3" />

        {/* ── TREES ── */}
        {trees.map((t, i) => (
          <Tree key={i} style={{ top: t.top, bottom: t.bottom, left: t.left, right: t.right }} w={t.w} h={t.h} sway={t.sway} />
        ))}

        {/* ── HEADER ── */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 40,
          padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.88)", borderRadius: 30,
            padding: "8px 18px", fontSize: 14, fontWeight: 800, color: "#3D2008",
            border: "2px solid rgba(232,144,60,0.3)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            🗺 Bản đồ Bình Lợi
          </div>
          <div style={{
            background: "rgba(255,255,255,0.8)", borderRadius: 20,
            padding: "6px 14px", fontSize: 11, color: "#8A5030", fontWeight: 600,
            border: "1.5px solid rgba(232,144,60,0.25)",
          }}>
            Bấm vào điểm để khám phá!
          </div>
        </div>

        {/* ── PINS ── */}
        {spots.map((s) => (
          <Pin key={s.id} spot={s} isActive={activeId === s.id} onClick={() => handlePin(s.id)} />
        ))}

        {/* ── DETAIL PANEL ── */}
        {activeSpot && <DetailPanel spot={activeSpot} onClose={() => setActiveId(null)} />}
      </div>
    </div>
  );
}