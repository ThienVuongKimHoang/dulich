import { useState, useEffect, useRef, useCallback } from "react";
import LogoIcon from "../components/LogoIcon";

// ── Ambience by hour ──
function getAmbience() {
  const h = new Date().getHours();
  if (h >= 5  && h < 7)  return { name: "Bình minh",  overlay: "rgba(255,130,60,0.36)",  glow: "#FFB060", quote: "Bình minh trong trẻo — một ngày mới bắt đầu từ hơi thở này." };
  if (h >= 7  && h < 11) return { name: "Sáng sớm",   overlay: "rgba(120,170,255,0.22)", glow: "#90BFFF", quote: "Buổi sáng tươi sáng — tâm trí nhẹ nhàng như sương mai." };
  if (h >= 11 && h < 14) return { name: "Buổi trưa",  overlay: "rgba(255,220,120,0.20)", glow: "#FFD060", quote: "Giữa trưa tĩnh lặng — dừng lại thở và buông bỏ hối hả." };
  if (h >= 14 && h < 17) return { name: "Chiều vàng", overlay: "rgba(255,150,30,0.30)",  glow: "#FFA030", quote: "Ánh chiều dịu dàng — gửi đi những lo toan theo gió." };
  if (h >= 17 && h < 19) return { name: "Hoàng hôn",  overlay: "rgba(200,55,15,0.38)",   glow: "#E04818", quote: "Hoàng hôn buông xuống — một ngày sắp được an nghỉ." };
  if (h >= 19 && h < 22) return { name: "Buổi tối",   overlay: "rgba(60,35,100,0.48)",   glow: "#8060C0", quote: "Màn đêm tĩnh mịch — để tâm hồn trôi vào bình yên." };
  return                          { name: "Đêm khuya", overlay: "rgba(5,8,28,0.68)",      glow: "#4060A0", quote: "Đêm khuya thanh tịnh — chỉ còn hơi thở và khoảnh khắc này." };
}

// ── Breathing cycle: box breathing 4-4-6-2 ──
const PHASES = [
  { id: "inhale", label: "Hít vào",   hint: "Từ từ hít vào bằng mũi...",  dur: 4000, toScale: 1.44, color: "#6B8F71" },
  { id: "hold1",  label: "Giữ hơi",  hint: "Nhẹ nhàng giữ hơi thở...",   dur: 4000, toScale: 1.44, color: "#C8963E" },
  { id: "exhale", label: "Thở ra",   hint: "Thả lỏng, thở ra từ từ...",   dur: 6000, toScale: 1.0,  color: "#7B9FA3" },
  { id: "hold2",  label: "Tĩnh lặng",hint: "Nghỉ ngơi trong khoảnh khắc...", dur: 2000, toScale: 1.0, color: "#9B7E5A" },
];

