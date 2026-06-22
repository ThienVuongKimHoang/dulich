import { useState, useEffect, useRef, useCallback } from "react";

// ─── PALETTE ───
const G = {
  gold:     "#C8963E",
  goldDark: "#8B6914",
  goldLight:"#F5D060",
  cream:    "#FDF8EE",
  wood:     "#5C3A1E",
  woodLight:"#8B5E3C",
  forest:   "#1A3A20",
  forestMid:"#2D5A35",
  forestLight:"#4A7C52",
  ink:      "#1C1C1C",
  smoke:    "rgba(200,150,62,0.12)",
};

// ─── TIME-AWARE BACKGROUND ───
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5 && h < 9)   return "dawn";
  if (h >= 9 && h < 16)  return "day";
  if (h >= 16 && h < 19) return "dusk";
  return "night";
}

const TIME_BG = {
  dawn:  { bg: "linear-gradient(180deg, #FFDDC1 0%, #FFFAE0 60%, #E8F5E9 100%)", label: "Bình minh — Sương sớm trên lá" },
  day:   { bg: "linear-gradient(180deg, #87CEEB 0%, #FFF9C4 50%, #C8E6C9 100%)", label: "Ban ngày — Ánh nắng rực rỡ" },
  dusk:  { bg: "linear-gradient(180deg, #FF7043 0%, #FFCC80 40%, #C8E6C9 100%)", label: "Hoàng hôn — Tà dương ấm áp" },
  night: { bg: "linear-gradient(180deg, #0D1B2A 0%, #1A3A20 60%, #2D5A35 100%)", label: "Đêm — Ánh trăng soi lá mai" },
};

// ─── PETAL COMPONENT ───
function FloatingPetal({ style }) {
  return (
    <div style={{
      position: "absolute",
      width: 12, height: 12,
      borderRadius: "50% 0 50% 50%",
      background: `radial-gradient(circle at 30% 30%, ${G.goldLight}, ${G.gold})`,
      opacity: 0.8,
      pointerEvents: "none",
      ...style,
    }} />
  );
}

// ─── CHAPTER HOOK ───
function useChapterVisible(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.25 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

// ─── SCROLL PROGRESS ───
function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => {
      const rect = el.getBoundingClientRect();
      const winH = window.innerHeight;
      const raw = (winH - rect.top) / (winH + rect.height);
      setProgress(Math.max(0, Math.min(1, raw)));
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [ref]);
  return progress;
}

// ─── STYLES ───
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap');

  .lm-chapter { opacity: 0; transform: translateY(48px); transition: opacity 0.9s ease, transform 0.9s ease; }
  .lm-chapter.visible { opacity: 1; transform: translateY(0); }

  .lm-fade-up { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s; }
  .lm-fade-up.visible { opacity: 1; transform: translateY(0); }

  .lm-fade-up-delay { opacity: 0; transform: translateY(32px); transition: opacity 0.7s ease 0.45s, transform 0.7s ease 0.45s; }
  .lm-fade-up-delay.visible { opacity: 1; transform: translateY(0); }

  @keyframes seedFall {
    0%   { transform: translateY(-60px) rotate(-15deg); opacity: 0; }
    60%  { opacity: 1; }
    100% { transform: translateY(0) rotate(0deg); opacity: 1; }
  }
  @keyframes seedCrack {
    0%,70% { transform: scale(1); }
    75%     { transform: scale(1.12) rotate(-3deg); }
    80%     { transform: scale(1.08) rotate(3deg); }
    85%     { transform: scale(1.15) rotate(-2deg); }
    100%    { transform: scale(1.1) rotate(0deg); }
  }
  @keyframes sproutGrow {
    from { transform: scaleY(0); opacity: 0; transform-origin: bottom; }
    to   { transform: scaleY(1); opacity: 1; transform-origin: bottom; }
  }
  @keyframes branchSway {
    0%,100% { transform: rotate(-4deg); }
    50%     { transform: rotate(4deg); }
  }
  @keyframes petalFloat {
    0%   { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0.9; }
    25%  { transform: translateY(60px) rotate(45deg) translateX(20px); }
    50%  { transform: translateY(120px) rotate(90deg) translateX(-10px); }
    75%  { transform: translateY(180px) rotate(135deg) translateX(25px); }
    100% { transform: translateY(260px) rotate(180deg) translateX(0); opacity: 0; }
  }
  @keyframes goldenBurst {
    0%   { opacity: 0; transform: scale(0.3); }
    60%  { opacity: 1; transform: scale(1.05); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0%,100% { opacity: 0.6; }
    50%     { opacity: 1; }
  }
  @keyframes trunkRise {
    from { transform: scaleY(0); transform-origin: bottom; }
    to   { transform: scaleY(1); transform-origin: bottom; }
  }
  @keyframes leafAppear {
    from { transform: scale(0) rotate(-30deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes sunPulse {
    0%,100% { box-shadow: 0 0 40px 10px rgba(255,220,50,0.4); }
    50%     { box-shadow: 0 0 80px 20px rgba(255,220,50,0.7); }
  }
  @keyframes moonGlow {
    0%,100% { box-shadow: 0 0 30px 8px rgba(200,230,255,0.35); }
    50%     { box-shadow: 0 0 60px 16px rgba(200,230,255,0.6); }
  }
  @keyframes cursorPetal {
    0%   { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); }
    100% { opacity: 0; transform: translate(var(--dx,20px), var(--dy,40px)) rotate(var(--dr,90deg)) scale(0.3); }
  }
  @keyframes quizSlide {
    from { opacity:0; transform: translateX(30px); }
    to   { opacity:1; transform: translateX(0); }
  }
  @keyframes floatSeed {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-12px); }
  }
  @keyframes rippleOut {
    from { transform: scale(0.6); opacity: 0.8; }
    to   { transform: scale(2.5); opacity: 0; }
  }
  @keyframes handsLift {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-12px); }
  }
  @keyframes handsGlow {
    0%, 100% { filter: drop-shadow(0 10px 30px rgba(200,150,62,0.18)); }
    50%      { filter: drop-shadow(0 20px 56px rgba(200,150,62,0.55)); }
  }
