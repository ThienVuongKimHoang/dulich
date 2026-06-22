import { useState, useEffect, useRef } from "react";
import { C } from "../constants";

// ─── EPIC FANFARE (Web Audio API) ───────────────────────────────────────────
function playEpicFanfare() {
  try {
    const ctx = new (window.AudioContext || window["webkitAudioContext"])();
    const t = ctx.currentTime;

    const note = (freq, start, dur, vol = 0.22, type = "triangle") => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + start);
      gain.gain.linearRampToValueAtTime(vol, t + start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t + start);
      osc.stop(t + start + dur + 0.05);
    };

    // Arpeggio rise C5 → E5 → G5 → C6
    note(523.25, 0, 0.25);
    note(659.25, 0.22, 0.25);
    note(783.99, 0.44, 0.25);
    note(1046.5, 0.66, 1.5);
    // Full chord swell
    note(523.25, 0.66, 1.4, 0.18);
    note(659.25, 0.66, 1.4, 0.18);
    note(783.99, 0.66, 1.4, 0.18);
    // Flourish high notes
    note(1318.5, 1.3, 0.9, 0.14);
    note(1567.98, 1.52, 0.7, 0.11);
    note(2093.0, 1.7, 0.6, 0.08);

    // Cymbal crash (highpass-filtered white noise)
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 6000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, t + 0.66);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    noise.connect(hpf);
    hpf.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t + 0.66);
  } catch { }
}

// ─── LAUREL CROWN ─────────────────────────────────────────────────────────────
// Pre-computed falling-leaf positions (no Math.random in render)
const LAUREL_LEAVES_CONFIG = Array.from({ length: 28 }, (_, i) => ({
  leftVw: (i * 37 + 11) % 100,
  delay: (i * 0.13) % 2.4,
  dur: 2.6 + (i % 5) * 0.4,
  initRot: (i * 47) % 360,
  size: 10 + (i % 4) * 3,
}));

function LaurelCrown({ active }) {
  // Đặt vòng nguyệt quế sau popup (z-index thấp hơn modal 9991)
  // top cố định: icon nằm ở ~50vh - 100px, phần mở vòng quế ở ~30% từ trên ảnh
  // → top = (50vh - 100px) - (260 * 0.3) = 50vh - 178px
  return (
    <div style={{
      position: "fixed",
      left: "50%",
      top: "calc(50% - 178px)",
      transform: active
        ? "translateX(-50%) scale(1) rotate(0deg)"
        : "translateX(-50%) scale(0.4) rotate(-8deg)",
      zIndex: 9990,          // dưới modal (9991) → icon hiện bên trong vòng
      pointerEvents: "none",
      opacity: active ? 1 : 0,
      transition: "transform 1.05s cubic-bezier(0.34,1.22,0.64,1), opacity 0.55s ease",
      transitionDelay: active ? "0.2s" : "0s",
      width: 260,
    }}>
      <img
        src="/img/achievement/nguyet_que.png"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          display: "block",
          filter: "drop-shadow(0 4px 22px rgba(255,215,0,0.6))",
        }}
      />
    </div>
  );
}

// ─── ACHIEVEMENT POPUP ───
function SparkleParticle({ index, color }) {
  const angle = (index / 8) * 360;
  const r = 58 + (index % 2 === 0 ? 12 : 0);
  const sz = index % 2 === 0 ? 10 : 6;
  return (
    <div style={{
      position: "absolute",
      width: sz, height: sz, borderRadius: "50%",
      background: color, boxShadow: `0 0 8px ${color}`,
      left: `calc(50% + ${Math.cos(angle * Math.PI / 180) * r}px - ${sz / 2}px)`,
      top: `calc(50% + ${Math.sin(angle * Math.PI / 180) * r}px - ${sz / 2}px)`,
      animation: `sparkleParticle 1.3s ${index * 0.14}s ease-in-out infinite`,
      pointerEvents: "none",
    }} />
  );
}