export default function TamLinhPage({ onBack, onNavigate }) {
  const ambience = getAmbience();

  const [started,      setStarted]      = useState(false);
  const [phaseIdx,     setPhaseIdx]     = useState(0);
  const [cycleCount,   setCycleCount]   = useState(0);
  const [soundOn,      setSoundOn]      = useState(false);
  const [elapsed,      setElapsed]      = useState(0);
  const [showCtaPopup, setShowCtaPopup] = useState(false);

  const circleRef    = useRef(null);
  const timerRef     = useRef(null);
  const clockRef     = useRef(null);
  const audioCtxRef  = useRef(null);
  const nodesRef     = useRef({});

  // ── Breathing engine ──
  useEffect(() => {
    if (!started) return;
    let idx = 0;
    const tick = () => {
      setPhaseIdx(idx);
      const phase = PHASES[idx];
      if (circleRef.current) {
        circleRef.current.style.transition = `transform ${phase.dur}ms cubic-bezier(0.4,0,0.2,1), box-shadow ${phase.dur}ms ease`;
        circleRef.current.style.transform  = `scale(${phase.toScale})`;
        circleRef.current.style.boxShadow  = `0 0 ${phase.toScale > 1.2 ? 80 : 40}px ${phase.color}88, 0 0 ${phase.toScale > 1.2 ? 140 : 60}px ${phase.color}44`;
      }
      timerRef.current = setTimeout(() => {
        idx = (idx + 1) % PHASES.length;
        if (idx === 0) setCycleCount(c => c + 1);
        tick();
      }, phase.dur);
    };
    tick();
    return () => clearTimeout(timerRef.current);
  }, [started]);

  // ── Session clock ──
  useEffect(() => {
    if (!started) return;
    clockRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(clockRef.current);
  }, [started]);

  // ── Binaural beats + wind + bell ──
  const startSound = useCallback(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    // Binaural: 200Hz left + 204Hz right = 4Hz theta (relaxation)
    const merger = ctx.createChannelMerger(2);
    merger.connect(ctx.destination);
    ["left", "right"].forEach((side, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 200 + i * 4;
      gain.gain.value = 0.055;
      osc.connect(gain);
      gain.connect(merger, 0, i);
      osc.start();
      nodesRef.current[side] = { osc, gain };
    });

    // Wind: filtered noise panning slowly
    const bufSize = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, bufSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    }
    const wind = ctx.createBufferSource();
    wind.buffer = buf; wind.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 350; lp.Q.value = 0.5;
    const windGain = ctx.createGain(); windGain.gain.value = 0.045;
    const panner = ctx.createStereoPanner();
    // Slowly sweep panner
    panner.pan.setValueAtTime(-0.5, ctx.currentTime);
    panner.pan.linearRampToValueAtTime(0.5, ctx.currentTime + 12);
    panner.pan.linearRampToValueAtTime(-0.5, ctx.currentTime + 24);
    wind.connect(lp); lp.connect(windGain); windGain.connect(panner); panner.connect(ctx.destination);
    wind.start();
    nodesRef.current.wind = { wind, panner };

    // Bell every 32 seconds
    const ringBell = () => {
      [1, 2.756, 5.404].forEach((ratio, i) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 218 * ratio;
        g.gain.setValueAtTime(0.22 / (i + 1), ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 5.5);
        osc.start(); osc.stop(ctx.currentTime + 5.5);
      });
    };
    ringBell();
    nodesRef.current.bellId = setInterval(ringBell, 32000);
  }, []);

  const stopSound = useCallback(() => {
    clearInterval(nodesRef.current.bellId);
    try { nodesRef.current.left?.osc.stop();  } catch { /* ok */ }
    try { nodesRef.current.right?.osc.stop(); } catch { /* ok */ }
    try { nodesRef.current.wind?.wind.stop(); } catch { /* ok */ }
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    nodesRef.current = {};
  }, []);

  const toggleSound = useCallback(() => {
    if (soundOn) { stopSound(); setSoundOn(false); }
    else { startSound(); setSoundOn(true); }
  }, [soundOn, startSound, stopSound]);

  useEffect(() => () => { stopSound(); }, [stopSound]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const phase = PHASES[phaseIdx];

  return (
    <div style={{
      position: "fixed", inset: 0,
      fontFamily: "'Be Vietnam Pro', sans-serif",
      overflow: "hidden",
      background: "#060810",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;1,300&family=Be+Vietnam+Pro:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes starTwinkle {
          0%,100% { opacity: 0.4; } 50% { opacity: 1; }
        }
        @keyframes cloudDrift {
          from { transform: translateX(-5%); }
          to   { transform: translateX(5%);  }
        }
        @keyframes ringPulse {
          0%,100% { opacity: 0.18; transform: scale(1); }
          50%     { opacity: 0.38; transform: scale(1.04); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes phaseIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes noiBounce {
          0%,100% { transform: translateY(0) scale(1); }
          50%     { transform: translateY(-10px) scale(1.04); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.88) translateY(16px); }
          60%  { transform: scale(1.03); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .back-btn {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          padding: 0.4rem 1rem; border-radius: 2rem;
          cursor: pointer; font-size: 0.74rem;
          font-family: 'Be Vietnam Pro', sans-serif;
          transition: all 0.3s;
          backdrop-filter: blur(8px);
        }
        .back-btn:hover { background: rgba(255,255,255,0.13); color: white; }
        .sound-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 0.4rem 1rem; border-radius: 2rem;
          cursor: pointer; font-size: 0.72rem; font-weight: 500;
          font-family: 'Be Vietnam Pro', sans-serif;
          transition: all 0.4s;
          backdrop-filter: blur(8px);
          border: 1px solid;
        }
        .start-btn {
          display: inline-flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.28);
          color: white;
          padding: 0.9rem 2.6rem; border-radius: 3rem;
          cursor: pointer; font-size: 0.9rem; font-weight: 400;
          font-family: 'Be Vietnam Pro', sans-serif;
          letter-spacing: 0.06em;
          transition: all 0.45s;
          backdrop-filter: blur(12px);
        }
        .start-btn:hover {
          background: rgba(255,255,255,0.18);
          border-color: rgba(255,255,255,0.5);
          transform: scale(1.03);
        }
      `}</style>

      {/* ── Background image ── */}
      <img
        src="/img/main_page/chua.png"
        alt=""
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%", objectFit: "cover",
          filter: "brightness(0.38) saturate(0.7)",
          animation: "cloudDrift 30s ease-in-out infinite alternate",
        }}
      />

      {/* ── Time-of-day lighting overlay ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: ambience.overlay,
        mixBlendMode: "screen",
        transition: "background 3s ease",
        pointerEvents: "none",
      }} />

      {/* ── Dark vignette ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 100%)",
        pointerEvents: "none",
      }} />

      {/* ── TOP BAR ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "1.25rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <button className="back-btn" onClick={onBack}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Quay lại
          </button>
          <LogoIcon />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Time badge */}
          <div style={{ padding: "0.35rem 0.9rem", borderRadius: "2rem", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", backdropFilter: "blur(8px)", fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em" }}>
            {ambience.name}
          </div>

          {/* Session timer */}
          {started && (
            <div style={{ padding: "0.35rem 0.9rem", borderRadius: "2rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", fontSize: "0.65rem", color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
              {fmt(elapsed)}
            </div>
          )}

          {/* Sound toggle */}
          <button
            className="sound-btn"
            onClick={toggleSound}
            style={{
              borderColor: soundOn ? `${ambience.glow}66` : "rgba(255,255,255,0.15)",
              color: soundOn ? ambience.glow : "rgba(255,255,255,0.6)",
              background: soundOn ? `${ambience.glow}14` : "rgba(255,255,255,0.06)",
            }}>
            {soundOn
              ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg> Binaural Beats</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg> Bật âm thanh</>
            }
          </button>
        </div>
      </div>

      {/* ── CENTER: BREATHING CIRCLE ── */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        zIndex: 5,
        gap: "2.5rem",
      }}>
        {/* Outer decorative rings */}
        <div style={{ position: "relative", width: 360, height: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {[340, 300, 260].map((size, i) => (
            <div key={i} style={{
              position: "absolute",
              width: size, height: size, borderRadius: "50%",
              border: `1px solid ${ambience.glow}${i === 0 ? "18" : i === 1 ? "28" : "40"}`,
              animation: `ringPulse ${3 + i * 1.2}s ease-in-out ${i * 0.4}s infinite`,
            }} />
          ))}

          {/* Main breathing circle */}
          <div
            ref={circleRef}
            style={{
              width: 170, height: 170, borderRadius: "50%",
              background: started
                ? `radial-gradient(circle, ${phase.color}55 0%, ${phase.color}22 50%, transparent 75%)`
                : `radial-gradient(circle, ${ambience.glow}44 0%, ${ambience.glow}18 60%, transparent 80%)`,
              border: `1.5px solid ${started ? phase.color : ambience.glow}66`,
              boxShadow: `0 0 48px ${ambience.glow}55, 0 0 90px ${ambience.glow}22`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 1.5s ease, border-color 1.5s ease",
            }}>
            {/* Inner dot */}
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              background: started ? phase.color : ambience.glow,
              boxShadow: `0 0 16px ${started ? phase.color : ambience.glow}`,
              transition: "background 1.5s ease",
            }} />
          </div>
        </div>

        {/* Phase label + hint */}
        <div style={{ textAlign: "center", animation: "fadeUp 0.8s ease forwards" }}>
          {started ? (
            <div key={phaseIdx} style={{ animation: "phaseIn 0.5s ease forwards" }}>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.8rem", fontWeight: 300,
                color: "white", letterSpacing: "0.08em",
                marginBottom: "0.6rem",
                textShadow: `0 0 28px ${phase.color}88`,
              }}>
                {phase.label}
              </p>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.52)", fontWeight: 300, letterSpacing: "0.04em" }}>
                {phase.hint}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 300, color: "rgba(255,255,255,0.88)", marginBottom: "0.5rem", letterSpacing: "0.06em" }}>
                Hơi thở dẫn lối
              </p>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.42)", fontWeight: 300, marginBottom: "2rem" }}>
                {ambience.quote}
              </p>
              <button className="start-btn" onClick={() => setStarted(true)}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ambience.glow, boxShadow: `0 0 10px ${ambience.glow}` }} />
                Bắt đầu thiền định
              </button>
            </div>
          )}
        </div>

        {/* Cycle counter */}
        {started && cycleCount > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0.3rem 0.85rem", borderRadius: "2rem",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "0.65rem", color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.1em",
          }}>
            {Array.from({ length: Math.min(cycleCount, 8) }).map((_, i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: ambience.glow, opacity: 0.7 }} />
            ))}
            <span style={{ marginLeft: 4 }}>{cycleCount} chu kỳ</span>
          </div>
        )}
      </div>

      {/* ── BOTTOM: Quote + instructions ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "2rem",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem",
        background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
        zIndex: 10,
      }}>
        {!started && (
          <p style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            4 giây hít · 4 giây giữ · 6 giây thở ra · 2 giây nghỉ
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.22)", letterSpacing: "0.06em" }}>
            Bình Lợi · Bát Bửu Phật Đài · Bình Chánh, TP.HCM
          </div>
        </div>
      </div>

      {/* ── Floating Mai character ── */}
      <button
        onClick={() => setShowCtaPopup(true)}
        style={{
          position: "absolute", bottom: "5rem", right: "1.75rem",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        }}>
        <div style={{
          background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "2rem", padding: "0.2rem 0.7rem",
          fontSize: "0.6rem", color: "rgba(255,255,255,0.75)",
          marginBottom: 2, whiteSpace: "nowrap",
        }}>Khám phá thêm ✦</div>
        <img
          src="/img/main_page/noi.png"
          alt="Mai"
          style={{
            width: 72, height: 72, objectFit: "contain",
            animation: "noiBounce 2.8s ease-in-out infinite",
            filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.5))",
          }}
        />
      </button>

      {/* ── CTA Popup ── */}
      {showCtaPopup && (
        <div style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div onClick={() => setShowCtaPopup(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{
            position: "relative", zIndex: 1, width: "min(480px, 92vw)",
            background: "linear-gradient(160deg, #0D1B2A 0%, #1A3A20 100%)",
            border: "1px solid rgba(200,150,62,0.3)",
            borderRadius: 24, padding: "2rem",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
            animation: "popIn 0.4s cubic-bezier(0.34,1.26,0.64,1) forwards",
          }}>
            <button onClick={() => setShowCtaPopup(false)} style={{ position: "absolute", top: 14, right: 14, width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", color: "white", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.5rem" }}>
              <img src="/img/main_page/noi.png" alt="Mai" style={{ width: 44, height: 44, objectFit: "contain" }} />
              <div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "white", margin: 0 }}>Bạn muốn trải nghiệm thêm?</p>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", margin: 0 }}>Khám phá các điểm đến khác tại Bình Lợi</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { icon: "🗺️", title: "Xem bản đồ", desc: "Đến trực tiếp Ấp 9, xã Bình Lợi", action: "map" },
                { icon: "📅", title: "Đặt lịch tham quan", desc: "Hẹn trước để có hướng dẫn viên riêng", action: "booking" },
                { icon: "🌿", title: "Workshop uốn mai", desc: "Học nghệ thuật tạo thế mai cùng nghệ nhân", action: "workshop" },
              ].map(({ icon, title, desc, action }) => (
                <button key={action}
                  onClick={() => { setShowCtaPopup(false); onNavigate?.(action); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.85rem",
                    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 14, padding: "0.9rem 1rem",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "all 0.22s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.borderColor = `${ambience.glow}55`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>
                  <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                  <div>
                    <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.85rem", fontWeight: 600, color: "white", margin: 0 }}>{title}</p>
                    <p style={{ fontFamily: "'Be Vietnam Pro', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>{desc}</p>
                  </div>
                  <svg style={{ marginLeft: "auto", flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