`;

// ─── QUIZ DATA ───
const QUIZ = [
  {
    q: "Bạn mong muốn điều gì nhất trong năm mới?",
    opts: [
      { label: "Tài lộc dồi dào", mai: "Mai tứ quý", icon: "💰", color: "#C8963E" },
      { label: "Sức khoẻ dẻo dai", mai: "Mai ghép gốc cổ", icon: "💪", color: "#2D5A35" },
      { label: "Bình an, thư thái", mai: "Mai bonsai trực quân tử", icon: "🕊️", color: "#4A7C52" },
      { label: "Thịnh vượng gia đình", mai: "Mai chùm 5 cánh vàng", icon: "🏡", color: "#8B6914" },
    ],
  },
  {
    q: "Không gian trồng mai của bạn?",
    opts: [
      { label: "Sân thượng/ ban công", mai: "Mai tiểu cảnh mini", icon: "🏢", color: "#C8963E" },
      { label: "Sân vườn rộng", mai: "Mai thân cổ to", icon: "🌳", color: "#2D5A35" },
      { label: "Phòng khách", mai: "Mai bonsai nhỏ", icon: "🛋️", color: "#4A7C52" },
      { label: "Cổng/ cửa nhà", mai: "Mai thế huyền", icon: "🚪", color: "#8B6914" },
    ],
  },
  {
    q: "Phong cách của bạn là?",
    opts: [
      { label: "Phong lưu, quý phái", mai: "Mai vàng 8 cánh Yên Tử", icon: "👑", color: "#C8963E" },
      { label: "Giản dị, mộc mạc", mai: "Mai vàng 5 cánh dân gian", icon: "🌾", color: "#2D5A35" },
      { label: "Hiện đại, tinh tế", mai: "Mai ghép cành nghệ thuật", icon: "✨", color: "#4A7C52" },
      { label: "Truyền thống, cổ kính", mai: "Mai thế đổ Bình Chánh", icon: "🏛️", color: "#8B6914" },
    ],
  },
];

// ─── CHAPTER 1: KHỞI NGUỒN ───
function Chapter1({ visible }) {
  const [cracked, setCracked] = useState(false);
  useEffect(() => {
    if (visible) setTimeout(() => setCracked(true), 1800);
  }, [visible]);

  return (
    <section className="bl-full-section" style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 110%, #1A3A20 0%, #0D1B0D 60%, #060C06 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", padding: "4rem 2rem",
    }}>
      {/* Stars */}
      {[...Array(30)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: Math.random() * 2 + 1, height: Math.random() * 2 + 1,
          borderRadius: "50%", background: "white",
          top: `${Math.random() * 60}%`, left: `${Math.random() * 100}%`,
          opacity: Math.random() * 0.6 + 0.2,
          animation: `shimmer ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite`,
        }} />
      ))}

      {/* Ground glow */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200,
        background: "radial-gradient(ellipse at 50% 100%, rgba(44,90,35,0.6) 0%, transparent 70%)" }} />

      {/* Seed */}
      <div style={{
        position: "relative", marginBottom: "3rem",
        animation: visible ? `seedFall 1.2s cubic-bezier(0.22,1,0.36,1) forwards` : "none",
        opacity: visible ? 1 : 0,
      }}>
        <div style={{
          width: 60, height: 80,
          background: "radial-gradient(ellipse at 40% 30%, #8B6914, #3A2000)",
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6), inset 0 -4px 12px rgba(0,0,0,0.4)",
          animation: cracked ? `seedCrack 0.8s ease forwards` : "none",
          position: "relative",
        }}>
          {cracked && (
            <div style={{
              position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)",
              width: 6, height: 20, background: G.forestLight,
              borderRadius: 3,
              animation: `sproutGrow 0.6s ease 0.3s both`,
            }} />
          )}
        </div>

        {/* Ground ripple */}
        {visible && (
          <>
            <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
              width: 80, height: 80, borderRadius: "50%",
              border: `2px solid ${G.forestLight}`,
              animation: "rippleOut 1.5s ease 1.2s both",
            }} />
            <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
              width: 80, height: 80, borderRadius: "50%",
              border: `2px solid ${G.gold}50`,
              animation: "rippleOut 1.5s ease 1.6s both",
            }} />
          </>
        )}
      </div>

      <div className={`lm-chapter ${visible ? "visible" : ""}`} style={{ textAlign: "center", maxWidth: 680, zIndex: 2 }}>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.35em", textTransform: "uppercase", color: G.gold, marginBottom: "0.75rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          CHƯƠNG 1 · KHỞI NGUỒN
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem,5vw,3.2rem)", color: "white", margin: "0 0 1.25rem", lineHeight: 1.25 }}>
          Hạt mầm &amp; Đất lành
        </h2>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "rgba(255,255,255,0.75)", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 300 }}>
          Đất Lê Minh Xuân mang trong mình thứ dinh dưỡng mà không vùng nào sao chép được — phù sa bồi đắp qua ngàn mùa mưa, nguồn nước kênh rạch mát lành quanh năm. Chính nơi đây, hạt mầm mai vàng tìm thấy ngôi nhà đích thực của mình.
        </p>

        <div style={{ marginTop: "2.5rem", display: "flex", gap: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { icon: "🌊", label: "Nước kênh rạch mát lành" },
            { icon: "🌱", label: "Đất phù sa màu mỡ" },
            { icon: "☀️", label: "Nắng miền Nam dịu ấm" },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14, padding: "0.8rem 1.2rem", textAlign: "center",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>{icon}</div>
              <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.65)", margin: 0, fontFamily: "'Be Vietnam Pro', sans-serif" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CHAPTER 2: KIẾN TẠO ───
function Chapter2({ visible }) {
  const [hoveredBranch, setHoveredBranch] = useState(null);

  const BRANCHES = [
    { id: "truc", name: "Thế trực quân tử", desc: "Biểu tượng cho sự ngay thẳng, khí tiết của người quân tử. Thân cây vươn thẳng không uốn lượn.", color: G.gold, x: 20, y: 35 },
    { id: "hoan", name: "Thế hoàn long", desc: "Cành uốn khúc như rồng cuộn — mang ý nghĩa quyền năng và may mắn vượng phát.", color: G.forestLight, x: 65, y: 25 },
    { id: "xuyen", name: "Thế xuyên thủy", desc: "Cành mọc ngang như dòng suối len lỏi qua đá, tượng trưng cho sự linh hoạt.", color: G.woodLight, x: 40, y: 60 },
  ];

  return (
    <section className="bl-full-section" style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${G.cream} 0%, #FFF3DC 50%, #EDF7EE 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "5rem 2rem", position: "relative", overflow: "hidden",
    }}>
      {/* Decorative wood texture overlay */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(92,58,30,0.03) 48px, rgba(92,58,30,0.03) 50px)", pointerEvents: "none" }} />

      <div className={`lm-chapter ${visible ? "visible" : ""}`} style={{ maxWidth: 900, width: "100%", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.35em", textTransform: "uppercase", color: G.forestMid, marginBottom: "0.75rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            CHƯƠNG 2 · KIẾN TẠO
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem,5vw,3.2rem)", color: G.ink, margin: "0 0 1rem" }}>
            Bàn tay nghệ nhân
          </h2>
          <p style={{ fontSize: "1rem", lineHeight: 1.85, color: "rgba(28,28,28,0.65)", maxWidth: 580, margin: "0 auto", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 300 }}>
            Mai không chỉ là cây — đó là sự kỳ công. Mỗi cành uốn mang trong nó hàng trăm giờ thiền định của nghệ nhân.
          </p>
        </div>

        {/* ── Hands holding mai branch ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "3.5rem" }}>
          <img
            src="/img/lang_mai/trang_2.png"
            alt="Bàn tay nâng niu cành mai"
            style={{
              maxWidth: "100%",
              width: 520,
              objectFit: "contain",
              animation: visible ? "handsLift 3.5s ease-in-out infinite" : "none",
              filter: "drop-shadow(0 12px 36px rgba(200,150,62,0.28))",
              borderRadius: 16,
            }}
          />
        </div>

        {/* Interactive branches */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "3rem" }}>
          {BRANCHES.map(b => (
            <div key={b.id}
              onMouseEnter={() => setHoveredBranch(b.id)}
              onMouseLeave={() => setHoveredBranch(null)}
              style={{
                background: hoveredBranch === b.id ? `linear-gradient(135deg, ${b.color}18, ${b.color}08)` : "white",
                border: `2px solid ${hoveredBranch === b.id ? b.color : "rgba(0,0,0,0.06)"}`,
                borderRadius: 18, padding: "1.5rem",
                cursor: "pointer", transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
                transform: hoveredBranch === b.id ? "translateY(-4px)" : "none",
                boxShadow: hoveredBranch === b.id ? `0 12px 32px ${b.color}25` : "0 2px 12px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem", animation: hoveredBranch === b.id ? "branchSway 2s ease-in-out infinite" : "none" }}>🌿</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: G.ink, margin: "0 0 0.5rem" }}>{b.name}</h3>
              <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "rgba(28,28,28,0.6)", margin: 0, fontFamily: "'Be Vietnam Pro', sans-serif" }}>{b.desc}</p>
              <div style={{ marginTop: "1rem", fontSize: "0.7rem", color: b.color, fontWeight: 600, opacity: hoveredBranch === b.id ? 1 : 0, transition: "opacity 0.2s" }}>
                ✦ Click để khám phá thêm
              </div>
            </div>
          ))}
        </div>

        {/* Artisan quote */}
        <div style={{
          background: `linear-gradient(135deg, ${G.wood}10, ${G.goldDark}08)`,
          border: `1px solid ${G.gold}30`,
          borderRadius: 20, padding: "2rem 2.5rem",
          borderLeft: `4px solid ${G.gold}`,
        }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "1.1rem", lineHeight: 1.9, color: G.ink, margin: "0 0 0.75rem" }}>
            "Uốn một cành mai cũng như uốn tâm mình — vội vàng là gãy, cưỡng ép là chết. Phải kiên nhẫn, phải lắng nghe cây muốn nói gì."
          </p>
          <p style={{ fontSize: "0.78rem", color: G.gold, margin: 0, fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600 }}>
            — Nghệ nhân làng mai Lê Minh Xuân
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── CHAPTER 3: NUÔI DƯỠNG ───
const TREE_STAGES = [
  {
    src: "/img/lang_mai/cay_1.png", width: 200,
    label: "Mùa xuân — Nụ lộc đầu tiên",
    bg: "linear-gradient(180deg, #A8E063 0%, #FFF9C4 100%)",
    sky: "#87CEEB", sun: true, rain: 0, sound: "bird",
  },
  {
    src: "/img/lang_mai/cay_2.png", width: 280,
    label: "Mùa hè — Nắng gắt rèn cây",
    bg: "linear-gradient(180deg, #FFF176 0%, #A5D6A7 100%)",
    sky: "#FFD54F", sun: true, rain: 0, sound: "bird",
  },
  {
    src: "/img/lang_mai/cay_3.png", width: 420,
    label: "Mùa mưa — Nước trời nuôi dưỡng",
    bg: "linear-gradient(180deg, #7DA8C4 0%, #4A7C52 100%)",
    sky: "#5A90B0", sun: false, rain: 0.7, sound: "rain",
  },
];

function Chapter3({ visible }) {
  const [stageIdx, setStageIdx] = useState(0);
  const rainRef = useRef(null);
  const birdRef = useRef(null);
  const timerRef = useRef(null);

  // Auto-cycle khi section vào viewport — không cần scroll thêm
  useEffect(() => {
    if (!visible) return;
    timerRef.current = setInterval(() => {
      setStageIdx(i => (i + 1) % TREE_STAGES.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [visible]);

  // Xử lý âm thanh theo mùa
  useEffect(() => {
    if (!visible) {
      rainRef.current?.pause();
      birdRef.current?.pause();
      return;
    }
    const stage = TREE_STAGES[stageIdx];
    if (stage.sound === "bird") {
      rainRef.current?.pause();
      birdRef.current?.play().catch(() => {});
    } else {
      birdRef.current?.pause();
      rainRef.current?.play().catch(() => {});
    }
  }, [stageIdx, visible]);

  // Dừng âm thanh khi rời trang
  useEffect(() => () => {
    rainRef.current?.pause();
    birdRef.current?.pause();
  }, []);

  const stage = TREE_STAGES[stageIdx];

  return (
    <section style={{
      minHeight: "100vh",
      background: stage.bg, transition: "background 0.9s ease",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden", padding: "5rem 2rem",
    }}>
      {/* Audio */}
      <audio ref={birdRef} src="/audio/bird.mp3" loop preload="none" />
      <audio ref={rainRef} src="/audio/rain.mp3" loop preload="none" />

      {/* Sky glow */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${stage.sky}70, transparent 70%)`, transition: "background 0.9s ease", pointerEvents: "none" }} />

      {/* Season label */}
      <div style={{
        position: "absolute", top: "2rem",
        background: "rgba(0,0,0,0.25)", backdropFilter: "blur(10px)",
        color: "white", borderRadius: "2rem", padding: "0.4rem 1.2rem",
        fontSize: "0.78rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 500, zIndex: 3,
        transition: "all 0.5s ease",
      }}>
        {stage.label}
      </div>

      {/* Sun / Rain + Tree stack */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem" }}>
        {/* Sun GIF — phía trên cây, mùa nắng */}
        <div style={{
          height: stage.sun ? 90 : 0,
          overflow: "hidden",
          transition: "height 0.8s ease, opacity 0.8s ease",
          opacity: stage.sun ? 1 : 0,
          marginBottom: stage.sun ? "-12px" : 0,
        }}>
          <img src="/img/lang_mai/sun.gif" alt="nắng"
            style={{ width: 110, height: 90, objectFit: "contain" }} />
        </div>

        {/* Rain GIF — phía trên cây, mùa mưa */}
        <div style={{
          height: stage.rain > 0 ? 100 : 0,
          overflow: "hidden",
          transition: "height 0.8s ease, opacity 0.8s ease",
          opacity: stage.rain > 0 ? 1 : 0,
          marginBottom: stage.rain > 0 ? "-16px" : 0,
        }}>
          <img src="/img/lang_mai/rain.gif" alt="mưa"
            style={{ width: 180, height: 100, objectFit: "cover" }} />
        </div>

        {/* Tree image */}
        <img
          key={stageIdx}
          src={stage.src}
          alt="Sự phát triển của cây mai"
          style={{
            width: stage.width,
            maxWidth: "75vw",
            objectFit: "contain",
            animation: "leafAppear 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
            filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.22))",
          }}
        />
      </div>

      {/* Clickable stage dots */}
      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "center", marginBottom: "1.5rem", zIndex: 3 }}>
        {TREE_STAGES.map((_, i) => (
          <div key={i} onClick={() => { clearInterval(timerRef.current); setStageIdx(i); }}
            style={{
              width: stageIdx === i ? 28 : 8, height: 8, borderRadius: 4,
              background: stageIdx === i ? G.gold : "rgba(255,255,255,0.45)",
              transition: "all 0.4s ease", cursor: "pointer",
            }} />
        ))}
      </div>

      <div className={`lm-chapter ${visible ? "visible" : ""}`} style={{ textAlign: "center", maxWidth: 620, padding: "0 2rem", zIndex: 3 }}>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.35em", textTransform: "uppercase", color: G.forestMid, marginBottom: "0.75rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          CHƯƠNG 3 · NUÔI DƯỠNG
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem,4vw,2.8rem)", color: G.ink, margin: "0 0 1rem" }}>
          Sự phát triển của cây
        </h2>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.85, color: "rgba(28,28,28,0.7)", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 300 }}>
          Từng mùa đi qua, cây mai lớn dần trong bàn tay nghệ nhân. Mỗi cơn mưa, mỗi tia nắng đều in dấu vào từng đốt cành.
        </p>
      </div>
    </section>
  );
}