export default function AchievementPopup({ achievement, onDone }) {
  const [phase, setPhase] = useState("entry");
  const [cupPos, setCupPos] = useState(null);
  const [flyTo, setFlyTo] = useState({ x: 0, y: -280 });
  const [flyActive, setFlyActive] = useState(false);
  const [laurelActive, setLaurelActive] = useState(false);
  const cupRef = useRef(null);

  const isLegendary = achievement.rarity === "legendary";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 60);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (!isLegendary) return;
    playEpicFanfare();
    const t2 = setTimeout(() => setLaurelActive(true), 200);
    return () => clearTimeout(t2);
  }, [isLegendary]);

  const RARITY_COLORS = { legendary: "#FFD700", platinum: "#7EC8E3", gold: "#C8963E", silver: "#9E9E9E", bronze: "#CD7F32" };
  const pc = RARITY_COLORS[achievement.rarity] ?? "#C8963E";
  const RARITY_LABEL_COLOR = { legendary: "#7A5C00", platinum: "#2A6A8A", gold: "#5A3A00", silver: "#444", bronze: "#5A2A00" };
  const lc = RARITY_LABEL_COLOR[achievement.rarity] ?? "#5A3A00";

  const handleContinue = () => {
    if (cupRef.current) {
      const cr = cupRef.current.getBoundingClientRect();
      setCupPos({ left: cr.left, top: cr.top, w: cr.width, h: cr.height });
      const tEl = document.querySelector("[data-achievement-target]");
      if (tEl) {
        const tr = tEl.getBoundingClientRect();
        setFlyTo({
          x: (tr.left + tr.width / 2) - (cr.left + cr.width / 2),
          y: (tr.top + tr.height / 2) - (cr.top + cr.height / 2),
        });
      } else {
        setFlyTo({ x: window.innerWidth * 0.35, y: -(cr.top + cr.height / 2 + 40) });
      }
    }
    setPhase("fly");
    requestAnimationFrame(() => requestAnimationFrame(() => setFlyActive(true)));
    setTimeout(onDone, 950);
  };

  return (
    <>
      <style>{`
        @keyframes sparkleParticle { 0%,100%{transform:scale(0);opacity:0} 50%{transform:scale(1);opacity:1} }
        @keyframes cupGlow { 0%,100%{transform:scale(1) rotate(-2deg);filter:drop-shadow(0 4px 20px ${pc}99)} 50%{transform:scale(1.07) rotate(2deg);filter:drop-shadow(0 8px 32px ${pc}cc)} }
        @keyframes popIn { from{opacity:0;transform:scale(0.7) translateY(24px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes backdropIn { from{opacity:0} to{opacity:1} }
        @keyframes laurelFall {
          0%   { transform: translateY(-40px) rotate(var(--lr)) scale(0.7); opacity: 0; }
          15%  { opacity: 0.9; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(110vh) rotate(calc(var(--lr) + 420deg)) scale(1); opacity: 0; }
        }
        @keyframes legendaryPulse {
          0%,100% { box-shadow: 0 0 0 0 #FFD70055, 0 28px 70px rgba(0,0,0,0.38); }
          50%     { box-shadow: 0 0 0 18px #FFD70000, 0 28px 70px rgba(0,0,0,0.38); }
        }
      `}</style>

      {/* backdrop — darker gold tint for legendary */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9990, pointerEvents: phase === "fly" ? "none" : "auto",
        background: phase === "fly" ? "rgba(0,0,0,0)"
          : isLegendary ? "rgba(20,14,2,0.92)" : "rgba(8,18,9,0.88)",
        backdropFilter: phase === "fly" ? "none" : "blur(10px)",
        transition: "background 0.32s ease, backdrop-filter 0.32s ease",
        animation: phase !== "fly" ? "backdropIn 0.3s ease both" : undefined,
      }} />

      {/* Laurel crown (legendary only) */}
      {isLegendary && <LaurelCrown active={laurelActive && phase !== "fly"} />}

      {/* Falling laurel leaves (legendary only) */}
      {isLegendary && phase === "show" && LAUREL_LEAVES_CONFIG.map((cfg, i) => (
        <div key={i} style={{
          position: "fixed", zIndex: 9993, pointerEvents: "none",
          left: `${cfg.leftVw}vw`, top: "-30px",
          "--lr": `${cfg.initRot}deg`,
          animation: `laurelFall ${cfg.dur}s ${cfg.delay}s ease-in both`,
        }}>
          <svg width={cfg.size} height={cfg.size * 1.75} viewBox="0 0 14 24" fill="none">
            <path d="M7 1 C12 5 13 12 7 23 C1 12 2 5 7 1Z" fill="#B8860B" />
            <path d="M7 1 C11 5 12 12 7 23 C4 12 5 5 7 1Z" fill="#FFD700" opacity="0.7" />
            <path d="M7 3 Q7 12 7 21" stroke="#6B4E0A" strokeWidth="0.8" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* modal content */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9991,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
        opacity: phase === "fly" ? 0 : 1,
        transform: phase === "fly" ? "scale(0.94) translateY(-12px)" : phase === "show" ? "scale(1)" : "scale(0.85)",
        transition: "opacity 0.26s ease, transform 0.26s ease",
      }}>
        <div style={{ textAlign: "center", maxWidth: 400, width: "90%", animation: phase === "show" ? "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" : undefined }}>

          {/* cup + sparkles */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: "1.25rem" }}>
            {[...Array(isLegendary ? 12 : 8)].map((_, i) => <SparkleParticle key={i} index={i} color={pc} />)}
            {phase !== "fly" ? (
              <div ref={cupRef} style={{ lineHeight: 1, display: "inline-block", animation: "cupGlow 1.9s ease-in-out infinite" }}>
                {achievement.img
                  ? <img src={achievement.img} alt={achievement.name} style={{ width: 120, height: 120, objectFit: "contain", display: "block", filter: `drop-shadow(0 6px 24px ${pc}cc)` }} />
                  : <span style={{ fontSize: "5.5rem" }}>{achievement.cup}</span>
                }
              </div>
            ) : (
              <div style={{ width: achievement.img ? 120 : 88, height: achievement.img ? 120 : 88 }} />
            )}
          </div>

          {/* card */}
          <div style={{
            background: isLegendary ? "linear-gradient(160deg,#1C1200,#2A1E00,#1C1200)" : "white",
            borderRadius: 26, padding: "2rem 2.25rem",
            boxShadow: `0 28px 70px rgba(0,0,0,0.38), 0 0 0 1px rgba(255,255,255,0.05)`,
            animation: isLegendary && phase === "show" ? "legendaryPulse 2.2s ease-in-out infinite" : undefined,
            pointerEvents: "all",
          }}>
            <div style={{
              display: "inline-block",
              background: isLegendary
                ? "linear-gradient(90deg,#7A5C0022,#FFD70055,#7A5C0022)"
                : `linear-gradient(90deg, ${pc}25, ${pc}40, ${pc}25)`,
              color: lc, fontSize: "0.58rem", fontWeight: 800,
              letterSpacing: "0.22em", textTransform: "uppercase",
              padding: "0.28rem 1rem", borderRadius: "2rem",
              border: `1px solid ${pc}66`, marginBottom: "1rem",
            }}>
              {isLegendary ? "✦ THÀNH TỰU HUYỀN THOẠI ✦" : "✦ Thành tích mới mở khoá ✦"}
            </div>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", color: isLegendary ? "#FFD700" : C.dark, margin: "0 0 0.5rem", lineHeight: 1.3 }}>{achievement.name}</h3>
            <p style={{ fontSize: "0.84rem", color: isLegendary ? "#C8A84B" : "#888", lineHeight: 1.72, margin: "0 0 1.75rem" }}>{achievement.desc}</p>
            <button onClick={handleContinue}
              style={{ background: `linear-gradient(135deg, ${pc}, ${pc}bb)`, color: "#1C2B1D", border: "none", padding: "0.9rem 2.5rem", borderRadius: "3rem", fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 24px ${pc}66`, letterSpacing: "0.03em", transition: "transform 0.18s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              Tiếp tục →
            </button>
          </div>
        </div>
      </div>

      {/* flying cup */}
      {phase === "fly" && cupPos && (
        <div style={{ position: "fixed", left: cupPos.left + cupPos.w / 2, top: cupPos.top + cupPos.h / 2, width: 0, height: 0, zIndex: 9999, pointerEvents: "none" }}>
          <div style={{ position: "absolute", lineHeight: 1, transform: flyActive ? `translate(-50%,-50%) translate(${flyTo.x}px,${flyTo.y}px) scale(0.08)` : "translate(-50%,-50%) scale(1)", opacity: flyActive ? 0 : 1, transition: flyActive ? "transform 0.72s cubic-bezier(0.55,0,0.45,1), opacity 0.45s ease 0.28s" : "none", filter: `drop-shadow(0 4px 20px ${pc}99)` }}>
            {achievement.img
              ? <img src={achievement.img} alt={achievement.name} style={{ width: 110, height: 110, objectFit: "contain", display: "block" }} />
              : <span style={{ fontSize: "5.5rem" }}>{achievement.cup}</span>
            }
          </div>
        </div>
      )}
    </>
  );
}