// ─── CHAPTER 4: RỰC RỠ ───
function Chapter4({ visible }) {
  const [petals, setPetals] = useState([]);
  const containerRef = useRef(null);
  const nextId = useRef(0);

  const handleMouseMove = useCallback((e) => {
    if (Math.random() > 0.3) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const id = nextId.current++;
    const dx = (Math.random() - 0.5) * 60;
    const dy = 40 + Math.random() * 60;
    const dr = (Math.random() - 0.5) * 360;
    setPetals(p => [...p.slice(-25), { id, x: e.clientX - rect.left, y: e.clientY - rect.top, dx, dy, dr }]);
    setTimeout(() => setPetals(p => p.filter(pt => pt.id !== id)), 1200);
  }, []);

  return (
    <section ref={containerRef} onMouseMove={handleMouseMove} style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 30%, #FFE082 0%, #C8963E 35%, #8B5E00 70%, #3A2000 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "5rem 2rem", position: "relative", overflow: "hidden", cursor: "none",
    }}>
      {/* Golden particle rain */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${-10 + Math.random() * 20}%`,
          left: `${Math.random() * 100}%`,
          width: 10, height: 10,
          borderRadius: "50% 0 50% 50%",
          background: `hsl(${42 + Math.random() * 20}, 85%, ${65 + Math.random() * 20}%)`,
          animation: `petalFloat ${3 + Math.random() * 4}s linear ${Math.random() * 4}s infinite`,
          opacity: 0.9,
        }} />
      ))}

      {/* Cursor petals */}
      {petals.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: p.x, top: p.y,
          width: 14, height: 14,
          borderRadius: "50% 0 50% 50%",
          background: `radial-gradient(circle at 30% 30%, #FFF59D, ${G.gold})`,
          pointerEvents: "none",
          zIndex: 10,
          "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--dr": `${p.dr}deg`,
          animation: "cursorPetal 1.2s ease forwards",
        }} />
      ))}

      {/* Central burst */}
      {visible && (
        <div style={{ marginBottom: "3rem", animation: "goldenBurst 1.2s cubic-bezier(0.22,1,0.36,1) forwards", position: "relative" }}>
          {/* Flower */}
          <svg width="160" height="160" viewBox="0 0 160 160">
            {[...Array(5)].map((_, i) => {
              const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
              const cx = 80 + Math.cos(angle) * 38;
              const cy = 80 + Math.sin(angle) * 38;
              return (
                <ellipse key={i} cx={cx} cy={cy} rx={26} ry={18}
                  fill={G.goldLight}
                  transform={`rotate(${(angle * 180 / Math.PI) + 90}, ${cx}, ${cy})`}
                  style={{ filter: "blur(0.5px)" }}
                />
              );
            })}
            <circle cx="80" cy="80" r="18" fill="#FFF176" />
            <circle cx="80" cy="80" r="10" fill="#FFD54F" />
          </svg>
        </div>
      )}

      <div className={`lm-chapter ${visible ? "visible" : ""}`} style={{ textAlign: "center", maxWidth: 680, zIndex: 2 }}>
        <p style={{ fontSize: "0.65rem", letterSpacing: "0.35em", textTransform: "uppercase", color: "#FFF9C4", marginBottom: "0.75rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          CHƯƠNG 4 · RỰC RỠ
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem,5vw,3.5rem)", color: "white", margin: "0 0 1.25rem", lineHeight: 1.2 }}>
          Đỉnh cao thịnh vượng
        </h2>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "rgba(255,255,220,0.85)", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 300 }}>
          Di chuyển chuột để cánh hoa bay theo. Trong triết lý phong thủy ngàn đời, mai vàng là hiện thân của sự khởi đầu may mắn — mỗi cánh hoa mang theo một điều ước cho năm mới.
        </p>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { icon: "🌟", text: "Tài lộc" },
            { icon: "💛", text: "Phú quý" },
            { icon: null, text: "Bình an" },
            { icon: "✨", text: "Thịnh vượng" },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,200,0.3)",
              borderRadius: "2rem", padding: "0.5rem 1.1rem",
              display: "flex", alignItems: "center", gap: 6,
              animation: `shimmer ${1.5 + Math.random()}s ease-in-out infinite`,
            }}>
              {icon
                ? <span>{icon}</span>
                : <img src="/img/main_page/hoa_mai.png" alt="hoa mai" style={{ width: 20, height: 20, objectFit: "contain" }} />
              }
              <span style={{ fontSize: "0.82rem", color: "white", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: "1.5rem", fontSize: "0.72rem", color: "rgba(255,255,200,0.55)", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          ✦ Di chuyển chuột để tạo mưa cánh hoa
        </p>
      </div>
    </section>
  );
}

// ─── QUIZ ───
function MaiQuiz() {
  const [step, setStep]     = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult]   = useState(null);

  const handleAnswer = (opt) => {
    const next = [...answers, opt];
    if (step < QUIZ.length - 1) {
      setAnswers(next);
      setStep(s => s + 1);
    } else {
      const counts = {};
      next.forEach(a => { counts[a.mai] = (counts[a.mai] || 0) + 1; });
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || next[0].mai;
      const detail = next.find(a => a.mai === best) || next[0];
      setResult(detail);
    }
  };

  const reset = () => { setStep(0); setAnswers([]); setResult(null); };

  if (result) {
    return (
      <div style={{ textAlign: "center", animation: "quizSlide 0.5s ease forwards" }}>
        <div style={{ marginBottom: "1rem", animation: "floatSeed 2s ease-in-out infinite" }}>
          <img src="/img/main_page/hoa_mai.png" alt="hoa mai" style={{ width: 64, height: 64, objectFit: "contain" }} />
        </div>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: G.ink, margin: "0 0 0.5rem" }}>
          Cây mai dành cho bạn:
        </h3>
        <div style={{ display: "inline-block", background: `${result.color}15`, border: `2px solid ${result.color}`, borderRadius: 16, padding: "0.75rem 2rem", marginBottom: "1.25rem" }}>
          <p style={{ fontSize: "1.25rem", fontWeight: 700, color: result.color, margin: 0, fontFamily: "'Playfair Display', serif" }}>{result.mai}</p>
        </div>
        <p style={{ fontSize: "0.85rem", color: "rgba(28,28,28,0.6)", marginBottom: "1.5rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          Phù hợp với mong muốn và không gian sống của bạn
        </p>
        <button onClick={reset} style={{
          background: "transparent", border: `1.5px solid ${G.gold}`, color: G.goldDark,
          borderRadius: "2rem", padding: "0.5rem 1.5rem", cursor: "pointer",
          fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.82rem", fontWeight: 600,
          transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = G.gold; e.currentTarget.style.color = "white"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = G.goldDark; }}>
          Thử lại
        </button>
      </div>
    );
  }

  const q = QUIZ[step];
  return (
    <div key={step} style={{ animation: "quizSlide 0.4s ease forwards" }}>
      <p style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", color: G.gold, marginBottom: "0.5rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        Câu hỏi {step + 1} / {QUIZ.length}
      </p>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", color: G.ink, margin: "0 0 1.5rem" }}>{q.q}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {q.opts.map(opt => (
          <button key={opt.label} onClick={() => handleAnswer(opt)} style={{
            background: "white", border: `1.5px solid rgba(0,0,0,0.08)`,
            borderRadius: 14, padding: "1rem", cursor: "pointer", textAlign: "left",
            fontFamily: "'Be Vietnam Pro', sans-serif", transition: "all 0.22s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = opt.color; e.currentTarget.style.background = `${opt.color}0A`; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)"; e.currentTarget.style.background = "white"; e.currentTarget.style.transform = "none"; }}>
            <span style={{ fontSize: "1.4rem", display: "block", marginBottom: "0.4rem" }}>{opt.icon}</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 500, color: G.ink }}>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CHAPTER 5: LAN TỎA ───
function Chapter5({ visible, onBack, onNavigate }) {
  return (
    <section className="bl-full-section" style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${G.forest} 0%, #2D5A35 40%, #1A3A20 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "5rem 2rem", position: "relative", overflow: "hidden",
    }}>
      {/* Floating seeds */}
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${Math.random() * 80}%`,
          left: `${Math.random() * 100}%`,
          width: 10, height: 14,
          borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
          background: G.gold,
          opacity: 0.5,
          animation: `floatSeed ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite`,
        }} />
      ))}

      <div className={`lm-chapter ${visible ? "visible" : ""}`} style={{ maxWidth: 820, width: "100%", zIndex: 2 }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p style={{ fontSize: "0.65rem", letterSpacing: "0.35em", textTransform: "uppercase", color: G.gold, marginBottom: "0.75rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
            CHƯƠNG 5 · LAN TỎA
          </p>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem,5vw,3.2rem)", color: "white", margin: "0 0 1.25rem" }}>
            Sự thịnh vượng tiếp nối
          </h2>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "rgba(255,255,255,0.72)", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 300, maxWidth: 580, margin: "0 auto" }}>
            Mỗi hạt mai từ Lê Minh Xuân mang theo câu chuyện của đất, của người và của mùa xuân. Hãy cùng chúng tôi chăm sóc và đón mùa xuân tại vườn.
          </p>
        </div>

        {/* Quiz section */}
        <div style={{
          background: G.cream, borderRadius: 24,
          padding: "2.5rem", marginBottom: "3rem",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: G.forestMid, marginBottom: "1rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600 }}>
            🌸 Cây mai nào dành cho bạn?
          </p>
          <MaiQuiz />
        </div>

        {/* CTA grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: "🏡", title: "Thăm làng nghề", desc: "Đến trực tiếp Ấp 9, xã Bình Lợi để trải nghiệm không khí vườn mai", cta: "Xem bản đồ", action: "map" },
            { icon: "📅", title: "Đặt lịch tham quan", desc: "Hẹn trước để có hướng dẫn viên riêng và trải nghiệm trọn vẹn nhất", cta: "Đặt lịch ngay", action: "booking" },
            { icon: "🌿", title: "Workshop uốn mai", desc: "Học nghệ thuật tạo thế mai cùng nghệ nhân — một trải nghiệm độc đáo", cta: "Tìm hiểu thêm", action: "workshop" },
          ].map(({ icon, title, desc, cta, action }) => (
            <div key={title}
              onClick={() => onNavigate?.(action)}
              style={{
                background: "rgba(255,255,255,0.07)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18, padding: "1.5rem",
                transition: "all 0.28s", cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.13)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{icon}</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: "white", margin: "0 0 0.5rem" }}>{title}</h3>
              <p style={{ fontSize: "0.8rem", lineHeight: 1.65, color: "rgba(255,255,255,0.6)", margin: "0 0 1rem", fontFamily: "'Be Vietnam Pro', sans-serif" }}>{desc}</p>
              <span style={{ fontSize: "0.75rem", color: G.goldLight, fontWeight: 600, fontFamily: "'Be Vietnam Pro', sans-serif" }}>{cta} →</span>
            </div>
          ))}
        </div>

        {/* Back button */}
        <div style={{ textAlign: "center", marginTop: "3rem" }}>
          <button onClick={onBack} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", border: `1.5px solid ${G.gold}60`,
            color: G.goldLight, borderRadius: "2rem", padding: "0.65rem 1.75rem",
            cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: "0.85rem", fontWeight: 500, transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = G.gold; e.currentTarget.style.background = `${G.gold}18`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${G.gold}60`; e.currentTarget.style.background = "transparent"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Quay về trang chính
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── MAIN PAGE ───
export default function LangMaiPage({ onBack, onNavigate }) {
  const [scrollY, setScrollY] = useState(0);
  const timeOfDay = getTimeOfDay();
  const timeBg = TIME_BG[timeOfDay];

  const ch1Ref = useRef(null);
  const ch2Ref = useRef(null);
  const ch3Ref = useRef(null);
  const ch4Ref = useRef(null);
  const ch5Ref = useRef(null);

  const ch1V = useChapterVisible(ch1Ref);
  const ch2V = useChapterVisible(ch2Ref);
  const ch3V = useChapterVisible(ch3Ref);
  const ch4V = useChapterVisible(ch4Ref);
  const ch5V = useChapterVisible(ch5Ref);

  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Lock body scroll on unmount cleanup
  useEffect(() => {
    window.scrollTo(0, 0);
    return () => window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ fontFamily: "'Be Vietnam Pro', sans-serif", position: "relative" }}>
      <style>{STYLES}</style>

      {/* ── Fixed nav ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.85rem 2rem",
        background: scrollY > 80 ? "rgba(10,20,10,0.88)" : "transparent",
        backdropFilter: scrollY > 80 ? "blur(16px)" : "none",
        transition: "background 0.4s ease",
      }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)",
          color: "white", borderRadius: "2rem", padding: "0.4rem 1rem",
          cursor: "pointer", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.78rem",
          fontWeight: 500, transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = `${G.gold}30`; e.currentTarget.style.borderColor = G.gold; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Quay lại
        </button>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: G.gold, margin: 0, textTransform: "uppercase", fontWeight: 600 }}>Làng Mai Vàng · Bình Lợi</p>
        </div>

        <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "2rem", padding: "0.35rem 0.9rem", fontSize: "0.68rem", color: "rgba(255,255,255,0.75)", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
          {timeBg.label}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: "100vh",
        background: timeBg.bg,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "8rem 2rem 4rem",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", border: `1px solid ${G.gold}18`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", border: `1px solid ${G.gold}25`, top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none" }} />

        <p style={{ fontSize: "0.68rem", letterSpacing: "0.4em", textTransform: "uppercase", color: G.forestMid, marginBottom: "1rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600 }}>
          HÀNH TRÌNH 5 CHƯƠNG
        </p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.5rem,7vw,5rem)", color: G.ink, margin: "0 0 0.5rem", lineHeight: 1.15 }}>
          Từ hạt mầm
        </h1>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: "clamp(2.5rem,7vw,5rem)", color: G.gold, margin: "0 0 1.5rem", lineHeight: 1.15 }}>
          đến sắc xuân
        </h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.85, color: "rgba(28,28,28,0.62)", maxWidth: 560, margin: "0 auto 2.5rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 300 }}>
          Khám phá câu chuyện của Làng Mai Vàng Lê Minh Xuân — nơi đất lành, bàn tay nghệ nhân và thời gian cùng nhau tạo nên những cành xuân rực rỡ.
        </p>
        <a href="#chapter-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: G.forestMid, color: "white", borderRadius: "2rem", padding: "0.75rem 2rem", textDecoration: "none", fontSize: "0.9rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontWeight: 600, transition: "all 0.2s", boxShadow: `0 8px 24px ${G.forestMid}40` }}
          onMouseEnter={e => { e.currentTarget.style.background = G.forest; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = G.forestMid; e.currentTarget.style.transform = "none"; }}>
          Bắt đầu hành trình
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></svg>
        </a>

        {/* Chapter nav dots */}
        <div style={{ position: "absolute", right: "2rem", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {["Khởi nguồn", "Kiến tạo", "Nuôi dưỡng", "Rực rỡ", "Lan tỏa"].map((label, i) => (
            <a key={i} href={`#chapter-${i + 1}`} title={label} style={{
              display: "block", width: 8, height: 8, borderRadius: "50%",
              background: G.gold, opacity: 0.4, transition: "opacity 0.2s",
              textDecoration: "none",
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; }} />
          ))}
        </div>
      </section>

      {/* ── Chapters ── */}
      <div id="chapter-1" ref={ch1Ref}><Chapter1 visible={ch1V} /></div>
      <div id="chapter-2" ref={ch2Ref}><Chapter2 visible={ch2V} /></div>
      <div id="chapter-3" ref={ch3Ref}><Chapter3 visible={ch3V} /></div>
      <div id="chapter-4" ref={ch4Ref}><Chapter4 visible={ch4V} /></div>
      <div id="chapter-5" ref={ch5Ref}><Chapter5 visible={ch5V} onBack={onBack} onNavigate={onNavigate} /></div>
    </div>
  );
}
